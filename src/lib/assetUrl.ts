/** Site-root path that works in Vite dev (`/data/...`) and Live Server (`./public/data/...`). */
export function assetUrl(path: string): string {
  const clean = path.replace(/^\//, "");
  if (import.meta.env.DEV) return `/${clean}`;
  return new URL(`public/${clean}`, document.baseURI).href;
}
