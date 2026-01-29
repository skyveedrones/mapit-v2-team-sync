import { Resend } from 'resend';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// SkyVee brand colors
const BRAND_COLORS = {
  primary: '#10b981', // Emerald green
  background: '#0a0a0a',
  cardBg: '#171717',
  text: '#ffffff',
  textMuted: '#a3a3a3',
  border: '#262626',
};

/**
 * Generate the SkyVee branded email HTML template
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
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    
    .preheader {
      display: none !important;
      visibility: hidden;
      opacity: 0;
      color: transparent;
      height: 0;
      width: 0;
    }
    
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    
    .card {
      background-color: ${BRAND_COLORS.cardBg};
      border: 1px solid ${BRAND_COLORS.border};
      border-radius: 12px;
      padding: 40px;
    }
    
    .logo {
      text-align: center;
      margin-bottom: 32px;
    }
    
    .logo-text {
      font-family: 'Orbitron', sans-serif;
      font-size: 28px;
      font-weight: 700;
      color: ${BRAND_COLORS.text};
      text-decoration: none;
    }
    
    .logo-accent {
      color: ${BRAND_COLORS.primary};
    }
    
    .title {
      font-size: 24px;
      font-weight: 600;
      color: ${BRAND_COLORS.text};
      text-align: center;
      margin: 0 0 24px 0;
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
  <span class="preheader">${content.preheader}</span>
  
  <div class="container">
    <div class="card">
      <!-- Logo -->
      <div class="logo">
        <span class="logo-text">Sky<span class="logo-accent">Vee</span></span>
      </div>
      
      <!-- Title -->
      <h1 class="title">${content.title}</h1>
      
      <!-- Body -->
      <div class="body-text">
        ${content.body}
      </div>
      
      ${content.ctaText && content.ctaUrl ? `
      <!-- CTA Button -->
      <div class="cta-container">
        <a href="${content.ctaUrl}" class="cta-button">${content.ctaText}</a>
      </div>
      ` : ''}
      
      <div class="divider"></div>
      
      <!-- Footer -->
      <div class="footer">
        ${content.footer || `
        <p>This email was sent by <a href="https://skyveedrones.com">SkyVee Drone Mapping</a>.</p>
        <p>If you didn't expect this email, you can safely ignore it.</p>
        `}
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Send a project invitation email
 */
