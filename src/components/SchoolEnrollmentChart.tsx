import { useLayoutEffect, useRef, useState } from "react";
import {
  CURRENT_ENROLLMENT_YEAR,
  CURRENT_ENROLLMENT_YEAR_LABEL,
  HISTORICAL_ENROLLMENT_YEAR,
  PROJECTED_ENROLLMENT_YEAR,
  PROJECTED_ENROLLMENT_YEAR_LABEL,
  schoolYearLabel,
} from "../lib/districtCharts";
import {
  chartEnrollmentSeries,
  chartPkSeries,
  hasPkOverlay,
  k12CountForYear,
  pkCountForYear,
} from "../lib/enrollmentStats";
import { formatNumber, temporaryCapacityNote } from "../lib/format";
import { colors } from "../lib/theme";
import type { School } from "../types";
import { ChartTooltip, DYK_HOVER_DIM } from "./AgeFciChart";

const PLOT = { width: 420, height: 156 } as const;
const X_TICKS = [2015, 2020, 2025, 2030];
const PK_PROJECTED = "#7EC9AD";

function niceCeiling(value: number): number {
  if (value <= 5) return 5;
  if (value <= 10) return 10;
  const padded = value * 1.08;
  const mag = 10 ** Math.floor(Math.log10(padded));
  const step = padded / mag <= 2 ? mag / 2 : padded / mag <= 5 ? mag : mag * 2;
  return Math.ceil(padded / step) * step;
}

function ticksFrom(min: number, max: number, count = 3): number[] {
  if (max <= min) return [min];
  return Array.from({ length: count + 1 }, (_, i) => min + ((max - min) / count) * i);
}

function formatStudents(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  return String(Math.round(value));
}

function areaPath(
  points: Array<{ x: number; y: number }>,
  axisY: number,
): string {
  if (points.length < 2) return "";
  const top = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
  const last = points[points.length - 1];
  const first = points[0];
  return `${top} L ${last.x.toFixed(1)} ${axisY} L ${first.x.toFixed(1)} ${axisY} Z`;
}

