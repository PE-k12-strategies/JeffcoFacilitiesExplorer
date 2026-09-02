import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { colorForLevel } from "../lib/theme";
import type { School } from "../types";

export const BUILDING_SCORE_TIP =
  "A score from 0 to 100 that combines five building measures: condition (30%), energy use (15%), age (25%), a facility survey (10%), and work-order cost per square foot (20%).";

export function InfographicPlaceholder({
  label,
  hint,
}: {
  label: string;
  hint: string;
}) {
  return (
    <div className="placeholder-graphic" role="img" aria-label={label}>
      <strong>{label}</strong>
      <span>{hint}</span>
    </div>
  );
}

export function LevelChip({ school }: { school: School }) {
  return (
    <span className="chip" style={{ background: colorForLevel(school.schoolLevel) }}>
      {school.schoolLevel}
    </span>
  );
}

export function HelpTip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const tooltipId = useId();
  const markRef = useRef<HTMLButtonElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!open) return;

    function place() {
      const mark = markRef.current;
      const bubble = bubbleRef.current;
      if (!mark) return;
      const rect = mark.getBoundingClientRect();
      const width = bubble?.offsetWidth || 240;
      const height = bubble?.offsetHeight || 72;
      const pad = 8;
      const gap = 6;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let left = rect.left;
      if (left + width > vw - pad) left = rect.right - width;
      left = Math.max(pad, Math.min(left, vw - width - pad));
      let top = rect.bottom + gap;
      if (top + height > vh - pad && rect.top - gap - height >= pad) {
        top = rect.top - gap - height;
      }
      setCoords({ top, left });
    }

    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, children]);

  return (
    <span
      className="help-tip"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        ref={markRef}
        type="button"
        className="help-tip-mark"
        aria-label={`About ${label}`}
        aria-describedby={open ? tooltipId : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        ?
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <span
              ref={bubbleRef}
              className="help-tip-bubble is-open"
              id={tooltipId}
              role="tooltip"
              style={{ top: coords.top, left: coords.left }}
            >
              {children}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}

export function GlossaryTip({
  term,
  children,
}: {
  term: string;
  children: ReactNode;
}) {
  return (
    <span className="glossary">
      <details>
        <summary>{term}</summary>
        <p>{children}</p>
      </details>
    </span>
  );
}

export function StatCard({
  label,
  tip,
  value,
  hint,
  compare,
  extra,
}: {
  label: ReactNode;
  tip?: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  compare?: ReactNode;
  extra?: ReactNode;
}) {
  const tipLabel = typeof label === "string" ? label : "this measure";
  return (
    <div className="stat-card">
      <dt>
        <span>{label}</span>
        {tip ? <HelpTip label={tipLabel}>{tip}</HelpTip> : null}
      </dt>
      <dd>{value}</dd>
      <div className="stat-card-foot">
        {hint ? <div className="compare">{hint}</div> : null}
        {compare ? <div className="compare">{compare}</div> : null}
      </div>
      {extra}
    </div>
  );
}
