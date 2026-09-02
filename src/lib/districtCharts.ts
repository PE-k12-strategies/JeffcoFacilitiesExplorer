import type { School } from "../types";
import { DECADE_STARTS } from "./ageCondition";
import { SAFETY_SECURITY_SYSTEM } from "./buildingSystems";
import { snapshotSchools, schoolSpanKind } from "./peers";
import { colors } from "./theme";

/** DataSourceTracker aliases HistoricalEnrollment → 2015Enrollment. Confirm before publishing. */
export const HISTORICAL_ENROLLMENT_YEAR = 2015;
/** CurrEnrollment aliases Enrollment2025 / Enrollment2026. School year 2025–26. */
export const CURRENT_ENROLLMENT_YEAR = 2025;
export const CURRENT_ENROLLMENT_YEAR_LABEL = "2025–26";
/** DataSourceTracker aliases ProjEnrollment_Total → 2030_Total. School year 2030–31. */
export const PROJECTED_ENROLLMENT_YEAR = 2030;
export const PROJECTED_ENROLLMENT_YEAR_LABEL = "2030–31";

/** Column year 2015 in 12 Enrollment Projections is school year 2015–16. */
export function schoolYearLabel(startYear: number): string {
  return `${startYear}–${String(startYear + 1).slice(-2)}`;
}

export function schoolEnrollmentSeries(
  school: Pick<School, "enrollmentByYear" | "historicalEnrollment" | "enrollment" | "projEnrollment">,
): Array<{ year: number; students: number }> {
  const byYear = new Map<number, number>();
  for (const point of school.enrollmentByYear ?? []) {
    byYear.set(point.year, point.students);
  }
  if (school.historicalEnrollment != null && !byYear.has(HISTORICAL_ENROLLMENT_YEAR)) {
    byYear.set(HISTORICAL_ENROLLMENT_YEAR, school.historicalEnrollment);
  }
  if (school.enrollment != null && !byYear.has(CURRENT_ENROLLMENT_YEAR)) {
    byYear.set(CURRENT_ENROLLMENT_YEAR, school.enrollment);
  }
  if (school.projEnrollment != null && !byYear.has(PROJECTED_ENROLLMENT_YEAR)) {
    byYear.set(PROJECTED_ENROLLMENT_YEAR, school.projEnrollment);
  }
  return [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, students]) => ({ year, students }));
}

/**
 * New-construction unit costs ($/SF) from Facility Data/03 UnitCostLibrary.csv.
 * Option/Alternative/unknown spans use the HS rate as a fallback — review.
 */
const REPLACEMENT_COST_PER_SF = {
  elementary: 566.49648,
  middle: 588.4978,
  high: 623.1712256,
  k8: 577.50396,
} as const;

export interface NamedValue {
  label: string;
  value: number;
  color: string;
  year?: number;
}

export interface DecadeReplacement {
  decade: number;
  label: string;
  older: number;
  newer: number;
  total: number;
}

export interface ReplacementStats {
  allCost: number;
  olderCost: number;
  newerCost: number;
  unknownYearCost: number;
  missingSf: number;
  decades: DecadeReplacement[];
  maxDecadeTotal: number;
  cutoffYear: number;
}

export interface PriorityStats {
  facilitiesTotal: number;
  byAsset: NamedValue[];
}

export interface AdequacyStats {
  scored: number;
  missing: number;
  median: number | null;
  belowHalf: number;
  bins: NamedValue[];
  maxBin: number;
}

export interface EnrollmentTrendStats {
  historical: number;
  current: number;
  projected: number;
  histToCurr: number | null;
  currToProj: number | null;
  missingHistorical: number;
  missingProjected: number;
  points: NamedValue[];
  series: Array<{ year: number; value: number }>;
}

export interface ArticulationChangeRow {
  name: string;
  historical: number;
  current: number;
  change: number | null;
  schoolCount: number;
}

export interface ArticulationChangeStats {
  rows: ArticulationChangeRow[];
  maxAbsChange: number;
}

