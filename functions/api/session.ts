import { handleSession } from "../../server/handlers.ts";

interface PagesContext {
  request: Request;
  env: { DASHBOARD_PASSWORD?: string };
}

export async function onRequestGet(context: PagesContext): Promise<Response> {
  return handleSession(context.request, context.env.DASHBOARD_PASSWORD);
}
