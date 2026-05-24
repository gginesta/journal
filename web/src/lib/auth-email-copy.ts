export const authEmailCopy = {
  subject: "Your Photo Gratitude Journal sign-in link",
  heading: "Open your private journal",
  preview: "Your secure magic link is ready. It works once and expires automatically.",
  buttonLabel: "Open Photo Gratitude Journal",
  fallback: "If the button does not work, copy and paste this link into your browser.",
  safety: "If you did not request this, you can ignore this email."
};

export function magicLinkSentCopy(email: string) {
  const trimmed = email.trim();
  return {
    title: "Check your email",
    body: trimmed
      ? `We sent ${trimmed} a secure Photo Gratitude Journal sign-in link.`
      : "We sent you a secure Photo Gratitude Journal sign-in link.",
    hint: "Open it on this device if you want to continue here."
  };
}

export function supabaseMagicLinkTemplate(siteUrl: string) {
  return {
    subject: authEmailCopy.subject,
    html: `<!doctype html>
<html>
  <body style="margin:0;background:#faf5ed;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#212128;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#faf5ed;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fffdf8;border:1px solid #eaded2;border-radius:28px;overflow:hidden;">
            <tr>
              <td style="padding:32px 28px;">
                <p style="margin:0 0 14px;color:#c7455c;font-size:12px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;">Photo Gratitude Journal</p>
                <h1 style="margin:0;color:#212128;font-size:32px;line-height:1.08;">${authEmailCopy.heading}</h1>
                <p style="margin:16px 0 24px;color:#786e63;font-size:16px;line-height:1.65;">${authEmailCopy.preview}</p>
                <p style="margin:0 0 26px;">
                  <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#c7455c;color:#ffffff;text-decoration:none;font-weight:800;border-radius:999px;padding:14px 22px;">${authEmailCopy.buttonLabel}</a>
                </p>
                <p style="margin:0;color:#786e63;font-size:13px;line-height:1.6;">${authEmailCopy.fallback}</p>
                <p style="word-break:break-all;margin:10px 0 22px;color:#786e63;font-size:12px;line-height:1.55;">{{ .ConfirmationURL }}</p>
                <p style="margin:0;color:#786e63;font-size:12px;line-height:1.55;">${authEmailCopy.safety}</p>
                <p style="margin:22px 0 0;color:#786e63;font-size:12px;line-height:1.55;">Requested for {{ .Email }}. Continue at ${siteUrl}.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
  };
}
