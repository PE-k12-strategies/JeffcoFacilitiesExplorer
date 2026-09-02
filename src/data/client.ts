import type { ArticulationCollection, ExplorerData } from "../types";
import { assetUrl } from "../lib/assetUrl";

/**
 * Local JSON today; swap this function when the Supabase API is ready.
 * Set VITE_API_BASE_URL to load from an HTTP endpoint that returns the same shape.
 */
export async function loadExplorerData(): Promise<ExplorerData> {
  const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "");
  const url = apiBase ? `${apiBase}/schools` : assetUrl("data/schools.json");
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to load facility data (${response.status})`);
  }
  return response.json() as Promise<ExplorerData>;
}

export async function loadArticulationAreas(): Promise<ArticulationCollection> {
  const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "");
  const url = apiBase
    ? `${apiBase}/articulation-areas`
    : assetUrl("data/articulation-areas.geojson");
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to load articulation areas (${response.status})`);
  }
  return response.json() as Promise<ArticulationCollection>;
}

export async function loadDistrictBoundary(): Promise<ArticulationCollection> {
  const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "");
  const url = apiBase
    ? `${apiBase}/district-boundary`
    : assetUrl("data/district-boundary.geojson");
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to load district boundary (${response.status})`);
  }
  return response.json() as Promise<ArticulationCollection>;
}
