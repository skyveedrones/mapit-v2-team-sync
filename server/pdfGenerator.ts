import puppeteer from "puppeteer";

/**
 * Generate a PDF from HTML content using Puppeteer
 * @param html - The HTML content to convert to PDF
 * @returns Buffer containing the PDF data
 */
export async function generatePdfFromHtml(html: string): Promise<Buffer> {
  console.log("[PDF Generator] Starting PDF generation, HTML size:", (html.length / 1024).toFixed(2), "KB");
  
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: "/usr/bin/chromium-browser",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-software-rasterizer",
      "--disable-extensions",
    ],
  });

  try {
    const page = await browser.newPage();
    
    // Increase timeout for large reports with many images
    page.setDefaultTimeout(180000); // 3 minutes
    
    console.log("[PDF Generator] Setting page content...");

    // Set content and wait for images to load
    // For data URLs, we don't need networkidle since there are no external requests
    await page.setContent(html, {
      waitUntil: ["load", "domcontentloaded"],
      timeout: 180000,
    });
    
    console.log("[PDF Generator] Content loaded, waiting for images...");

    // Wait for all images to load (data URLs should load instantly)
    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images)
          .filter(img => !img.complete)
          .map(img => new Promise(resolve => {
            img.onload = img.onerror = resolve;
          }))
      );
    });
    
    console.log("[PDF Generator] Images loaded, generating PDF...");

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: "Letter",
      printBackground: true,
      margin: {
        top: "0.5in",
        right: "0.5in",
        bottom: "0.5in",
        left: "0.5in",
      },
      timeout: 180000,
    });
    
    console.log("[PDF Generator] PDF generated successfully, size:", (pdfBuffer.length / 1024).toFixed(2), "KB");

    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error("[PDF Generator] Error details:", error);
    throw error;
  } finally {
    await browser.close();
    console.log("[PDF Generator] Browser closed");
  }
}
