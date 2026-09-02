import { useState } from "react";
import { formatMoney, formatMoneyExact, formatPercent } from "../lib/format";
import { PRIORITY_SCORES } from "../lib/needs";
import { colors } from "../lib/theme";
import type { PriorityScore } from "../types";
import { HelpTip } from "./Ui";

const SIZE = 168;
const CX = 84;
const CY = 84;
const R_OUT = 72;
const R_IN = 44;
const GAP = 0.04;

export const PRIORITY_COLORS: Record<PriorityScore, string> = {
  "1": colors.magenta,
  "2": colors.purple,
  "3": colors.blue,
  "4": colors.teal,
};

function polar(radius: number, angle: number) {
  return {
    x: CX + Math.cos(angle) * radius,
    y: CY + Math.sin(angle) * radius,
  };
}

function donutSlice(start: number, end: number): string {
  const span = end - start;
  if (span <= 0) return "";
  if (span >= Math.PI * 2 - 0.001) {
    const mid = start + Math.PI;
    const a = polar(R_OUT, start);
    const b = polar(R_OUT, mid);
    const c = polar(R_IN, mid);
    const d = polar(R_IN, start);
    return [
      `M ${a.x.toFixed(2)} ${a.y.toFixed(2)}`,
      `A ${R_OUT} ${R_OUT} 0 1 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`,
      `A ${R_OUT} ${R_OUT} 0 1 1 ${a.x.toFixed(2)} ${a.y.toFixed(2)}`,
      `L ${d.x.toFixed(2)} ${d.y.toFixed(2)}`,
      `A ${R_IN} ${R_IN} 0 1 0 ${c.x.toFixed(2)} ${c.y.toFixed(2)}`,
      `A ${R_IN} ${R_IN} 0 1 0 ${d.x.toFixed(2)} ${d.y.toFixed(2)}`,
      "Z",
    ].join(" ");
  }
  const large = span > Math.PI ? 1 : 0;
  const outerStart = polar(R_OUT, start);
  const outerEnd = polar(R_OUT, end);
  const innerEnd = polar(R_IN, end);
  const innerStart = polar(R_IN, start);
  return [
    `M ${outerStart.x.toFixed(2)} ${outerStart.y.toFixed(2)}`,
    `A ${R_OUT} ${R_OUT} 0 ${large} 1 ${outerEnd.x.toFixed(2)} ${outerEnd.y.toFixed(2)}`,
    `L ${innerEnd.x.toFixed(2)} ${innerEnd.y.toFixed(2)}`,
    `A ${R_IN} ${R_IN} 0 ${large} 0 ${innerStart.x.toFixed(2)} ${innerStart.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

function labelPoint(start: number, end: number) {
  return polar((R_OUT + R_IN) / 2, (start + end) / 2);
}

export function PriorityDonut({
  totals,
  selected,
  onToggle,
}: {
  totals: Record<PriorityScore, number>;
  selected: PriorityScore[];
  onToggle: (score: PriorityScore) => void;
}) {
  const slices = PRIORITY_SCORES.map((score) => ({
    score,
    value: totals[score] ?? 0,
  })).filter((slice) => slice.value > 0);
  const grand = slices.reduce((sum, slice) => sum + slice.value, 0);
  const [hovered, setHovered] = useState<PriorityScore | null>(null);

  if (grand <= 0 || slices.length === 0) return null;

  let cursor = -Math.PI / 2;
  const drawn = slices.map((slice) => {
    const share = slice.value / grand;
    const span = share * Math.PI * 2;
    const gap = slices.length > 1 ? GAP : 0;
    const start = cursor + gap / 2;
    const end = cursor + span - gap / 2;
    cursor += span;
    return { ...slice, share, start, end, path: donutSlice(start, end) };
  });

  const active = drawn.find((slice) => slice.score === hovered) ?? null;
  const centerValue = active ? active.value : grand;
  const centerLabel = active ? `Priority ${active.score}` : "All priorities";

  return (
    <figure className="priority-donut">
      <figcaption>
        Cost by priority
        <HelpTip label="Cost by priority">
          How the repair cost is split by priority. 1 is most urgent and 4 is
          least urgent. Click a slice or use the list to hide a priority.
          Hidden priorities stay gray on the donut.
        </HelpTip>
      </figcaption>
      <svg
        className="priority-donut-svg"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label="Identified facility need cost by priority score"
      >
        {drawn.map((slice) => {
          const on = selected.includes(slice.score);
          const label = labelPoint(slice.start, slice.end);
          return (
            <g
              key={slice.score}
              className={`priority-donut-slice${on ? "" : " is-off"}`}
              role="button"
              tabIndex={0}
              aria-pressed={on}
              aria-label={`Priority ${slice.score}, ${formatMoneyExact(slice.value)}, ${on ? "included" : "excluded"}`}
              onMouseEnter={() => setHovered(slice.score)}
              onMouseLeave={() => setHovered((current) => (current === slice.score ? null : current))}
              onClick={() => onToggle(slice.score)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onToggle(slice.score);
                }
              }}
            >
              <path
                d={slice.path}
                fill={PRIORITY_COLORS[slice.score]}
                stroke={colors.paper}
                strokeWidth={1.2}
              />
              {slice.share >= 0.08 ? (
                <text
                  x={label.x}
                  y={label.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="priority-donut-slice-label"
                >
                  {slice.score}
                </text>
              ) : null}
            </g>
          );
        })}
        <text x={CX} y={CY - 8} textAnchor="middle" className="priority-donut-center-value">
          {formatMoney(centerValue)}
        </text>
        <text x={CX} y={CY + 10} textAnchor="middle" className="priority-donut-center-label">
          {centerLabel}
        </text>
      </svg>
      <div className="priority-donut-legend">
        <p className="priority-donut-legend-label" id="priority-filter-label">
          Show in charts
        </p>
        <div className="priority-donut-keys" role="group" aria-labelledby="priority-filter-label">
          {PRIORITY_SCORES.map((score) => {
            const slice = drawn.find((item) => item.score === score);
            const on = selected.includes(score);
            const disabled = !slice;
            return (
              <button
                key={score}
                type="button"
                className={`priority-donut-key${on ? " is-on" : " is-off"}`}
                aria-pressed={on}
                disabled={disabled}
                onMouseEnter={() => {
                  if (slice) setHovered(score);
                }}
                onMouseLeave={() => setHovered((current) => (current === score ? null : current))}
                onClick={() => onToggle(score)}
              >
                <span
                  className="priority-donut-check"
                  style={on ? { backgroundColor: PRIORITY_COLORS[score] } : undefined}
                  aria-hidden="true"
                />
                <span className="priority-donut-key-name">Priority {score}</span>
                <span className="priority-donut-key-share">
                  {slice ? formatPercent(slice.share) : "—"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </figure>
  );
}
