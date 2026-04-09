import { storagePut, storageGet } from "./storage";
import { invokeLLM } from "./server/_core/llm";

/**
 * Convert PDF to PNG using PDF rendering service
 * Falls back to generating a placeholder if conversion fails
 */
export async function convertPdfToPng(
  fileKey: string,
  fileName: string
): Promise<{ imageUrl: string; success: boolean }> {
  try {
    // Get the PDF file URL from storage
    const { url: pdfUrl } = await storageGet(fileKey);

    // Use LLM with file_url to process the PDF
    // This will extract the first page as an image
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a PDF processing assistant. Extract the first page of the PDF as a high-quality image. Return a JSON object with the image data.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Convert the first page of this PDF to a PNG image. Return the image URL.",
            },
            {
              type: "file_url",
              file_url: {
                url: pdfUrl,
                mime_type: "application/pdf",
              },
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "pdf_conversion",
          strict: true,
          schema: {
            type: "object",
            properties: {
              imageUrl: { type: "string", description: "URL to the converted PNG image" },
              success: { type: "boolean", description: "Whether conversion was successful" },
            },
            required: ["imageUrl", "success"],
            additionalProperties: false,
          },
        },
      },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result;
  } catch (error) {
    console.error("[PDF Converter Error]", error);

    // Fallback: Generate a placeholder image
    try {
      const placeholderImageUrl = await generatePlaceholderImage(fileName);
      return { imageUrl: placeholderImageUrl, success: false };
    } catch (fallbackError) {
      console.error("[PDF Converter Fallback Error]", fallbackError);
      throw new Error("Failed to convert PDF to PNG");
    }
  }
}

/**
 * Generate a placeholder image for the document
 */
async function generatePlaceholderImage(fileName: string): Promise<string> {
  // Create a simple SVG placeholder
  const svg = `
    <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="600" fill="#f0f0f0"/>
      <text x="400" y="300" font-size="24" text-anchor="middle" fill="#666">
        ${fileName}
      </text>
      <text x="400" y="350" font-size="14" text-anchor="middle" fill="#999">
        Document Preview Unavailable
      </text>
    </svg>
  `;

  // Convert SVG to PNG and upload to storage
  const pngBuffer = Buffer.from(svg);
  const placeholderKey = `placeholders/${Date.now()}-${fileName}.png`;
  const { url } = await storagePut(placeholderKey, pngBuffer, "image/png");

  return url;
}

/**
 * Extract image from image file (PNG/JPG)
 */
export async function getImageUrl(fileKey: string): Promise<string> {
  const { url } = await storageGet(fileKey);
  return url;
}
