import type { ArticulationCollection, ExplorerData } from "../types";

/**
 * Facility JSON is read through /api/data. When DASHBOARD_PASSWORD is set, the
 * server requires HTTP Basic auth (or a session cookie). Do not fetch
 * private/data from the browser, and do not wire supabase-js here.
 */
async function fetchJson<T>(file: string, label: string, version?: number): Promise<T> {
  const cacheKey = version == null ? "" : `?v=${version}`;
  const response = await fetch(`/api/data/${file}${cacheKey}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Unable to load ${label} (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export function loadExplorerData(version?: number): Promise<ExplorerData> {
  return fetchJson<ExplorerData>("schools.json", "facility data", version);
}

export function loadArticulationAreas(version?: number): Promise<ArticulationCollection> {
  return fetchJson<ArticulationCollection>(
    "articulation-areas.geojson",
    "articulation areas",
    version,
  );
}

export function loadDistrictBoundary(version?: number): Promise<ArticulationCollection> {
  return fetchJson<ArticulationCollection>(
    "district-boundary.geojson",
    "district boundary",
    version,
  );
}
