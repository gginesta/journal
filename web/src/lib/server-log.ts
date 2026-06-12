// Structured failure logging for API routes, visible in Vercel logs.
// Log route, status, and error class only — never journal content.
export function logApiFailure(route: string, status: number, message: string, context: Record<string, string | undefined> = {}) {
  const tags = Object.entries(context)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");
  console.error(`[api] ${route} status=${status} ${tags ? `${tags} ` : ""}error=${message}`);
}
