import { useState } from "react";
import { FCI_BAND_META, FCI_BANDS, type DecadeFciCounts } from "../lib/ageCondition";
import { colors } from "../lib/theme";

export const DYK_PLOT = { width: 420, height: 180 } as const;
export const DYK_HOVER_DIM = 0.28;

export function ChartTooltip({
  text,
  plotWidth = DYK_PLOT.width,
}: {
  text: string;
  plotWidth?: number;
}) {
  const width = Math.min(plotWidth - 12, Math.max(148, 18 + text.length * 6.1));
  return (
    <g pointerEvents="none">
      <rect
        x={plotWidth / 2 - width / 2}
        y={3}
        width={width}
        height={22}
        rx={4}
        fill="#fff"
        stroke={colors.line}
      />
      <text
        x={plotWidth / 2}
        y={18}
        textAnchor="middle"
        className="dyk-chart-tooltip"
      >
        {text}
      </text>
    </g>
  );
}

function niceCeiling(value: number): number {
  if (value <= 5) return 5;
  if (value <= 10) return 10;
  const padded = value * 1.08;
  const mag = 10 ** Math.floor(Math.log10(padded));
  const step = padded / mag <= 2 ? mag / 2 : padded / mag <= 5 ? mag : mag * 2;
  return Math.ceil(padded / step) * step;
}

function ticks(max: number): number[] {
  const count = 4;
  return Array.from({ length: count + 1 }, (_, i) => (max / count) * i);
}

export function AgeFciChart({
  decades,
  maxTotal,
}: {
  decades: DecadeFciCounts[];
  maxTotal: number;
}) {
  const yMax = niceCeiling(maxTotal);
  const width = DYK_PLOT.width;
  const height = DYK_PLOT.height;
  const axisLabelGap = 5;
  const pad = { top: 10, right: 8, bottom: axisLabelGap + 26, left: 36 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const axisY = pad.top + plotH;
  const gap = 6;
  const barW = (plotW - gap * (decades.length - 1)) / decades.length;
  const yTicks = ticks(yMax);
  const [hovered, setHovered] = useState<string | null>(null);
  const active = decades
    .flatMap((row) =>
      FCI_BANDS.map((band) => ({
        key: `${row.label}:${band}`,
        label: row.label,
        band,
        value: row[band],
      })),
    )
    .find((item) => item.key === hovered && item.value > 0);

  return (
    <figure className="chart-shell age-fci">
      <div className="age-fci-legend">
        {FCI_BANDS.map((band) => (
          <span key={band}>
            <i style={{ background: FCI_BAND_META[band].color }} />
            {FCI_BAND_META[band].label}
          </span>
        ))}
      </div>
      <svg
        className="age-fci-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Number of active non-charter Jeffco schools by decade built, stacked by facility condition index: Good, Fair, and Poor"
        onMouseLeave={() => setHovered(null)}
      >
        {yTicks.map((tick) => {
          const y = axisY - (tick / yMax) * plotH;
          return (
            <g key={tick}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={y}
                y2={y}
                className="age-fci-grid"
              />
              <text x={pad.left - 6} y={y + 3} className="age-fci-tick" textAnchor="end">
                {Math.round(tick)}
              </text>
            </g>
          );
        })}
        <text
          className="age-fci-axis-title"
          transform={`translate(12 ${pad.top + plotH / 2}) rotate(-90)`}
          textAnchor="middle"
        >
          Schools
        </text>
        {decades.map((row, index) => {
          const x = pad.left + index * (barW + gap);
          let y = axisY;
          const decadeActive = hovered?.startsWith(`${row.label}:`);
          return (
            <g key={row.label}>
              {FCI_BANDS.map((band) => {
                const value = row[band];
                if (!value) return null;
                const h = (value / yMax) * plotH;
                y -= h;
                const key = `${row.label}:${band}`;
                const isActive = hovered === key;
                const dimmed = Boolean(hovered && !isActive);
                return (
                  <rect
                    key={band}
                    x={x}
                    y={y}
                    width={barW}
                    height={h}
                    fill={FCI_BAND_META[band].color}
                    opacity={dimmed ? DYK_HOVER_DIM : 1}
                    stroke={isActive ? colors.ink : "none"}
                    strokeWidth={isActive ? 1.1 : 0}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() => setHovered(key)}
                  />
                );
              })}
              <text
                x={x + barW / 2}
                y={axisY + axisLabelGap}
                className="age-fci-xlabel"
                textAnchor="end"
                fontWeight={decadeActive ? 800 : undefined}
                transform={`rotate(-42 ${x + barW / 2} ${axisY + axisLabelGap})`}
              >
                {row.label}
              </text>
            </g>
          );
        })}
        {active ? (
          <ChartTooltip
            text={`${active.label} · ${FCI_BAND_META[active.band].label}: ${active.value} school${active.value === 1 ? "" : "s"}`}
          />
        ) : null}
      </svg>
      <div className="dyk-chart-x-title">Year of School Construction</div>
    </figure>
  );
}