function ageCutoffYear(): number {
  return new Date().getFullYear() - 50;
}

function unitCostPerSf(school: School): number {
  const kind = schoolSpanKind(school);
  if (kind === "elementary") return REPLACEMENT_COST_PER_SF.elementary;
  if (kind === "middle") return REPLACEMENT_COST_PER_SF.middle;
  if (kind === "high" || kind === "jrSr") return REPLACEMENT_COST_PER_SF.high;
  if (kind === "k8") return REPLACEMENT_COST_PER_SF.k8;
  return REPLACEMENT_COST_PER_SF.high;
}

function replacementCost(school: School): number | null {
  if (school.squareFt == null || school.squareFt <= 0) return null;
  return school.squareFt * unitCostPerSf(school);
}

function emptyDecade(decade: number, label: string): DecadeReplacement {
  return { decade, label, older: 0, newer: 0, total: 0 };
}

export function replacementStats(schools: School[]): ReplacementStats {
  const snapshot = snapshotSchools(schools);
  const cutoffYear = ageCutoffYear();
  const decades: DecadeReplacement[] = DECADE_STARTS.map((decade) =>
    emptyDecade(decade, `${decade}s`),
  );
  const pre = emptyDecade(1920, "Pre-1930s");

  let allCost = 0;
  let olderCost = 0;
  let newerCost = 0;
  let unknownYearCost = 0;
  let missingSf = 0;

  for (const school of snapshot) {
    const cost = replacementCost(school);
    if (cost == null) {
      missingSf += 1;
      continue;
    }
    allCost += cost;
    const year = school.yearBuilt;
    if (year == null) {
      unknownYearCost += cost;
      continue;
    }
    if (year <= cutoffYear) olderCost += cost;
    else newerCost += cost;

    const bucket =
      year < 1930
        ? pre
        : decades.find((row) => row.decade === Math.floor(year / 10) * 10);
    if (!bucket) continue;
    if (year <= cutoffYear) bucket.older += cost;
    else bucket.newer += cost;
    bucket.total += cost;
  }

  const rows = pre.total > 0 ? [pre, ...decades] : decades;
  return {
    allCost,
    olderCost,
    newerCost,
    unknownYearCost,
    missingSf,
    decades: rows,
    maxDecadeTotal: Math.max(1, ...rows.map((row) => row.total)),
    cutoffYear,
  };
}

function titleAsset(name: string): string {
  const trimmed = name.trim() || "Other";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

const ASSET_COLORS = [
  colors.purple,
  colors.magenta,
  colors.teal,
  colors.blue,
  colors.orange,
  colors.navy,
  colors.green,
];

export function priorityStats(schools: School[]): PriorityStats {
  const snapshot = snapshotSchools(schools);
  const sums: Record<string, number> = {};
  let facilitiesTotal = 0;
  for (const school of snapshot) {
    facilitiesTotal += school.needs.facilitiesTotal + school.needs.safetyTotal;
    for (const [raw, value] of Object.entries(school.needs.facilities)) {
      if (!value) continue;
      const label = titleAsset(raw);
      sums[label] = (sums[label] ?? 0) + value;
    }
    if (school.needs.safetyTotal > 0) {
      sums[SAFETY_SECURITY_SYSTEM] =
        (sums[SAFETY_SECURITY_SYSTEM] ?? 0) + school.needs.safetyTotal;
    }
  }
  const byAsset = Object.entries(sums)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], index) => ({
      label,
      value,
      color: ASSET_COLORS[index % ASSET_COLORS.length],
    }));
  return { facilitiesTotal, byAsset };
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

const EA_BIN_STEP = 0.05;
const EA_CUTOFF = 0.7;

