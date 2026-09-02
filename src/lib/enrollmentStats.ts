import {
  CURRENT_ENROLLMENT_YEAR,
  HISTORICAL_ENROLLMENT_YEAR,
  PROJECTED_ENROLLMENT_YEAR,
  schoolEnrollmentSeries,
} from "./districtCharts";
import type { School } from "../types";

export function pkCountForYear(school: School, year: number): number {
  const fromSeries = school.pkEnrollmentByYear?.find((point) => point.year === year);
  if (fromSeries != null) return fromSeries.students;
  if (year === CURRENT_ENROLLMENT_YEAR) return school.pkEnrollment ?? 0;
  if (year === PROJECTED_ENROLLMENT_YEAR) return school.projPkEnrollment ?? 0;
  return 0;
}

export function hasPkOverlay(school: School): boolean {
  if (school.pkEnrollmentByYear?.some((point) => point.students > 0)) return true;
  return (school.pkEnrollment ?? 0) > 0 || (school.projPkEnrollment ?? 0) > 0;
}

function minusPk(total: number | null | undefined, pk: number): number | null {
  if (total == null || Number.isNaN(total)) return null;
  return Math.max(0, total - (Number.isNaN(pk) ? 0 : pk));
}

export function hasAttendanceArea(school: Pick<School, "schoolLevel">): boolean {
  return school.schoolLevel !== "Option";
}

export function enrollmentView(school: School, includePk: boolean) {
  const current = includePk
    ? school.enrollment
    : minusPk(school.enrollment, pkCountForYear(school, CURRENT_ENROLLMENT_YEAR));
  const historical = includePk
    ? school.historicalEnrollment
    : minusPk(
        school.historicalEnrollment,
        pkCountForYear(school, HISTORICAL_ENROLLMENT_YEAR),
      );
  const projected = includePk
    ? school.projEnrollment
    : minusPk(school.projEnrollment, pkCountForYear(school, PROJECTED_ENROLLMENT_YEAR));

  const changeCount =
    current == null || historical == null ? null : current - historical;
  const changePct =
    current == null || historical == null || historical === 0
      ? null
      : (current - historical) / historical;

  const attendanceCapture = !hasAttendanceArea(school)
    ? null
    : includePk
      ? school.attendanceAreaEnrollment
      : school.nonPkAttendanceAreaEnrollment;

  const utilization =
    current == null || school.capacity == null || school.capacity <= 0
      ? null
      : current / school.capacity;

  return {
    current,
    historical,
    projected,
    changeCount,
    changePct,
    attendanceCapture,
    utilization,
  };
}

export function chartEnrollmentSeries(school: School, includePk: boolean) {
  const totals = schoolEnrollmentSeries(school);
  if (includePk) return totals;
  return totals.map((point) => ({
    ...point,
    students: Math.max(0, point.students - pkCountForYear(school, point.year)),
  }));
}

function interpolateTotal(series: Array<{ year: number; students: number }>, year: number): number | null {
  if (!series.length) return null;
  const exact = series.find((point) => point.year === year);
  if (exact) return exact.students;
  let prev: { year: number; students: number } | null = null;
  for (const next of series) {
    if (next.year > year) {
      if (!prev) return next.students;
      const span = next.year - prev.year;
      if (span <= 0) return prev.students;
      const t = (year - prev.year) / span;
      return prev.students + t * (next.students - prev.students);
    }
    prev = next;
  }
  return prev?.students ?? null;
}

export function k12CountForYear(school: School, year: number): number {
  const total = interpolateTotal(schoolEnrollmentSeries(school), year);
  const pk = pkCountForYear(school, year);
  if (total == null) return 0;
  return Math.max(0, total - pk);
}

export function chartPkSeries(school: School) {
  const byYear = new Map<number, number>();
  for (const point of school.pkEnrollmentByYear ?? []) {
    if (point.year < HISTORICAL_ENROLLMENT_YEAR || point.year > PROJECTED_ENROLLMENT_YEAR) {
      continue;
    }
    byYear.set(point.year, point.students);
  }
  if (school.pkEnrollment != null && !byYear.has(CURRENT_ENROLLMENT_YEAR)) {
    byYear.set(CURRENT_ENROLLMENT_YEAR, school.pkEnrollment);
  }
  if (school.projPkEnrollment != null && !byYear.has(PROJECTED_ENROLLMENT_YEAR)) {
    byYear.set(PROJECTED_ENROLLMENT_YEAR, school.projPkEnrollment);
  }
  return [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, students]) => ({ year, students }));
}
