const READER_COOKIE = "violet_reader_id";
const MAX_AGE = 60 * 60 * 24 * 365;

function readCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  for (const item of cookieHeader.split(";")) {
    const [key, ...parts] = item.trim().split("=");
    if (key === name) return decodeURIComponent(parts.join("="));
  }
  return null;
}

export function getReaderIdentity(request: Request) {
  const existing = readCookie(request, READER_COOKIE);
  if (existing && /^[a-f0-9-]{36}$/i.test(existing)) {
    return { visitorId: existing, cookie: null };
  }

  const visitorId = crypto.randomUUID();
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  const cookie = `${READER_COOKIE}=${encodeURIComponent(visitorId)}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; SameSite=Lax${secure}`;
  return { visitorId, cookie };
}
