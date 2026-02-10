import { Resend } from 'resend';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Mapit brand colors
const BRAND_COLORS = {
  primary: '#10b981', // Emerald green
  background: '#0a0a0a',
  cardBg: '#171717',
  text: '#ffffff',
  textMuted: '#a3a3a3',
  border: '#262626',
};

/**
 * Generate the Mapit branded email HTML template
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
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Orbitron:wght@700&display=swap');
    
    body {
      margin: 0;
      padding: 0;
      background-color: ${BRAND_COLORS.background};
      font-family: 'Inter', sans-serif;
      color: ${BRAND_COLORS.text};
    }
    
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: ${BRAND_COLORS.cardBg};
      border: 1px solid ${BRAND_COLORS.border};
      border-radius: 8px;
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
      padding: 32px 24px;
      border-bottom: 2px solid ${BRAND_COLORS.primary};
      text-align: center;
    }
    
    .header h1 {
      margin: 0;
      font-family: 'Orbitron', monospace;
      font-size: 24px;
      font-weight: 700;
      color: ${BRAND_COLORS.primary};
      letter-spacing: 1px;
    }
    
    .content {
      padding: 32px 24px;
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
      font-size: 16px;
      line-height: 1.6;
      color: ${BRAND_COLORS.textMuted};
      margin: 0 0 24px 0;
    }
    
    .cta-button {
      display: inline-block;
      background-color: ${BRAND_COLORS.primary};
      color: ${BRAND_COLORS.background} !important;
      font-size: 16px;
      font-weight: 600;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      text-align: center;
    }
    
    .cta-container {
      text-align: center;
      margin: 32px 0;
    }
    
    .divider {
      height: 1px;
      background-color: ${BRAND_COLORS.border};
      margin: 32px 0;
    }
    
    .footer {
      font-size: 14px;
      color: ${BRAND_COLORS.textMuted};
      text-align: center;
      margin-top: 24px;
    }
    
    .footer a {
      color: ${BRAND_COLORS.primary};
      text-decoration: none;
    }
    
    .highlight {
      color: ${BRAND_COLORS.primary};
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="preheader">${content.preheader}</div>
  <div class="container">
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
</body>
</html>
  `;
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
      body: `<p>${inviterName} has invited you to collaborate on <strong>${projectName}</strong> using Mapit.</p>`,
      ctaText: 'View Project',
      ctaUrl: inviteLink,
      footer: 'If you did not expect this invitation, you can safely ignore this email.',
    });

    const { error } = await resend.emails.send({
      from: 'Mapit <noreply@skyveedrones.com>',
      to: [to],
      replyTo: 'support@skyveedrones.com',
      subject: `${inviterName} invited you to "${projectName}" on Mapit`,
      html,
      headers: {
        'X-Entity-Ref-ID': `project-invite-${Date.now()}`,
        'X-Mailer': 'Mapit/1.0',
      },
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
      body: `<p>You now have access to <strong>${projectName}</strong> on Mapit. You can start viewing and collaborating on this project right away.</p>`,
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
      headers: {
        'X-Entity-Ref-ID': `project-welcome-${Date.now()}`,
        'X-Mailer': 'Mapit/1.0',
      },
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
      body: `<p>This is a test email from Mapit to verify that your email configuration is working correctly.</p><p>If you received this email, your email authentication (SPF, DKIM, DMARC) is properly configured.</p>`,
      footer: 'This is an automated test email. No action is required.',
    });

    const { error } = await resend.emails.send({
      from: 'Mapit <noreply@skyveedrones.com>',
      to: [to],
      replyTo: 'support@skyveedrones.com',
      subject: 'Mapit Test Email - Configuration Verified',
      html,
      headers: {
        'X-Entity-Ref-ID': `test-email-${Date.now()}`,
        'X-Mailer': 'Mapit/1.0',
      },
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
      body: `<p>${senderName} has shared a report for <strong>${projectName}</strong> with you.</p><p>Click the button below to view the report.</p>`,
      ctaText: 'View Report',
      ctaUrl: reportUrl,
      footer: 'Questions about this report? Contact the sender or our support team.',
    });

    const { error } = await resend.emails.send({
      from: 'Mapit <noreply@skyveedrones.com>',
      to: [to],
      replyTo: 'support@skyveedrones.com',
      subject: `${senderName} shared a report for "${projectName}"`,
      html,
      headers: {
        'X-Entity-Ref-ID': `report-email-${Date.now()}`,
        'X-Mailer': 'Mapit/1.0',
      },
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
 * Send client portal invitation email
 */