export async function sendProjectInvitationEmail(params: {
  to: string;
  inviterName: string;
  projectName: string;
  role: 'viewer' | 'editor';
  inviteUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, inviterName, projectName, role, inviteUrl } = params;
  
  const roleDescription = role === 'editor' 
    ? 'view and edit' 
    : 'view';
  
  const html = generateEmailTemplate({
    preheader: `${inviterName} has invited you to collaborate on a drone mapping project`,
    title: 'You\'ve Been Invited!',
    body: `
      <p><span class="highlight">${inviterName}</span> has invited you to ${roleDescription} the drone mapping project:</p>
      <p style="font-size: 20px; font-weight: 600; color: ${BRAND_COLORS.text}; text-align: center; margin: 24px 0;">"${projectName}"</p>
      <p>Click the button below to accept the invitation and access the project. You'll need to create an account or sign in if you haven't already.</p>
    `,
    ctaText: 'Accept Invitation',
    ctaUrl: inviteUrl,
    footer: `
      <p>This invitation will expire in 7 days.</p>
      <p>If you don't want to join this project, you can ignore this email.</p>
      <p style="margin-top: 16px;">— The <a href="https://skyveedrones.com">SkyVee</a> Team</p>
    `,
  });

  try {
    const { error } = await resend.emails.send({
      from: 'SkyVee <noreply@notifications.skyveedrones.com>',
      to: [to],
      subject: `${inviterName} invited you to "${projectName}" on SkyVee`,
      html,
    });

    if (error) {
      console.error('[Email] Failed to send invitation:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('[Email] Error sending invitation:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Send a welcome email when invitation is accepted
 */
export async function sendWelcomeEmail(params: {
  to: string;
  userName: string;
  projectName: string;
  projectUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, userName, projectName, projectUrl } = params;
  
  const html = generateEmailTemplate({
    preheader: `Welcome to SkyVee! You now have access to "${projectName}"`,
    title: 'Welcome to SkyVee!',
    body: `
      <p>Hi <span class="highlight">${userName}</span>,</p>
      <p>You've successfully joined the drone mapping project:</p>
      <p style="font-size: 20px; font-weight: 600; color: ${BRAND_COLORS.text}; text-align: center; margin: 24px 0;">"${projectName}"</p>
      <p>You can now access the project's interactive maps, media gallery, and GPS data. Click below to get started!</p>
    `,
    ctaText: 'View Project',
    ctaUrl: projectUrl,
    footer: `
      <p>Need help? Visit our <a href="https://skyveedrones.com/help">Help Center</a>.</p>
      <p style="margin-top: 16px;">— The <a href="https://skyveedrones.com">SkyVee</a> Team</p>
    `,
  });

  try {
    const { error } = await resend.emails.send({
      from: 'SkyVee <noreply@notifications.skyveedrones.com>',
      to: [to],
      subject: `Welcome to SkyVee - You now have access to "${projectName}"`,
      html,
    });

    if (error) {
      console.error('[Email] Failed to send welcome email:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('[Email] Error sending welcome email:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Validate the Resend API key by making a test request
 */
export async function validateResendApiKey(): Promise<{ valid: boolean; error?: string }> {
  try {
    // Try to get API key info - this is a lightweight way to validate the key
    const { data, error } = await resend.apiKeys.list();
    
    if (error) {
      return { valid: false, error: error.message };
    }
    
    return { valid: true };
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Send a test email to verify the configuration
 */
export async function sendTestEmail(params: {
  to: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to } = params;
  
  const html = generateEmailTemplate({
    preheader: 'This is a test email from SkyVee',
    title: 'Test Email Successful!',
    body: `
      <p>Congratulations! Your email configuration is working correctly.</p>
      <p>This test email was sent from your verified domain: <span class="highlight">notifications.skyveedrones.com</span></p>
      <p>You can now send:</p>
      <ul style="color: ${BRAND_COLORS.textMuted}; margin: 16px 0;">
        <li>Project invitation emails</li>
        <li>Welcome emails</li>
        <li>Warranty reminder emails</li>
      </ul>
    `,
    ctaText: 'Go to Dashboard',
    ctaUrl: 'https://skyveedrones.com/dashboard',
    footer: `
      <p>This was a test email sent at ${new Date().toLocaleString()}.</p>
      <p style="margin-top: 16px;">— The <a href="https://skyveedrones.com">SkyVee</a> Team</p>
    `,
  });

  try {
    const { error } = await resend.emails.send({
      from: 'SkyVee <noreply@notifications.skyveedrones.com>',
      to: [to],
      subject: 'SkyVee Test Email - Configuration Verified',
      html,
    });

    if (error) {
      console.error('[Email] Failed to send test email:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('[Email] Error sending test email:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Send a warranty reminder email
 */
export async function sendWarrantyReminderEmail(params: {
  to: string;
  projectName: string;
  projectLocation?: string;
  clientName?: string;
  warrantyStartDate: Date;
  warrantyEndDate: Date;
  monthsRemaining: number;
  customSubject?: string;
  customMessage?: string;
  projectUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  const { 
    to, 
    projectName, 
    projectLocation,
    clientName,
    warrantyStartDate, 
    warrantyEndDate, 
    monthsRemaining,
    customSubject,
    customMessage,
    projectUrl 
  } = params;
  
  const formatDate = (date: Date) => date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const defaultMessage = `
    <p>This is a reminder that the warranty for the following drone mapping project is approaching its expiration:</p>
    <p style="font-size: 20px; font-weight: 600; color: ${BRAND_COLORS.text}; text-align: center; margin: 24px 0;">"${projectName}"</p>
    ${clientName ? `<p><strong>Client:</strong> ${clientName}</p>` : ''}
    ${projectLocation ? `<p><strong>Location:</strong> ${projectLocation}</p>` : ''}
    <p><strong>Warranty Period:</strong> ${formatDate(warrantyStartDate)} - ${formatDate(warrantyEndDate)}</p>
    <p style="font-size: 18px; color: ${monthsRemaining <= 1 ? '#ef4444' : BRAND_COLORS.primary}; font-weight: 600; text-align: center; margin: 24px 0;">
      ${monthsRemaining <= 0 ? 'WARRANTY HAS EXPIRED' : `${monthsRemaining} month${monthsRemaining !== 1 ? 's' : ''} remaining`}
    </p>
    <p>Please review the project and take any necessary action before the warranty expires.</p>
  `;

  const html = generateEmailTemplate({
    preheader: `Warranty reminder for "${projectName}" - ${monthsRemaining} months remaining`,
    title: 'Warranty Reminder',
    body: customMessage || defaultMessage,
    ctaText: 'View Project',
    ctaUrl: projectUrl,
    footer: `
      <p>This is an automated warranty reminder from SkyVee.</p>
      <p>To manage your reminder settings, visit the project settings.</p>
      <p style="margin-top: 16px;">— The <a href="https://skyveedrones.com">SkyVee</a> Team</p>
    `,
  });

  const subject = customSubject || `Warranty Reminder: "${projectName}" - ${monthsRemaining} month${monthsRemaining !== 1 ? 's' : ''} remaining`;

  try {
    const { error } = await resend.emails.send({
      from: 'SkyVee <noreply@notifications.skyveedrones.com>',
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error('[Email] Failed to send warranty reminder:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('[Email] Error sending warranty reminder:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
