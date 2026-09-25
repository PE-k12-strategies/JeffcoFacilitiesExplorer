/**
 * Facility snapshot is served only from this GET handler.
 * Do not expose Supabase (or any table API) to the browser: keep RLS deny-all
 * for anon/authenticated and, if a warehouse is added later, read with the
 * service role from this server only.
 */
import { isFacilityFile } from "../../../server/auth.ts";
import { dataNotFound, gatedJson, requireSession } from "../../../server/handlers.ts";

interface PagesContext {
  request: Request;
  env: {
    DASHBOARD_PASSWORD?: string;
    ASSETS: { fetch: (request: Request) => Promise<Response> };
  };
  params: { file?: string };
}

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const denied = await requireSession(context.request, context.env.DASHBOARD_PASSWORD);
  if (denied) return denied;

  const file = context.params.file ? decodeURIComponent(context.params.file) : "";
  if (!isFacilityFile(file)) return dataNotFound();

  const assetUrl = new URL(context.request.url);
  assetUrl.pathname = `/__facility/${file}`;
  assetUrl.search = "";
  const asset = await context.env.ASSETS.fetch(new Request(assetUrl, { method: "GET" }));
  if (!asset.ok) return dataNotFound();
  const body: unknown = await asset.json();
  return gatedJson(body, file);
}
