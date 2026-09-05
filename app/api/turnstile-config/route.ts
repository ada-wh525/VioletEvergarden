import { env } from "cloudflare:workers";

export async function GET() {
  const runtime = env as unknown as { TURNSTILE_SITE_KEY?: string };
  const siteKey = runtime.TURNSTILE_SITE_KEY?.trim();

  if (!siteKey) {
    return Response.json(
      { error: "verification service is not configured" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }

  return Response.json({ siteKey }, { headers: { "cache-control": "no-store" } });
}
