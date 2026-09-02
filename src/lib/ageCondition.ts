import type { School } from "../types";
import { colors } from "./theme";
import { snapshotSchools } from "./peers";

export const FCI_BANDS = ["good", "fair", "poor"] as const;
export type FciBand = (typeof FCI_BANDS)[number];

export const FCI_BAND_META: Record<
  FciBand,
  { label: string; color: string; range: string }
> = {
  good: { label: "Good", color: colors.teal, range: "FCI < 0.05" },
  fair: { label: "Fair", color: colors.orange, range: "FCI 0.05–0.15" },
  poor: { label: "Poor", color: colors.magenta, range: "FCI > 0.15" },
};

export const DECADE_STARTS = [
  1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020,
] as const;

export interface DecadeFciCounts {
  decade: number;
  label: string;
  good: number;
  fair: number;
  poor: number;
  total: number;
}

export function fciBand(fci: number | null | undefined): FciBand | null {
  if (fci == null || Number.isNaN(fci)) return null;
  if (fci < 0.05) return "good";
  if (fci <= 0.15) return "fair";
  return "poor";
}

export function decadeLabel(year: number): string {
  if (year < 1930) return "Pre-1930s";
  return `${Math.floor(year / 10) * 10}s`;
}

export interface AgeConditionStats {
  schools: School[];
  withYearAndFci: number;
  over50Share: number | null;
  fairPoorShare: number | null;
  decades: DecadeFciCounts[];
  maxTotal: number;
}

export function ageConditionStats(allSchools: School[]): AgeConditionStats {
  const schools = snapshotSchools(allSchools);
  const thisYear = new Date().getFullYear();
  const cutoff = thisYear - 50;

  const decades: DecadeFciCounts[] = DECADE_STARTS.map((decade) => ({
    decade,
    label: `${decade}s`,
    good: 0,
    fair: 0,
    poor: 0,
    total: 0,
  }));
  const pre: DecadeFciCounts = {
    decade: 1920,
    label: "Pre-1930s",
    good: 0,
    fair: 0,
    poor: 0,
    total: 0,
  };

  let withYear = 0;
  let over50 = 0;
  let withFci = 0;
  let fairPoor = 0;
  let withYearAndFci = 0;

  for (const school of schools) {
    const band = fciBand(school.fci);
    if (band) {
      withFci += 1;
      if (band !== "good") fairPoor += 1;
    }
    const year = school.yearBuilt;
    if (year == null) continue;
    withYear += 1;
    if (year <= cutoff) over50 += 1;
    if (!band) continue;
    withYearAndFci += 1;
    const bucket = year < 1930 ? pre : decades.find((row) => row.decade === Math.floor(year / 10) * 10);
    if (!bucket) continue;
    bucket[band] += 1;
    bucket.total += 1;
  }

  const rows = pre.total > 0 ? [pre, ...decades] : decades;
  return {
    schools,
    withYearAndFci,
    over50Share: withYear ? over50 / withYear : null,
    fairPoorShare: withFci ? fairPoor / withFci : null,
    decades: rows,
    maxTotal: Math.max(1, ...rows.map((row) => row.total)),
  };
}
