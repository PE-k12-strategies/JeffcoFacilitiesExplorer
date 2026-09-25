export const COOKIE_NAME = "jeffco_explorer_session";
export const SESSION_PAYLOAD = "ok";

export const FACILITY_FILES = [
  "schools.json",
  "articulation-areas.geojson",
  "district-boundary.geojson",
] as const;

export type FacilityFile = (typeof FACILITY_FILES)[number];

export function isFacilityFile(name: string): name is FacilityFile {
  return (FACILITY_FILES as readonly string[]).includes(name);
}

export function passwordFromBasicAuth(header: string | null | undefined): string | undefined {
  if (!header) return undefined;
  const [scheme, encoded] = header.split(" ");
  if (!scheme || scheme.toLowerCase() !== "basic" || !encoded) return undefined;
  try {
    const decoded = atob(encoded);
    const colon = decoded.indexOf(":");
    if (colon < 0) return decoded || undefined;
    const username = decoded.slice(0, colon);
    const password = decoded.slice(colon + 1);
    return password || username || undefined;
  } catch {
    return undefined;
  }
}

export function parseCookie(header: string | null | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return undefined;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function makeSessionToken(password: string): Promise<string> {
  const signature = await hmacHex(password, SESSION_PAYLOAD);
  return `${SESSION_PAYLOAD}.${signature}`;
}

export async function isValidSession(
  token: string | undefined,
  password: string,
): Promise<boolean> {
  if (!token || !password) return false;
  const expected = await makeSessionToken(password);
  return safeEqual(token, expected);
}

export async function passwordsMatch(input: string, expected: string): Promise<boolean> {
  if (!expected || !input) return false;
  const [left, right] = await Promise.all([
    hmacHex(expected, input),
    hmacHex(expected, expected),
  ]);
  return safeEqual(left, right);
}

export function sessionCookieHeader(token: string, secure: boolean): string {
  const parts = [`${COOKIE_NAME}=${token}`, "Path=/", "HttpOnly", "SameSite=Lax"];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(body), { ...init, headers });
}
