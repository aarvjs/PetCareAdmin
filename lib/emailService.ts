import { Resend } from 'resend';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBWM-Kc_cJmH75vEVMBvBaosvbLAI_62lg",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "pet-clinic-47727.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "pet-clinic-47727",
};

function getClientAuth() {
  const existingApps = getApps();
  const app =
    existingApps.find((a) => a.name === 'EmailServiceClientApp') ||
    initializeApp(firebaseConfig, 'EmailServiceClientApp');
  return getAuth(app);
}

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
  provider?: 'resend' | 'firebase_auth' | 'both' | 'none';
  data?: any;
  error?: string | null;
  message?: string;
  details?: {
    firebaseAuthSuccess: boolean;
    firebaseAuthError?: string | null;
    resendSuccess: boolean;
    resendError?: string | null;
  };
}

/**
 * Dispatches an onboarding invitation to a newly created Admin.
 * Uses a dual-delivery strategy:
 * 1. Firebase Authentication: Dispatches an official, time-limited, secure password-setup/reset link.
 *    Works reliably for all recipient domains with zero domain-verification restrictions.
 * 2. Resend API: Sends a rich branded HTML invitation email if custom domain is verified.
 *    Captures and reports Resend sandbox restrictions instead of silently swallowing errors.
 */
export async function sendAdminInvitationEmail({
  toEmail,
  fullName,
  tempPassword,
  createdByName = 'Super Administrator',
  loginUrl = `${appUrl}/admin-login`,
}: SendAdminInvitationParams): Promise<SendEmailResponse> {
  const targetEmail = toEmail.trim().toLowerCase();
  let firebaseAuthSuccess = false;
  let firebaseAuthError: string | null = null;
  let resendSuccess = false;
  let resendError: string | null = null;
  let resendData: any = null;

  // 1. Dispatch secure, time-limited password setup link via Firebase Auth
  try {
    const auth = getClientAuth();
    await sendPasswordResetEmail(auth, targetEmail, {
      url: loginUrl,
      handleCodeInApp: false,
    });
    firebaseAuthSuccess = true;
    console.log(`[Email Service] Firebase Auth secure setup link dispatched to ${targetEmail}`);
  } catch (fbErr: any) {
    firebaseAuthError = fbErr.message || 'Firebase Auth failed to dispatch setup email';
    console.warn(`[Email Service] Firebase Auth setup email warning for ${targetEmail}:`, fbErr.message);
  }

  // 2. Dispatch branded invitation template via Resend if configured
  const resend = getResendClient();
  if (resend) {
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
                    <td style="color: #25242A; font-weight: 700;">${targetEmail}</td>
                  </tr>
                  ${
                    tempPassword
                      ? `
                  <tr>
                    <td style="color: #777980; font-weight: 600;">Temporary Password:</td>
                    <td style="color: #7567E8; font-weight: 700; font-family: monospace; font-size: 14px;">${tempPassword}</td>
                  </tr>
                  `
                      : `
                  <tr>
                    <td style="color: #777980; font-weight: 600;">Account Password:</td>
                    <td style="color: #0284C7; font-weight: 700; font-size: 12px;">Activation link dispatched to your email</td>
                  </tr>
                  `
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
      const res = await resend.emails.send({
        from: fromEmail,
        to: [targetEmail],
        subject: subject,
        html: htmlContent,
      });

      if (res.error) {
        resendError = res.error.message;
        console.warn(`[Email Service] Resend rejected email to ${targetEmail}:`, res.error.message);
      } else if (res.data?.id) {
        resendSuccess = true;
        resendData = res.data;
        console.log(`[Email Service] Resend branded email delivered to ${targetEmail} (ID: ${res.data.id})`);
      }
    } catch (resendCatchErr: any) {
      resendError = resendCatchErr?.message || 'Resend network error';
      console.warn(`[Email Service] Resend exception for ${targetEmail}:`, resendCatchErr.message);
    }
  } else {
    resendError = 'RESEND_API_KEY is not configured on the server.';
  }

  // Combined result determination
  const details = {
    firebaseAuthSuccess,
    firebaseAuthError,
    resendSuccess,
    resendError,
  };

  if (resendSuccess && firebaseAuthSuccess) {
    return {
      success: true,
      provider: 'both',
      data: resendData,
      message: `Branded invitation email and secure activation link delivered to ${targetEmail}!`,
      details,
    };
  }

  if (resendSuccess) {
    return {
      success: true,
      provider: 'resend',
      data: resendData,
      message: `Branded invitation email delivered to ${targetEmail} via Resend.`,
      details,
    };
  }

  if (firebaseAuthSuccess) {
    const isResendSandbox = resendError?.includes('only send testing emails') || resendError?.includes('verify a domain');
    const note = isResendSandbox
      ? 'Resend sandbox notice: Verify your custom domain at resend.com/domains to send custom branded HTML emails to third-party recipients.'
      : (resendError || 'Resend delivery pending');

    return {
      success: true,
      provider: 'firebase_auth',
      message: `Secure account activation link dispatched to ${targetEmail} via Firebase Authentication! (${note})`,
      details,
    };
  }

  return {
    success: false,
    provider: 'none',
    error: `Failed to deliver email: ${firebaseAuthError || resendError || 'Email delivery service rejected the request.'}`,
    details,
  };
}
