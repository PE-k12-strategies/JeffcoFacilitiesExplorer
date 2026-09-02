import { type ReactNode } from "react";
import { CURRENT_ENROLLMENT_YEAR_LABEL, HISTORICAL_ENROLLMENT_YEAR } from "../lib/districtCharts";
import { defaultVisibleLevels, levelColors } from "../lib/theme";
import { formatMoney, formatNumber, formatSignedPercent } from "../lib/format";
import { FILTER_SLIDER_BOUNDS, SYMBOLOGY_OPTIONS } from "../lib/symbology";
import { HelpTip } from "./Ui";
import type { DistrictSummary, MapFilters } from "../types";

const ALL_LEVELS = [
  "Elementary",
  "Middle",
  "High",
  "Multi-Level",
  "Option",
  "Alternative",
];

export type FilterSliderId =
  | "enrollment"
  | "enrollmentChange"
  | "capacity"
  | "utilization"
  | "buildingScore"
  | "need";

export type ArticulationColorMode = "default" | "birthChange" | "enrollmentChange";

export const ARTICULATION_COLOR_OPTIONS: Array<{
  id: ArticulationColorMode;
  label: string;
}> = [
  { id: "default", label: "Default" },
  { id: "birthChange", label: "Change in Birth Rate" },
  { id: "enrollmentChange", label: "Change in Enrollment" },
];

const FILTER_SLIDER_SHORT: Record<FilterSliderId, string> = {
  enrollment: "Enrollment",
  enrollmentChange: "Change in Enrollment",
  capacity: "Capacity",
  utilization: "Utilization",
  buildingScore: "Building Score",
  need: "Facility Need",
};

export const FILTER_SLIDER_OPTIONS: Array<{ id: FilterSliderId; label: string }> = [
  { id: "enrollment", label: `School Enrollment (${CURRENT_ENROLLMENT_YEAR_LABEL})` },
  { id: "enrollmentChange", label: "Change in Enrollment" },
  { id: "capacity", label: "School Capacity" },
  { id: "utilization", label: "School Utilization" },
  { id: "buildingScore", label: "Composite Building Score" },
  { id: "need", label: "Identified Facility Need ($)" },
];

const FILTER_SLIDER_TIPS: Record<FilterSliderId, ReactNode> = {
  enrollment: (
    <>
      This year’s K–12 student count ({CURRENT_ENROLLMENT_YEAR_LABEL}). Pre-K
      is counted separately and is not included here.
    </>
  ),
  enrollmentChange: (
    <>
      How much K–12 enrollment grew or shrank from {HISTORICAL_ENROLLMENT_YEAR}{" "}
      to {CURRENT_ENROLLMENT_YEAR_LABEL}. A plus means more students; a minus
      means fewer.
    </>
  ),
  capacity: (
    <>
      How many students the building is meant to hold in permanent classrooms.
      Portables do not count.
    </>
  ),
  utilization: (
    <>
      {CURRENT_ENROLLMENT_YEAR_LABEL} K–12 students divided by permanent seats.
      Portables do not count. Over 100% means more students than planned seats.
    </>
  ),
  buildingScore: (
    <>
      A score from 0 to 100 based on the building’s condition, energy use, age,
      and related costs. It is not a letter grade.
    </>
  ),
  need: (
    <>
      The total estimated cost of needed repairs and upgrades, including
      building work plus safety, technology, and food-service projects.
    </>
  ),
};

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function DualRange({
  boundMin,
  boundMax,
  valueMin,
  valueMax,
  step,
  format,
  minLabel,
  maxLabel,
  onChange,
}: {
  boundMin: number;
  boundMax: number;
  valueMin: number | null;
  valueMax: number | null;
  step: number;
  format: (value: number) => string;
  minLabel: string;
  maxLabel: string;
  onChange: (min: number | null, max: number | null) => void;
}) {
  const lo = valueMin ?? boundMin;
  const hi = valueMax ?? boundMax;
  const span = Math.max(boundMax - boundMin, step);
  const left = ((lo - boundMin) / span) * 100;
  const right = ((hi - boundMin) / span) * 100;

  function commit(nextMin: number, nextMax: number) {
    const clampedMin = Math.min(nextMin, nextMax);
    const clampedMax = Math.max(nextMin, nextMax);
    onChange(
      clampedMin <= boundMin ? null : clampedMin,
      clampedMax >= boundMax ? null : clampedMax,
    );
  }

  return (
    <div className="dual-range">
      <div className="dual-range-labels">
        <span>{format(lo)}</span>
        <span>{format(hi)}</span>
      </div>
      <div className="dual-range-track">
        <div
          className="dual-range-fill"
          style={{ left: `${left}%`, width: `${Math.max(0, right - left)}%` }}
        />
        <input
          type="range"
          min={boundMin}
          max={boundMax}
          step={step}
          value={lo}
          aria-label={minLabel}
          onChange={(event) => commit(Number(event.target.value), hi)}
        />
        <input
          type="range"
          min={boundMin}
          max={boundMax}
          step={step}
          value={hi}
          aria-label={maxLabel}
          onChange={(event) => commit(lo, Number(event.target.value))}
        />
      </div>
    </div>
  );
}