function bandPath(
  lower: Array<{ x: number; y: number }>,
  upper: Array<{ x: number; y: number }>,
): string {
  if (lower.length < 2 || upper.length < 2) return "";
  const top = upper
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
  const bottom = [...lower]
    .reverse()
    .map((point) => `L ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
  return `${top} ${bottom} Z`;
}

function linePath(points: Array<{ x: number; y: number }>): string {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
}

export function SchoolEnrollmentChart({
  school,
  includePk,
  onIncludePkChange,
}: {
  school: School;
  includePk: boolean;
  onIncludePkChange: (next: boolean) => void;
}) {
  const series = chartEnrollmentSeries(school, false);
  const pkSeries = includePk && hasPkOverlay(school) ? chartPkSeries(school) : [];
  const plotRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(PLOT);
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);

  useLayoutEffect(() => {
    const node = plotRef.current;
    if (!node) return;

    function measure() {
      const rect = node.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      setSize((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height },
      );
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [series.length]);

  if (series.length < 2) return null;

  const stackedMax = Math.max(
    ...series.map((point) => point.students + pkCountForYear(school, point.year)),
    ...(hasPkOverlay(school)
      ? chartPkSeries(school).map((point) => k12CountForYear(school, point.year) + point.students)
      : []),
  );
  const capacity = school.capacity != null && school.capacity > 0 ? school.capacity : null;
  const tempNote = temporaryCapacityNote(school);
  const yMin = 0;
  const yMax = Math.max(niceCeiling(Math.max(stackedMax, capacity ?? 0)), 1);
  const pad = { top: 22, right: 16, bottom: 26, left: 36 };
  const plotW = Math.max(1, size.width - pad.left - pad.right);
  const plotH = Math.max(1, size.height - pad.top - pad.bottom);
  const axisY = pad.top + plotH;
  const xMin = HISTORICAL_ENROLLMENT_YEAR;
  const xMax = PROJECTED_ENROLLMENT_YEAR;

  function xOf(year: number) {
    return pad.left + ((year - xMin) / Math.max(xMax - xMin, 1)) * plotW;
  }
  function yOf(value: number) {
    return axisY - ((value - yMin) / (yMax - yMin)) * plotH;
  }

  const plotted = series.map((point) => {
    const pk = includePk ? pkCountForYear(school, point.year) : 0;
    const total = point.students + pk;
    const pkNote =
      includePk && pkSeries.length && pk > 0
        ? ` · ${formatNumber(point.students)} K–12 · ${formatNumber(pk)} PK`
        : "";
    return {
      ...point,
      x: xOf(point.year),
      y: yOf(point.students),
      projected: point.year > CURRENT_ENROLLMENT_YEAR,
      label: `${schoolYearLabel(point.year)}: ${formatNumber(includePk ? total : point.students)} students${pkNote}${
        point.year > CURRENT_ENROLLMENT_YEAR ? " (projected)" : ""
      }${capacity != null ? ` · Permanent capacity: ${formatNumber(capacity)}` : ""}`,
    };
  });
  const pkPlotted = pkSeries.map((point) => {
    const k12 = k12CountForYear(school, point.year);
    return {
      ...point,
      k12,
      x: xOf(point.year),
      y: yOf(k12 + point.students),
      yBase: yOf(k12),
      projected: point.year > CURRENT_ENROLLMENT_YEAR,
    };
  });
  const historicPts = plotted.filter((point) => point.year <= CURRENT_ENROLLMENT_YEAR);
  const projectedPts = plotted.filter((point) => point.year >= CURRENT_ENROLLMENT_YEAR);
  const pkHistoricPts = pkPlotted.filter((point) => point.year <= CURRENT_ENROLLMENT_YEAR);
  const pkProjectedPts = pkPlotted.filter((point) => point.year >= CURRENT_ENROLLMENT_YEAR);
  const activePoint = plotted.find((point) => point.year === hoveredYear) ?? null;

  return (
    <figure className="enrollment-chart">
      <div className="enrollment-chart-toolbar">
        <div className="dyk-chart-legend">
          <span>
            <i style={{ background: colors.navy, borderColor: colors.navy }} />
            Historic
          </span>
          <span>
            <i className="is-dashed" style={{ color: colors.magenta, borderColor: colors.magenta }} />
            Projected
          </span>
          {pkSeries.length ? (
            <span>
              <i style={{ background: colors.teal, borderColor: colors.teal }} />
              PK
            </span>
          ) : null}
          {pkProjectedPts.length ? (
            <span>
              <i className="is-dashed" style={{ color: PK_PROJECTED, borderColor: PK_PROJECTED }} />
              Projected PK
            </span>
          ) : null}
          {capacity != null ? (
            <span>
              <i className="is-dotted" style={{ color: "var(--compare-near)" }} />
              Permanent capacity
            </span>
          ) : null}
        </div>
        <label className="enrollment-pk-toggle">
          <input
            type="checkbox"
            checked={includePk}
            onChange={(event) => onIncludePkChange(event.target.checked)}
          />
          Include PK
        </label>
      </div>
      <div className="enrollment-chart-plot" ref={plotRef}>
        <svg
          className="dyk-chart-svg"
          viewBox={`0 0 ${size.width} ${size.height}`}
          role="img"
          aria-label={`Enrollment from ${schoolYearLabel(HISTORICAL_ENROLLMENT_YEAR)} to ${PROJECTED_ENROLLMENT_YEAR_LABEL}${includePk ? ", with pre-K stacked on K–12" : ", excluding pre-K"}. Historic counts are a solid line; years after ${CURRENT_ENROLLMENT_YEAR_LABEL} are projected.${
            capacity != null
              ? ` A gold dotted line shows permanent instructional capacity${tempNote ? `; ${tempNote}` : ""}.`
              : ""
          }`}
          onMouseLeave={() => setHoveredYear(null)}
        >
        {ticksFrom(yMin, yMax, size.height > 220 ? 4 : 3).map((tick) => {
          const y = yOf(tick);
          return (
            <g key={tick}>
              <line
                x1={pad.left}
                x2={size.width - pad.right}
                y1={y}
                y2={y}
                className="dyk-chart-gridline"
              />
              <text x={pad.left - 6} y={y + 3} className="dyk-chart-tick" textAnchor="end">
                {formatStudents(tick)}
              </text>
            </g>
          );
        })}
        {X_TICKS.filter((year) => year >= xMin && year <= xMax).map((year) => (
          <text
            key={year}
            x={xOf(year)}
            y={axisY + 16}
            className="dyk-chart-tick"
            textAnchor="middle"
          >
            {schoolYearLabel(year)}
          </text>
        ))}
        {historicPts.length > 1 ? (
          <path
            d={areaPath(historicPts, axisY)}
            fill={colors.navy}
            fillOpacity={0.16}
            pointerEvents="none"
          />
        ) : null}
        {projectedPts.length > 1 ? (
          <path
            d={areaPath(projectedPts, axisY)}
            fill={colors.magenta}
            fillOpacity={0.14}
            pointerEvents="none"
          />
        ) : null}
        {pkHistoricPts.length > 1 ? (
          <path
            d={bandPath(pkHistoricPts.map((point) => ({ x: point.x, y: point.yBase })), pkHistoricPts)}
            fill={colors.teal}
            fillOpacity={0.38}
            pointerEvents="none"
          />
        ) : null}
        {pkProjectedPts.length > 1 ? (
          <path
            d={bandPath(pkProjectedPts.map((point) => ({ x: point.x, y: point.yBase })), pkProjectedPts)}
            fill={PK_PROJECTED}
            fillOpacity={0.45}
            pointerEvents="none"
          />
        ) : null}
        {historicPts.length > 1 ? (
          <path
            d={linePath(historicPts)}
            fill="none"
            stroke={colors.navy}
            strokeWidth={2.4}
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
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 5"
            opacity={!activePoint || activePoint.projected || activePoint.year === CURRENT_ENROLLMENT_YEAR ? 1 : DYK_HOVER_DIM}
            pointerEvents="none"
          />
        ) : null}
        {pkHistoricPts.length > 1 ? (
          <path
            d={linePath(pkHistoricPts)}
            fill="none"
            stroke={colors.teal}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            pointerEvents="none"
          />
        ) : null}
        {pkProjectedPts.length > 1 ? (
          <path
            d={linePath(pkProjectedPts)}
            fill="none"
            stroke={PK_PROJECTED}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 5"
            pointerEvents="none"
          />
        ) : null}
        {capacity != null ? (
          <line
            x1={pad.left}
            x2={size.width - pad.right}
            y1={yOf(capacity)}
            y2={yOf(capacity)}
            stroke="var(--compare-near)"
            strokeWidth={1.75}
            strokeDasharray="2 4"
            strokeLinecap="round"
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
            <g
              key={point.year}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHoveredYear(point.year)}
            >
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
        {pkPlotted.map((point) => {
          const isActive = hoveredYear === point.year;
          const dimmed = Boolean(hoveredYear != null && !isActive);
          return (
            <g
              key={`pk-${point.year}`}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHoveredYear(point.year)}
            >
              <circle cx={point.x} cy={point.y} r={8} fill="transparent" />
              <circle
                cx={point.x}
                cy={point.y}
                r={isActive ? 4.5 : 3}
                fill={point.projected ? "#fff" : colors.teal}
                stroke={isActive ? colors.ink : point.projected ? PK_PROJECTED : "none"}
                strokeWidth={isActive ? 1.2 : point.projected ? 2 : 0}
                opacity={dimmed ? DYK_HOVER_DIM : 1}
                pointerEvents="none"
              />
            </g>
          );
        })}
        {activePoint ? <ChartTooltip text={activePoint.label} plotWidth={size.width} /> : null}
        </svg>
      </div>
      {tempNote ? <p className="enrollment-capacity-note">{tempNote}</p> : null}
    </figure>
  );
}
