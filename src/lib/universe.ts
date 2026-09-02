import type { ExplorerData, School } from "../types";

/** Schools that appear in 13 Composite Building Score (the dashboard universe). */
export function isCompositeUniverseSchool(school: School): boolean {
  const factors = school.buildingScoreFactors;
  if (!factors) return false;
  return (
    factors.fci != null ||
    factors.eui != null ||
    factors.age != null ||
    factors.survey != null ||
    factors.workOrder != null
  );
}

export function restrictExplorerData(data: ExplorerData): ExplorerData {
  const allowed = new Set(
    data.schools.filter(isCompositeUniverseSchool).map((school) => school.id),
  );
  const schools = data.schools
    .filter((school) => allowed.has(school.id))
    .map((school) => ({
      ...school,
      nearbySchools: (school.nearbySchools ?? []).filter((item) =>
        allowed.has(item.id),
      ),
    }));
  const active = schools.filter((school) => school.status === "Active");
  return {
    ...data,
    schools,
    district: {
      ...data.district,
      schoolCount: schools.length,
      activeCount: active.length,
      closedCount: schools.filter((school) => school.status === "Closed").length,
      charterCount: schools.filter((school) => school.isCharter).length,
      mappedCount: schools.filter((school) => school.hasMapPoint).length,
      levels: [...new Set(schools.map((school) => school.schoolLevel).filter(Boolean))].sort(),
      articulationAreas: [
        ...new Set(
          schools
            .map((school) => school.articulation)
            .filter(
              (area): area is string =>
                Boolean(area) && area !== "NoArticulationArea",
            ),
        ),
      ].sort(),
    },
  };
}
