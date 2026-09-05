import { env } from "cloudflare:workers";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TURNSTILE_ACTION = "submit_letter";

type TurnstileResult = {
  success?: boolean;
  action?: string;
  hostname?: string;
  "error-codes"?: string[];
};

export type TurnstileVerification =
  | { ok: true }
  | { ok: false; reason: "unavailable" | "invalid" };

export async function verifyTurnstile(token: unknown, request: Request): Promise<TurnstileVerification> {
  const runtime = env as unknown as { TURNSTILE_SECRET_KEY?: string };
  const secret = runtime.TURNSTILE_SECRET_KEY?.trim();

  if (!secret) return { ok: false, reason: "unavailable" };
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) {
    return { ok: false, reason: "invalid" };
  }

  const body = new FormData();
  body.set("secret", secret);
  body.set("response", token);
  body.set("idempotency_key", crypto.randomUUID());

  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return { ok: false, reason: "unavailable" };

    const result = (await response.json()) as TurnstileResult;
    const requestHostname = new URL(request.url).hostname;
    const validHostname = result.hostname === requestHostname;

    if (result.success && result.action === TURNSTILE_ACTION && validHostname) {
      return { ok: true };
    }
    return { ok: false, reason: "invalid" };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
