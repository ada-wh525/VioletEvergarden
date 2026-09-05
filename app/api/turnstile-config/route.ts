import { env } from "cloudflare:workers";

const DEFAULT_TURNSTILE_SITE_KEY = "0x4AAAAAAEphiFF6JnrMGZX9";

export async function GET() {
  const runtime = env as unknown as { TURNSTILE_SITE_KEY?: string };
  const siteKey = runtime.TURNSTILE_SITE_KEY?.trim() || DEFAULT_TURNSTILE_SITE_KEY;

  return Response.json({ siteKey }, { headers: { "cache-control": "no-store" } });
}
