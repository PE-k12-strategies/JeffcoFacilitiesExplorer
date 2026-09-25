/** Images and logos sit beside the built JS (`<root>/assets/app.js`), so the root
 *  is derived from this module's own URL. Cloudflare Pages serves the bundle as the
 *  site root, while Live Server serves it from `bundle/` under the repo root. */
const appRoot = import.meta.env.DEV ? null : new URL("../", import.meta.url).href;

export function assetUrl(path: string): string {
  const clean = path.replace(/^\//, "");
  if (!appRoot) return `/${clean}`;
  return new URL(clean, appRoot).href;
}