export function adequacyStats(schools: School[]): AdequacyStats {
  const snapshot = snapshotSchools(schools);
  const scores = snapshot
    .map((school) => school.educationalAdequacy)
    .filter((value): value is number => value != null && !Number.isNaN(value));
  const minScore = scores.length ? Math.min(...scores) : 0.4;
  const maxScore = scores.length ? Math.max(...scores) : 0.9;
  const stepC = Math.round(EA_BIN_STEP * 100);
  const firstC = Math.floor((minScore * 100) / stepC) * stepC;
  const lastC = Math.max(firstC + stepC, Math.ceil((maxScore * 100) / stepC) * stepC);
  const bins: NamedValue[] = [];
  for (let c = firstC; c < lastC; c += stepC) {
    const edge = c / 100;
    const end = (c + stepC) / 100;
    const isLast = c + stepC >= lastC;
    const count = scores.filter((value) =>
      isLast ? value >= edge && value <= end : value >= edge && value < end,
    ).length;
    bins.push({
      label: edge.toFixed(2),
      value: count,
      color: edge < EA_CUTOFF ? colors.magenta : colors.teal,
    });
  }
  return {
    scored: scores.length,
    missing: snapshot.length - scores.length,
    median: median(scores),
    belowHalf: scores.filter((value) => value < 0.5).length,
    bins,
    maxBin: Math.max(1, ...bins.map((bin) => bin.value)),
  };
}

export function enrollmentTrendStats(schools: School[]): EnrollmentTrendStats {
  const snapshot = snapshotSchools(schools);
  let historical = 0;
  let current = 0;
  let projected = 0;
  let missingHistorical = 0;
  let missingProjected = 0;
  const byYear = new Map<number, number>();
  for (const school of snapshot) {
    historical += school.historicalEnrollment ?? 0;
    current += school.enrollment ?? 0;
    projected += school.projEnrollment ?? 0;
    if (school.historicalEnrollment == null) missingHistorical += 1;
    if (school.projEnrollment == null) missingProjected += 1;
    for (const point of schoolEnrollmentSeries(school)) {
      byYear.set(point.year, (byYear.get(point.year) ?? 0) + point.students);
    }
  }
  const histToCurr = historical ? (current - historical) / historical : null;
  const currToProj = current ? (projected - current) / current : null;
  const series = [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, value]) => ({ year, value }));
  return {
    historical,
    current,
    projected,
    histToCurr,
    currToProj,
    missingHistorical,
    missingProjected,
    series,
    points: [
      {
        year: HISTORICAL_ENROLLMENT_YEAR,
        label: schoolYearLabel(HISTORICAL_ENROLLMENT_YEAR),
        value: historical,
        color: colors.navy,
      },
      {
        year: CURRENT_ENROLLMENT_YEAR,
        label: CURRENT_ENROLLMENT_YEAR_LABEL,
        value: current,
        color: colors.purple,
      },
      {
        year: PROJECTED_ENROLLMENT_YEAR,
        label: PROJECTED_ENROLLMENT_YEAR_LABEL,
        value: projected,
        color: colors.magenta,
      },
    ],
  };
}

function areaName(school: School): string | null {
  const name = school.articulation?.trim();
  if (!name || name === "NoArticulationArea") return null;
  return name;
}

export function articulationChangeStats(schools: School[]): ArticulationChangeStats {
  const snapshot = snapshotSchools(schools);
  const byArea = new Map<
    string,
    { historical: number; current: number; schoolCount: number }
  >();
  for (const school of snapshot) {
    const name = areaName(school);
    if (!name) continue;
    const row = byArea.get(name) ?? { historical: 0, current: 0, schoolCount: 0 };
    row.historical += school.historicalEnrollment ?? 0;
    row.current += school.enrollment ?? 0;
    row.schoolCount += 1;
    byArea.set(name, row);
  }
  const rows: ArticulationChangeRow[] = [...byArea.entries()]
    .map(([name, row]) => ({
      name,
      historical: row.historical,
      current: row.current,
      change: row.historical ? (row.current - row.historical) / row.historical : null,
      schoolCount: row.schoolCount,
    }))
    .sort((a, b) => (a.change ?? 0) - (b.change ?? 0));
  const maxAbsChange = Math.max(
    0.01,
    ...rows.map((row) => Math.abs(row.change ?? 0)),
  );
  return { rows, maxAbsChange };
}

