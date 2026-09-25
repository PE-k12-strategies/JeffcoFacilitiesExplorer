import { requireSession } from "../server/handlers.ts";

interface PagesContext {
  request: Request;
  env: { DASHBOARD_PASSWORD?: string };
  next: () => Promise<Response>;
}

export async function onRequest(context: PagesContext): Promise<Response> {
  const path = new URL(context.request.url).pathname;
  if (path === "/__facility" || path.startsWith("/__facility/")) {
    return new Response(null, { status: 404 });
  }

  const denied = await requireSession(context.request, context.env.DASHBOARD_PASSWORD);
  if (denied) return denied;
  return context.next();
}