function moneyLabel(value: number): string {
  if (value === 0) return "$0";
  return formatMoney(value);
}

function activeFilterPhrases(filters: MapFilters): string[] {
  const extents = FILTER_SLIDER_BOUNDS;
  const items: Array<{
    id: FilterSliderId;
    min: number | null;
    max: number | null;
    boundMin: number;
    boundMax: number;
    format: (value: number) => string;
  }> = [
    {
      id: "enrollment",
      min: filters.enrollmentMin,
      max: filters.enrollmentMax,
      boundMin: extents.enrollment.min,
      boundMax: extents.enrollment.max,
      format: formatNumber,
    },
    {
      id: "enrollmentChange",
      min: filters.enrollmentChangeMin,
      max: filters.enrollmentChangeMax,
      boundMin: extents.enrollmentChange.min,
      boundMax: extents.enrollmentChange.max,
      format: (value) => formatSignedPercent(value, { alreadyPercent: true }),
    },
    {
      id: "capacity",
      min: filters.capacityMin,
      max: filters.capacityMax,
      boundMin: extents.capacity.min,
      boundMax: extents.capacity.max,
      format: formatNumber,
    },
    {
      id: "utilization",
      min: filters.utilizationMin,
      max: filters.utilizationMax,
      boundMin: extents.utilization.min,
      boundMax: extents.utilization.max,
      format: (value) => `${formatNumber(value)}%`,
    },
    {
      id: "buildingScore",
      min: filters.buildingScoreMin == null ? null : filters.buildingScoreMin * 100,
      max: filters.buildingScoreMax == null ? null : filters.buildingScoreMax * 100,
      boundMin: extents.buildingScore.min,
      boundMax: extents.buildingScore.max,
      format: (value) => formatNumber(value, 0),
    },
    {
      id: "need",
      min: filters.needMin,
      max: filters.needMax,
      boundMin: extents.need.min,
      boundMax: extents.need.max,
      format: moneyLabel,
    },
  ];
  return items
    .filter((item) => item.min != null || item.max != null)
    .map((item) => {
      const lo = item.min ?? item.boundMin;
      const hi = item.max ?? item.boundMax;
      return `${FILTER_SLIDER_SHORT[item.id]}: ${item.format(lo)} to ${item.format(hi)}`;
    });
}

