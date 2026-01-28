import puppeteer from "puppeteer";

/**
 * Generate a PDF from HTML content using Puppeteer
 * @param html - The HTML content to convert to PDF
 * @returns Buffer containing the PDF data
 */
export async function generatePdfFromHtml(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: "/usr/bin/chromium-browser",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  try {
    const page = await browser.newPage();

    // Set content and wait for images to load
    await page.setContent(html, {
      waitUntil: ["load", "networkidle0"],
      timeout: 60000,
    });

    // Wait for images to load using a simple timeout
    // networkidle0 should handle most cases, but add extra time for safety
    await new Promise((resolve) => setTimeout(resolve, 2000));

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
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
