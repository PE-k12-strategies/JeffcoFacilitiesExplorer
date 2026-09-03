import type { ArticulationCollection, ExplorerData } from "../types";
import { assetUrls } from "../lib/assetUrl";

/**
 * Local JSON today; swap this function when the Supabase API is ready.
 * Set VITE_API_BASE_URL to load from an HTTP endpoint that returns the same shape.
 */
async function fetchJson<T>(path: string, label: string): Promise<T> {
  const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "");
  const urls = apiBase ? [`${apiBase}/${path}`] : assetUrls(`data/${path}`);
  let lastStatus = 0;
  for (const url of urls) {
    const response = await fetch(url);
    lastStatus = response.status;
    if (response.ok) return response.json() as Promise<T>;
  }
  throw new Error(`Unable to load ${label} (${lastStatus || 404})`);
}

export function loadExplorerData(): Promise<ExplorerData> {
  return fetchJson<ExplorerData>("schools.json", "facility data");
}

export function loadArticulationAreas(): Promise<ArticulationCollection> {
  return fetchJson<ArticulationCollection>(
    "articulation-areas.geojson",
    "articulation areas",
  );
}

export function loadDistrictBoundary(): Promise<ArticulationCollection> {
  return fetchJson<ArticulationCollection>(
    "district-boundary.geojson",
    "district boundary",
  );
}
