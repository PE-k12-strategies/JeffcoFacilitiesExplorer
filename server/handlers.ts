import {
  COOKIE_NAME,
  isFacilityFile,
  isValidSession,
  jsonResponse,
  makeSessionToken,
  parseCookie,
  passwordFromBasicAuth,
  passwordsMatch,
  sessionCookieHeader,
} from "./auth.ts";

export function isSecureRequest(request: Request): boolean {
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}

function configuredPassword(envPassword: string | undefined): string {
  return envPassword?.trim() ?? "";
}

export async function handleLogin(request: Request, envPassword: string | undefined): Promise<Response> {
  const password = configuredPassword(envPassword);
  if (!password) {
    return jsonResponse({ error: "DASHBOARD_PASSWORD is not configured" }, { status: 503 });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  let submitted = "";
  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as { password?: unknown };
      submitted = typeof body.password === "string" ? body.password : "";
    } else {
      const form = await request.formData();
      const value = form.get("password");
      submitted = typeof value === "string" ? value : "";
    }
  } catch {
    return jsonResponse({ error: "Invalid request" }, { status: 400 });
  }

  if (!(await passwordsMatch(submitted, password))) {
    return jsonResponse({ error: "That password is not correct." }, { status: 401 });
  }

  const token = await makeSessionToken(password);
  return jsonResponse(
    { ok: true },
    {
      status: 200,
      headers: {
        "Set-Cookie": sessionCookieHeader(token, isSecureRequest(request)),
      },
    },
  );
}

export async function handleSession(request: Request, envPassword: string | undefined): Promise<Response> {
  const password = configuredPassword(envPassword);
  const token = parseCookie(request.headers.get("cookie"), COOKIE_NAME);
  if (!(await isValidSession(token, password))) {
    return jsonResponse({ ok: false }, { status: 401 });
  }
  return jsonResponse({ ok: true }, { status: 200 });
}

export function unauthorizedResponse(): Response {
  return new Response("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Jeffco Facilities Explorer"',
      "Cache-Control": "no-store",
    },
  });
}

export async function requireSession(
  request: Request,
  envPassword: string | undefined,
): Promise<Response | null> {
  const password = configuredPassword(envPassword);
  if (!password) return null;

  const token = parseCookie(request.headers.get("cookie"), COOKIE_NAME);
  if (await isValidSession(token, password)) return null;

  const basic = passwordFromBasicAuth(request.headers.get("authorization"));
  if (basic && (await passwordsMatch(basic, password))) return null;

  return unauthorizedResponse();
}

export function facilityFileFromPath(pathname: string): string | null {
  const match = pathname.match(/\/api\/data\/([^/]+)$/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

export function dataNotFound(): Response {
  return jsonResponse({ error: "Not found" }, { status: 404 });
}

export function gatedJson(body: unknown, filename: string): Response {
  const geo = filename.endsWith(".geojson");
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": geo
        ? "application/geo+json; charset=utf-8"
        : "application/json; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export { isFacilityFile };
