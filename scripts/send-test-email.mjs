import 'dotenv/config';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const BRAND_COLORS = {
  primary: '#10b981',
  background: '#0a0a0a',
  cardBg: '#171717',
  text: '#ffffff',
  textMuted: '#a3a3a3',
  border: '#262626',
};

const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Email</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Orbitron:wght@700&display=swap');
    
    body {
      margin: 0;
      padding: 0;
      background-color: ${BRAND_COLORS.background};
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
    
    .highlight {
      color: ${BRAND_COLORS.primary};
      font-weight: 600;
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
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">
        <span class="logo-text">Sky<span class="logo-accent">Vee</span></span>
      </div>
      
      <h1 class="title">Test Email Successful!</h1>
      
      <div class="body-text">
        <p>Congratulations! Your email configuration is working correctly.</p>
        <p>This test email was sent from your verified domain: <span class="highlight">notifications.skyveedrones.com</span></p>
        <p>You can now send:</p>
        <ul>
          <li>Project invitation emails</li>
          <li>Welcome emails</li>
          <li>Warranty reminder emails</li>
        </ul>
      </div>
      
      <div class="cta-container">
        <a href="https://skyveedrones.com/dashboard" class="cta-button">Go to Dashboard</a>
      </div>
      
      <div class="divider"></div>
      
      <div class="footer">
        <p>This was a test email sent at ${new Date().toLocaleString()}.</p>
        <p style="margin-top: 16px;">— The <a href="https://skyveedrones.com">SkyVee</a> Team</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

async function sendTestEmail() {
  const to = 'clay@skyveedrones.com';
  
  console.log('Sending test email to:', to);
  console.log('Using API key:', process.env.RESEND_API_KEY ? 'Set (hidden)' : 'NOT SET');
  
  try {
    const { data, error } = await resend.emails.send({
      from: 'SkyVee <noreply@notifications.skyveedrones.com>',
      to: [to],
      subject: 'SkyVee Test Email - Configuration Verified',
      html,
    });

    if (error) {
      console.error('Failed to send test email:', error);
      process.exit(1);
    }

    console.log('Test email sent successfully!');
    console.log('Email ID:', data?.id);
  } catch (err) {
    console.error('Error sending test email:', err);
    process.exit(1);
  }
}

sendTestEmail();
