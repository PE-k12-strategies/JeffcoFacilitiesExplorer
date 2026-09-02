import { useState, type ReactNode } from "react";
import { formatMoney, formatMoneyExact } from "../lib/format";
import { buildingSystemTip, SAFETY_SECURITY_SYSTEM } from "../lib/buildingSystems";
import { PRIORITY_SCORES, needsForPriorities, priorityTotals } from "../lib/needs";
import type { PriorityScore, SchoolNeeds } from "../types";
import { BuildingSystemIcon } from "./BuildingSystemIcon";
import { PriorityDonut } from "./PriorityDonut";
import { HelpTip } from "./Ui";

function entries(breakdown: Record<string, number>) {
  return Object.entries(breakdown)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1]);
}

function togglePriority(list: PriorityScore[], value: PriorityScore): PriorityScore[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function BarGroup({
  title,
  total,
  items,
  withMeta = false,
  compact = false,
}: {
  title: string;
  total: number;
  items: Array<[string, number]>;
  withMeta?: boolean;
  compact?: boolean;
}) {
  if (!items.length || total <= 0) return null;
  const max = Math.max(...items.map(([, value]) => value));
  return (
    <div className={`section${compact ? " needs-systems" : ""}`}>
      <h3 style={{ fontSize: "1rem" }}>{title}</h3>
      <p className="footnote" style={{ marginTop: 0 }}>
        Identified need {formatMoneyExact(total)}
      </p>
      <div className="bar-list">
        {items.map(([label, value]) => (
          <div className={`bar-row${withMeta ? " has-icon" : ""}`} key={label}>
            {withMeta ? (
              <span className="bar-row-icon" aria-hidden="true">
                <BuildingSystemIcon name={label} />
              </span>
            ) : null}
            <div className="bar-row-body">
              <span className="bar-row-label">
                {label}
                {withMeta ? (
                  <HelpTip label={label}>{buildingSystemTip(label)}</HelpTip>
                ) : null}
              </span>
              <span className="bar-row-value">{formatMoney(value)}</span>
              <div className="bar-track" aria-hidden="true">
                <div
                  className="bar-fill"
                  style={{ width: `${Math.max(6, (value / max) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function NeedsBreakdown({
  needs,
  compare,
  intro,
}: {
  needs: SchoolNeeds;
  compare?: ReactNode;
  intro?: ReactNode;
}) {
  const [priorities, setPriorities] = useState<PriorityScore[]>([...PRIORITY_SCORES]);
  const filtered = needsForPriorities(needs, priorities);
  const systems = entries({
    ...filtered.facilities,
    ...(filtered.safetyTotal > 0
      ? { [SAFETY_SECURITY_SYSTEM]: filtered.safetyTotal }
      : {}),
  });
  const systemsTotal = filtered.facilitiesTotal + filtered.safetyTotal;
  const technology = entries(filtered.technology);
  const food = entries(filtered.food);
  const totals = priorityTotals(needs);
  const donut = (
    <PriorityDonut
      totals={totals}
      selected={priorities}
      onToggle={(score) => setPriorities(togglePriority(priorities, score))}
    />
  );

  const lead = (
    <>
      <p>
        Identified facility needs total{" "}
        <strong>{formatMoneyExact(filtered.total)}</strong> in the current planning
        snapshot.
        {compare ? <> This is {compare}.</> : null}{" "}
        These are planning-level replacement estimates, not a budget or a
        construction schedule.
      </p>
      {intro}
    </>
  );
  const bars = (
    <>
      <BarGroup
        title="Building systems"
        total={systemsTotal}
        items={systems}
        withMeta
        compact
      />
      <BarGroup
        title="Information technology"
        total={filtered.technologyTotal}
        items={technology}
        compact
      />
      <BarGroup
        title="Food and nutrition"
        total={filtered.foodTotal}
        items={food}
        compact
      />
    </>
  );

  if (filtered.total <= 0) {
    return (
      <div className="needs-layout">
        <div className="needs-layout-lead">
          <p className="footnote">
            {needs.total <= 0
              ? "No identified facility need costs are published for this site in the current snapshot. Technology and food-service cost tables are present but not yet populated."
              : "No identified facility need costs match the selected priority scores."}
          </p>
        </div>
        {donut}
      </div>
    );
  }

  return (
    <div className="needs-layout">
      <div className="needs-layout-lead">{lead}</div>
      {donut}
      <div className="needs-layout-bars">{bars}</div>
    </div>
  );
}
