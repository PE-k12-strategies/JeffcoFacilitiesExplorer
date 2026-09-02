import { useState, type CSSProperties, type ReactNode } from "react";
import {
  EA_FACTORS,
  emptyEaFactors,
  type EaFactorScores,
} from "../lib/educationalAdequacy";
import { formatPercent } from "../lib/format";
import { colors } from "../lib/theme";
import { HelpTip } from "./Ui";

const SIZE = 280;
const CX = 140;
const CY = 140;
const RADIUS = 132;
const RINGS = [0.25, 0.5, 0.75, 1];
/** Distance from stage center to the label anchor, as a percent of the stage.
 *  Vertices sit at ~36.8% (SVG is 78% of the stage, radius 132/280).
 *  Keep this only a little larger so names sit just outside the octagon. */
const LABEL_RING = 42;

function toShare(value: number | null | undefined): number {
  if (value == null) return 0;
  return Math.max(0, Math.min(1, value / 100));
}

function angleAt(index: number) {
  return -Math.PI / 2 + (index * 2 * Math.PI) / EA_FACTORS.length;
}

function pointAt(index: number, value: number) {
  const angle = angleAt(index);
  return {
    x: CX + Math.cos(angle) * RADIUS * value,
    y: CY + Math.sin(angle) * RADIUS * value,
  };
}

function labelStyle(index: number): CSSProperties {
  const angle = angleAt(index);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tx = cos > 0.35 ? "0" : cos < -0.35 ? "-100%" : "-50%";
  const ty = sin > 0.35 ? "0" : sin < -0.35 ? "-100%" : "-50%";
  return {
    left: `${50 + cos * LABEL_RING}%`,
    top: `${50 + sin * LABEL_RING}%`,
    transform: `translate(${tx}, ${ty})`,
    textAlign: "center",
  };
}

