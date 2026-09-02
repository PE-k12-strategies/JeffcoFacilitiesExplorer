"""Build compact JSON for the public explorer from Facility Data CSVs/GeoJSON.

Run from repo root:  py -3 scripts/build-data.py
"""

from __future__ import annotations

import csv
import json
import math
import os
from collections import defaultdict
from datetime import datetime, timezone
from statistics import median

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC = os.path.join(ROOT, "Facility Data")
OUT = os.path.join(ROOT, "public", "data")


def money(value) -> float:
    if value is None:
        return 0.0
    text = str(value).strip().replace(",", "").replace("$", "").replace('"', "")
    if text == "" or text.lower() in {"nan", "n/a", "#n/a"}:
        return 0.0
    try:
        return float(text)
    except ValueError:
        return 0.0


def number(value):
    if value is None:
        return None
    text = str(value).strip().replace(",", "")
    if text == "" or text.lower() in {
        "nan",
        "n/a",
        "#n/a",
        "not found",
        "not assessed",
    }:
        return None
    try:
        n = float(text)
    except ValueError:
        return None
    if math.isnan(n):
        return None
    return n


def yes_no(value):
    text = str(value or "").strip().lower()
    if text in {"yes", "y", "true", "1"}:
        return True
    if text in {"no", "n", "false", "0"}:
        return False
    return None


