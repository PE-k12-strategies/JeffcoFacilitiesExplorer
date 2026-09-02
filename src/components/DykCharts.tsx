import { useState, type ReactNode } from "react";
import {
  changeFill,
  CURRENT_ENROLLMENT_YEAR,
  CURRENT_ENROLLMENT_YEAR_LABEL,
  HISTORICAL_ENROLLMENT_YEAR,
  JEFFCO_BIRTHS,
  CONSTRUCTION_COST_INDEX,
  PROJECTED_ENROLLMENT_YEAR,
  PROJECTED_ENROLLMENT_YEAR_LABEL,
  schoolYearLabel,
  type AdequacyStats,
  type ArticulationChangeStats,
  type DecadeReplacement,
  type EnrollmentTrendStats,
  type NamedValue,
  type PriorityStats,
  type ReplacementStats,
} from "../lib/districtCharts";
import { formatMoney, formatNumber, formatSignedPercent } from "../lib/format";
import { colors } from "../lib/theme";
import { ChartTooltip, DYK_HOVER_DIM, DYK_PLOT } from "./AgeFciChart";
import { HelpTip } from "./Ui";

function niceCeiling(value: number): number {
  if (value <= 5) return 5;
  if (value <= 10) return 10;
  const padded = value * 1.08;
  const mag = 10 ** Math.floor(Math.log10(padded));
  const step = padded / mag <= 2 ? mag / 2 : padded / mag <= 5 ? mag : mag * 2;
  return Math.ceil(padded / step) * step;
}

function ticksFrom(min: number, max: number, count = 4): number[] {
  if (max <= min) return [min];
  return Array.from({ length: count + 1 }, (_, i) => min + ((max - min) / count) * i);
}

function ChartFrame({
  label,
  legend,
  yTitle,
  children,
}: {
  label: string;
  legend?: Array<{ label: string; color: string; dashed?: boolean }>;
  yTitle?: ReactNode;
  children: ReactNode;
}) {
  return (
    <figure className="chart-shell dyk-chart">
      {legend ? (
        <div className="dyk-chart-legend">
          {legend.map((item) => (
            <span key={item.label}>
              <i
                className={item.dashed ? "is-dashed" : undefined}
                style={{
                  background: item.dashed ? "transparent" : item.color,
                  color: item.color,
                  borderColor: item.color,
                }}
              />
              {item.label}
            </span>
          ))}
        </div>
      ) : null}
      <div className="dyk-chart-plot">
        {yTitle ? <div className="dyk-chart-y-title">{yTitle}</div> : null}
        <div role="img" aria-label={label}>
          {children}
        </div>
      </div>
    </figure>
  );
}