function ringPath(value: number) {
  return (
    EA_FACTORS.map((_, index) => {
      const { x, y } = pointAt(index, value);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(" ") + " Z"
  );
}

export function EaRadarChart({
  scores,
  averages,
  peerLabel,
  overall,
  compare,
}: {
  scores?: EaFactorScores | null;
  averages?: EaFactorScores | null;
  peerLabel?: string;
  overall?: number | null;
  compare?: ReactNode;
}) {
  const values = scores ?? emptyEaFactors();
  const peerValues = averages ?? emptyEaFactors();
  const plotted = EA_FACTORS.map((factor) => values[factor.id]);
  const peerPlotted = EA_FACTORS.map((factor) => peerValues[factor.id]);
  const hasAny = plotted.some((value) => value != null);
  const hasPeer = peerPlotted.some((value) => value != null);
  const [hovered, setHovered] = useState<number | null>(null);

  const polygon = hasAny
    ? plotted
        .map((value, index) => {
          const { x, y } = pointAt(index, toShare(value));
          return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join(" ") + " Z"
    : null;
  const peerLine = hasPeer
    ? peerPlotted
        .map((value, index) => {
          const { x, y } = pointAt(index, toShare(value));
          return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join(" ") + " Z"
    : null;

  const active = hovered == null ? null : EA_FACTORS[hovered];
  const activeValue = hovered == null ? null : plotted[hovered];
  const activePeer = hovered == null ? null : peerPlotted[hovered];
  const typeLabel = peerLabel ? `${peerLabel} average` : "Type average";
  const overallLabel = formatPercent(overall);

  return (
    <figure className="ea-radar">
      <figcaption>
        Educational adequacy factors
        <HelpTip label="Educational adequacy">
          A score for how well the building supports teaching and learning, not
          how worn it is. Each of the eight factors is one spoke on the chart.
          Farther from the center means a higher score.
        </HelpTip>
      </figcaption>
      <div className="ea-radar-body">
        <div className="ea-radar-stage" onMouseLeave={() => setHovered(null)}>
          <svg
            className="ea-radar-svg"
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label={`Educational adequacy ${overallLabel}. Spider chart for Presence, Safety and Security, Community, Organization, Environmental Quality, Instructional Space, Assembly, and Extended Learning`}
          >
            {RINGS.map((ring) => (
              <path key={ring} d={ringPath(ring)} className="ea-radar-ring" />
            ))}
            {EA_FACTORS.map((factor, index) => {
              const outer = pointAt(index, 1);
              return (
                <g key={`${factor.id}-axis`}>
                  <line
                    x1={CX}
                    y1={CY}
                    x2={outer.x}
                    y2={outer.y}
                    className="ea-radar-axis"
                  />
                  <line
                    x1={CX}
                    y1={CY}
                    x2={outer.x}
                    y2={outer.y}
                    className="ea-radar-axis-hit"
                    onMouseEnter={() => setHovered(index)}
                  />
                </g>
              );
            })}
            {polygon ? (
              <path
                d={polygon}
                fill="rgba(103, 55, 133, 0.22)"
                stroke={colors.purple}
                strokeWidth={2}
                strokeLinejoin="round"
                pointerEvents="none"
              />
            ) : null}
            {peerLine ? (
              <path
                d={peerLine}
                fill="none"
                stroke="var(--compare-near)"
                strokeWidth={2}
                strokeLinejoin="round"
                pointerEvents="none"
              />
            ) : null}
            {EA_FACTORS.map((factor, index) => {
              const value = plotted[index];
              const peerValue = peerPlotted[index];
              const vertex = pointAt(index, toShare(value));
              const peerVertex = pointAt(index, toShare(peerValue));
              const isActive = hovered === index;
              return (
                <g key={factor.id}>
                  {hasPeer && peerValue != null ? (
                    <circle
                      cx={peerVertex.x}
                      cy={peerVertex.y}
                      r={8}
                      fill="transparent"
                      style={{ cursor: "pointer" }}
                      onMouseEnter={() => setHovered(index)}
                    />
                  ) : null}
                  {hasPeer && peerValue != null && isActive ? (
                    <circle
                      cx={peerVertex.x}
                      cy={peerVertex.y}
                      r={5}
                      fill="var(--compare-near)"
                      stroke="#fff"
                      strokeWidth={1.2}
                      pointerEvents="none"
                    />
                  ) : null}
                  {hasAny ? (
                    <circle
                      cx={vertex.x}
                      cy={vertex.y}
                      r={3.5}
                      fill={value == null ? colors.line : colors.purple}
                      stroke={isActive ? colors.ink : "#fff"}
                      strokeWidth={1.2}
                      style={{ cursor: "pointer" }}
                      onMouseEnter={() => setHovered(index)}
                    />
                  ) : null}
                </g>
              );
            })}
            {overall != null ? (
              <text
                x={CX}
                y={CY + 8}
                textAnchor="middle"
                className="ea-radar-score"
                pointerEvents="none"
              >
                {overallLabel}
              </text>
            ) : null}
          </svg>
          {EA_FACTORS.map((factor, index) => (
            <button
              key={`${factor.id}-label`}
              type="button"
              className="ea-radar-axis-label"
              style={labelStyle(index)}
              onMouseEnter={() => setHovered(index)}
            >
              {factor.lines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </button>
          ))}
        </div>
        {hasAny ? (
          <>
            <p className={`ea-radar-factor-blurb${active ? "" : " is-hidden"}`}>
              {active ? (
                <>
                  <strong className="ea-radar-factor-blurb-label">
                    {active.label}:
                  </strong>{" "}
                  {active.blurb.charAt(0).toLowerCase() + active.blurb.slice(1)}
                </>
              ) : (
                "\u00a0"
              )}
            </p>
            <div className="ea-radar-callouts" aria-live="polite">
            <div className="ea-radar-callouts-main">
              <div className={`ea-radar-callouts-idle${active ? " is-hidden" : ""}`}>
                {compare ? (
                  <div className="graphic-compare">{compare}</div>
                ) : (
                  <p className="ea-radar-callout is-hint">Hover over a factor for scores</p>
                )}
              </div>
              {active ? (
                <div className="ea-radar-callouts-hover">
                  <p className="ea-radar-callout is-school">
                    <i className="ea-radar-swatch" aria-hidden="true" />
                    <span className="ea-radar-callout-name">
                      {active.lines.length > 1 ? (
                        <>
                          {active.lines.slice(0, -1).map((line) => (
                            <span key={line}>{line}</span>
                          ))}
                          <span>
                            {active.lines[active.lines.length - 1]}:{" "}
                            {formatPercent(activeValue, { alreadyPercent: true })}
                          </span>
                        </>
                      ) : (
                        <span>
                          {active.label}:{" "}
                          {formatPercent(activeValue, { alreadyPercent: true })}
                        </span>
                      )}
                    </span>
                  </p>
                  <p className="ea-radar-callout is-average">
                    <i className="ea-radar-swatch" aria-hidden="true" />
                    <span>
                      {typeLabel}: {formatPercent(activePeer, { alreadyPercent: true })}
                    </span>
                  </p>
                </div>
              ) : null}
            </div>
            <div className="ea-radar-legend">
              <span>
                <i className="is-school" aria-hidden="true" />
                Selected School
              </span>
              {hasPeer ? (
                <span>
                  <i className="is-average" aria-hidden="true" />
                  {typeLabel}
                </span>
              ) : null}
            </div>
            </div>
          </>
        ) : (
          <p className="ea-radar-note">
            Factor scores will appear when the detailed educational adequacy
            breakdown is published.
          </p>
        )}
      </div>
    </figure>
  );
}
