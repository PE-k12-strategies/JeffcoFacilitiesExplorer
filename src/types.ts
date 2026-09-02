import type { EaFactorScores } from "./lib/educationalAdequacy";

export type SchoolLevel =
  | "Elementary"
  | "Middle"
  | "High"
  | "Multi-Level"
  | "Option"
  | "Alternative"
  | "Charter"
  | "Unknown"
  | string;

export type SchoolStatus = "Active" | "Closed" | string;

export type CostBreakdown = Record<string, number>;

export type PriorityScore = "1" | "2" | "3" | "4";

export interface NeedsPrioritySlice {
  facilities: CostBreakdown;
  safety: CostBreakdown;
  technology: CostBreakdown;
  food: CostBreakdown;
}

export interface SchoolNeeds {
  facilities: CostBreakdown;
  safety: CostBreakdown;
  technology: CostBreakdown;
  food: CostBreakdown;
  facilitiesTotal: number;
  safetyTotal: number;
  technologyTotal: number;
  foodTotal: number;
  total: number;
  byPriority: Record<PriorityScore, NeedsPrioritySlice>;
}

export interface BuildingScoreFactors {
  fci: number | null;
  eui: number | null;
  age: number | null;
  survey: number | null;
  workOrder: number | null;
}

export type BuildingScoreValues = BuildingScoreFactors;

export interface NearbySchool {
  id: string;
  name: string;
  rank: number;
  distanceMiles: number | null;
  grades: string;
  gradeOverlap: string;
}

export interface School {
  id: string;
  facilityId: string | null;
  name: string;
  status: SchoolStatus;
  schoolLevel: SchoolLevel;
  isCharter: boolean;
  includeFlowChart: boolean | null;
  /** Applied permanent capacity from file 15. Portable seats are excluded. */
  capacity: number | null;
  /** Applied temporary (portable classroom) seats from file 15. */
  temporaryCapacity: number | null;
  educationalCapacity: number | null;
  historicalEnrollment: number | null;
  pkEnrollment: number | null;
  enrollment: number | null;
  projPkEnrollment: number | null;
  projEnrollment: number | null;
  /** School-year start years: 2015 = 2015–16. Totals already include PK. */
  enrollmentByYear: Array<{ year: number; students: number }>;
  /** PK subset of enrollmentByYear from 14 PK Enrollment. */
  pkEnrollmentByYear: Array<{ year: number; students: number }>;
  fci: number | null;
  yearBuilt: number | null;
  educationalAdequacy: number | null;
  educationalAdequacyFactors: EaFactorScores;
  siteCapacity: boolean | null;
  squareFt: number | null;
  buildingScore: number | null;
  buildingScoreFactors: BuildingScoreFactors;
  /** Raw inputs from 13 Composite Building Score (FCI, EUI, effective age, survey, work order $/SF). */
  buildingScoreValues: BuildingScoreValues;
  recentInvestments: boolean | null;
  attendanceAreaEnrollment: number | null;
  nonPkAttendanceAreaEnrollment: number | null;
  highNeedStudents: number | null;
  roftsStudentsReceived: number | null;
  classroomEaScore: number | null;
  classroomCount: number | null;
  utilization: number | null;
  articulation: string | null;
  gradesServed: string | null;
  nearbySchools: NearbySchool[];
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  hasMapPoint: boolean;
  needs: SchoolNeeds;
}

export interface DistrictSummary {
  schoolCount: number;
  activeCount: number;
  closedCount: number;
  charterCount: number;
  mappedCount: number;
  totalEnrollment: number;
  totalCapacity: number;
  totalSquareFt: number;
  totalIdentifiedNeed: number;
  medianUtilization: number | null;
  medianEducationalAdequacy: number | null;
  medianBuildingScore: number | null;
  medianFci: number | null;
  levels: string[];
  articulationAreas: string[];
}

export interface ExplorerData {
  generatedAt: string;
  source: string;
  district: DistrictSummary;
  schools: School[];
}

export interface ArticulationCollection {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: { name?: string | null };
    geometry: unknown;
  }>;
}

export interface MapFilters {
  query: string;
  levels: string[];
  statuses: string[];
  includeCharter: boolean;
  articulation: string | null;
  enrollmentMin: number | null;
  enrollmentMax: number | null;
  enrollmentChangeMin: number | null;
  enrollmentChangeMax: number | null;
  capacityMin: number | null;
  capacityMax: number | null;
  utilizationMin: number | null;
  utilizationMax: number | null;
  buildingScoreMin: number | null;
  buildingScoreMax: number | null;
  needMin: number | null;
  needMax: number | null;
  symbology: MapSymbology;
}

export type MapSymbology =
  | "type"
  | "enrollment"
  | "capacity"
  | "utilization"
  | "buildingScore"
  | "need"
  | "enrollmentChange";