export async function sendClientInvitationEmail(params: {
  to: string;
  clientName: string;
  inviterName: string;
  inviteLink: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, clientName, inviterName, inviteLink } = params;

  try {
    const html = generateEmailTemplate({
      preheader: `${inviterName} invited you to the ${clientName} portal`,
      title: `You're invited to the ${clientName} portal`,
      body: `<p>${inviterName} has invited you to access the <strong>${clientName}</strong> client portal on Mapit.</p><p>You'll be able to view and manage projects related to ${clientName}.</p>`,
      ctaText: 'Accept Invitation',
      ctaUrl: inviteLink,
      footer: 'If you did not expect this invitation, you can safely ignore this email.',
    });

    const { error } = await resend.emails.send({
      from: 'Mapit <noreply@skyveedrones.com>',
      to: [to],
      replyTo: 'support@skyveedrones.com',
      subject: `${inviterName} invited you to the ${clientName} portal on Mapit`,
      html,
      headers: {
        'X-Entity-Ref-ID': `client-invite-${Date.now()}`,
        'X-Mailer': 'Mapit/1.0',
      },
    });

    if (error) {
      console.error('[Email] Failed to send client invitation to', to, ':', error);
      return { success: false, error: error.message };
    }

    console.log('[Email] Client invitation email sent to', to);
    return { success: true };
  } catch (err) {
    console.error('[Email] Exception sending client invitation:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Send client portal welcome email
 */
export async function sendClientWelcomeEmail(params: {
  to: string;
  clientName: string;
  portalLink: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, clientName, portalLink } = params;

  try {
    const html = generateEmailTemplate({
      preheader: `Welcome to the ${clientName} portal on Mapit`,
      title: `Welcome to the ${clientName} portal`,
      body: `<p>Welcome to the <strong>${clientName}</strong> client portal on Mapit!</p><p>You can now access and view all projects associated with ${clientName}. Use the portal to stay updated on project progress, view media, and download reports.</p>`,
      ctaText: 'Access Portal',
      ctaUrl: portalLink,
      footer: 'Questions? Contact our support team at support@skyveedrones.com',
    });

    const { error } = await resend.emails.send({
      from: 'Mapit <noreply@skyveedrones.com>',
      to: [to],
      replyTo: 'support@skyveedrones.com',
      subject: `Welcome to Mapit - ${clientName} Client Portal Access`,
      html,
      headers: {
        'X-Entity-Ref-ID': `client-welcome-${Date.now()}`,
        'X-Mailer': 'Mapit/1.0',
      },
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

/**
 * Send email when user is added to a project
 */
export async function sendProjectAddedEmail(params: {
  to: string;
  projectName: string;
  projectLink: string;
  addedByName: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, projectName, projectLink, addedByName } = params;

  try {
    const html = generateEmailTemplate({
      preheader: `You've been added to ${projectName}`,
      title: `You've been added to ${projectName}`,
      body: `<p>${addedByName} has added you to the <strong>${projectName}</strong> project on Mapit.</p><p>You can now view and collaborate on this project.</p>`,
      ctaText: 'View Project',
      ctaUrl: projectLink,
      footer: 'Questions? Contact our support team at support@skyveedrones.com',
    });

    const { error } = await resend.emails.send({
      from: 'Mapit <noreply@skyveedrones.com>',
      to: [to],
      replyTo: 'support@skyveedrones.com',
      subject: `You've been added to "${projectName}" on Mapit`,
      html,
      headers: {
        'X-Entity-Ref-ID': `project-added-${Date.now()}`,
        'X-Mailer': 'Mapit/1.0',
      },
    });

    if (error) {
      console.error('[Email] Failed to send project added email to', to, ':', error);
      return { success: false, error: error.message };
    }

    console.log('[Email] Project added email sent to', to);
    return { success: true };
  } catch (err) {
    console.error('[Email] Exception sending project added email:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