def read_csv(name: str) -> list[dict]:
    path = os.path.join(SRC, name)
    with open(path, encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def year_from_header(header: str) -> int | None:
    text = str(header).strip()
    if text.endswith(".0"):
        text = text[:-2]
    if text.isdigit() and len(text) == 4:
        year = int(text)
        if 2000 <= year <= 2100:
            return year
    return None


FOSTER_ID = "CO-1420-3088"
PATTERSON_ID = "CO-1420-6808"
BERGEN_ID = "CO-1420-0779"


def _norm_school_name(name: str) -> str:
    return " ".join(name.lower().replace("-", " ").split())


def _enrollment_years_from_row(row: dict) -> dict[int, float]:
    by_year: dict[int, float] = {}
    for header, raw in row.items():
        year = year_from_header(header)
        if year is None:
            continue
        value = number(raw)
        if value is None:
            continue
        by_year[year] = value
    return by_year


def _series_from_years(by_year: dict[int, float]) -> list[dict[str, float | int]]:
    return [{"year": year, "students": by_year[year]} for year in sorted(by_year)]


def _combine_enrollment_rows(
    uid: str, items: list[tuple[str, dict[int, float]]]
) -> dict[int, float]:
    """Resolve duplicate CDE rows in 12 Enrollment Projections.

    Foster Dual Language PK-8 was renamed from Foster Elementary (same CDE);
    merge the two timelines. Patterson Elementary is K–12; its Preschool row
    is PK (joined from file 14). Bergen Elementary is the complete campus
    series; ignore Bergen Valley (and Bergen Meadow, a different CDE).
    """
    if len(items) == 1:
        return items[0][1]

    if uid == FOSTER_ID:
        merged: dict[int, float] = {}
        dual: dict[int, float] = {}
        for name, series in items:
            if "dual language" in _norm_school_name(name):
                dual = series
            else:
                merged.update(series)
        merged.update(dual)
        return merged

    if uid == PATTERSON_ID:
        for name, series in items:
            if _norm_school_name(name).startswith("patterson elementary"):
                return series
        return items[0][1]

    if uid == BERGEN_ID:
        for name, series in items:
            if _norm_school_name(name).startswith("bergen elementary"):
                return series
        return items[0][1]

    return items[-1][1]


def load_enrollment_projections() -> dict[str, list[dict[str, float | int]]]:
    """Year-by-year enrollment. Column 2015 is school year 2015–16."""
    rows_by_id: dict[str, list[tuple[str, dict[int, float]]]] = defaultdict(list)
    for row in read_csv("12 Enrollment Projections.csv"):
        uid = (row.get("CDE Code") or "").strip()
        if not uid:
            continue
        by_year = _enrollment_years_from_row(row)
        if not by_year:
            continue
        name = (row.get("School") or "").strip()
        rows_by_id[uid].append((name, by_year))

    by_id: dict[str, list[dict[str, float | int]]] = {}
    for uid, items in rows_by_id.items():
        by_id[uid] = _series_from_years(_combine_enrollment_rows(uid, items))
    return by_id


def _add_pk_to_k12_totals(
    k12: list[dict[str, float | int]],
    pk: list[dict[str, float | int]],
) -> list[dict[str, float | int]]:
    """Patterson Elementary is K–12 only; other file 12 rows already include PK."""
    k12_by_year = {int(item["year"]): float(item["students"]) for item in k12}
    pk_by_year = {int(item["year"]): float(item["students"]) for item in pk}
    years = sorted(set(k12_by_year) | set(pk_by_year))
    return [
        {"year": year, "students": k12_by_year.get(year, 0) + pk_by_year.get(year, 0)}
        for year in years
    ]


def year_from_school_year(value: str) -> int | None:
    text = str(value or "").strip()
    if len(text) >= 4 and text[:4].isdigit():
        year = int(text[:4])
        if 2000 <= year <= 2100:
            return year
    return None


def load_pk_enrollment() -> dict[str, list[dict[str, float | int]]]:
    """Year-by-year PK headcount from 14 PK Enrollment.csv (long format)."""
    totals: dict[str, dict[int, float]] = defaultdict(lambda: defaultdict(float))
    for row in read_csv("14 PK Enrollment.csv"):
        uid = (row.get("CDE Code") or "").strip()
        if not uid:
            continue
        grade = (row.get("Grade") or "").strip().upper()
        if grade and grade not in {"PK", "PRE-K", "PREK", "PREKINDERGARTEN"}:
            continue
        year = year_from_school_year(row.get("Year") or "") or year_from_school_year(
            row.get("School Year") or ""
        )
        value = number(row.get("Enrollment"))
        if year is None or value is None:
            continue
        totals[uid][year] += value
    by_id: dict[str, list[dict[str, float | int]]] = {}
    # Patterson Preschool in file 12 is PK (same 2015–22 counts as file 14).
    # Fill any years file 14 does not already have; do not add on top.
    for row in read_csv("12 Enrollment Projections.csv"):
        uid = (row.get("CDE Code") or "").strip()
        name = _norm_school_name(row.get("School") or "")
        if uid != PATTERSON_ID or not name.startswith("patterson preschool"):
            continue
        for year, value in _enrollment_years_from_row(row).items():
            if year not in totals[uid]:
                totals[uid][year] = value
    for uid, by_year in totals.items():
        series = [{"year": year, "students": by_year[year]} for year in sorted(by_year)]
        if series:
            by_id[uid] = series
    return by_id


EMPTY_BUILDING_SCORE_FACTORS = {
    "fci": None,
    "eui": None,
    "age": None,
    "survey": None,
    "workOrder": None,
}


def _row_by_prefix(row: dict, prefix: str):
    for key, value in row.items():
        if str(key).startswith(prefix):
            return value
    return None


def load_permanent_temp_capacity() -> dict[str, dict[str, float | None]]:
    """Applied permanent vs temporary (portable) seats from file 15."""
    by_id: dict[str, dict[str, float | None]] = {}
    for row in read_csv("15 Permanent Temp Capacity.csv"):
        uid = (row.get("State School ID") or "").strip()
        if not uid:
            continue
        by_id[uid] = {
            "permanent": number(row.get("Applied Permanent Capacity")),
            "temporary": number(row.get("Applied Temporary Capacity")),
        }
    return by_id


def load_building_score_workbook() -> tuple[dict[str, dict], dict[str, dict], dict[str, int]]:
    """Standardized 0–1 components and raw inputs from file 13."""
    factors_by_id: dict[str, dict] = {}
    values_by_id: dict[str, dict] = {}
    year_by_id: dict[str, int] = {}
    for row in read_csv("13 Composite Building Score.csv"):
        uid = (row.get("State School ID") or "").strip()
        if not uid:
            continue
        factors_by_id[uid] = {
            "fci": number(row.get("Standardized FCI")),
            "eui": number(row.get("Standardized EUI")),
            "age": number(row.get("Standardized age")),
            "survey": number(row.get("Standardized survey score")),
            "workOrder": number(row.get("Standardized work order $/SF")),
        }
        values_by_id[uid] = {
            "fci": number(row.get("FCI")),
            "eui": number(_row_by_prefix(row, "Site EUI")),
            "age": number(row.get("Effective Building Age")),
            "survey": number(row.get("Facilities condition survey score")),
            "workOrder": number(_row_by_prefix(row, "Average Work Order")),
        }
        year = number(row.get("Year Built"))
        if year is not None:
            year_by_id[uid] = int(year)
    return factors_by_id, values_by_id, year_by_id


PRIORITIES = ("1", "2", "3", "4")


def rollup_costs(filename: str, uid_keys: list[str], cat_key: str, cost_key: str):
    totals: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    by_priority: dict[str, dict[str, dict[str, float]]] = defaultdict(
        lambda: defaultdict(lambda: defaultdict(float))
    )
    for row in read_csv(filename):
        uid = None
        for key in uid_keys:
            raw = (row.get(key) or "").strip()
            if raw:
                uid = raw
                break
        if not uid:
            continue
        category = (row.get(cat_key) or "Other").strip() or "Other"
        category = category[:1].upper() + category[1:]
        cost = money(row.get(cost_key))
        totals[uid][category] += cost
        priority = str(row.get("PriorityScore") or "").strip()
        if priority in PRIORITIES:
            by_priority[uid][priority][category] += cost
    return totals, by_priority


def money_map(values: dict[str, float]) -> dict[str, float]:
    return {key: round_money(value) for key, value in values.items() if value}


def priority_slice(
    uid: str,
    facilities_p,
    safety_p,
    technology_p,
    food_p,
) -> dict:
    return {
        priority: {
            "facilities": money_map(facilities_p.get(uid, {}).get(priority, {})),
            "safety": money_map(safety_p.get(uid, {}).get(priority, {})),
            "technology": money_map(technology_p.get(uid, {}).get(priority, {})),
            "food": money_map(food_p.get(uid, {}).get(priority, {})),
        }
        for priority in PRIORITIES
    }


def round_money(value: float) -> float:
    return round(value, 2)


def median_or_none(values: list[float]):
    clean = [v for v in values if v is not None]
    if not clean:
        return None
    return median(clean)


# EPSG:2232 NAD83 / Colorado Central (US survey feet) → WGS84 lon/lat.
# Lambert Conformal Conic (2SP) inverse; GRS80 ellipsoid.
_LCC = None


def _colorado_central_lcc():
    a = 6378137.0
    f = 1.0 / 298.257222101
    e2 = f * (2.0 - f)
    e = math.sqrt(e2)
    phi1 = math.radians(38.45)
    phi2 = math.radians(39.75)
    phi0 = math.radians(37.83333333333334)
    lam0 = math.radians(-105.5)

    def m(phi: float) -> float:
        return math.cos(phi) / math.sqrt(1.0 - e2 * math.sin(phi) ** 2)

    def t(phi: float) -> float:
        sinp = math.sin(phi)
        return math.tan(math.pi / 4.0 - phi / 2.0) / (
            ((1.0 - e * sinp) / (1.0 + e * sinp)) ** (e / 2.0)
        )

    m1, m2 = m(phi1), m(phi2)
    t0, t1, t2 = t(phi0), t(phi1), t(phi2)
    n = (math.log(m1) - math.log(m2)) / (math.log(t1) - math.log(t2))
    F = m1 / (n * t1**n)
    return {
        "a": a,
        "e": e,
        "n": n,
        "F": F,
        "rho0": a * F * t0**n,
        "lam0": lam0,
        "usft": 1200.0 / 3937.0,
        "fe": 3_000_000.0,
        "fn": 1_000_000.0,
    }


def stateplane_to_lonlat(x_ft: float, y_ft: float) -> tuple[float, float]:
    global _LCC
    if _LCC is None:
        _LCC = _colorado_central_lcc()
    c = _LCC
    x = (x_ft - c["fe"]) * c["usft"]
    y = (y_ft - c["fn"]) * c["usft"]
    n = c["n"]
    rho = math.hypot(x, c["rho0"] - y)
    if n < 0:
        rho = -rho
    theta = math.atan2(x, c["rho0"] - y)
    t = (rho / (c["a"] * c["F"])) ** (1.0 / n)
    e = c["e"]
    phi = math.pi / 2.0 - 2.0 * math.atan(t)
    for _ in range(10):
        sinp = math.sin(phi)
        phi = math.pi / 2.0 - 2.0 * math.atan(
            t * (((1.0 - e * sinp) / (1.0 + e * sinp)) ** (e / 2.0))
        )
    lam = theta / n + c["lam0"]
    return math.degrees(lam), math.degrees(phi)


def transform_geometry_coords(coords):
    if not coords:
        return coords
    if isinstance(coords[0], (int, float)):
        lon, lat = stateplane_to_lonlat(float(coords[0]), float(coords[1]))
        return [round(lon, 6), round(lat, 6)]
    return [transform_geometry_coords(part) for part in coords]


def to_wgs84_geometry(geometry: dict | None):
    if not geometry or not geometry.get("coordinates"):
        return geometry
    return {
        "type": geometry["type"],
        "coordinates": transform_geometry_coords(geometry["coordinates"]),
    }


def main() -> None:
    os.makedirs(OUT, exist_ok=True)

    decision = read_csv("01 Decision Data Export.csv")
    mapped = {row["Building Code"]: row for row in read_csv("09 Map_Export.csv")}
    year_by_id = {
        (row.get("UniqueID") or "").strip(): (
            int(n) if (n := number(row.get("YearBuilt"))) is not None else None
        )
        for row in read_csv("10 YearBuilt.csv")
        if (row.get("UniqueID") or "").strip()
    }

    safety, safety_p = rollup_costs(
        "02.1_SafetyandSecurityProjects.csv",
        ["UniqueID"],
        "AssetType",
        "ReplacementCost",
    )
    deficiency, deficiency_p = rollup_costs(
        "02.2_FacilitiesDeficiencyProjects.csv",
        ["UniqueID"],
        "AssetType",
        "ReplacementCost",
    )
    technology, technology_p = rollup_costs(
        "02.4_InformationTechnologyProjects.csv",
        ["UniqueID"],
        "AssetType",
        "ReplacementCost",
    )
    food, food_p = rollup_costs(
        "02.5_FoodAndNutritionProjects.csv",
        ["UniqueID"],
        "AssetType",
        "ReplacementCost",
    )

    score_factors_by_id, score_values_by_id, composite_year_by_id = load_building_score_workbook()
    year_by_id.update(composite_year_by_id)
    universe = set(score_factors_by_id)
    if len(universe) != 122:
        print(f"Warning: composite universe has {len(universe)} schools, expected 122")

    grades_by_id: dict[str, str] = {}
    nearby_by_id: dict[str, list[dict]] = defaultdict(list)
    for row in read_csv("06 SchooltoSchoolDistances.csv"):
        uid = (row.get("Origin CDE Prefix") or "").strip()
        grades = (row.get("Origin Grades") or "").strip().strip("'").strip('"')
        if uid and grades and uid in universe:
            grades_by_id.setdefault(uid, grades)
        dest = (row.get("Destination CDE Prefix") or "").strip()
        rank_n = number(row.get("Nth Closest to Origin"))
        if not uid or not dest or rank_n is None:
            continue
        if uid not in universe or dest not in universe:
            continue
        rank = int(rank_n)
        if rank < 2:
            continue
        overlap = (row.get("Grade Overlap") or "").strip().strip("'").strip('"')
        nearby_by_id[uid].append(
            {
                "id": dest,
                "name": (row.get("Destination Facility Name") or "").strip(),
                "rank": rank,
                "distanceMiles": number(row.get("Network Distance (Miles)")),
                "grades": (row.get("Destination Grade") or "").strip().strip("'").strip('"'),
                "gradeOverlap": overlap,
            }
        )
    def grade_overlaps(value: str) -> bool:
        return value.strip().lower() not in {"", "no"}

    for origin, items in nearby_by_id.items():
        items.sort(key=lambda item: item["rank"])
        closest = [item for item in items if 2 <= item["rank"] <= 6][:5]
        overlapping = [item for item in items if grade_overlaps(item["gradeOverlap"])][:5]
        by_dest = {item["id"]: item for item in closest + overlapping}
        nearby_by_id[origin] = sorted(by_dest.values(), key=lambda item: item["rank"])

    enrollment_by_id = load_enrollment_projections()
    pk_by_id = load_pk_enrollment()
    capacity_split = load_permanent_temp_capacity()

    address_by_id: dict[str, str] = {}
    for row in read_csv("11 Addresses.csv"):
        uid = (row.get("State School ID") or "").strip()
        address = (row.get("Full Address") or "").strip()
        if uid and address:
            address_by_id.setdefault(uid, address)

    def ea_points(value) -> int | None:
        n = number(value)
        if n is None:
            return None
        return int(round(n * 100))

    ea_by_id: dict[str, dict[str, int | None]] = {}
    for row in read_csv("16 EA Category Scores.csv"):
        uid = (row.get("State School ID") or "").strip()
        if not uid or uid in ea_by_id:
            continue
        ea_by_id[uid] = {
            "presence": ea_points(row.get("Presence weighted")),
            "safetySecurity": ea_points(row.get("Safety & Security score weighted")),
            "community": ea_points(row.get("Community score weighted")),
            "organization": ea_points(row.get("Organization score weighted")),
            "environmentalQuality": ea_points(row.get("Overall Environmental Quality score")),
            "instructionalSpace": ea_points(row.get("Overall Classroom score")),
            "assembly": ea_points(row.get("Assembly score weighted")),
            "extendedLearning": ea_points(row.get("Extended learning score weighted")),
        }

    schools = []
    for row in decision:
        uid = row["UniqueID"]
        geo = mapped.get(uid, {})
        split = capacity_split.get(uid)
        capacity = number(row.get("Capacity"))
        if split and split["permanent"] is not None:
            capacity = split["permanent"]
        temporary_capacity = split["temporary"] if split else None
        enrollment = number(row.get("CurrEnrollment"))
        utilization = None
        if capacity and capacity > 0 and enrollment is not None:
            utilization = enrollment / capacity

        def_by = money_map(deficiency.get(uid, {}))
        safety_by = money_map(safety.get(uid, {}))
        tech_by = money_map(technology.get(uid, {}))
        food_by = money_map(food.get(uid, {}))

        lat = number(geo.get("Latitude"))
        lon = number(geo.get("Longitude"))
        enrollment_by_year = enrollment_by_id.get(uid, [])
        pk_by_year = pk_by_id.get(uid, [])
        # Patterson Elementary is K–12; add file 14 / preschool PK so totals
        # match other schools (file 12 already includes PK).
        if uid == PATTERSON_ID:
            enrollment_by_year = _add_pk_to_k12_totals(enrollment_by_year, pk_by_year)
        students_by_year = {item["year"]: item["students"] for item in enrollment_by_year}

        school = {
            "id": uid,
            "facilityId": row.get("JeffCoFacilityID"),
            "name": row.get("Building Name"),
            "status": row.get("Status") or "Unknown",
            "schoolLevel": row.get("School Level") or "Unknown",
            "isCharter": (row.get("School Level") or "") == "Charter",
            "includeFlowChart": yes_no(row.get("Include_Flow_Chart")),
            "capacity": capacity,
            "temporaryCapacity": temporary_capacity,
            "educationalCapacity": number(row.get("EducationalCapacity")),
            "historicalEnrollment": students_by_year.get(2015, number(row.get("HistoricalEnrollment"))),
            "pkEnrollment": number(row.get("CurrPKEnrollment")),
            "enrollment": enrollment,
            "projPkEnrollment": number(row.get("ProjEnrollment_PK")),
            "projEnrollment": students_by_year.get(2030, number(row.get("ProjEnrollment_Total"))),
            "enrollmentByYear": enrollment_by_year,
            "pkEnrollmentByYear": pk_by_year,
            "fci": number(row.get("FCI")),
            "yearBuilt": year_by_id.get(uid),
            "educationalAdequacy": number(row.get("EducationalAdequacy")),
            "educationalAdequacyFactors": ea_by_id.get(
                uid,
                {
                    "presence": None,
                    "safetySecurity": None,
                    "community": None,
                    "organization": None,
                    "environmentalQuality": None,
                    "instructionalSpace": None,
                    "assembly": None,
                    "extendedLearning": None,
                },
            ),
            "siteCapacity": yes_no(row.get("SiteCapacity")),
            "squareFt": number(row.get("SquareFt")),
            "buildingScore": number(row.get("BuildingScore")),
            "buildingScoreFactors": score_factors_by_id.get(
                uid, EMPTY_BUILDING_SCORE_FACTORS
            ),
            "buildingScoreValues": score_values_by_id.get(
                uid, EMPTY_BUILDING_SCORE_FACTORS
            ),
            "recentInvestments": yes_no(row.get("RecentInvestments")),
            "attendanceAreaEnrollment": number(row.get("AttendanceAreaEnrollment")),
            "nonPkAttendanceAreaEnrollment": number(
                row.get("NonPKAttendanceAreaEnrollment")
            ),
            "highNeedStudents": number(row.get("HighNeedStudents")),
            "roftsStudentsReceived": number(row.get("ROFTSStudentsREceived")),
            "classroomEaScore": number(row.get("ClassroomEAScore")),
            "classroomCount": number(row.get("ClassroomCount")),
            "utilization": utilization,
            "articulation": geo.get("Articulation") or None,
            "gradesServed": grades_by_id.get(uid),
            "nearbySchools": nearby_by_id.get(uid, []),
            "address": address_by_id.get(uid),
            "latitude": lat,
            "longitude": lon,
            "hasMapPoint": lat is not None and lon is not None,
            "needs": {
                "facilities": def_by,
                "safety": safety_by,
                "technology": tech_by,
                "food": food_by,
                "facilitiesTotal": round_money(sum(def_by.values())),
                "safetyTotal": round_money(sum(safety_by.values())),
                "technologyTotal": round_money(sum(tech_by.values())),
                "foodTotal": round_money(sum(food_by.values())),
                "total": round_money(
                    sum(def_by.values())
                    + sum(safety_by.values())
                    + sum(tech_by.values())
                    + sum(food_by.values())
                ),
                "byPriority": priority_slice(
                    uid, deficiency_p, safety_p, technology_p, food_p
                ),
            },
        }
        schools.append(school)

    found = {school["id"] for school in schools}
    missing = sorted(universe - found)
    if missing:
        print("Warning: composite IDs missing from Decision export:")
        for uid in missing:
            print(f"  {uid}")
    schools = [school for school in schools if school["id"] in universe]
    for school in schools:
        school["nearbySchools"] = [
            item for item in school.get("nearbySchools") or [] if item["id"] in universe
        ]

    schools.sort(key=lambda s: (s["name"] or "").lower())
    active = [s for s in schools if s["status"] == "Active"]

    def collect(key: str, rows=None):
        source = rows if rows is not None else schools
        return [s[key] for s in source if s.get(key) is not None]

    district = {
        "schoolCount": len(schools),
        "activeCount": len(active),
        "closedCount": sum(1 for s in schools if s["status"] == "Closed"),
        "charterCount": sum(1 for s in schools if s["isCharter"]),
        "mappedCount": sum(1 for s in schools if s["hasMapPoint"]),
        "totalEnrollment": round(sum(s["enrollment"] or 0 for s in active), 0),
        "totalCapacity": round(sum(s["capacity"] or 0 for s in active), 0),
        "totalSquareFt": round(sum(s["squareFt"] or 0 for s in active), 0),
        "totalIdentifiedNeed": round(
            sum(s["needs"]["total"] for s in active), 2
        ),
        "medianUtilization": median_or_none(collect("utilization", active)),
        "medianEducationalAdequacy": median_or_none(
            collect("educationalAdequacy", active)
        ),
        "medianBuildingScore": median_or_none(collect("buildingScore", active)),
        "medianFci": median_or_none(collect("fci", active)),
        "levels": sorted({s["schoolLevel"] for s in schools if s["schoolLevel"]}),
        "articulationAreas": sorted(
            {
                s["articulation"]
                for s in schools
                if s["articulation"] and s["articulation"] != "NoArticulationArea"
            }
        ),
    }

    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": "local-facility-data",
        "district": district,
        "schools": schools,
    }

    schools_path = os.path.join(OUT, "schools.json")
    with open(schools_path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, separators=(",", ":"))

    geo_src = os.path.join(SRC, "08 ArticulationArea.geojson")
    geo_dst = os.path.join(OUT, "articulation-areas.geojson")
    with open(geo_src, encoding="utf-8") as handle:
        geo = json.load(handle)
    slim = {
        "type": "FeatureCollection",
        "name": "ArticulationAreas",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "name": feat.get("properties", {}).get("Articulation Area")
                },
                "geometry": to_wgs84_geometry(feat.get("geometry")),
            }
            for feat in geo.get("features", [])
        ],
    }
    with open(geo_dst, "w", encoding="utf-8") as handle:
        json.dump(slim, handle, ensure_ascii=False, separators=(",", ":"))

    from shapely.geometry import mapping, shape
    from shapely.ops import unary_union

    district_geoms = [
        shape(feat["geometry"])
        for feat in slim["features"]
        if feat.get("geometry")
    ]
    merged = unary_union(district_geoms)
    if merged.is_empty:
        raise RuntimeError("Articulation areas produced an empty district boundary")
    if not merged.is_valid:
        merged = merged.buffer(0)
    district_geo = {
        "type": "FeatureCollection",
        "name": "DistrictBoundary",
        "features": [
            {
                "type": "Feature",
                "properties": {"name": "Jeffco Public Schools"},
                "geometry": mapping(merged),
            }
        ],
    }
    district_dst = os.path.join(OUT, "district-boundary.geojson")
    with open(district_dst, "w", encoding="utf-8") as handle:
        json.dump(district_geo, handle, ensure_ascii=False, separators=(",", ":"))

    matched = sum(1 for school in schools if school["enrollmentByYear"])
    pk_matched = sum(1 for school in schools if school["pkEnrollmentByYear"])
    perm_matched = sum(1 for school in schools if school.get("capacity") is not None)
    temp_matched = sum(
        1 for school in schools if (school.get("temporaryCapacity") or 0) > 0
    )
    print(f"Wrote {len(schools)} schools -> {schools_path}")
    print(f"Enrollment projections joined for {matched} schools")
    print(f"PK enrollment joined for {pk_matched} schools")
    print(
        f"Permanent capacity joined for {perm_matched} schools "
        f"({temp_matched} with portable seats)"
    )
    print(f"Wrote {len(slim['features'])} articulation areas -> {geo_dst}")
    print(f"Wrote district boundary -> {district_dst}")


if __name__ == "__main__":
    main()
