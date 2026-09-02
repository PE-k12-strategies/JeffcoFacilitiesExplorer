import { enrollmentChange } from "./format";
import { defaultVisibleLevels } from "./theme";
import { isCompositeUniverseSchool } from "./universe";
import type { ExplorerData, MapFilters, School } from "../types";

export function defaultFilters(data: ExplorerData): MapFilters {
  const levels = data.district.levels.filter((level) =>
    defaultVisibleLevels.includes(level),
  );
  return {
    query: "",
    levels: levels.length ? levels : defaultVisibleLevels,
    statuses: ["Active"],
    includeCharter: false,
    articulation: null,
    enrollmentMin: null,
    enrollmentMax: null,
    enrollmentChangeMin: null,
    enrollmentChangeMax: null,
    capacityMin: null,
    capacityMax: null,
    utilizationMin: null,
    utilizationMax: null,
    buildingScoreMin: null,
    buildingScoreMax: null,
    needMin: null,
    needMax: null,
    symbology: "type",
  };
}

export function isCharterSchool(school: School): boolean {
  return Boolean(school.isCharter) || school.schoolLevel === "Charter";
}

export function schoolMatches(school: School, filters: MapFilters): boolean {
  if (!isCompositeUniverseSchool(school)) return false;
  if (isCharterSchool(school)) return false;
  if (school.status !== "Active") return false;
  if (!filters.levels.includes(school.schoolLevel)) {
    return false;
  }
  if (filters.articulation && school.articulation !== filters.articulation) {
    return false;
  }
  if (filters.enrollmentMin != null && (school.enrollment ?? -1) < filters.enrollmentMin) {
    return false;
  }
  if (filters.enrollmentMax != null && (school.enrollment ?? Infinity) > filters.enrollmentMax) {
    return false;
  }
  const changePct = enrollmentChange(school);
  const changePctPoints = changePct == null ? null : changePct * 100;
  if (
    filters.enrollmentChangeMin != null &&
    (changePctPoints ?? Number.NEGATIVE_INFINITY) < filters.enrollmentChangeMin
  ) {
    return false;
  }
  if (
    filters.enrollmentChangeMax != null &&
    (changePctPoints ?? Number.POSITIVE_INFINITY) > filters.enrollmentChangeMax
  ) {
    return false;
  }
  if (filters.capacityMin != null && (school.capacity ?? -1) < filters.capacityMin) {
    return false;
  }
  if (filters.capacityMax != null && (school.capacity ?? Infinity) > filters.capacityMax) {
    return false;
  }
  const utilPct = school.utilization == null ? null : school.utilization * 100;
  if (filters.utilizationMin != null && (utilPct ?? -1) < filters.utilizationMin) {
    return false;
  }
  if (filters.utilizationMax != null && (utilPct ?? Infinity) > filters.utilizationMax) {
    return false;
  }
  const score = school.buildingScore;
  if (filters.buildingScoreMin != null && (score ?? -1) < filters.buildingScoreMin) {
    return false;
  }
  if (filters.buildingScoreMax != null && (score ?? Infinity) > filters.buildingScoreMax) {
    return false;
  }
  const need = school.needs.total;
  if (filters.needMin != null && need < filters.needMin) {
    return false;
  }
  if (filters.needMax != null && need > filters.needMax) {
    return false;
  }
  const q = filters.query.trim().toLowerCase();
  if (q) {
    const hay = `${school.name} ${school.articulation ?? ""} ${school.schoolLevel}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

export function filterSchools(schools: School[], filters: MapFilters): School[] {
  return schools.filter((school) => schoolMatches(school, filters));
}
