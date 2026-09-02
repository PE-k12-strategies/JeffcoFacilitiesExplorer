import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { NeedsBreakdown } from "../components/NeedsBreakdown";
import { BuildingScoreGauge } from "../components/BuildingScoreGauge";
import { EaRadarChart } from "../components/EaRadarChart";
import { SchoolEnrollmentChart } from "../components/SchoolEnrollmentChart";
import { NearbySchools } from "../components/NearbySchools";
import { SchoolInsetMap } from "../components/SchoolInsetMap";
import { SchoolSearch } from "../components/SchoolSearch";
import { BUILDING_SCORE_TIP, HelpTip, LevelChip, StatCard } from "../components/Ui";
import { useExplorer } from "../data/DataProvider";
import { filterSchools } from "../lib/filters";
import {
  compareToAverage,
  enrollmentChange,
  formatBuildingScore,
  formatMoney,
  formatNumber,
  formatPercent,
  formatSignedPercent,
  schoolSlug,
  temporaryCapacityNote,
  utilizationLabel,
} from "../lib/format";
import {
  CURRENT_ENROLLMENT_YEAR_LABEL,
  HISTORICAL_ENROLLMENT_YEAR,
  PROJECTED_ENROLLMENT_YEAR_LABEL,
} from "../lib/districtCharts";
import { enrollmentView, hasAttendanceArea } from "../lib/enrollmentStats";
import { EA_FACTORS, emptyEaFactors } from "../lib/educationalAdequacy";
import { peerAverage, peerGroupAbbrev, peerGroupNeedsPhrase, peerSchools, snapshotSchools, totalNeeds } from "../lib/peers";
import type { School } from "../types";

function compareNeedClause(
  value: number | null | undefined,
  average: number | null,
  groupLabel: string,
): ReactNode | undefined {
  const cmp = compareToAverage(value, average);
  if (cmp === "unknown" || average == null) return undefined;
  const band =
    cmp === "near" ? "about average" : cmp === "above" ? "above average" : "below average";
  return (
    <>
      <strong className={`compare-band compare-band-${cmp}`}>{band}</strong>
      {` ${groupLabel}`}
    </>
  );
}

function comparePhrase(
  value: number | null | undefined,
  average: number | null,
  groupLabel: string,
  formatValue: (n: number) => string,
): ReactNode | undefined {
  const cmp = compareToAverage(value, average);
  if (cmp === "unknown" || average == null) return undefined;
  const avgText = formatValue(average);
  const band =
    cmp === "near" ? "About Average" : cmp === "above" ? "Above Average" : "Below Average";
  return (
    <span className="compare-line">
      <strong className={`compare-band compare-band-${cmp}`}>{band}</strong>
      <span className="compare-line-rest">{` (${avgText}) ${groupLabel}`}</span>
    </span>
  );
}

function studentChangeHint(delta: number | null): string | undefined {
  if (delta == null) return undefined;
  const rounded = Math.round(delta);
  if (rounded === 0) return "No change in student count";
  const abs = Math.abs(rounded).toLocaleString("en-US");
  return rounded > 0 ? `+${abs} students` : `−${abs} students`;
}

export function SchoolsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data } = useExplorer();

  if (id) {
    const school = data.schools.find((item) => item.id === decodeURIComponent(id));
    if (!school) {
      return (
        <div className="page">
          <SchoolSearch
            schools={data.schools}
            onSelect={(next) => navigate(`/schools/${schoolSlug(next.id)}`)}
          />
          <h1>School not found</h1>
          <p>That site is not in the current snapshot.</p>
          <Link className="btn" to="/schools">
            Back to the school list
          </Link>
        </div>
      );
    }
    return <SchoolProfile school={school} />;
  }

  return <SchoolDirectory />;
}

