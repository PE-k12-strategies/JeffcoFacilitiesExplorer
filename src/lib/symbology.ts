import { CURRENT_ENROLLMENT_YEAR_LABEL } from "./districtCharts";
import { enrollmentChange, formatBuildingScore, formatMoney, formatNumber, formatPercent, formatSignedPercent } from "./format";
import { colors, levelColors } from "./theme";
import type { MapSymbology, School } from "../types";

export type { MapSymbology };

/** Filter-slider endcaps. Percents are UI units; metricRange() converts to source units. */
export const FILTER_SLIDER_BOUNDS = {
  enrollment: { min: 0, max: 2_000 },
  enrollmentChange: { min: -100, max: 300 },
  capacity: { min: 0, max: 2_500 },
  utilization: { min: 0, max: 120 },
  buildingScore: { min: 0, max: 100 },
  need: { min: 0, max: 22_000_000 },
} as const;

export const SYMBOLOGY_OPTIONS: Array<{ id: MapSymbology; label: string }> = [
  { id: "type", label: "School Type" },
  { id: "enrollment", label: `School Enrollment (${CURRENT_ENROLLMENT_YEAR_LABEL})` },
  { id: "enrollmentChange", label: "Change in Enrollment" },
  { id: "capacity", label: "School Capacity" },
  { id: "utilization", label: "School Utilization" },
  { id: "buildingScore", label: "Composite Building Score" },
  { id: "need", label: "Identified Facility Need ($)" },
];

const RAMP = ["#c8bdd4", "#673785", "#971B72"] as const;
const DIVERGING_RAMP = ["#971B72", "#efe6c9", "#1B8367"] as const;
const NEED_RAMP = ["#1B8367", "#efe6c9", "#971B72"] as const;
const MISSING_COLOR = "#9a9a9a";

export const LEVEL_COLOR_MATCH = [
  "match",
  ["get", "schoolLevel"],
  "Elementary",
  levelColors.Elementary,
  "Middle",
  levelColors.Middle,
  "High",
  levelColors.High,
  "Multi-Level",
  levelColors["Multi-Level"],
  "Option",
  levelColors.Option,
  "Alternative",
  levelColors.Alternative,
  "Charter",
  levelColors.Charter,
  colors.muted,
];

export function symbologyLabel(mode: MapSymbology): string {
  return SYMBOLOGY_OPTIONS.find((option) => option.id === mode)?.label ?? "School Type";
}

export function metricValue(school: School, mode: MapSymbology): number | null {
  if (mode === "type") return null;
  if (mode === "enrollment") return school.enrollment;
  if (mode === "capacity") return school.capacity;
  if (mode === "utilization") return school.utilization;
  if (mode === "buildingScore") return school.buildingScore;
  if (mode === "enrollmentChange") {
    if (isWarrenTechNorth(school)) return null;
    return enrollmentChange(school);
  }
  const total = school.needs.total;
  return total > 0 ? total : null;
}

function isWarrenTechNorth(school: School): boolean {
  return school.name.trim().toLowerCase() === "warren tech north";
}

export function metricRange(schools: School[], mode: MapSymbology): { min: number; max: number } {
  if (mode === "enrollment") return { ...FILTER_SLIDER_BOUNDS.enrollment };
  if (mode === "capacity") return { ...FILTER_SLIDER_BOUNDS.capacity };
  if (mode === "need") return { ...FILTER_SLIDER_BOUNDS.need };
  if (mode === "utilization") {
    return {
      min: FILTER_SLIDER_BOUNDS.utilization.min / 100,
      max: FILTER_SLIDER_BOUNDS.utilization.max / 100,
    };
  }
  if (mode === "buildingScore") {
    return {
      min: FILTER_SLIDER_BOUNDS.buildingScore.min / 100,
      max: FILTER_SLIDER_BOUNDS.buildingScore.max / 100,
    };
  }
  if (mode === "enrollmentChange") {
    const values = schools
      .map((school) => metricValue(school, mode))
      .filter((value): value is number => value != null && Number.isFinite(value));
    if (!values.length) {
      return {
        min: FILTER_SLIDER_BOUNDS.enrollmentChange.min / 100,
        max: FILTER_SLIDER_BOUNDS.enrollmentChange.max / 100,
      };
    }
    return { min: Math.min(...values), max: Math.max(...values) };
  }
  return { min: 0, max: 1 };
}

