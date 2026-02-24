import puppeteer from 'puppeteer';

export async function generatePdfFromHtml(html: string): Promise<Uint8Array> {
  let browser;
  try {
    console.log('[PDF] Starting PDF generation...');
    // Launch browser
    console.log('[PDF] Launching Puppeteer browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    
    // Set longer timeout for map loading (60 seconds)
    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(60000);
    
    // Set content with longer timeout for map tiles to load
    console.log('[PDF] Setting page content with 60s timeout for map loading...');
    await page.setContent(html, { waitUntil: 'networkidle2', timeout: 60000 } as any);
    
    // Wait for map to fully render (give it extra time for Google Maps tiles)
    console.log('[PDF] Waiting 2 seconds for map tiles to fully render...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate PDF with extended timeout
    console.log('[PDF] Generating PDF...');
    const pdfBuffer = await page.pdf({
      format: 'Letter',
      margin: {
        top: '0.3in',
        right: '0.4in',
        bottom: '0.3in',
        left: '0.4in',
      },
      printBackground: true,
      timeout: 60000,
    });
    
    console.log('[PDF] PDF generated successfully, size:', pdfBuffer.length, 'bytes');
    return pdfBuffer;
  } catch (error) {
    console.error('[PDF] Error during PDF generation:', error);
    throw error;
  } finally {
    if (browser) {
      console.log('[PDF] Closing browser...');
      await browser.close();
    }
  }
}
