import { Resend } from 'resend';

const fromEmail = process.env.RESEND_FROM_EMAIL || 'Healthy Paws Pet Clinic <onboarding@resend.dev>';
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key || key.trim() === '') return null;
  try {
    return new Resend(key);
  } catch (e) {
    return null;
  }
}

export interface SendAdminInvitationParams {
  toEmail: string;
  fullName: string;
  tempPassword?: string;
  createdByName?: string;
  loginUrl?: string;
}

export interface SendEmailResponse {
  success: boolean;
  data?: any;
  error?: string | null;
}

export async function sendAdminInvitationEmail({
  toEmail,
  fullName,
  tempPassword,
  createdByName = 'Super Admin',
  loginUrl = `${appUrl}/admin-login`,
}: SendAdminInvitationParams): Promise<SendEmailResponse> {
  const resend = getResendClient();

  if (!resend) {
    console.error('[Email Service] Missing or unconfigured RESEND_API_KEY environment variable.');
    return {
      success: false,
      error: 'RESEND_API_KEY is not configured on the server.',
    };
  }

  const subject = `You're invited to Healthy Paws Pet Clinic Admin Portal`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAFCFD; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #25242A;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FAFCFD; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 24px; border: 1px solid #E8ECF0; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #7567E8 0%, #8ED8F8 100%); padding: 32px 40px; text-align: left;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="display: inline-block; background-color: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 50px; color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">
                      🐾 Healthy Paws Pet Clinic
                    </div>
                    <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 12px 0 4px 0;">
                      Welcome to the Admin Portal
                    </h1>
                    <p style="color: rgba(255,255,255,0.9); font-size: 13px; margin: 0; font-weight: 500;">
                      Store & Clinic Operations Workspace
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="font-size: 15px; font-weight: 700; color: #25242A; margin-top: 0;">
                Hello ${fullName},
              </p>
              <p style="font-size: 13px; line-height: 1.6; color: #777980; margin-bottom: 24px;">
                You have been provisioned an administrator account for <strong>Healthy Paws Pet Clinic</strong> by ${createdByName}. You now have access to manage store inventory, orders, customer profiles, and clinic operations.
              </p>

              <!-- Credentials Box -->
              <div style="background-color: #EAF8FE; border: 1px solid rgba(142, 216, 248, 0.5); border-radius: 16px; padding: 20px; margin-bottom: 28px;">
                <p style="font-size: 11px; font-weight: 800; color: #0284C7; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px 0;">
                  🔑 Your Login Credentials
                </p>
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="4" style="font-size: 13px;">
                  <tr>
                    <td width="110" style="color: #777980; font-weight: 600;">Login ID:</td>
                    <td style="color: #25242A; font-weight: 700;">${toEmail}</td>
                  </tr>
                  ${
                    tempPassword
                      ? `
                  <tr>
                    <td style="color: #777980; font-weight: 600;">Temporary Password:</td>
                    <td style="color: #7567E8; font-weight: 700; font-family: monospace; font-size: 14px;">${tempPassword}</td>
                  </tr>
                  `
                      : ''
                  }
                </table>
              </div>

              <!-- Call to Action Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${loginUrl}" target="_blank" style="display: inline-block; background-color: #7567E8; color: #ffffff; font-size: 13px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 14px; box-shadow: 0 4px 12px rgba(117, 103, 232, 0.3);">
                  Sign In to Admin Portal →
                </a>
              </div>

              <p style="font-size: 12px; line-height: 1.5; color: #777980; margin-top: 24px; border-top: 1px solid #E8ECF0; padding-top: 20px;">
                <strong>Security Notice:</strong> Please sign in and update your password immediately upon first login. If you did not expect this invitation, please contact your Super Administrator.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #FAFCFD; border-top: 1px solid #E8ECF0; padding: 20px 40px; text-align: center; font-size: 11px; color: #777980;">
              © 2026 Healthy Paws Pet Clinic • Central Ecosystem Management
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  try {
    const data = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      subject: subject,
      html: htmlContent,
    });

    return {
      success: true,
      data,
      error: null,
    };
  } catch (error: any) {
    console.error('[Email Service] Failed to send email via Resend:', error);
    return {
      success: false,
      error: error?.message || 'Failed to deliver invitation email via Resend.',
    };
  }
}