function SliderFields({
  filters,
  onChange,
  visibleIds,
}: {
  filters: MapFilters;
  onChange: (next: MapFilters) => void;
  visibleIds?: FilterSliderId[];
}) {
  const extents = FILTER_SLIDER_BOUNDS;
  const sliders: Array<{
    id: FilterSliderId;
    node: ReactNode;
  }> = [
    {
      id: "enrollment",
      node: (
        <fieldset className="fieldset" key="enrollment">
          <legend>
            <span className="field-legend">
              Enrollment ({CURRENT_ENROLLMENT_YEAR_LABEL})
              <HelpTip label="Enrollment">
                {FILTER_SLIDER_TIPS.enrollment}
              </HelpTip>
            </span>
          </legend>
          <DualRange
            boundMin={extents.enrollment.min}
            boundMax={extents.enrollment.max}
            valueMin={filters.enrollmentMin}
            valueMax={filters.enrollmentMax}
            step={10}
            format={formatNumber}
            minLabel="Minimum enrollment"
            maxLabel="Maximum enrollment"
            onChange={(enrollmentMin, enrollmentMax) =>
              onChange({ ...filters, enrollmentMin, enrollmentMax })
            }
          />
        </fieldset>
      ),
    },
    {
      id: "enrollmentChange",
      node: (
        <fieldset className="fieldset" key="enrollmentChange">
          <legend>
            <span className="field-legend">
              Change in enrollment (%)
              <HelpTip label="Change in enrollment">
                {FILTER_SLIDER_TIPS.enrollmentChange}
              </HelpTip>
            </span>
          </legend>
          <DualRange
            boundMin={extents.enrollmentChange.min}
            boundMax={extents.enrollmentChange.max}
            valueMin={filters.enrollmentChangeMin}
            valueMax={filters.enrollmentChangeMax}
            step={1}
            format={(value) => formatSignedPercent(value, { alreadyPercent: true })}
            minLabel="Minimum change in enrollment"
            maxLabel="Maximum change in enrollment"
            onChange={(enrollmentChangeMin, enrollmentChangeMax) =>
              onChange({ ...filters, enrollmentChangeMin, enrollmentChangeMax })
            }
          />
        </fieldset>
      ),
    },
    {
      id: "capacity",
      node: (
        <fieldset className="fieldset" key="capacity">
          <legend>
            <span className="field-legend">
              Capacity
              <HelpTip label="Capacity">
                {FILTER_SLIDER_TIPS.capacity}
              </HelpTip>
            </span>
          </legend>
          <DualRange
            boundMin={extents.capacity.min}
            boundMax={extents.capacity.max}
            valueMin={filters.capacityMin}
            valueMax={filters.capacityMax}
            step={10}
            format={formatNumber}
            minLabel="Minimum capacity"
            maxLabel="Maximum capacity"
            onChange={(capacityMin, capacityMax) =>
              onChange({ ...filters, capacityMin, capacityMax })
            }
          />
        </fieldset>
      ),
    },
    {
      id: "utilization",
      node: (
        <fieldset className="fieldset" key="utilization">
          <legend>
            <span className="field-legend">
              Utilization (%)
              <HelpTip label="Utilization">
                {FILTER_SLIDER_TIPS.utilization}
              </HelpTip>
            </span>
          </legend>
          <DualRange
            boundMin={extents.utilization.min}
            boundMax={extents.utilization.max}
            valueMin={filters.utilizationMin}
            valueMax={filters.utilizationMax}
            step={1}
            format={(value) => `${formatNumber(value)}%`}
            minLabel="Minimum utilization"
            maxLabel="Maximum utilization"
            onChange={(utilizationMin, utilizationMax) =>
              onChange({ ...filters, utilizationMin, utilizationMax })
            }
          />
        </fieldset>
      ),
    },
    {
      id: "buildingScore",
      node: (
        <fieldset className="fieldset" key="buildingScore">
          <legend>
            <span className="field-legend">
              Building score
              <HelpTip label="Building score">
                {FILTER_SLIDER_TIPS.buildingScore}
              </HelpTip>
            </span>
          </legend>
          <DualRange
            boundMin={extents.buildingScore.min}
            boundMax={extents.buildingScore.max}
            valueMin={
              filters.buildingScoreMin == null ? null : filters.buildingScoreMin * 100
            }
            valueMax={
              filters.buildingScoreMax == null ? null : filters.buildingScoreMax * 100
            }
            step={1}
            format={(value) => formatNumber(value, 0)}
            minLabel="Minimum building score"
            maxLabel="Maximum building score"
            onChange={(buildingScoreMin, buildingScoreMax) =>
              onChange({
                ...filters,
                buildingScoreMin:
                  buildingScoreMin == null ? null : buildingScoreMin / 100,
                buildingScoreMax:
                  buildingScoreMax == null ? null : buildingScoreMax / 100,
              })
            }
          />
        </fieldset>
      ),
    },
    {
      id: "need",
      node: (
        <fieldset className="fieldset" key="need">
          <legend>
            <span className="field-legend">
              Identified facility need ($)
              <HelpTip label="Identified facility need">
                {FILTER_SLIDER_TIPS.need}
              </HelpTip>
            </span>
          </legend>
          <DualRange
            boundMin={extents.need.min}
            boundMax={extents.need.max}
            valueMin={filters.needMin}
            valueMax={filters.needMax}
            step={1_000_000}
            format={moneyLabel}
            minLabel="Minimum identified need"
            maxLabel="Maximum identified need"
            onChange={(needMin, needMax) => onChange({ ...filters, needMin, needMax })}
          />
        </fieldset>
      ),
    },
  ];

  return (
    <>
      {sliders
        .filter((item) => !visibleIds || visibleIds.includes(item.id))
        .map((item) => item.node)}
    </>
  );
}

