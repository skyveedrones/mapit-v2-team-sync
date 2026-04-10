// Preconfigured storage helpers for Manus WebDev templates
// Uses the Biz-provided storage proxy (Authorization: Bearer <token>)

import { ENV } from './_core/env';

type StorageConfig = { baseUrl: string; apiKey: string };

function getStorageConfig(): StorageConfig {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

function buildUploadUrl(baseUrl: string, relKey: string): URL {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}

async function buildDownloadUrl(
  baseUrl: string,
  relKey: string,
  apiKey: string
): Promise<string> {
  const downloadApiUrl = new URL(
    "v1/storage/downloadUrl",
    ensureTrailingSlash(baseUrl)
  );
  downloadApiUrl.searchParams.set("path", normalizeKey(relKey));
  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: buildAuthHeaders(apiKey),
  });
  return (await response.json()).url;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function toFormData(
  data: Buffer | Uint8Array | string,
  contentType: string,
  fileName: string
): FormData {
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(apiKey),
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  const url = (await response.json()).url;
  return { key, url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string; }> {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  return {
    key,
    url: await buildDownloadUrl(baseUrl, key, apiKey),
  };
}

/**
 * Download file bytes from storage through the authenticated proxy.
 * Use this instead of fetch(storageGet(...).url) to avoid 403 on presigned/CDN URLs.
 */
export async function storageDownload(relKey: string): Promise<{ buffer: Buffer; contentType: string }> {
  const { baseUrl, apiKey } = getStorageConfig();
  // normalizeKey strips leading slashes; encodeURIComponent encodes spaces and special chars
  // that cause 400 Bad Request from the storage proxy
  const key = normalizeKey(relKey);
  const encodedKey = key.split('/').map(encodeURIComponent).join('/');

  // Step 1: get the presigned download URL
  const downloadApiUrl = new URL("v1/storage/downloadUrl", ensureTrailingSlash(baseUrl));
  downloadApiUrl.searchParams.set("path", encodedKey);
  const urlResponse = await fetch(downloadApiUrl, {
    method: "GET",
    headers: buildAuthHeaders(apiKey),
  });
  if (!urlResponse.ok) {
    const msg = await urlResponse.text().catch(() => urlResponse.statusText);
    throw new Error(`storageDownload: failed to get download URL (${urlResponse.status}): ${msg}`);
  }
  const { url: presignedUrl } = await urlResponse.json();

  // Step 2: fetch the actual bytes
  let fileResponse = await fetch(presignedUrl);
  if (!fileResponse.ok) {
    // Fallback: use the storage proxy's direct download endpoint
    const directUrl = new URL("v1/storage/download", ensureTrailingSlash(baseUrl));
    directUrl.searchParams.set("path", encodedKey);
    fileResponse = await fetch(directUrl, { headers: buildAuthHeaders(apiKey) });
    if (!fileResponse.ok) {
      throw new Error(`storageDownload: fetch failed (${fileResponse.status}) for key: ${key}`);
    }
  }

  const buffer = Buffer.from(await fileResponse.arrayBuffer());
  const contentType = fileResponse.headers.get("content-type") || "application/octet-stream";
  return { buffer, contentType };
}

// Get a presigned URL for direct client-side uploads (bypasses server memory)
export async function storageGetUploadUrl(
  relKey: string,
  contentType: string
): Promise<{ key: string; uploadUrl: string; publicUrl: string }> {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  
  // Get presigned upload URL from the storage proxy
  const presignUrl = new URL("v1/storage/presignUpload", ensureTrailingSlash(baseUrl));
  presignUrl.searchParams.set("path", key);
  presignUrl.searchParams.set("contentType", contentType);
  
  const response = await fetch(presignUrl, {
    method: "GET",
    headers: buildAuthHeaders(apiKey),
  });
  
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`Failed to get presigned URL (${response.status}): ${message}`);
  }
  
  const result = await response.json();
  return {
    key,
    uploadUrl: result.uploadUrl,
    publicUrl: result.url,
  };
}
