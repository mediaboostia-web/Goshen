// Notifies a person the moment they're granted SUPERADMIN — platform-wide
// access must never be added silently. Mirrors
// church/member-added-email.ts's branded shell (kept separate: this is a
// platform-admin notification, not a church-domain one).
import 'server-only';

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface SuperadminGrantedEmailArgs {
  loginUrl: string;
  /**
   * Present only when the account had no password at grant time (brand-new
   * account, or an existing OAuth-only one). Without it, a freshly-created
   * account has no way to authenticate at all — no password, no linked
   * OAuth provider. The code is a real PASSWORD_RESET VerificationCode row
   * (same mechanism as /forgot-password), consumed at /reset-password.
   */
  setPasswordCode?: string;
  resetPasswordUrl?: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export function superadminGrantedEmail(args: SuperadminGrantedEmailArgs): EmailTemplate {
  const loginUrl = htmlEscape(args.loginUrl);
  const hasCode = !!args.setPasswordCode;
  const code = hasCode ? htmlEscape(args.setPasswordCode as string) : '';
  const resetUrl = htmlEscape(args.resetPasswordUrl ?? args.loginUrl);

  const actionBlock = hasCode
    ? `<p style="margin:12px 0 20px;font-size:14px;line-height:1.6;color:#44403c;">
            Ce compte n'a pas encore de mot de passe. Rendez-vous sur
            <a href="${resetUrl}" style="color:#0f172a;font-weight:700;">${resetUrl}</a>,
            indiquez cette adresse email et le code ci-dessous pour créer votre mot de passe.
          </p>
          <div style="margin:0 0 20px;padding:16px;background-color:#f5f5f4;border:1px solid #e7e5e4;border-radius:12px;text-align:center;">
            <span style="display:inline-block;font-family:'SF Mono',SFMono-Regular,Consolas,'Liberation Mono',Menlo,monospace;font-size:28px;font-weight:700;letter-spacing:0.28em;color:#0f172a;">${code}</span>
          </div>
          <p style="margin:0 0 20px;font-size:12px;line-height:1.6;color:#78716c;">Ce code expire dans 15 minutes.</p>`
    : `<div style="text-align:center;margin:0 0 8px;">
            <a href="${loginUrl}" style="display:inline-block;background-color:#0f172a;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:10px;">Se connecter</a>
          </div>`;

  const textActionBlock = hasCode
    ? `Ce compte n'a pas encore de mot de passe. Rendez-vous sur ${resetUrl}, indiquez cette adresse email et le code ${args.setPasswordCode} (expire dans 15 minutes) pour créer votre mot de passe.`
    : `Connectez-vous sur ${args.loginUrl}.`;

  return {
    subject: 'Accès SUPERADMIN accordé sur Goshen',
    html: `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>Accès SUPERADMIN accordé</title>
  </head>
  <body style="margin:0;padding:24px 12px;background-color:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;">
      <tr>
        <td style="padding-bottom:20px;text-align:center;">
          <span style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:700;color:#0f172a;letter-spacing:-0.02em;">Goshen</span>
        </td>
      </tr>
      <tr>
        <td style="background-color:#ffffff;border:1px solid #e7e5e4;border-radius:16px;padding:32px 28px;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#b45309;">Accès SUPERADMIN accordé</p>
          <p style="margin:12px 0 20px;font-size:14px;line-height:1.6;color:#44403c;">
            Votre compte vient de recevoir un accès <strong>SUPERADMIN</strong> — administration
            complète de la plateforme Goshen (toutes les églises, tous les utilisateurs).
          </p>
          ${actionBlock}
          <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#78716c;">Si vous ne vous attendiez pas à cet accès, contactez immédiatement un autre administrateur de la plateforme.</p>
        </td>
      </tr>
      <tr>
        <td style="padding-top:20px;text-align:center;">
          <p style="margin:0;font-size:11px;line-height:1.6;color:#a8a29e;">Envoyé par Goshen — église, gestion financière.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    text: `Votre compte vient de recevoir un accès SUPERADMIN sur Goshen. ${textActionBlock} Si vous ne vous attendiez pas à cet accès, contactez immédiatement un autre administrateur de la plateforme.`,
  };
}
