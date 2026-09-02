import { useState } from "react";
import { Link } from "react-router-dom";
import { formatNumber, schoolSlug } from "../lib/format";
import type { NearbySchool } from "../types";

function hasGradeOverlap(value: string): boolean {
  return value.trim().toLowerCase() !== "no" && value.trim() !== "";
}

function closestSchools(nearby: NearbySchool[], overlapOnly: boolean): NearbySchool[] {
  const ranked = [...nearby].sort((a, b) => a.rank - b.rank);
  const source = overlapOnly
    ? ranked.filter((school) => hasGradeOverlap(school.gradeOverlap))
    : ranked.filter((school) => school.rank >= 2 && school.rank <= 6);
  return source.slice(0, 5);
}

export function NearbySchools({ nearby }: { nearby: NearbySchool[] | undefined }) {
  const [overlapOnly, setOverlapOnly] = useState(false);
  const list = closestSchools(nearby ?? [], overlapOnly);

  if (!(nearby ?? []).length) return null;

  return (
    <div className="nearby-schools">
      <div className="nearby-schools-head">
        <h2>Nearby schools</h2>
        <label className="check-pill">
          <input
            type="checkbox"
            checked={overlapOnly}
            onChange={(event) => setOverlapOnly(event.target.checked)}
          />
          Overlapping Grades
        </label>
      </div>
      {list.length ? (
        <ul className="nearby-schools-list">
          {list.map((item) => {
            const grades = item.grades.replace(/-/g, "–");
            const distance =
              item.distanceMiles == null
                ? "—"
                : `${formatNumber(item.distanceMiles, 1)} mi`;
            return (
              <li key={item.id}>
                <Link to={`/schools/${schoolSlug(item.id)}`}>{item.name}</Link>
                {grades ? ` · ${grades}` : ""}
                {` · ${distance}`}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="nearby-schools-empty">
          No nearby schools with overlapping grades.
        </p>
      )}
    </div>
  );
}
