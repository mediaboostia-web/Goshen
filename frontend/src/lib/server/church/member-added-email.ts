// Notifies a person the moment a pastor grants them a role on a church —
// so access is never silently added without the recipient knowing. Mirrors
// the branded shell in ../auth/email-templates.ts (kept separate: this is a
// church-domain notification, not an auth code email).
import 'server-only';

const ROLE_LABELS: Record<string, string> = {
  PASTOR: 'Pasteur',
  TREASURER: 'Trésorier',
  SECRETARY: 'Secrétaire',
  AUDITOR: 'Commissaire aux comptes',
};

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface MemberAddedEmailArgs {
  churchName: string;
  role: string;
  loginUrl: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export function memberAddedEmail(args: MemberAddedEmailArgs): EmailTemplate {
  const churchName = htmlEscape(args.churchName);
  const roleLabel = htmlEscape(ROLE_LABELS[args.role] ?? args.role);
  const loginUrl = htmlEscape(args.loginUrl);

  return {
    subject: `Vous avez été ajouté à ${args.churchName} sur Goshen`,
    html: `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>Accès accordé</title>
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
          <p style="margin:0 0 4px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#047857;">Accès accordé</p>
          <p style="margin:12px 0 20px;font-size:14px;line-height:1.6;color:#44403c;">
            Vous venez d’être ajouté à <strong>${churchName}</strong> avec le rôle
            <strong>${roleLabel}</strong>.
          </p>
          <p style="margin:0 0 20px;font-size:13px;line-height:1.6;color:#57534e;">
            Connectez-vous avec cette adresse email pour accéder à la comptabilité de l’église.
            Si vous n’avez pas encore de mot de passe, utilisez « Mot de passe oublié » sur la page
            de connexion pour en créer un.
          </p>
          <div style="text-align:center;margin:0 0 8px;">
            <a href="${loginUrl}" style="display:inline-block;background-color:#065f46;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:10px;">Se connecter</a>
          </div>
          <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#78716c;">Si vous ne vous attendiez pas à cet accès, contactez le responsable de ${churchName} ou ignorez cet email.</p>
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
    text: `Vous avez été ajouté à ${args.churchName} avec le rôle ${ROLE_LABELS[args.role] ?? args.role}. Connectez-vous sur ${args.loginUrl} pour y accéder. Si vous ne vous attendiez pas à cet accès, ignorez cet email.`,
  };
}