function formatAxisMoney(value: number): string {
  if (value === 0) return "$0";
  if (value >= 1_000_000_000) {
    const billions = value / 1_000_000_000;
    return `$${billions.toFixed(billions >= 10 || billions % 1 === 0 ? 0 : 1)}B`;
  }
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${Math.round(value)}`;
}

function formatStudents(value: number): string {
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return String(Math.round(value));
}

function VerticalBars({
  rows,
  yLabel,
  xLabel,
  formatTick,
  formatTooltip,
  padLeft = 40,
  yLabelX = 11,
  extraBottom = 0,
  rotateXLabels = true,
}: {
  rows: Array<{ label: string; segments: Array<{ key: string; value: number; color: string }> }>;
  yLabel: string;
  xLabel?: ReactNode;
  formatTick: (value: number) => string;
  formatTooltip?: (
    row: { label: string },
    segment: { key: string; value: number },
  ) => string;
  padLeft?: number;
  yLabelX?: number;
  extraBottom?: number;
  rotateXLabels?: boolean;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const totals = rows.map((row) =>
    row.segments.reduce((sum, segment) => sum + segment.value, 0),
  );
  const yMax = niceCeiling(Math.max(1, ...totals));
  const width = DYK_PLOT.width;
  const height = DYK_PLOT.height + extraBottom;
  const pad = { top: 10, right: 8, bottom: 32 + extraBottom, left: padLeft };
  const plotW = width - pad.left - pad.right;
  const plotH = DYK_PLOT.height - 10 - 32;
  const axisY = pad.top + plotH;
  const xlabelY = axisY + 5 + extraBottom;
  const gap = 6;
  const barW = (plotW - gap * Math.max(0, rows.length - 1)) / Math.max(1, rows.length);
  const yTicks = ticksFrom(0, yMax);
  const active = rows
    .flatMap((row) =>
      row.segments.map((segment) => ({
        id: `${row.label}:${segment.key}`,
        row,
        segment,
      })),
    )
    .find((item) => item.id === hovered && item.segment.value > 0);
  const tooltipText = active
    ? (formatTooltip?.(active.row, active.segment) ??
      (active.segment.key === active.row.label
        ? `${active.row.label}: ${formatTick(active.segment.value)}`
        : `${active.row.label} · ${active.segment.key}: ${formatTick(active.segment.value)}`))
    : null;

  return (
    <>
    <svg
      className="dyk-chart-svg"
      viewBox={`0 0 ${width} ${height}`}
      onMouseLeave={() => setHovered(null)}
    >
      {yTicks.map((tick) => {
        const y = axisY - (tick / yMax) * plotH;
        return (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} className="dyk-chart-gridline" />
            <text x={pad.left - 6} y={y + 3} className="dyk-chart-tick" textAnchor="end">
              {formatTick(tick)}
            </text>
          </g>
        );
      })}
      <text
        className="dyk-chart-axis"
        transform={`translate(${yLabelX} ${pad.top + plotH / 2}) rotate(-90)`}
        textAnchor="middle"
      >
        {yLabel}
      </text>
      {rows.map((row, index) => {
        const x = pad.left + index * (barW + gap);
        let y = axisY;
        const rowActive = hovered?.startsWith(`${row.label}:`);
        return (
          <g key={row.label}>
            {row.segments.map((segment) => {
              if (!segment.value) return null;
              const h = (segment.value / yMax) * plotH;
              y -= h;
              const id = `${row.label}:${segment.key}`;
              const isActive = hovered === id;
              const dimmed = Boolean(hovered && !isActive);
              return (
                <rect
                  key={segment.key}
                  x={x}
                  y={y}
                  width={barW}
                  height={h}
                  fill={segment.color}
                  opacity={dimmed ? DYK_HOVER_DIM : 1}
                  stroke={isActive ? colors.ink : "none"}
                  strokeWidth={isActive ? 1.1 : 0}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHovered(id)}
                />
              );
            })}
            <text
              x={x + barW / 2}
              y={rotateXLabels ? xlabelY : axisY + 16}
              className="dyk-chart-xlabel"
              textAnchor={rotateXLabels ? "end" : "middle"}
              fontWeight={rowActive ? 800 : undefined}
              transform={
                rotateXLabels
                  ? `rotate(-42 ${x + barW / 2} ${xlabelY})`
                  : undefined
              }
            >
              {row.label}
            </text>
          </g>
        );
      })}
      {tooltipText ? <ChartTooltip text={tooltipText} /> : null}
    </svg>
    {xLabel ? <div className="dyk-chart-x-title">{xLabel}</div> : null}
    </>
  );
}

function HorizontalBars({
  rows,
  formatValue,
  diverge = false,
  showValues = true,
  labelPad = 92,
  plotHeight,
}: {
  rows: Array<{ label: string; value: number; color: string; title?: string }>;
  formatValue: (value: number) => string;
  diverge?: boolean;
  showValues?: boolean;
  labelPad?: number;
  plotHeight?: number;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const width = DYK_PLOT.width;
  const height = plotHeight ?? DYK_PLOT.height;
  const fillPlot = plotHeight != null;
  const pad = {
    top: fillPlot ? 2 : 4,
    right: showValues && !diverge ? 48 : 12,
    bottom: fillPlot ? 2 : 4,
    left: labelPad,
  };
  const rowH = (height - pad.top - pad.bottom) / Math.max(1, rows.length);
  const barH = Math.max(4, Math.min(9, rowH - (fillPlot ? 6 : 3)));
  const plotW = width - pad.left - pad.right;
  const maxAbs = Math.max(
    0.01,
    ...rows.map((row) => Math.abs(row.value)),
  );
  const maxPos = Math.max(0.01, ...rows.map((row) => row.value));
  const zeroX = diverge ? pad.left + plotW / 2 : pad.left;
  const active = rows.find((row) => row.label === hovered) ?? null;

  return (
    <svg
      className="dyk-chart-svg"
      viewBox={`0 0 ${width} ${height}`}
      onMouseLeave={() => setHovered(null)}
    >
      {diverge ? (
        <line
          x1={zeroX}
          x2={zeroX}
          y1={pad.top}
          y2={height - pad.bottom}
          className="dyk-chart-zero"
        />
      ) : null}
      {rows.map((row, index) => {
        const y = pad.top + index * rowH + Math.max(0, (rowH - barH) / 2);
        const span = diverge ? plotW / 2 : plotW;
        const mag = diverge ? maxAbs : maxPos;
        const w = (Math.abs(row.value) / mag) * span;
        const x = diverge && row.value < 0 ? zeroX - w : zeroX;
        const dimmed = Boolean(hovered && hovered !== row.label);
        return (
          <g
            key={row.label}
            opacity={dimmed ? DYK_HOVER_DIM : 1}
            style={{ cursor: "pointer" }}
            onMouseEnter={() => setHovered(row.label)}
          >
            <rect
              x={0}
              y={pad.top + index * rowH}
              width={width}
              height={rowH}
              fill="transparent"
            />
            <text
              x={pad.left - 6}
              y={y + barH - 1}
              className="dyk-chart-ylabel"
              textAnchor="end"
              fontWeight={hovered === row.label ? 800 : undefined}
            >
              {row.label}
            </text>
            <rect
              x={x}
              y={y}
              width={Math.max(w, row.value ? 1.5 : 0)}
              height={barH}
              fill={row.color}
              stroke={hovered === row.label ? colors.ink : "none"}
              strokeWidth={hovered === row.label ? 1.1 : 0}
            />
            {showValues ? (
              <text
                x={x + Math.max(w, 0) + 3}
                y={y + barH - 1}
                className="dyk-chart-tick"
                textAnchor="start"
              >
                {formatValue(row.value)}
              </text>
            ) : null}
          </g>
        );
      })}
      {active ? (
        <ChartTooltip text={active.title ?? `${active.label} ${formatValue(active.value)}`} />
      ) : null}
    </svg>
  );
}

export function ReplacementCostChart({ stats }: { stats: ReplacementStats }) {
  return (
    <ChartFrame
      label="Estimated building replacement cost by decade, split between buildings 50 years and older and newer buildings"
      legend={[
        { label: "50+ years", color: colors.magenta },
        { label: "Newer", color: colors.teal },
      ]}
    >
      <VerticalBars
        yLabel="Est. Cost"
        xLabel="Year of School Construction"
        padLeft={56}
        yLabelX={8}
        formatTick={formatAxisMoney}
        formatTooltip={(row, segment) =>
          `${row.label} · ${segment.key}: ${formatMoney(segment.value)}`
        }
        rows={stats.decades.map((row: DecadeReplacement) => ({
          label: row.label,
          segments: [
            { key: "50+ years", value: row.older, color: colors.magenta },
            { key: "Newer", value: row.newer, color: colors.teal },
          ],
        }))}
      />
    </ChartFrame>
  );
}

export function PriorityProjectsChart({ stats }: { stats: PriorityStats }) {
  const rows = stats.byAsset.map((item) => ({
    ...item,
    title: `${item.label}: ${formatMoney(item.value)}`,
  }));
  return (
    <ChartFrame label="Identified facility deficiency cost by building system">
      <HorizontalBars
        rows={rows}
        formatValue={formatMoney}
        labelPad={118}
        plotHeight={Math.max(DYK_PLOT.height, rows.length * 15 + 8)}
      />
    </ChartFrame>
  );
}

export function EducationalAdequacyChart({ stats }: { stats: AdequacyStats }) {
  return (
    <ChartFrame
      label="Number of schools by educational adequacy score"
      legend={[
        { label: "Below 0.70", color: colors.magenta },
        { label: "0.70 and above", color: colors.teal },
      ]}
    >
      <VerticalBars
        yLabel="Schools"
        rotateXLabels={false}
        extraBottom={6}
        xLabel={
          <>
            Educational Adequacy Score
            <HelpTip label="Educational Adequacy Score">
              A score for how well a building supports teaching and learning,
              not how worn the building is.
            </HelpTip>
          </>
        }
        formatTick={(value) => String(Math.round(value))}
        formatTooltip={(row, segment) =>
          `${row.label}: ${Math.round(segment.value)} school${Math.round(segment.value) === 1 ? "" : "s"}`
        }
        rows={stats.bins.map((bin: NamedValue) => ({
          label: bin.label,
          segments: [{ key: bin.label, value: bin.value, color: bin.color }],
        }))}
      />
    </ChartFrame>
  );
}

export function EnrollmentTrendChart({ stats }: { stats: EnrollmentTrendStats }) {
  const series = stats.series.length >= 2
    ? stats.series
    : stats.points.map((point) => ({ year: point.year ?? 0, value: point.value }));
  const width = DYK_PLOT.width;
  const height = DYK_PLOT.height;
  const pad = { top: 10, right: 16, bottom: 28, left: 52 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const axisY = pad.top + plotH;
  const xMin = series[0]?.year ?? HISTORICAL_ENROLLMENT_YEAR;
  const xMax = series[series.length - 1]?.year ?? PROJECTED_ENROLLMENT_YEAR;
  const rawMin = Math.min(...series.map((point) => point.value));
  const rawMax = Math.max(...series.map((point) => point.value), 1);
  const yMin = Math.max(0, Math.floor((rawMin * 0.92) / 5000) * 5000);
  const yMax = Math.max(niceCeiling(rawMax), yMin + 10_000);
  const yTicks = ticksFrom(yMin, yMax);
  const xTicks = [2015, 2020, 2025, 2030].filter((year) => year >= xMin && year <= xMax);

  function xOf(year: number) {
    return pad.left + ((year - xMin) / Math.max(xMax - xMin, 1)) * plotW;
  }
  function yOf(value: number) {
    return axisY - ((Math.max(value, yMin) - yMin) / (yMax - yMin)) * plotH;
  }

  const plotted = series.map((point) => ({
    ...point,
    x: xOf(point.year),
    y: yOf(point.value),
    projected: point.year > CURRENT_ENROLLMENT_YEAR,
    label: `${schoolYearLabel(point.year)}: ${formatNumber(point.value)} students${
      point.year > CURRENT_ENROLLMENT_YEAR ? " (projected)" : ""
    }`,
  }));
  const historicPts = plotted.filter((point) => point.year <= CURRENT_ENROLLMENT_YEAR);
  const projectedPts = plotted.filter((point) => point.year >= CURRENT_ENROLLMENT_YEAR);
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);
  const activePoint = plotted.find((point) => point.year === hoveredYear) ?? null;

  function areaPath(points: Array<{ x: number; y: number }>) {
    if (points.length < 2) return "";
    const top = points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
      .join(" ");
    return `${top} L ${points[points.length - 1].x.toFixed(1)} ${axisY} L ${points[0].x.toFixed(1)} ${axisY} Z`;
  }
  function linePath(points: Array<{ x: number; y: number }>) {
    return points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
      .join(" ");
  }

  return (
    <ChartFrame
      label={`District enrollment from ${schoolYearLabel(HISTORICAL_ENROLLMENT_YEAR)} to ${PROJECTED_ENROLLMENT_YEAR_LABEL}, with current counts for ${CURRENT_ENROLLMENT_YEAR_LABEL} and projected enrollment through ${PROJECTED_ENROLLMENT_YEAR_LABEL}`}
      legend={[
        { label: "Historic", color: colors.navy },
        { label: `Projected (${PROJECTED_ENROLLMENT_YEAR_LABEL})`, color: colors.magenta, dashed: true },
      ]}
    >
      <svg
        className="dyk-chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        onMouseLeave={() => setHoveredYear(null)}
      >
        {yTicks.map((tick) => {
          const y = yOf(tick);
          return (
            <g key={tick}>
              <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} className="dyk-chart-gridline" />
              <text x={pad.left - 6} y={y + 3} className="dyk-chart-tick" textAnchor="end">
                {formatStudents(tick)}
              </text>
            </g>
          );
        })}
        <text
          className="dyk-chart-axis"
          transform={`translate(10 ${pad.top + plotH / 2}) rotate(-90)`}
          textAnchor="middle"
        >
          Total Jeffco Enrollment
        </text>
        {xTicks.map((year) => (
          <text
            key={year}
            x={xOf(year)}
            y={axisY + 16}
            className="dyk-chart-tick"
            textAnchor="middle"
            fontWeight={activePoint?.year === year ? 800 : undefined}
          >
            {schoolYearLabel(year)}
          </text>
        ))}
        {historicPts.length > 1 ? (
          <path d={areaPath(historicPts)} fill={colors.navy} fillOpacity={0.16} pointerEvents="none" />
        ) : null}
        {projectedPts.length > 1 ? (
          <path d={areaPath(projectedPts)} fill={colors.magenta} fillOpacity={0.14} pointerEvents="none" />
        ) : null}
        {historicPts.length > 1 ? (
          <path
            d={linePath(historicPts)}
            fill="none"
            stroke={colors.navy}
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={!activePoint || !activePoint.projected ? 1 : DYK_HOVER_DIM}
            pointerEvents="none"
          />
        ) : null}
        {projectedPts.length > 1 ? (
          <path
            d={linePath(projectedPts)}
            fill="none"
            stroke={colors.magenta}
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 5"
            opacity={!activePoint || activePoint.projected || activePoint.year === CURRENT_ENROLLMENT_YEAR ? 1 : DYK_HOVER_DIM}
            pointerEvents="none"
          />
        ) : null}
        {plotted.map((point) => {
          const isActive = activePoint?.year === point.year;
          const dimmed = Boolean(hoveredYear != null && !isActive);
          const fill = point.projected
            ? "#fff"
            : point.year === CURRENT_ENROLLMENT_YEAR
              ? colors.purple
              : colors.navy;
          const stroke = point.projected
            ? colors.magenta
            : point.year === CURRENT_ENROLLMENT_YEAR
              ? colors.navy
              : "none";
          return (
            <g key={point.year} style={{ cursor: "pointer" }} onMouseEnter={() => setHoveredYear(point.year)}>
              <circle cx={point.x} cy={point.y} r={8} fill="transparent" />
              <circle
                cx={point.x}
                cy={point.y}
                r={isActive ? 5 : 3.25}
                fill={fill}
                stroke={isActive ? colors.ink : stroke}
                strokeWidth={isActive ? 1.2 : point.projected ? 2 : point.year === CURRENT_ENROLLMENT_YEAR ? 1 : 0}
                opacity={dimmed ? DYK_HOVER_DIM : 1}
                pointerEvents="none"
              />
            </g>
          );
        })}
        {activePoint ? <ChartTooltip text={activePoint.label} /> : null}
      </svg>
    </ChartFrame>
  );
}

export function ArticulationChangeBars({ stats }: { stats: ArticulationChangeStats }) {
  return (
    <ChartFrame
      label="Percent enrollment change from historical to current by articulation area"
      legend={[
        { label: "Loss", color: colors.magenta },
        { label: "Growth", color: colors.teal },
      ]}
    >
      <HorizontalBars
        diverge
        showValues={false}
        formatValue={(value) => formatSignedPercent(value, { digits: 1 })}
        rows={stats.rows.map((row) => ({
          label: row.name,
          value: row.change ?? 0,
          color: changeFill(row.change, stats.maxAbsChange),
          title: `${row.name}: ${formatSignedPercent(row.change, { digits: 1 })} (${formatNumber(row.historical)} → ${formatNumber(row.current)})`,
        }))}
      />
    </ChartFrame>
  );
}

export function BirthRateChart() {
  const width = DYK_PLOT.width;
  const height = DYK_PLOT.height;
  const pad = { top: 10, right: 12, bottom: 28, left: 52 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const axisY = pad.top + plotH;
  const xMin = JEFFCO_BIRTHS[0]?.year ?? 2014;
  const xMax = JEFFCO_BIRTHS[JEFFCO_BIRTHS.length - 1]?.year ?? 2023;
  const yMin = 5_000;
  const yMax = 6_000;
  const yTicks = ticksFrom(yMin, yMax, 2);
  const xTicks = JEFFCO_BIRTHS.map((row) => row.year);

  function xOf(year: number) {
    return pad.left + ((year - xMin) / (xMax - xMin || 1)) * plotW;
  }
  function yOf(value: number) {
    return axisY - ((Math.max(value, yMin) - yMin) / (yMax - yMin)) * plotH;
  }

  const points = JEFFCO_BIRTHS.map((row) => ({
    ...row,
    x: xOf(row.year),
    y: yOf(row.value),
  }));
  const [hovered, setHovered] = useState<number | null>(null);
  const active = points.find((point) => point.year === hovered) ?? null;

  return (
    <ChartFrame label="Jefferson County live births, 2014 to 2023">
      <svg
        className="dyk-chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        onMouseLeave={() => setHovered(null)}
      >
        {yTicks.map((tick) => {
          const y = yOf(tick);
          return (
            <g key={tick}>
              <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} className="dyk-chart-gridline" />
              <text x={pad.left - 6} y={y + 3} className="dyk-chart-tick" textAnchor="end">
                {Math.round(tick).toLocaleString("en-US")}
              </text>
            </g>
          );
        })}
        <text
          className="dyk-chart-axis"
          transform={`translate(10 ${pad.top + plotH / 2}) rotate(-90)`}
          textAnchor="middle"
        >
          Births in Jeffco
        </text>
        {xTicks.map((year) => (
          <text
            key={year}
            x={xOf(year)}
            y={axisY + 16}
            className="dyk-chart-tick"
            textAnchor="middle"
            fontWeight={hovered === year ? 800 : undefined}
          >
            {year}
          </text>
        ))}
        {points.map((point, index) => {
          if (index === 0) return null;
          const prev = points[index - 1];
          const isActive = hovered === point.year || hovered === prev.year;
          return (
            <g key={`seg-${point.year}`}>
              <line
                x1={prev.x}
                y1={prev.y}
                x2={point.x}
                y2={point.y}
                stroke="transparent"
                strokeWidth={12}
                strokeLinecap="round"
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHovered(point.year)}
              />
              <line
                x1={prev.x}
                y1={prev.y}
                x2={point.x}
                y2={point.y}
                stroke={colors.navy}
                strokeWidth={isActive ? 3 : 2.4}
                strokeLinecap="round"
                opacity={!hovered || isActive ? 1 : DYK_HOVER_DIM}
                pointerEvents="none"
              />
            </g>
          );
        })}
        {points.map((point) => {
          const isActive = hovered === point.year;
          const dimmed = Boolean(hovered && !isActive);
          return (
            <g
              key={point.year}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHovered(point.year)}
            >
              <circle cx={point.x} cy={point.y} r={10} fill="transparent" />
              <circle
                cx={point.x}
                cy={point.y}
                r={isActive ? 5.5 : 3.5}
                fill={colors.navy}
                stroke={isActive ? colors.ink : "none"}
                strokeWidth={isActive ? 1.2 : 0}
                opacity={dimmed ? DYK_HOVER_DIM : 1}
                pointerEvents="none"
              />
            </g>
          );
        })}
        {active ? (
          <ChartTooltip text={`${active.year}: ${formatNumber(active.value)} births`} />
        ) : null}
      </svg>
    </ChartFrame>
  );
}

const NATIONAL_COST_FILL = "#c9c9c9";

export function ConstructionCostChart() {
  const rows = CONSTRUCTION_COST_INDEX;
  const width = DYK_PLOT.width;
  const height = DYK_PLOT.height;
  const pad = { top: 10, right: 10, bottom: 28, left: 56 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const axisY = pad.top + plotH;
  const yMin = 100;
  const yMax = 210;
  const yTicks = ticksFrom(yMin, yMax, 5);
  const gap = 4;
  const barW = (plotW - gap * Math.max(0, rows.length - 1)) / Math.max(1, rows.length);
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);
  const active = rows.find((row) => row.year === hoveredYear) ?? null;

  function xOf(year: number) {
    const index = rows.findIndex((row) => row.year === year);
    return pad.left + index * (barW + gap) + barW / 2;
  }
  function yOf(value: number) {
    return axisY - ((value - yMin) / (yMax - yMin)) * plotH;
  }

  const denverPath = rows
    .map((row, index) => `${index === 0 ? "M" : "L"} ${xOf(row.year).toFixed(1)} ${yOf(row.denver).toFixed(1)}`)
    .join(" ");

  return (
    <ChartFrame
      label="Construction cost index from 2016 to 2026, national average versus Denver, January 2009 equals 100"
      legend={[
        { label: "Denver", color: colors.blue },
        { label: "National", color: NATIONAL_COST_FILL },
      ]}
      yTitle={
        <>
          Construction Cost Index
          <HelpTip label="Construction Cost Index">
            This index is updated every three months from the price of a typical
            non-residential building project. Source: Mortensen.
          </HelpTip>
        </>
      }
    >
      <svg
        className="dyk-chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        onMouseLeave={() => setHoveredYear(null)}
      >
        {yTicks.map((tick) => {
          const y = yOf(tick);
          return (
            <g key={tick}>
              <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} className="dyk-chart-gridline" />
              <text x={pad.left - 6} y={y + 3} className="dyk-chart-tick" textAnchor="end">
                {Math.round(tick)}
              </text>
            </g>
          );
        })}
        {rows.map((row) => {
          const x = xOf(row.year) - barW / 2;
          const y = yOf(row.national);
          const isActive = hoveredYear === row.year;
          const dimmed = Boolean(hoveredYear != null && !isActive);
          return (
            <rect
              key={`bar-${row.year}`}
              x={x}
              y={y}
              width={barW}
              height={Math.max(0, axisY - y)}
              fill={NATIONAL_COST_FILL}
              opacity={dimmed ? DYK_HOVER_DIM : 1}
              stroke={isActive ? colors.ink : "none"}
              strokeWidth={isActive ? 1.1 : 0}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHoveredYear(row.year)}
            />
          );
        })}
        <path
          d={denverPath}
          fill="none"
          stroke={colors.blue}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          pointerEvents="none"
        />
        {rows.map((row) => {
          const x = xOf(row.year);
          const y = yOf(row.denver);
          const isActive = hoveredYear === row.year;
          const dimmed = Boolean(hoveredYear != null && !isActive);
          return (
            <g
              key={`pt-${row.year}`}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHoveredYear(row.year)}
            >
              <circle cx={x} cy={y} r={10} fill="transparent" />
              <circle
                cx={x}
                cy={y}
                r={isActive ? 4.5 : 3}
                fill={colors.blue}
                stroke={isActive ? colors.ink : "none"}
                strokeWidth={isActive ? 1.2 : 0}
                opacity={dimmed ? DYK_HOVER_DIM : 1}
                pointerEvents="none"
              />
            </g>
          );
        })}
        {rows.map((row) => (
          <text
            key={`x-${row.year}`}
            x={xOf(row.year)}
            y={axisY + 16}
            className="dyk-chart-tick"
            textAnchor="middle"
            fontWeight={hoveredYear === row.year ? 800 : undefined}
          >
            {row.year}
          </text>
        ))}
        {active ? (
          <ChartTooltip
            text={`${active.year} · National ${active.national.toFixed(1)} · Denver ${active.denver.toFixed(1)}`}
          />
        ) : null}
      </svg>
    </ChartFrame>
  );
}
