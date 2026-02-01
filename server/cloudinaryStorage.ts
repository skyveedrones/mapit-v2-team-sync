/**
 * Cloudinary Storage Helper
 * 
 * This module provides storage functions using Cloudinary as the backend,
 * replacing the previous S3/CloudFront storage that became inaccessible.
 * 
 * Features:
 * - Image uploads with automatic optimization
 * - Video uploads with automatic thumbnail generation
 * - Automatic format conversion and CDN delivery
 * - Retry logic for connection issues
 */

import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface CloudinaryUploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  format: string;
  resourceType: 'image' | 'video' | 'raw';
  bytes: number;
}

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Upload a file to Cloudinary with retry logic
 * 
 * @param fileBuffer - The file data as a Buffer
 * @param options - Upload options
 * @param retries - Number of retries (default 3)
 * @returns Upload result with URLs and metadata
 */
export async function cloudinaryUpload(
  fileBuffer: Buffer,
  options: {
    folder: string;
    filename?: string;
    resourceType?: 'image' | 'video' | 'auto' | 'raw';
    transformation?: object;
  },
  retries: number = 3
): Promise<CloudinaryUploadResult> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await uploadWithTimeout(fileBuffer, options, 120000); // 2 minute timeout
      return result;
    } catch (error: any) {
      lastError = error;
      console.error(`[Cloudinary] Upload attempt ${attempt}/${retries} failed:`, error.message);
      
      // If it's a socket/connection error, retry after a delay
      if (error.message?.includes('socket') || error.message?.includes('ECONNRESET') || error.message?.includes('timeout')) {
        if (attempt < retries) {
          const delay = attempt * 2000; // Exponential backoff: 2s, 4s, 6s
          console.log(`[Cloudinary] Retrying in ${delay}ms...`);
          await sleep(delay);
          continue;
        }
      }
      
      // For other errors, throw immediately
      throw error;
    }
  }
  
  throw lastError || new Error('Cloudinary upload failed after retries');
}

/**
 * Upload with timeout wrapper
 */
async function uploadWithTimeout(
  fileBuffer: Buffer,
  options: {
    folder: string;
    filename?: string;
    resourceType?: 'image' | 'video' | 'auto' | 'raw';
    transformation?: object;
  },
  timeoutMs: number
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Cloudinary upload timeout'));
    }, timeoutMs);

    const uploadOptions: any = {
      folder: options.folder,
      resource_type: options.resourceType || 'auto',
      use_filename: true,
      unique_filename: true,
      timeout: 120000, // Cloudinary SDK timeout
    };

    if (options.filename) {
      uploadOptions.public_id = options.filename.replace(/\.[^/.]+$/, ''); // Remove extension
    }

    // For images, apply optimization
    if (options.resourceType === 'image' || !options.resourceType) {
      uploadOptions.transformation = options.transformation || {
        quality: 'auto',
        fetch_format: 'auto',
      };
    }

    // For videos, generate thumbnail
    if (options.resourceType === 'video') {
      uploadOptions.eager = [
        { width: 300, height: 200, crop: 'fill', format: 'jpg' }
      ];
      uploadOptions.eager_async = true;
    }

    // Convert buffer to base64 data URI for more reliable upload
    const mimeType = options.resourceType === 'video' ? 'video/mp4' : 'image/jpeg';
    const base64Data = fileBuffer.toString('base64');
    const dataUri = `data:${mimeType};base64,${base64Data}`;

    // Use upload instead of upload_stream for better reliability
    cloudinary.uploader.upload(
      dataUri,
      uploadOptions,
      (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
        clearTimeout(timeout);
        
        if (error) {
          console.error('[Cloudinary] Upload error:', error);
          reject(new Error(`Cloudinary upload failed: ${error.message}`));
          return;
        }

        if (!result) {
          reject(new Error('Cloudinary upload returned no result'));
          return;
        }

        // Generate thumbnail URL
        let thumbnailUrl = result.secure_url;
        if (result.resource_type === 'image') {
          // For images, create a thumbnail transformation URL
          thumbnailUrl = cloudinary.url(result.public_id, {
            width: 300,
            height: 200,
            crop: 'fill',
            quality: 'auto',
            fetch_format: 'auto',
          });
        } else if (result.resource_type === 'video') {
          // For videos, use the eager transformation or generate poster
          thumbnailUrl = cloudinary.url(result.public_id, {
            resource_type: 'video',
            width: 300,
            height: 200,
            crop: 'fill',
            format: 'jpg',
          });
        }

        resolve({
          url: result.url,
          secureUrl: result.secure_url,
          publicId: result.public_id,
          thumbnailUrl,
          width: result.width,
          height: result.height,
          format: result.format,
          resourceType: result.resource_type as 'image' | 'video' | 'raw',
          bytes: result.bytes,
        });
      }
    );
  });
}

/**
 * Upload an image to Cloudinary
 */
export async function cloudinaryUploadImage(
  fileBuffer: Buffer,
  folder: string,
  filename?: string
): Promise<CloudinaryUploadResult> {
  return cloudinaryUpload(fileBuffer, {
    folder,
    filename,
    resourceType: 'image',
  });
}

/**
 * Upload a video to Cloudinary
 */
export async function cloudinaryUploadVideo(
  fileBuffer: Buffer,
  folder: string,
  filename?: string
): Promise<CloudinaryUploadResult> {
  return cloudinaryUpload(fileBuffer, {
    folder,
    filename,
    resourceType: 'video',
  });
}

/**
 * Delete a file from Cloudinary
 */
export async function cloudinaryDelete(
  publicId: string,
  resourceType: 'image' | 'video' | 'raw' = 'image'
): Promise<boolean> {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return result.result === 'ok';
  } catch (error) {
    console.error('[Cloudinary] Delete error:', error);
    return false;
  }
}

/**
 * Generate a thumbnail URL for an existing Cloudinary resource
 */
export function cloudinaryThumbnailUrl(
  publicId: string,
  resourceType: 'image' | 'video' = 'image',
  width: number = 300,
  height: number = 200
): string {
  if (resourceType === 'video') {
    return cloudinary.url(publicId, {
      resource_type: 'video',
      width,
      height,
      crop: 'fill',
      format: 'jpg',
    });
  }
  
  return cloudinary.url(publicId, {
    width,
    height,
    crop: 'fill',
    quality: 'auto',
    fetch_format: 'auto',
  });
}

/**
 * Test Cloudinary connection by pinging the API
 */
export async function testCloudinaryConnection(): Promise<boolean> {
  try {
    const result = await cloudinary.api.ping();
    return result.status === 'ok';
  } catch (error) {
    console.error('[Cloudinary] Connection test failed:', error);
    return false;
  }
}

/**
 * Get Cloudinary account usage info
 */
export async function getCloudinaryUsage(): Promise<{
  used_percent: number;
  storage_used: number;
  bandwidth_used: number;
} | null> {
  try {
    const result = await cloudinary.api.usage();
    return {
      used_percent: result.used_percent,
      storage_used: result.storage?.usage || 0,
      bandwidth_used: result.bandwidth?.usage || 0,
    };
  } catch (error) {
    console.error('[Cloudinary] Usage check failed:', error);
    return null;
  }
}

export { cloudinary };
