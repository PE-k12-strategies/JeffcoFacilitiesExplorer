import { useId, type ReactNode } from "react";
import { formatBuildingScore, formatNumber, formatPercent } from "../lib/format";
import { SYMBOLOGY_DIVERGING_RAMP } from "../lib/symbology";
import { colors } from "../lib/theme";
import type { BuildingScoreFactors, BuildingScoreValues } from "../types";
import { BUILDING_SCORE_TIP, HelpTip } from "./Ui";

const W = 220;
const CX = 110;
const CY = 115;
const R = 99;
const TRACK = 14;
const H = CY + (TRACK + 4) / 2 + 1;

const FACTORS: Array<{
  id: keyof BuildingScoreValues;
  label: string;
  higherIsBetter: boolean;
  /** Raw value that fills the bar. Larger values clamp to full width. */
  max: number;
}> = [
  { id: "fci", label: "Facilities Condition Index (FCI)", higherIsBetter: false, max: 0.25 },
  { id: "eui", label: "Energy Use Intensity (EUI) (kBTU / SF)", higherIsBetter: false, max: 100 },
  { id: "age", label: "Building Age (Years)", higherIsBetter: false, max: 100 },
  { id: "survey", label: "Survey Score (1–5)", higherIsBetter: true, max: 5 },
  { id: "workOrder", label: "Work Order $ / SF", higherIsBetter: false, max: 5 },
];

function pointOnArc(t: number, radius = R) {
  const clamped = Math.max(0, Math.min(1, t));
  const angle = Math.PI - clamped * Math.PI;
  return {
    x: CX + Math.cos(angle) * radius,
    y: CY - Math.sin(angle) * radius,
  };
}

function arcPath(radius: number) {
  const start = pointOnArc(0, radius);
  const end = pointOnArc(1, radius);
  return `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} A ${radius} ${radius} 0 0 1 ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
}

function hexRgb(hex: string): [number, number, number] {
  const raw = hex.replace("#", "");
  return [
    Number.parseInt(raw.slice(0, 2), 16),
    Number.parseInt(raw.slice(2, 4), 16),
    Number.parseInt(raw.slice(4, 6), 16),
  ];
}

function mixHex(from: string, to: string, t: number): string {
  const a = hexRgb(from);
  const b = hexRgb(to);
  const mix = (i: number) => Math.round(a[i] + (b[i] - a[i]) * t);
  return `rgb(${mix(0)}, ${mix(1)}, ${mix(2)})`;
}

function mixRamp(ramp: readonly [string, string, string], t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const [start, mid, end] = ramp;
  if (clamped <= 0.5) return mixHex(start, mid, clamped / 0.5);
  return mixHex(mid, end, (clamped - 0.5) / 0.5);
}

function scoreColor(t: number): string {
  return mixRamp(SYMBOLOGY_DIVERGING_RAMP, t);
}

/** 0 is the raw value; 1 is the metric ceiling. Length uses this directly. */
function magnitudeShare(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(1, value / max));
}

/** 0 is poor (maroon) and 1 is good (green), independent of bar length. */
function performanceShare(magnitude: number, higherIsBetter: boolean): number {
  return higherIsBetter ? magnitude : 1 - magnitude;
}

function formatFactorValue(id: keyof BuildingScoreValues, value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  if (id === "fci") return formatPercent(value, { digits: 1 });
  if (id === "eui") return formatNumber(value, 1);
  if (id === "age") return formatNumber(value, 0);
  if (id === "survey") return formatNumber(value, value % 1 === 0 ? 0 : 1);
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function BuildingScoreGauge({
  score,
  values,
  compare,
}: {
  score: number | null | undefined;
  factors?: BuildingScoreFactors | null;
  values?: BuildingScoreValues | null;
  compare?: ReactNode;
}) {
  const rawId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const gradId = `building-score-${rawId}`;
  const t = score == null || Number.isNaN(score) ? null : Math.max(0, Math.min(1, score));
  const needle = t == null ? null : pointOnArc(t, R - TRACK / 2 - 2);
  const tipColor = t == null ? colors.muted : scoreColor(t);
  const display = formatBuildingScore(score);

  return (
    <figure className="building-score-gauge">
      <figcaption>
        Composite building score
        <HelpTip label="Composite building score">{BUILDING_SCORE_TIP}</HelpTip>
      </figcaption>
      <div className="building-score-gauge-body">
      <div className="building-score-gauge-stack">
        <div className="building-score-gauge-plot">
        <svg
          className="building-score-gauge-svg"
          viewBox={`0 4 ${W} ${H - 4}`}
          preserveAspectRatio="xMidYMax meet"
              role="img"
              aria-label={
                t == null
                  ? "Composite building score is not available"
                  : `Composite building score ${display} out of 100`
              }
            >
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={SYMBOLOGY_DIVERGING_RAMP[0]} />
                  <stop offset="50%" stopColor={SYMBOLOGY_DIVERGING_RAMP[1]} />
                  <stop offset="100%" stopColor={SYMBOLOGY_DIVERGING_RAMP[2]} />
                </linearGradient>
              </defs>
              <path
                d={arcPath(R)}
                fill="none"
                stroke="var(--mist)"
                strokeWidth={TRACK + 4}
                strokeLinecap="round"
              />
              <path
                d={arcPath(R)}
                fill="none"
                stroke={`url(#${gradId})`}
                strokeWidth={TRACK}
                strokeLinecap="round"
              />
              {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
                const inner = pointOnArc(tick, R - TRACK / 2 - 1);
                const outer = pointOnArc(tick, R + TRACK / 2 + 1);
                return (
                  <line
                    key={tick}
                    x1={inner.x}
                    y1={inner.y}
                    x2={outer.x}
                    y2={outer.y}
                    stroke={colors.paper}
                    strokeWidth={tick === 0 || tick === 0.5 || tick === 1 ? 2 : 1}
                  />
                );
              })}
              {needle ? (
                <line
                  x1={CX}
                  y1={CY}
                  x2={needle.x}
                  y2={needle.y}
                  stroke={colors.navy}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
              ) : null}
              <circle cx={CX} cy={CY} r={6} fill={colors.navy} stroke={colors.paper} strokeWidth={1.5} />
              {needle ? (
                <circle cx={needle.x} cy={needle.y} r={4} fill={tipColor} stroke={colors.paper} strokeWidth={1.2} />
              ) : null}
              <text x={CX} y={CY - 26} textAnchor="middle" className="building-score-gauge-value">
                {display}
              </text>
            </svg>
        </div>
        {compare ? <div className="graphic-compare">{compare}</div> : null}
      </div>
      <div className="building-score-factors">
        {FACTORS.map((factor) => {
          const raw = values?.[factor.id];
          const missing = raw == null || Number.isNaN(raw);
          const magnitude = missing ? null : magnitudeShare(raw, factor.max);
          const isZero = magnitude === 0;
          return (
            <div className="building-score-factor" key={factor.id}>
              <span className="building-score-factor-label">
                {factor.label}
                <span className="building-score-factor-direction">
                  {factor.higherIsBetter ? "Higher is better ↑" : "Lower is better ↓"}
                </span>
              </span>
              <span className="building-score-factor-value">
                {formatFactorValue(factor.id, raw)}
              </span>
              <div className="bar-track" aria-hidden="true">
                <div
                  className={isZero ? "bar-fill is-zero" : "bar-fill"}
                  style={{
                    width: magnitude == null || isZero ? "0%" : `${magnitude * 100}%`,
                    background:
                      magnitude == null
                        ? "transparent"
                        : scoreColor(performanceShare(magnitude, factor.higherIsBetter)),
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </figure>
  );
}
