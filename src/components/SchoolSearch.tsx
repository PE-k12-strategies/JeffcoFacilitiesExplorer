import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { isCharterSchool } from "../lib/filters";
import { isCompositeUniverseSchool } from "../lib/universe";
import type { School } from "../types";

function matchSchools(schools: School[], query: string, excludeId?: string, limit = 12): School[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return schools
    .filter(
      (school) =>
        school.id !== excludeId &&
        isCompositeUniverseSchool(school) &&
        school.status === "Active" &&
        !isCharterSchool(school) &&
        school.name.toLowerCase().includes(q),
    )
    .sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aStarts = aName.startsWith(q) ? 0 : 1;
      const bStarts = bName.startsWith(q) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return aName.localeCompare(bName);
    })
    .slice(0, limit);
}

export function SchoolSearch({
  schools,
  excludeId,
  onSelect,
  placeholder = "Search by school name",
}: {
  schools: School[];
  excludeId?: string;
  onSelect: (school: School) => void;
  placeholder?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const matches = useMemo(
    () => matchSchools(schools, query, excludeId),
    [schools, query, excludeId],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function choose(school: School) {
    onSelect(school);
    setQuery("");
    setOpen(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!matches.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index + 1) % matches.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index - 1 + matches.length) % matches.length);
      return;
    }
    if (event.key === "Enter" && open) {
      event.preventDefault();
      const school = matches[activeIndex];
      if (school) choose(school);
    }
  }

  return (
    <div className="school-search school-profile-search" ref={rootRef}>
      <input
        className="search-input"
        type="search"
        placeholder={placeholder}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (query.trim()) setOpen(true);
        }}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && Boolean(query.trim())}
        aria-controls="school-profile-results"
        aria-activedescendant={
          open && matches[activeIndex]
            ? `school-profile-option-${matches[activeIndex].id}`
            : undefined
        }
        aria-label="Search schools"
      />
      {open && query.trim() ? (
        <ul className="school-search-results" id="school-profile-results" role="listbox">
          {matches.length ? (
            matches.map((school, index) => (
              <li key={school.id} role="presentation">
                <button
                  type="button"
                  className="school-search-option"
                  id={`school-profile-option-${school.id}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => choose(school)}
                >
                  <strong>{school.name}</strong>
                  <span>
                    {school.schoolLevel}
                    {school.articulation && school.articulation !== "NoArticulationArea"
                      ? ` · ${school.articulation}`
                      : ""}
                    {school.status !== "Active" ? ` · ${school.status}` : ""}
                  </span>
                </button>
              </li>
            ))
          ) : (
            <li className="school-search-empty">No matching schools</li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