export function FilterPanel({
  filters,
  district,
  onChange,
  onReset,
  mapOptions,
  section = "all",
  activeSlider = "enrollment",
  onActiveSliderChange,
  articulationColor = "default",
  onArticulationColorChange,
}: {
  filters: MapFilters;
  district: DistrictSummary;
  onChange: (next: MapFilters) => void;
  onReset: () => void;
  mapOptions?: ReactNode;
  section?: "all" | "layers" | "sliders";
  activeSlider?: FilterSliderId;
  onActiveSliderChange?: (id: FilterSliderId) => void;
  articulationColor?: ArticulationColorMode;
  onArticulationColorChange?: (mode: ArticulationColorMode) => void;
}) {
  const levels = district.levels.filter(
    (level) => ALL_LEVELS.includes(level) || defaultVisibleLevels.includes(level),
  );
  const uniqueLevels = Array.from(new Set([...ALL_LEVELS, ...levels])).filter((level) =>
    district.levels.includes(level),
  );
  const showLayers = section === "all" || section === "layers";
  const showSliders = section === "all" || section === "sliders";
  const activePhrases = section === "sliders" ? activeFilterPhrases(filters) : [];

  return (
    <form
      className={`filter-grid filter-grid-${section}`}
      onSubmit={(event) => event.preventDefault()}
      aria-label="School filters"
    >
      {showLayers && mapOptions ? (
        <div className="filter-map-chrome">{mapOptions}</div>
      ) : null}
      {showLayers ? (
        <label className="field">
          <span className="field-label">Color School Points By:</span>
          <select
            value={filters.symbology ?? "type"}
            onChange={(event) =>
              onChange({
                ...filters,
                symbology: event.target.value as MapFilters["symbology"],
              })
            }
          >
            {SYMBOLOGY_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {showLayers ? (
        <label className="field">
          <span className="field-label field-legend">
            Color Articulation Areas By:
            <HelpTip label="Color Articulation Areas By">
              Color each articulation area. Gray is the default. Birth-rate
              change uses births from 2014 to 2023. Enrollment change uses the
              change from past to current K–12 students. Magenta means a drop;
              teal means a rise.
            </HelpTip>
          </span>
          <select
            value={articulationColor}
            onChange={(event) =>
              onArticulationColorChange?.(event.target.value as ArticulationColorMode)
            }
          >
            {ARTICULATION_COLOR_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {showLayers ? (
        <fieldset className="fieldset school-level-field">
          <legend>School level</legend>
          <div className="check-grid">
            {uniqueLevels.map((level) => (
              <label className="check-pill" key={level}>
                <input
                  type="checkbox"
                  checked={filters.levels.includes(level)}
                  onChange={() =>
                    onChange({ ...filters, levels: toggleValue(filters.levels, level) })
                  }
                />
                <span
                  className="swatch"
                  style={{ background: levelColors[level] ?? "#636363" }}
                  aria-hidden="true"
                />
                {level}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {showSliders && section === "all" ? (
        <h3 className="filter-schools-heading">Filter Schools By:</h3>
      ) : null}

      {showSliders && section === "sliders" ? (
        <div className="filter-slider-bar">
          <div className="field">
            <span className="field-label field-legend">
              <label htmlFor="mobile-filter-by">Filter by</label>
              <HelpTip label={FILTER_SLIDER_OPTIONS.find((item) => item.id === activeSlider)?.label ?? "this filter"}>
                {FILTER_SLIDER_TIPS[activeSlider]}
              </HelpTip>
            </span>
            <select
              id="mobile-filter-by"
              value={activeSlider}
              onChange={(event) =>
                onActiveSliderChange?.(event.target.value as FilterSliderId)
              }
            >
              {FILTER_SLIDER_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className="btn filter-reset" onClick={onReset}>
            Reset
          </button>
        </div>
      ) : null}

      {showSliders ? (
        <div className="range-grid">
          <SliderFields
            filters={filters}
            onChange={onChange}
            visibleIds={section === "sliders" ? [activeSlider] : undefined}
          />
        </div>
      ) : null}

      {activePhrases.length ? (
        <p className="active-filters">{activePhrases.join(", ")}</p>
      ) : null}

      {showSliders && section === "all" ? (
        <button type="button" className="btn filter-reset" onClick={onReset}>
          Reset filters
        </button>
      ) : null}
    </form>
  );
}
