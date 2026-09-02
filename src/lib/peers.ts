import { emptyPriorityMap } from "./needs";
import type { PriorityScore, School, SchoolNeeds } from "../types";
import { isCompositeUniverseSchool } from "./universe";

export type SpanKind =
  | "elementary"
  | "middle"
  | "high"
  | "k8"
  | "jrSr"
  | "other";

const K8_RE = /\b(?:pk|pre-?k|k)[\s-]*8(?:th)?\b/i;
const JRSR_RE =
  /junior\s*\/\s*senior|\bjr\.?\s*\/\s*sr\.?|\b7\s*[-\/]\s*12\b/i;

export function schoolSpanKind(school: School): SpanKind {
  const name = school.name ?? "";
  if (K8_RE.test(name)) return "k8";
  if (JRSR_RE.test(name)) return "jrSr";
  if (school.schoolLevel === "Elementary") return "elementary";
  if (school.schoolLevel === "Middle") return "middle";
  if (school.schoolLevel === "High") return "high";
  if (/\belementary\b/i.test(name)) return "elementary";
  if (/\bmiddle\b/i.test(name)) return "middle";
  if (/\bhigh school\b/i.test(name)) return "high";
  return "other";
}

function peerKinds(kind: SpanKind): SpanKind[] | null {
  switch (kind) {
    case "elementary":
      return ["elementary"];
    case "middle":
      return ["middle"];
    case "high":
      return ["high"];
    case "k8":
      return ["elementary", "middle", "k8"];
    case "jrSr":
      return ["middle", "high", "jrSr"];
    default:
      return null;
  }
}

export function peerGroupAbbrev(school: School): string {
  switch (schoolSpanKind(school)) {
    case "elementary":
      return "ES";
    case "middle":
      return "MS";
    case "high":
      return "HS";
    case "k8":
      return "ES/MS";
    case "jrSr":
      return "MS/HS";
    default:
      return String(school.schoolLevel);
  }
}

export function peerGroupNeedsPhrase(school: School): string {
  switch (schoolSpanKind(school)) {
    case "elementary":
      return "for other elementary schools";
    case "middle":
      return "for other middle schools";
    case "high":
      return "for other high schools";
    case "k8":
      return "for elementary and middle schools";
    case "jrSr":
      return "for other middle and high schools";
    default:
      return `for other ${String(school.schoolLevel).toLowerCase()} schools`;
  }
}

export function peerSchools(school: School, schools: School[]): School[] {
  const kind = schoolSpanKind(school);
  const kinds = peerKinds(kind);
  return schools.filter((candidate) => {
    if (candidate.id === school.id) return false;
    if (!isCompositeUniverseSchool(candidate)) return false;
    if (candidate.status !== "Active") return false;
    if (Boolean(candidate.isCharter) !== Boolean(school.isCharter)) return false;
    if (!kinds) return candidate.schoolLevel === school.schoolLevel;
    return kinds.includes(schoolSpanKind(candidate));
  });
}

export function peerAverage(
  peers: School[],
  getValue: (school: School) => number | null | undefined,
): number | null {
  const values = peers
    .map(getValue)
    .filter((value): value is number => value != null && !Number.isNaN(value));
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function snapshotSchools(schools: School[]): School[] {
  return schools.filter(
    (school) =>
      isCompositeUniverseSchool(school) &&
      school.status === "Active" &&
      school.hasMapPoint &&
      !school.isCharter &&
      school.schoolLevel !== "Charter",
  );
}

function emptyNeeds(): SchoolNeeds {
  return {
    facilities: {},
    safety: {},
    technology: {},
    food: {},
    facilitiesTotal: 0,
    safetyTotal: 0,
    technologyTotal: 0,
    foodTotal: 0,
    total: 0,
    byPriority: emptyPriorityMap(),
  };
}

function sumNeedsRollup(
  schools: School[],
  getBreakdown: (school: School) => Record<string, number>,
): Record<string, number> {
  const sums: Record<string, number> = {};
  for (const school of schools) {
    for (const [key, value] of Object.entries(getBreakdown(school))) {
      sums[key] = (sums[key] ?? 0) + value;
    }
  }
  return sums;
}

/** District-wide identified need totals (not per-school averages). */
export function totalNeeds(schools: School[]): SchoolNeeds {
  if (!schools.length) return emptyNeeds();
  return {
    facilities: sumNeedsRollup(schools, (school) => school.needs.facilities),
    safety: sumNeedsRollup(schools, (school) => school.needs.safety),
    technology: sumNeedsRollup(schools, (school) => school.needs.technology),
    food: sumNeedsRollup(schools, (school) => school.needs.food),
    facilitiesTotal: schools.reduce((sum, school) => sum + school.needs.facilitiesTotal, 0),
    safetyTotal: schools.reduce((sum, school) => sum + school.needs.safetyTotal, 0),
    technologyTotal: schools.reduce(
      (sum, school) => sum + school.needs.technologyTotal,
      0,
    ),
    foodTotal: schools.reduce((sum, school) => sum + school.needs.foodTotal, 0),
    total: schools.reduce((sum, school) => sum + school.needs.total, 0),
    byPriority: (["1", "2", "3", "4"] as PriorityScore[]).reduce(
      (rolled, score) => {
        rolled[score] = {
          facilities: sumNeedsRollup(
            schools,
            (school) => school.needs.byPriority?.[score]?.facilities ?? {},
          ),
          safety: sumNeedsRollup(
            schools,
            (school) => school.needs.byPriority?.[score]?.safety ?? {},
          ),
          technology: sumNeedsRollup(
            schools,
            (school) => school.needs.byPriority?.[score]?.technology ?? {},
          ),
          food: sumNeedsRollup(
            schools,
            (school) => school.needs.byPriority?.[score]?.food ?? {},
          ),
        };
        return rolled;
      },
      emptyPriorityMap(),
    ),
  };
}
