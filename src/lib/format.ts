export function formatNumber(value: number | null | undefined, digits = 0): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

export function formatPercent(
  value: number | null | undefined,
  { alreadyPercent = false, digits = 0 } = {},
): string {
  if (value == null || Number.isNaN(value)) return "—";
  const pct = alreadyPercent ? value : value * 100;
  return `${pct.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })}%`;
}

export function formatSignedPercent(
  value: number | null | undefined,
  { alreadyPercent = false, digits = 0 } = {},
): string {
  if (value == null || Number.isNaN(value)) return "—";
  const pct = alreadyPercent ? value : value * 100;
  const abs = Math.abs(pct).toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
  if (pct > 0) return `+${abs}%`;
  if (pct < 0) return `−${abs}%`;
  return `${abs}%`;
}

export function enrollmentChange(school: {
  enrollment: number | null;
  historicalEnrollment: number | null;
}): number | null {
  if (
    school.enrollment == null ||
    school.historicalEnrollment == null ||
    school.historicalEnrollment === 0
  ) {
    return null;
  }
  return (school.enrollment - school.historicalEnrollment) / school.historicalEnrollment;
}

export function enrollmentChangeCount(school: {
  enrollment: number | null;
  historicalEnrollment: number | null;
}): number | null {
  if (school.enrollment == null || school.historicalEnrollment == null) return null;
  return school.enrollment - school.historicalEnrollment;
}

export function formatShareOrCount(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  if (value >= 0 && value <= 1) return formatPercent(value, { digits: 0 });
  return formatNumber(value, value % 1 === 0 ? 0 : 1);
}

export function formatMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value) || value === 0) return "—";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

export function formatMoneyExact(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

/** Present the 0–1 source BuildingScore as a whole number from 0 to 100. */
export function formatBuildingScore(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return formatNumber(value * 100, 0);
}

export function utilizationLabel(value: number | null | undefined): string {
  if (value == null) return "No data";
  if (value < 0.7) return "Below typical use";
  if (value <= 0.95) return "Typical use";
  if (value <= 1.1) return "Near capacity";
  return "Over capacity";
}

export function hasTemporaryCapacity(school: {
  temporaryCapacity?: number | null;
}): boolean {
  return (school.temporaryCapacity ?? 0) > 0;
}

export function temporaryCapacityNote(school: {
  temporaryCapacity?: number | null;
}): string | undefined {
  const temp = school.temporaryCapacity;
  if (temp == null || temp <= 0) return undefined;
  return `Does not include ${formatNumber(temp)} portable seat${temp === 1 ? "" : "s"}.`;
}

export function compareToAverage(
  value: number | null | undefined,
  averageValue: number | null | undefined,
): "below" | "near" | "above" | "unknown" {
  if (value == null || averageValue == null || Number.isNaN(value) || Number.isNaN(averageValue)) {
    return "unknown";
  }
  if (averageValue === 0 || value < 0 || averageValue < 0) {
    const diff = value - averageValue;
    if (Math.abs(diff) <= 0.05) return "near";
    return diff > 0 ? "above" : "below";
  }
  const ratio = value / averageValue;
  if (ratio < 0.9) return "below";
  if (ratio > 1.1) return "above";
  return "near";
}

export function schoolSlug(id: string): string {
  return encodeURIComponent(id);
}
