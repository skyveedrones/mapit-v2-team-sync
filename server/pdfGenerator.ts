/**
 * PDF Generator - Lightweight implementation without Puppeteer
 * Uses a simple approach for Railway deployment where Chromium is not available.
 * Falls back to returning HTML content as a buffer for client-side PDF generation.
 */

export async function generatePdfFromHtml(html: string): Promise<Buffer> {
  console.log("[PDF Generator] Starting PDF generation, HTML size:", (html.length / 1024).toFixed(2), "KB");
  
  // In production (Railway), Puppeteer/Chromium is not available.
  // Return the HTML as a buffer - the client can use window.print() or 
  // a client-side library to generate the PDF.
  // This is a temporary solution until a cloud PDF service is integrated.
  
  try {
    // Try dynamic import of puppeteer-core in case it's available in the environment
    const puppeteer = await import("puppeteer-core");
    const { existsSync } = await import("fs");
    
    // Try to find system Chromium
    const systemChromiumPaths = [
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium",
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
    ];
    
    let executablePath: string | undefined;
    for (const chromePath of systemChromiumPaths) {
      if (existsSync(chromePath)) {
        executablePath = chromePath;
        break;
      }
    }
    
    if (!executablePath) {
      console.log("[PDF Generator] No Chromium found, returning HTML buffer for client-side rendering");
      return Buffer.from(html, "utf-8");
    }
    
    console.log("[PDF Generator] Using system Chromium:", executablePath);
    const browser = await puppeteer.default.launch({
      headless: true,
      executablePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    });
    
    const page = await browser.newPage();
    page.setDefaultTimeout(180000);
    await page.setContent(html, { waitUntil: ["load", "domcontentloaded"], timeout: 180000 });
    
    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images)
          .filter(img => !img.complete)
          .map(img => new Promise(resolve => { img.onload = img.onerror = resolve; }))
      );
    });
    
    const pdfBuffer = await page.pdf({
      format: "Letter",
      printBackground: true,
      margin: { top: "0.5in", right: "0.5in", bottom: "0.5in", left: "0.5in" },
      timeout: 180000,
    });
    
    await browser.close();
    console.log("[PDF Generator] PDF generated successfully, size:", (pdfBuffer.length / 1024).toFixed(2), "KB");
    return Buffer.from(pdfBuffer);
  } catch (error) {
    // If puppeteer-core is not available or Chromium not found, return HTML
    console.log("[PDF Generator] Puppeteer not available, returning HTML buffer for client-side rendering");
    return Buffer.from(html, "utf-8");
  }
}
