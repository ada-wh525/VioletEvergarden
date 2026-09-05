import { env } from "cloudflare:workers";

const COOKIE_NAME = "violet_admin_session";
const SESSION_SECONDS = 60 * 60 * 12;
const encoder = new TextEncoder();

function getSecret() {
  const runtime = env as unknown as { ADMIN_REVIEW_PASSWORD?: string };
  return runtime.ADMIN_REVIEW_PASSWORD?.trim() ?? "";
}

function readCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  for (const item of cookieHeader.split(";")) {
    const [key, ...parts] = item.trim().split("=");
    if (key === name) return decodeURIComponent(parts.join("="));
  }
  return null;
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function digest(value: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

function secureEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

async function sign(payload: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload))));
}

export async function verifyAdminPassword(password: string) {
  const secret = getSecret();
  if (!secret || password.length > 256) return false;
  return secureEqual(await digest(password), await digest(secret));
}

export async function createAdminSessionCookie(request: Request) {
  const secret = getSecret();
  if (!secret) throw new Error("ADMIN_REVIEW_PASSWORD is not configured");
  const payload = toBase64Url(encoder.encode(JSON.stringify({ expiresAt: Date.now() + SESSION_SECONDS * 1000 })));
  const signature = await sign(payload, secret);
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=${encodeURIComponent(`${payload}.${signature}`)}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; SameSite=Strict${secure}`;
}

export function clearAdminSessionCookie(request: Request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict${secure}`;
}

export async function isAdminRequest(request: Request) {
  const secret = getSecret();
  const token = readCookie(request, COOKIE_NAME);
  if (!secret || !token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  try {
    const expected = await sign(payload, secret);
    if (!secureEqual(encoder.encode(signature), encoder.encode(expected))) return false;
    const data = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as { expiresAt?: number };
    return typeof data.expiresAt === "number" && data.expiresAt > Date.now();
  } catch {
    return false;
  }
}
