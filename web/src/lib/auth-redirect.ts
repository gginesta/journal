export function safeRedirectPath(value: string | null, baseUrl: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/app";

  try {
    const redirectUrl = new URL(value, baseUrl);
    if (redirectUrl.origin !== new URL(baseUrl).origin) return "/app";
    return `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`;
  } catch {
    return "/app";
  }
}
