/**
 * Email Report Service
 * Send PDF reports via email
 */

import { Resend } from 'resend';
import { generatePdfFromHtml } from './pdfGenerator';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailReportParams {
  to: string;
  projectName: string;
  html: string;
  senderName?: string;
}

/**
 * Send a PDF report via email
 */
export async function sendReportEmail(params: EmailReportParams): Promise<{ success: boolean; error?: string }> {
  const { to, projectName, html, senderName = 'Mapit' } = params;
  
  try {
    console.log(`[Email Report] Generating PDF for project: ${projectName}`);
    
    // Generate PDF from HTML
    const pdfBuffer = await generatePdfFromHtml(html);
    
    console.log(`[Email Report] PDF generated (${(pdfBuffer.length / 1024).toFixed(2)} KB), sending email to ${to}`);
    
    // Send email with PDF attachment
    const { error } = await resend.emails.send({
      from: 'Mapit Reports <noreply@notifications.skyveedrones.com>',
      to: [to],
      subject: `Mapit Report - ${projectName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              padding: 30px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .logo {
              font-size: 28px;
              font-weight: 700;
              margin-bottom: 10px;
            }
            .content {
              background: #f9fafb;
              padding: 30px;
              border-radius: 0 0 8px 8px;
            }
            .project-name {
              font-size: 20px;
              font-weight: 600;
              color: #10b981;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              color: #6b7280;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Map<span style="color: #d1fae5;">it</span></div>
            <p style="margin: 0;">Drone Mapping Report</p>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>Your drone mapping report is ready!</p>
            <div class="project-name">📍 ${projectName}</div>
            <p>The PDF report is attached to this email. It includes:</p>
            <ul>
              <li>Project overview and location map</li>
              <li>High-resolution aerial photos</li>
              <li>GPS coordinates and flight path data</li>
            </ul>
            <p>If you have any questions about this report, please don't hesitate to reach out.</p>
            <div class="footer">
              <p>Sent by ${senderName} via <strong>Mapit</strong></p>
              <p>Delivering precision drone mapping solutions</p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: `${projectName.replace(/[^a-z0-9]/gi, '_')}_Report.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    if (error) {
      console.error('[Email Report] Failed to send email:', error);
      return { success: false, error: error.message };
    }

    console.log(`[Email Report] Email sent successfully to ${to}`);
    return { success: true };
  } catch (err) {
    console.error('[Email Report] Error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