export function formatSymbologyValue(mode: MapSymbology, value: number): string {
  if (mode === "utilization") return formatPercent(value);
  if (mode === "buildingScore") return formatBuildingScore(value);
  if (mode === "enrollmentChange") return formatSignedPercent(value);
  if (mode === "need") return value === 0 ? "$0" : formatMoney(value);
  return formatNumber(value);
}

export function formatSchoolMetric(school: School, mode: MapSymbology): string | null {
  if (mode === "type") return school.schoolLevel;
  const value = metricValue(school, mode);
  if (value == null) return null;
  return formatSymbologyValue(mode, value);
}

/** 0 = lowest $, 1 = highest $. Ties share the average rank. Not for display. */
export function needColorRanks(schools: School[]): Map<string, number> {
  const scored = schools
    .map((school) => {
      const value = metricValue(school, "need");
      return value == null ? null : { id: school.id, value };
    })
    .filter((item): item is { id: string; value: number } => item != null)
    .sort((a, b) => a.value - b.value);

  const ranks = new Map<string, number>();
  if (!scored.length) return ranks;
  if (scored.length === 1) {
    ranks.set(scored[0].id, 0.5);
    return ranks;
  }

  let index = 0;
  while (index < scored.length) {
    let end = index;
    while (end + 1 < scored.length && scored[end + 1].value === scored[index].value) {
      end += 1;
    }
    const t = (index + end) / 2 / (scored.length - 1);
    for (let i = index; i <= end; i += 1) ranks.set(scored[i].id, t);
    index = end + 1;
  }
  return ranks;
}

const POINT_RADIUS = [
  "interpolate",
  ["linear"],
  ["zoom"],
  8,
  5,
  11,
  7,
  14,
  10,
] as const;

export function circlePaint(mode: MapSymbology, range: { min: number; max: number }) {
  const radius = {
    "circle-radius": POINT_RADIUS as never,
    "circle-stroke-width": 1.5,
    "circle-stroke-color": "#ffffff",
  };

  if (mode === "type") {
    return {
      "circle-color": LEVEL_COLOR_MATCH as never,
      ...radius,
    };
  }

  const ramp = symbologyRamp(mode);
  const { min, max } =
    mode === "need" ? { min: 0, max: 1 } : range;
  const mid = min + (max - min) / 2;
  const colorStops =
    mode === "enrollmentChange" && min < 0 && max > 0
      ? ([min, ramp[0], 0, ramp[1], max, ramp[2]] as const)
      : ([min, ramp[0], mid, ramp[1], max, ramp[2]] as const);

  return {
    "circle-color": [
      "case",
      ["==", ["get", "hasMetric"], 1],
      ["interpolate", ["linear"], ["get", "metric"], ...colorStops],
      MISSING_COLOR,
    ] as never,
    ...radius,
  };
}

export function usesDivergingRamp(mode: MapSymbology): boolean {
  return (
    mode === "enrollmentChange" ||
    mode === "buildingScore" ||
    mode === "utilization" ||
    mode === "need"
  );
}

export function symbologyRamp(mode: MapSymbology): readonly string[] {
  if (mode === "need") return NEED_RAMP;
  if (usesDivergingRamp(mode)) return DIVERGING_RAMP;
  return RAMP;
}

export const SYMBOLOGY_RAMP = RAMP;
export const SYMBOLOGY_DIVERGING_RAMP = DIVERGING_RAMP;
export const SYMBOLOGY_MISSING = MISSING_COLOR;