function SchoolDirectory() {
  const { data, filters, setFilters } = useExplorer();
  const [localQuery, setLocalQuery] = useState(filters.query);
  const searching = localQuery.trim().length > 0;
  const visible = useMemo(() => {
    if (!searching) return [];
    return filterSchools(data.schools, { ...filters, query: localQuery });
  }, [data.schools, filters, localQuery, searching]);

  return (
    <div className="page">
      <p className="eyebrow">Schools</p>
      <h1>Find your School</h1>
      <input
        className="search-input"
        type="search"
        placeholder="Search by school name"
        value={localQuery}
        onChange={(event) => {
          setLocalQuery(event.target.value);
          setFilters({ ...filters, query: event.target.value });
        }}
        aria-label="Search schools"
      />
      {searching ? (
        <>
          <p className="footnote">{formatNumber(visible.length)} schools</p>
          {visible.length ? (
            <ul className="school-list">
              {visible.map((school) => (
                <li key={school.id}>
                  <Link to={`/schools/${schoolSlug(school.id)}`}>
                    <span>
                      <strong>{school.name}</strong>
                      <span>
                        {school.schoolLevel}
                        {school.articulation &&
                        school.articulation !== "NoArticulationArea"
                          ? ` · ${school.articulation}`
                          : ""}
                        {school.status !== "Active" ? ` · ${school.status}` : ""}
                      </span>
                    </span>
                    <span>{formatPercent(school.utilization)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>No schools match that search.</p>
          )}
        </>
      ) : (
        <DistrictSnapshot />
      )}
    </div>
  );
}

function DistrictSnapshot() {
  const { data } = useExplorer();
  const schools = useMemo(() => snapshotSchools(data.schools), [data.schools]);
  const avg = (getValue: (item: School) => number | null | undefined) =>
    peerAverage(schools, getValue);
  const needs = useMemo(() => totalNeeds(schools), [schools]);

  return (
    <>
      <dl className="stat-grid">
        <StatCard
          label="Utilization"
          tip={`How full the buildings are this year (${CURRENT_ENROLLMENT_YEAR_LABEL}). It is K–12 students divided by permanent seats. Portables do not count. Over 100% means more students than planned seats.`}
          value={formatPercent(avg((item) => item.utilization))}
        />
        <StatCard
          label="% Change in Enrollment (2015 - 2025)"
          tip={`How much K–12 enrollment grew or shrank from ${HISTORICAL_ENROLLMENT_YEAR} to ${CURRENT_ENROLLMENT_YEAR_LABEL}. A plus means more students; a minus means fewer.`}
          value={formatSignedPercent(avg(enrollmentChange))}
        />
        <StatCard
          label="Composite Building Score"
          tip={BUILDING_SCORE_TIP}
          value={formatBuildingScore(avg((item) => item.buildingScore))}
        />
        <StatCard
          label="Educational Adequacy"
          tip="A score for how well the building supports teaching and learning, not how worn it is. It uses eight factors, including safety, classroom space, and community."
          value={formatPercent(avg((item) => item.educationalAdequacy))}
        />
      </dl>

      <section className="section" aria-labelledby="needs-heading">
        <h2 id="needs-heading">Identified Facility Needs</h2>
        <NeedsBreakdown
          needs={needs}
          intro={
            <p>
              Figures below are district totals across these schools, not
              averages per school.
            </p>
          }
        />
      </section>
    </>
  );
}

function SchoolProfile({ school }: { school: School }) {
  const navigate = useNavigate();
  const { data } = useExplorer();
  const [includePk, setIncludePk] = useState(true);
  const stats = useMemo(() => enrollmentView(school, includePk), [includePk, school]);
  const tempNote = temporaryCapacityNote(school);

  useEffect(() => {
    setIncludePk(true);
  }, [school.id]);
  const peers = useMemo(
    () => peerSchools(school, data.schools),
    [data.schools, school],
  );
  const districtSchools = useMemo(
    () => snapshotSchools(data.schools),
    [data.schools],
  );
  const groupAbbrev = peerGroupAbbrev(school);
  const eaAverages = useMemo(() => {
    const next = emptyEaFactors();
    for (const factor of EA_FACTORS) {
      next[factor.id] = peerAverage(
        peers,
        (item) => item.educationalAdequacyFactors?.[factor.id],
      );
    }
    return next;
  }, [peers]);

  function cmp(
    getValue: (item: School) => number | null | undefined,
    formatValue: (n: number) => string,
  ) {
    return comparePhrase(
      getValue(school),
      peerAverage(peers, getValue),
      `for other ${groupAbbrev}`,
      formatValue,
    );
  }

  function cmpBoth(
    getValue: (item: School) => number | null | undefined,
    formatValue: (n: number) => string,
  ) {
    const peer = cmp(getValue, formatValue);
    const district = comparePhrase(
      getValue(school),
      peerAverage(districtSchools, getValue),
      "districtwide",
      formatValue,
    );
    if (!peer && !district) return undefined;
    return (
      <>
        {peer}
        {district}
      </>
    );
  }

  return (
    <div className="page school-profile">
      <SchoolSearch
        schools={data.schools}
        excludeId={school.id}
        onSelect={(next) => navigate(`/schools/${schoolSlug(next.id)}`)}
      />
      <p>
          <Link to="/schools">Schools</Link>
        {" · "}
        <Link to="/map">Map</Link>
      </p>
      <div className={`school-profile-top${school.hasMapPoint ? " has-map" : ""}`}>
        <header className="school-hero">
          <h1>{school.name}</h1>
          <div className="chips">
            <LevelChip school={school} />
            {school.articulation && school.articulation !== "NoArticulationArea" ? (
              <span className="chip chip-muted">
                {school.articulation} Articulation Area
              </span>
            ) : null}
            {school.gradesServed ? (
              <span className="chip chip-muted">
                Grades {school.gradesServed.replace(/-/g, "–")}
              </span>
            ) : null}
            {school.yearBuilt ? (
              <span className="chip chip-muted">Year Built: {school.yearBuilt}</span>
            ) : null}
            {school.address ? (
              <span className="chip chip-muted chip-wide">{school.address}</span>
            ) : null}
            {school.capacity != null ? (
              <span className="chip chip-muted">
                Capacity: {formatNumber(school.capacity)}
                <HelpTip label="Capacity">
                  How many students the building is meant to hold in permanent
                  classrooms. Portables do not count.
                  {tempNote ? ` ${tempNote}` : ""}
                </HelpTip>
              </span>
            ) : null}
            {school.squareFt != null ? (
              <span className="chip chip-muted">{formatNumber(school.squareFt)} sqft</span>
            ) : null}
            {school.isCharter ? <span className="chip chip-muted">Charter</span> : null}
          </div>
          <NearbySchools key={school.id} nearby={school.nearbySchools} />
        </header>

        {school.hasMapPoint ? <SchoolInsetMap school={school} /> : null}
      </div>

      <section className="section school-split school-split-enrollment" aria-labelledby="enrollment-heading">
        <h2 id="enrollment-heading">Enrollment</h2>
        <div className="school-split-body">
          <SchoolEnrollmentChart
            school={school}
            includePk={includePk}
            onIncludePkChange={setIncludePk}
          />
          <dl className="stat-grid stat-grid-2">
          <StatCard
            label={`${CURRENT_ENROLLMENT_YEAR_LABEL} enrollment`}
            tip={`How many students are enrolled in ${CURRENT_ENROLLMENT_YEAR_LABEL}${includePk ? ", including pre-K" : ", not counting pre-K"}.`}
            value={formatNumber(stats.current)}
            hint={
              includePk
                ? `Includes current Pre-K: ${formatNumber(school.pkEnrollment)}`
                : undefined
            }
            compare={cmp((item) => enrollmentView(item, includePk).current, formatNumber)}
          />
          <StatCard
            label="Change in enrollment"
            tip={`How much enrollment grew or shrank from ${HISTORICAL_ENROLLMENT_YEAR} to ${CURRENT_ENROLLMENT_YEAR_LABEL}${includePk ? ", including pre-K" : ", not counting pre-K"}. A plus means more students; a minus means fewer.`}
            value={formatSignedPercent(stats.changePct)}
            hint={studentChangeHint(stats.changeCount)}
            compare={cmpBoth(
              (item) => enrollmentView(item, includePk).changePct,
              formatSignedPercent,
            )}
          />
          <StatCard
            label={`Projected enrollment (${PROJECTED_ENROLLMENT_YEAR_LABEL})`}
            tip={`How many students are expected in ${PROJECTED_ENROLLMENT_YEAR_LABEL}${includePk ? ", including pre-K" : ", not counting pre-K"}.`}
            value={formatNumber(stats.projected)}
            hint={
              includePk
                ? `Includes projected Pre-K: ${formatNumber(school.projPkEnrollment)}`
                : undefined
            }
            compare={cmp((item) => enrollmentView(item, includePk).projected, formatNumber)}
          />
          <StatCard
            label="Attendance Area Capture"
            tip={
              !hasAttendanceArea(school)
                ? "Option schools do not have an attendance area, so this measure does not apply."
                : includePk
                  ? "The share of students in this school’s grades who live in its area and also go to this school, including pre-K."
                  : "The share of students in this school’s grades who live in its area and also go to this school, not counting pre-K."
            }
            value={
              hasAttendanceArea(school)
                ? formatPercent(stats.attendanceCapture, {
                    alreadyPercent: true,
                  })
                : "N/A"
            }
            compare={
              hasAttendanceArea(school)
                ? cmpBoth(
                    (item) => enrollmentView(item, includePk).attendanceCapture,
                    (n) => formatPercent(n, { alreadyPercent: true }),
                  )
                : undefined
            }
          />
          <StatCard
            label="Utilization"
            tip={`How full this school is in ${CURRENT_ENROLLMENT_YEAR_LABEL}${includePk ? ", including pre-K" : ", not counting pre-K"}. It is students divided by permanent seats. Portables do not count. Over 100% means more students than planned seats.${
              tempNote ? ` ${tempNote}` : ""
            }`}
            value={formatPercent(stats.utilization)}
            hint={
              <>
                {utilizationLabel(stats.utilization)}
                {tempNote ? (
                  <>
                    <br />
                    {tempNote}
                  </>
                ) : null}
              </>
            }
            compare={cmpBoth(
              (item) => enrollmentView(item, includePk).utilization,
              formatPercent,
            )}
          />
          </dl>
        </div>
      </section>

      <section className="section school-split school-split-ea" aria-labelledby="conditions-heading">
        <h2 id="conditions-heading">Facility Conditions</h2>
        <div className="school-split-body">
          <BuildingScoreGauge
            score={school.buildingScore}
            factors={school.buildingScoreFactors}
            values={school.buildingScoreValues}
            compare={cmpBoth((item) => item.buildingScore, formatBuildingScore)}
          />
          <EaRadarChart
            scores={school.educationalAdequacyFactors}
            averages={eaAverages}
            peerLabel={groupAbbrev}
            overall={school.educationalAdequacy}
            compare={cmpBoth((item) => item.educationalAdequacy, formatPercent)}
          />
        </div>
      </section>

      <section className="section" aria-labelledby="needs-heading">
        <h2 id="needs-heading">Identified Facility Needs</h2>
        <NeedsBreakdown
          needs={school.needs}
          compare={compareNeedClause(
            school.needs.total,
            peerAverage(peers, (item) => item.needs.total),
            peerGroupNeedsPhrase(school),
          )}
        />
      </section>

      {school.hasMapPoint ? (
        <p>
          <Link className="btn" to={`/map?school=${schoolSlug(school.id)}`}>
            View on the map
          </Link>
        </p>
      ) : (
        <p className="footnote">This site does not have map coordinates in the current GIS export.</p>
      )}
    </div>
  );
}
