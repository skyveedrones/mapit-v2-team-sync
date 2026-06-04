import { sendEmail } from './_core/email';

export async function sendUserInvitationEmail(params: {
  email: string;
  token: string;
  temporaryPassword: string;
  invitedByName: string;
  expiresAt: Date;
}): Promise<void> {
  const { email, token, temporaryPassword, invitedByName, expiresAt } = params;
  
  // Build the invitation link
  const invitationUrl = `${process.env.VITE_FRONTEND_URL || 'https://mapit.skyveedrones.com'}/accept-invitation?token=${token}`;
  
  const htmlContent = generateUserInvitationEmailHTML({
    email,
    invitationUrl,
    temporaryPassword,
    invitedByName,
    expiresAt,
  });

  await sendEmail({
    to: email,
    subject: `You're Invited to MAPit - Set Up Your Account`,
    html: htmlContent,
  });
}

function generateUserInvitationEmailHTML(params: {
  email: string;
  invitationUrl: string;
  temporaryPassword: string;
  invitedByName: string;
  expiresAt: Date;
}): string {
  const { email, invitationUrl, temporaryPassword, invitedByName, expiresAt } = params;
  const expirationDate = new Date(expiresAt).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited to MAPit</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #09323B;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #0a1f26; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #117660 0%, #04B16F 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: 2px;">
                MAP<span style="color: #14E114;">i</span>T
              </h1>
              <p style="margin: 10px 0 0 0; color: #e0f2f1; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                Drone Mapping Platform
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px; color: #e0e0e0;">
              <h2 style="margin: 0 0 20px 0; color: #04B16F; font-size: 24px; font-weight: 600;">
                Welcome to MAPit!
              </h2>
              
              <p style="margin: 0 0 20px 0; line-height: 1.6; font-size: 16px; color: #b0b0b0;">
                <strong style="color: #ffffff;">${invitedByName}</strong> has invited you to join their MAPit workspace. You're just one click away from accessing powerful drone mapping tools.
              </p>

              <!-- Temporary Password Box -->
              <div style="background-color: #051419; border: 1px solid #117660; border-radius: 8px; padding: 20px; margin: 0 0 30px 0;">
                <p style="margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase; color: #04B16F; font-weight: 600; letter-spacing: 1px;">
                  Your Temporary Password
                </p>
                <p style="margin: 0; font-size: 18px; font-family: 'Courier New', monospace; color: #ffffff; font-weight: 600; letter-spacing: 2px; word-break: break-all;">
                  ${temporaryPassword}
                </p>
                <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">
                  You'll be prompted to change this after clicking the link below.
                </p>
              </div>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin: 0 0 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${invitationUrl}" style="display: inline-block; background: linear-gradient(135deg, #117660 0%, #04B16F 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px; transition: opacity 0.2s;">
                      Accept Invitation & Set Up Account
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Alternative Link -->
              <p style="margin: 0 0 20px 0; font-size: 13px; color: #999; text-align: center;">
                Or copy this link: <br>
                <span style="color: #04B16F; word-break: break-all;">${invitationUrl}</span>
              </p>

              <!-- Info Box -->
              <div style="background-color: #051419; border: 1px solid #333; border-radius: 8px; padding: 15px; margin: 0 0 20px 0;">
                <p style="margin: 0; font-size: 13px; color: #999; line-height: 1.5;">
                  <strong style="color: #b0b0b0;">⏰ This invitation expires on ${expirationDate}</strong><br>
                  If you don't accept by then, you'll need to request a new invitation.
                </p>
              </div>

              <!-- Footer -->
              <p style="margin: 20px 0 0 0; padding-top: 20px; border-top: 1px solid #333; font-size: 12px; color: #666; line-height: 1.5;">
                Questions? Contact your workspace administrator or reply to this email.<br>
                <br>
                © 2026 MAPit. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
