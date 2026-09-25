import { handleLogin } from "../../server/handlers.ts";

interface PagesContext {
  request: Request;
  env: { DASHBOARD_PASSWORD?: string };
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  return handleLogin(context.request, context.env.DASHBOARD_PASSWORD);
}
