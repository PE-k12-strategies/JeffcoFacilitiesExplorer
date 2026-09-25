import type { ArticulationCollection, ExplorerData } from "../types";

/**
 * Facility JSON is read through /api/data. When DASHBOARD_PASSWORD is set, the
 * server requires HTTP Basic auth (or a session cookie). Do not fetch
 * private/data from the browser, and do not wire supabase-js here.
 */
async function fetchJson<T>(file: string, label: string): Promise<T> {
  const response = await fetch(`/api/data/${file}`, { credentials: "include" });
  if (!response.ok) {
    throw new Error(`Unable to load ${label} (${response.status})`);
  }
  return response.json() as Promise<T>;
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