export const BIRTH_CHANGE_YEARS = { start: 2014, end: 2023 } as const;

/** Percent change in live births by articulation area, 2014–2023 planning table. */
export const BIRTH_CHANGE_BY_AREA: Record<string, number> = {
  Alameda: -23.5,
  Arvada: -18.6,
  "Arvada West": -0.3,
  "Bear Creek": 7.5,
  Chatfield: -15,
  Columbine: -16,
  Conifer: 12.1,
  "Dakota Ridge": -18.1,
  Evergreen: -19.8,
  Golden: -15.9,
  "Green Mountain": 4.1,
  Jefferson: -15.8,
  Lakewood: -12.4,
  Pomona: -15.2,
  "Ralston Valley": 60.4,
  "Standley Lake": -8.6,
  "Wheat Ridge": -3.8,
};

export function birthChangeRange(): { min: number; max: number } {
  const values = Object.values(BIRTH_CHANGE_BY_AREA);
  return { min: Math.min(...values), max: Math.max(...values) };
}

/** Jefferson County live births, Grand Total by year (2014–2023 planning table). */
export const JEFFCO_BIRTHS: Array<{ year: number; value: number }> = [
  { year: 2014, value: 5802 },
  { year: 2015, value: 5763 },
  { year: 2016, value: 5932 },
  { year: 2017, value: 5827 },
  { year: 2018, value: 5613 },
  { year: 2019, value: 5687 },
  { year: 2020, value: 5476 },
  { year: 2021, value: 5558 },
  { year: 2022, value: 5440 },
  { year: 2023, value: 5320 },
];

/** Construction cost index, January 2009 = 100. National vs Denver, 2016–2026. */
export const CONSTRUCTION_COST_INDEX: Array<{
  year: number;
  national: number;
  denver: number;
}> = [
  { year: 2016, national: 117.7, denver: 120.7 },
  { year: 2017, national: 122.3, denver: 125.8 },
  { year: 2018, national: 130.8, denver: 134.6 },
  { year: 2019, national: 135.0, denver: 137.9 },
  { year: 2020, national: 137.8, denver: 138.3 },
  { year: 2021, national: 167.4, denver: 169.2 },
  { year: 2022, national: 178.6, denver: 182.2 },
  { year: 2023, national: 182.5, denver: 182.8 },
  { year: 2024, national: 186.1, denver: 181.9 },
  { year: 2025, national: 199.8, denver: 200.4 },
  { year: 2026, national: 203.2, denver: 205.3 },
];

export function birthDeclineShare(): number | null {
  const first = JEFFCO_BIRTHS[0];
  const last = JEFFCO_BIRTHS[JEFFCO_BIRTHS.length - 1];
  if (!first?.value) return null;
  return (last.value - first.value) / first.value;
}

export function moreThanBillions(value: number): string {
  return `$${Math.floor(value / 1_000_000_000)} billion`;
}

export function moreThanHundredMillions(value: number): string {
  const rounded = Math.floor(value / 100_000_000) * 100;
  return `$${rounded} million`;
}

export function moreThanPercent(ratio: number): string {
  return `${Math.floor(Math.abs(ratio) * 100)}%`;
}

export function changeFill(
  change: number | null,
  maxAbs: number,
): string {
  if (change == null || maxAbs <= 0) return "#d8d4d6";
  const t = Math.max(-1, Math.min(1, change / maxAbs));
  if (t < 0) return mixHex("#e6e2e4", colors.magenta, -t);
  return mixHex("#e6e2e4", colors.teal, t);
}

function mixHex(from: string, to: string, t: number): string {
  const a = hexRgb(from);
  const b = hexRgb(to);
  const mix = (i: number) => Math.round(a[i] + (b[i] - a[i]) * t);
  return `rgb(${mix(0)}, ${mix(1)}, ${mix(2)})`;
}

function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
