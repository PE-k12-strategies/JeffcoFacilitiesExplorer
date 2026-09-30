export const EA_FACTORS = [
  {
    id: "instructionalSpace",
    label: "Classrooms",
    lines: ["Classrooms"],
    blurb: "How well classrooms, labs, and art rooms support learning through size, furniture, light, and views.",
  },
  {
    id: "safetySecurity",
    label: "Safety and Security",
    lines: ["Safety and", "Security"],
    blurb: "Looks at sight lines, building layout, door hardware, and other features that keep people safe.",
  },
  {
    id: "presence",
    label: "Presence",
    lines: ["Presence"],
    blurb: "How the building and grounds look from outside, and how it feels to arrive.",
  },
  {
    id: "assembly",
    label: "Assembly",
    lines: ["Assembly"],
    blurb: "Quality of auditoriums and dining rooms, including size, furniture, and how the space feels.",
  },
  {
    id: "organization",
    label: "Organization",
    lines: ["Organization"],
    blurb: "How rooms are arranged, including the main office, staff work areas, and student activity spaces.",
  },
  {
    id: "environmentalQuality",
    label: "Environmental Quality",
    lines: ["Environmental", "Quality"],
    blurb: "How comfortable the building feels, including sound, daylight, temperature, and indoor air.",
  },
  {
    id: "extendedLearning",
    label: "Extended Learning",
    lines: ["Extended", "Learning"],
    blurb: "Informal indoor and outdoor spots that add to classrooms, judged on the same space-quality factors.",
  },
  {
    id: "community",
    label: "Community",
    lines: ["Community"],
    blurb: "How well the building helps people connect, both inside the school and with neighbors.",
  },
] as const;

export const EA_CATEGORIES = ["Poor", "Fair", "Good", "Excellent"] as const;

export type EaCategory = (typeof EA_CATEGORIES)[number];

export function eaCategoryRank(category: string | null | undefined): number | null {
  if (!category) return null;
  const index = EA_CATEGORIES.indexOf(category as EaCategory);
  return index < 0 ? null : index;
}

export type EaFactorId = (typeof EA_FACTORS)[number]["id"];

export type EaFactorScores = Record<EaFactorId, number | null>;

export function emptyEaFactors(): EaFactorScores {
  return {
    presence: null,
    safetySecurity: null,
    community: null,
    organization: null,
    environmentalQuality: null,
    instructionalSpace: null,
    assembly: null,
    extendedLearning: null,
  };
}
