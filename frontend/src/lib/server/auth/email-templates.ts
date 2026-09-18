// Source: RESEARCH.md Pattern 19 — D-15/D-16 email template factories.
// English by default (per D-15) — fork-edit to localize.
// Plain HTML (per D-16) — no MJML / React Email; per-project may swap.
//
// Phase 5's email-queue cron consumes outbox `email.*` events and calls these
// factories to produce the EmailJob row. Phase 1 just defines the factories
// and emits the outbox events.
//
// WR-03 — Defense-in-depth: ALL interpolated values in HTML strings MUST
// flow through `htmlEscape()`. The verification code is currently constrained
// to `[A-Z2-9]{8}` upstream (VERIFICATION_CODE_REGEX), so XSS is impossible
// today. But the function signature accepts `string` and future templates
// (e.g. password-changed notifications including the user's display name)
// will reuse this pattern — escape at the source so a careless add can't
// inject HTML. Plain-text body has no HTML interpretation, so no escape
// needed there.
//
// O1 audit fix — `expiresAt` is now threaded from the outbox payload so the
// rendered TTL matches `AUTH_VERIFICATION_TTL_MIN` (was hardcoded "15 minutes"
// which lied when operators tuned the env var).
import 'server-only';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface VerificationEmailArgs {
  code: string;
  email: string;
  /** Optional ISO-8601 expiry; falls back to "soon" wording when omitted. */
  expiresAt?: string;
}

export interface ResetPasswordEmailArgs {
  code: string;
  email: string;
  /** Optional ISO-8601 expiry; falls back to "soon" wording when omitted. */
  expiresAt?: string;
}

/**
 * Minimal HTML escape for template interpolation. Covers the OWASP-recommended
 * five-character set (`& < > " '`). Apply to EVERY user-controlled (or
 * potentially user-controlled) value before interpolating into an HTML
 * template string.
 */
function htmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Render the TTL window as "in N minutes" / "in N hours" — rounds to the
 * unit the user would actually read. Falls back to a vague "soon" when no
 * timestamp is provided or the parse fails (defensive: a malformed payload
 * should never break email rendering).
 *
 * Bias rounding toward the FLOOR so we never overstate the TTL: telling a
 * user "in 15 minutes" when 14m59s remain (and the code is about to expire)
 * leads to a frustrating retry loop. Floor it to "in 14 minutes" — they may
 * be earlier than promised, never later.
 */
function ttlWording(expiresAtIso: string | undefined): string {
  if (!expiresAtIso) return 'soon';
  const expiresMs = Date.parse(expiresAtIso);
  if (Number.isNaN(expiresMs)) return 'soon';
  const remainingMs = expiresMs - Date.now();
  if (remainingMs <= 0) return 'soon'; // expired by the time we render; pre-cron drift
  const minutes = Math.floor(remainingMs / 60_000);
  if (minutes < 1) return 'in less than a minute';
  if (minutes < 60) return `in ${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.floor(minutes / 60);
  return `in ${hours} hour${hours === 1 ? '' : 's'}`;
}

/**
 * Shared code-email shell — a self-contained (no external images/fonts, no
 * `<style>` block) HTML document so it renders consistently across Gmail /
 * Outlook / Apple Mail. The code sits alone on its own line in a bordered,
 * monospace, letter-spaced box: triple-click or double-click-drag selects
 * exactly the code and nothing else (the earlier `<strong>code</strong>`
 * inline in a sentence made a clean selection nearly impossible — Gmail's
 * "Hi, Your verification code is FEBFKBMD. It expires…" ran the code into
 * the surrounding punctuation).
 */
function codeEmailHtml(args: { heading: string; lead: string; code: string; ttl: string }): string {
  const { heading, lead, code, ttl } = args;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>${heading}</title>
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
          <p style="margin:0 0 4px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#047857;">${heading}</p>
          <p style="margin:12px 0 20px;font-size:14px;line-height:1.6;color:#44403c;">${lead}</p>
          <div style="margin:0 0 20px;padding:16px;background-color:#f5f5f4;border:1px solid #e7e5e4;border-radius:12px;text-align:center;">
            <span style="display:inline-block;font-family:'SF Mono',SFMono-Regular,Consolas,'Liberation Mono',Menlo,monospace;font-size:28px;font-weight:700;letter-spacing:0.28em;color:#0f172a;">${code}</span>
          </div>
          <p style="margin:0;font-size:13px;line-height:1.6;color:#78716c;">This code expires ${ttl}. If you did not request this, you can safely ignore this email.</p>
        </td>
      </tr>
      <tr>
        <td style="padding-top:20px;text-align:center;">
          <p style="margin:0;font-size:11px;line-height:1.6;color:#a8a29e;">Sent by Goshen &mdash; église, gestion financière.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function verificationEmail(args: VerificationEmailArgs): EmailTemplate {
  const code = htmlEscape(args.code);
  const ttl = ttlWording(args.expiresAt);
  return {
    subject: 'Verify your email',
    html: codeEmailHtml({
      heading: 'Confirm your email address',
      lead: 'Enter this code to finish creating your account:',
      code,
      ttl,
    }),
    text: `Your verification code is ${args.code}. It expires ${ttl}. If you did not request this, ignore this email.`,
  };
}

export function resetPasswordEmail(args: ResetPasswordEmailArgs): EmailTemplate {
  const code = htmlEscape(args.code);
  const ttl = ttlWording(args.expiresAt);
  return {
    subject: 'Reset your password',
    html: codeEmailHtml({
      heading: 'Reset your password',
      lead: 'Enter this code to choose a new password:',
      code,
      ttl,
    }),
    text: `Your password reset code is ${args.code}. It expires ${ttl}. If you did not request this, ignore this email.`,
  };
}
