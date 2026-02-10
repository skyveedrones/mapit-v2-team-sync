import { Resend } from 'resend';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Enterprise-friendly light theme colors (better for corporate email filters)
const BRAND_COLORS = {
  primary: '#10b981', // Emerald green
  background: '#ffffff', // Light background for enterprise compatibility
  cardBg: '#f9fafb',
  text: '#1f2937', // Dark text for readability
  textMuted: '#6b7280',
  border: '#e5e7eb',
};

/**
 * Generate enterprise-friendly email HTML template
 * Uses light theme for better compatibility with corporate email filters
 */
function generateEmailTemplate(content: {
  preheader: string;
  title: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  footer?: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="format-detection" content="telephone=no">
  <meta name="format-detection" content="date=no">
  <meta name="format-detection" content="address=no">
  <meta name="format-detection" content="email=no">
  <title>${content.title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Use system fonts instead of external imports for better enterprise compatibility */
    body {
      margin: 0;
      padding: 0;
      background-color: ${BRAND_COLORS.background};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: ${BRAND_COLORS.text};
      line-height: 1.5;
    }
    
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: ${BRAND_COLORS.background};
    }
    
    .card {
      background-color: ${BRAND_COLORS.cardBg};
      border: 1px solid ${BRAND_COLORS.border};
      border-radius: 6px;
      overflow: hidden;
      margin: 20px;
    }
    
    .header {
      background-color: ${BRAND_COLORS.background};
      padding: 24px 20px;
      border-bottom: 3px solid ${BRAND_COLORS.primary};
      text-align: center;
    }
    
    .header h1 {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 20px;
      font-weight: 700;
      color: ${BRAND_COLORS.primary};
      letter-spacing: 0.5px;
    }
    
    .content {
      padding: 24px 20px;
    }
    
    .preheader {
      display: none;
      max-height: 0;
      max-width: 0;
      overflow: hidden;
      font-size: 1px;
      opacity: 0;
    }
    
    .body-text {
      font-size: 15px;
      line-height: 1.6;
      color: ${BRAND_COLORS.text};
      margin: 0 0 16px 0;
    }
    
    .body-text p {
      margin: 0 0 12px 0;
    }
    
    .body-text strong {
      color: ${BRAND_COLORS.primary};
      font-weight: 600;
    }
    
    .cta-button {
      display: inline-block;
      background-color: ${BRAND_COLORS.primary};
      color: #ffffff !important;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      padding: 12px 28px;
      border-radius: 6px;
      border: 2px solid ${BRAND_COLORS.primary};
      text-align: center;
    }
    
    .cta-container {
      text-align: center;
      margin: 24px 0;
    }
    
    .divider {
      height: 1px;
      background-color: ${BRAND_COLORS.border};
      margin: 24px 0;
    }
    
    .footer {
      font-size: 13px;
      color: ${BRAND_COLORS.textMuted};
      text-align: center;
      margin-top: 20px;
    }
    
    .footer a {
      color: ${BRAND_COLORS.primary};
      text-decoration: none;
    }
    
    .footer a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="preheader">${content.preheader}</div>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1>MAPIT</h1>
      </div>
      <div class="content">
        <div class="body-text">${content.body}</div>
        ${content.ctaUrl ? `<div class="cta-container"><a href="${content.ctaUrl}" class="cta-button">${content.ctaText || 'View'}</a></div>` : ''}
        <div class="divider"></div>
        <div class="footer">
          ${content.footer || 'Thank you for using Mapit'}
          <br><br>
          <a href="https://mapit.skyveedrones.com">Visit Mapit</a> | <a href="mailto:support@skyveedrones.com">Contact Support</a>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Get common email headers for enterprise compatibility
 */
function getEmailHeaders() {
  return {
    'X-Entity-Ref-ID': `mapit-${Date.now()}`,
    'X-Mailer': 'Mapit/1.0',
    'X-Priority': '3', // Normal priority
    'X-MSMail-Priority': 'Normal',
    'Importance': 'normal',
    'List-Unsubscribe': '<mailto:support@skyveedrones.com?subject=unsubscribe>',
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    'Precedence': 'bulk',
  };
}

/**
 * Send project invitation email
 */
export async function sendProjectInvitationEmail(params: {
  to: string;
  projectName: string;
  inviterName: string;
  inviteLink: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, projectName, inviterName, inviteLink } = params;

  try {
    const html = generateEmailTemplate({
      preheader: `${inviterName} invited you to ${projectName}`,
      title: `You're invited to ${projectName}`,
      body: `<p>Hello,</p><p>${inviterName} has invited you to collaborate on <strong>${projectName}</strong> using Mapit, a professional drone mapping and project management platform.</p><p>Click the button below to accept the invitation and start collaborating.</p>`,
      ctaText: 'Accept Invitation',
      ctaUrl: inviteLink,
      footer: 'If you did not expect this invitation, you can safely ignore this email.',
    });

    const { error } = await resend.emails.send({
      from: 'Mapit <noreply@skyveedrones.com>',
      to: [to],
      replyTo: 'support@skyveedrones.com',
      subject: `${inviterName} invited you to "${projectName}" on Mapit`,
      html,
      headers: getEmailHeaders(),
    });

    if (error) {
      console.error('[Email] Failed to send project invitation to', to, ':', error);
      return { success: false, error: error.message };
    }

    console.log('[Email] Project invitation sent to', to);
    return { success: true };
  } catch (err) {
    console.error('[Email] Exception sending project invitation:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Send project welcome email (after accepting invitation)
 */
export async function sendProjectWelcomeEmail(params: {
  to: string;
  projectName: string;
  projectLink: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, projectName, projectLink } = params;

  try {
    const html = generateEmailTemplate({
      preheader: `You now have access to ${projectName}`,
      title: `Welcome to ${projectName}`,
      body: `<p>Hello,</p><p>You now have access to <strong>${projectName}</strong> on Mapit. You can start viewing and collaborating on this project right away.</p><p>Use the button below to open the project and begin working with your team.</p>`,
      ctaText: 'Open Project',
      ctaUrl: projectLink,
      footer: 'Questions? Contact our support team at support@skyveedrones.com',
    });

    const { error } = await resend.emails.send({
      from: 'Mapit <noreply@skyveedrones.com>',
      to: [to],
      replyTo: 'support@skyveedrones.com',
      subject: `Welcome to Mapit - You now have access to "${projectName}"`,
      html,
      headers: getEmailHeaders(),
    });

    if (error) {
      console.error('[Email] Failed to send project welcome email to', to, ':', error);
      return { success: false, error: error.message };
    }

    console.log('[Email] Project welcome email sent to', to);
    return { success: true };
  } catch (err) {
    console.error('[Email] Exception sending project welcome email:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Send test email to verify configuration
 */
export async function sendTestEmail(params: {
  to: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to } = params;

  try {
    const html = generateEmailTemplate({
      preheader: 'Test email to verify Mapit configuration',
      title: 'Mapit Test Email',
      body: `<p>Hello,</p><p>This is a test email from Mapit to verify that your email configuration is working correctly.</p><p>If you received this email in your inbox, your email authentication (SPF, DKIM, DMARC) is properly configured and emails are being delivered successfully.</p>`,
      footer: 'This is an automated test email. No action is required.',
    });

    const { error } = await resend.emails.send({
      from: 'Mapit <noreply@skyveedrones.com>',
      to: [to],
      replyTo: 'support@skyveedrones.com',
      subject: 'Mapit Test Email - Configuration Verified',
      html,
      headers: getEmailHeaders(),
    });

    if (error) {
      console.error('[Email] Failed to send test email to', to, ':', error);
      return { success: false, error: error.message };
    }

    console.log('[Email] Test email sent to', to);
    return { success: true };
  } catch (err) {
    console.error('[Email] Exception sending test email:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Send report via email
 */
export async function sendReportEmail(params: {
  to: string;
  projectName: string;
  reportUrl: string;
  senderName: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, projectName, reportUrl, senderName } = params;

  try {
    const html = generateEmailTemplate({
      preheader: `${senderName} shared a report for ${projectName}`,
      title: `Project Report: ${projectName}`,
      body: `<p>Hello,</p><p>${senderName} has shared a project report for <strong>${projectName}</strong> with you.</p><p>Click the button below to view the report.</p>`,
      ctaText: 'View Report',
      ctaUrl: reportUrl,
      footer: 'Questions about this report? Contact the sender or our support team at support@skyveedrones.com',
    });

    const { error } = await resend.emails.send({
      from: 'Mapit <noreply@skyveedrones.com>',
      to: [to],
      replyTo: 'support@skyveedrones.com',
      subject: `${senderName} shared a report for "${projectName}"`,
      html,
      headers: getEmailHeaders(),
    });

    if (error) {
      console.error('[Email] Failed to send report email to', to, ':', error);
      return { success: false, error: error.message };
    }

    console.log('[Email] Report email sent to', to);
    return { success: true };
  } catch (err) {
    console.error('[Email] Exception sending report email:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Send client welcome email
 */
export async function sendClientWelcomeEmail(params: {
  to: string;
  clientName: string;
  projectName: string;
  loginUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, clientName, projectName, loginUrl } = params;

  try {
    const html = generateEmailTemplate({
      preheader: `Welcome to Mapit - Your project ${projectName} is ready`,
      title: `Welcome to Mapit, ${clientName}`,
      body: `<p>Hello ${clientName},</p><p>Welcome to Mapit! Your project <strong>${projectName}</strong> has been set up and is ready for collaboration.</p><p>Use the button below to log in and start viewing your project details, media files, and reports.</p>`,
      ctaText: 'Log In to Mapit',
      ctaUrl: loginUrl,
      footer: 'If you have any questions, our support team is here to help at support@skyveedrones.com',
    });

    const { error } = await resend.emails.send({
      from: 'Mapit <noreply@skyveedrones.com>',
      to: [to],
      replyTo: 'support@skyveedrones.com',
      subject: `Welcome to Mapit - Your project ${projectName} is ready`,
      html,
      headers: getEmailHeaders(),
    });

    if (error) {
      console.error('[Email] Failed to send client welcome email to', to, ':', error);
      return { success: false, error: error.message };
    }

    console.log('[Email] Client welcome email sent to', to);
    return { success: true };
  } catch (err) {
    console.error('[Email] Exception sending client welcome email:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
