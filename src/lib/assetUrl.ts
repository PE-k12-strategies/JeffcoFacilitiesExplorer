/** Site-root path for Vite dev, Live Server, and GitHub Pages.
 *  Vite copies `public/` into `bundle/`, and `index.html` loads JS from there. */
export function assetUrl(path: string): string {
  const clean = path.replace(/^\//, "");
  if (import.meta.env.DEV) return `/${clean}`;
  return new URL(`bundle/${clean}`, document.baseURI).href;
}

/** Production first tries `bundle/`, then `public/` (GitHub Pages / older deploys). */
export function assetUrls(path: string): string[] {
  const clean = path.replace(/^\//, "");
  if (import.meta.env.DEV) return [`/${clean}`];
  const base = document.baseURI;
  return [
    new URL(`bundle/${clean}`, base).href,
    new URL(`public/${clean}`, base).href,
  ];
}
