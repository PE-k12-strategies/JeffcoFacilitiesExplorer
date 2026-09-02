export const colors = {
  purple: "#673785",
  magenta: "#971B72",
  teal: "#1B8367",
  blue: "#317BB4",
  orange: "#C1571A",
  green: "#5E7E35",
  navy: "#1F435F",
  ink: "#131313",
  body: "#373737",
  muted: "#636363",
  line: "#cfcfcf",
  paper: "#ffffff",
  canvas: "#f7f5f2",
  mist: "#f0eef2",
} as const;

export const levelColors: Record<string, string> = {
  Elementary: colors.teal,
  Middle: colors.blue,
  High: colors.purple,
  "Multi-Level": colors.magenta,
  Option: colors.orange,
  Alternative: colors.green,
  Charter: colors.navy,
  Unknown: colors.muted,
};

export const defaultVisibleLevels = [
  "Elementary",
  "Middle",
  "High",
  "Multi-Level",
  "Option",
  "Alternative",
];

export function colorForLevel(level: string | null | undefined): string {
  if (!level) return colors.muted;
  return levelColors[level] ?? colors.muted;
}
