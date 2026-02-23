import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export type InviteEmailParams = {
  to: string;
  inviterFirstName: string | null;
  inviterLastName: string | null;
  organizationName: string;
  inviteCode: string;
  siteUrl: string;
};

function getTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port: port ? Number(port) : 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  });
}

export function isEmailConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendInviteEmail(params: InviteEmailParams): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) {
    throw new Error('Email is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in your environment.');
  }
  const { to, inviterFirstName, inviterLastName, organizationName, inviteCode, siteUrl } = params;
  const inviterName = [inviterFirstName, inviterLastName].filter(Boolean).join(' ') || 'A team member';
  const signupUrl = `${siteUrl.replace(/\/$/, '')}/signup`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're invited to join ${organizationName}</title>
</head>
<body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;background-color:#f5f5f5;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.08);overflow:hidden;">
    <div style="background:linear-gradient(135deg,#1677ff 0%,#4096ff 100%);padding:28px 24px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:1.5rem;font-weight:600;">You're invited</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:0.95rem;">Join ${organizationName} on the B2B marketplace</p>
    </div>
    <div style="padding:28px 24px;">
      <p style="margin:0 0 16px;color:#333;line-height:1.6;font-size:15px;">
        Hello,
      </p>
      <p style="margin:0 0 20px;color:#333;line-height:1.6;font-size:15px;">
        <strong>${escapeHtml(inviterName)}</strong> from <strong>${escapeHtml(organizationName)}</strong> has invited you to join their organization on our B2B healthcare marketplace as a <strong>Procurement</strong> member.
      </p>
      <p style="margin:0 0 20px;color:#555;line-height:1.6;font-size:15px;">
        As a Procurement user, you will be able to browse the marketplace, add items to your cart, and place orders on behalf of ${escapeHtml(organizationName)}.
      </p>
      <div style="background:#f9fafb;border-radius:8px;padding:16px 20px;margin:24px 0;">
        <p style="margin:0 0 8px;color:#666;font-size:13px;">Your invite code</p>
        <p style="margin:0;font-family:ui-monospace,monospace;font-size:1.25rem;font-weight:600;letter-spacing:2px;color:#1677ff;">${escapeHtml(inviteCode)}</p>
      </div>
      <p style="margin:0 0 24px;color:#555;line-height:1.6;font-size:15px;">
        Click the button below to create your account and join. When signing up, choose <strong>"Join with invite code"</strong> and enter the code above.
      </p>
      <p style="margin:0 0 8px;">
        <a href="${escapeHtml(signupUrl)}" style="display:inline-block;background:#1677ff;color:#fff!important;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px;">Join now</a>
      </p>
      <p style="margin:16px 0 0;color:#999;font-size:13px;">
        Or copy this link: <a href="${escapeHtml(signupUrl)}" style="color:#1677ff;">${escapeHtml(signupUrl)}</a>
      </p>
    </div>
    <div style="padding:16px 24px;background:#fafafa;border-top:1px solid #eee;">
      <p style="margin:0;color:#999;font-size:12px;">
        This invitation was sent by ${escapeHtml(inviterName)}. If you did not expect this email, you can ignore it.
      </p>
    </div>
  </div>
</body>
</html>
`.trim();

  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@example.com';

  await transporter.sendMail({
    from: `"${organizationName}" <${from}>`,
    to,
    subject: `You're invited to join ${organizationName} as Procurement`,
    html,
    text: [
      `Hello,`,
      ``,
      `${inviterName} from ${organizationName} has invited you to join their organization on our B2B healthcare marketplace as a Procurement member.`,
      ``,
      `As a Procurement user, you can browse the marketplace, add items to your cart, and place orders on behalf of ${organizationName}.`,
      ``,
      `Your invite code: ${inviteCode}`,
      ``,
      `Create your account and join here: ${signupUrl}`,
      `When signing up, choose "Join with invite code" and enter the code above.`,
      ``,
      `— ${organizationName}`,
    ].join('\n'),
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
