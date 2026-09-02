import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import MapGL, {
  GeolocateControl,
  Layer,
  NavigationControl,
  Popup,
  Source,
  type MapRef,
} from "react-map-gl/mapbox";
import mapboxgl, { type FilterSpecification, type MapLayerMouseEvent } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  FilterPanel,
  type ArticulationColorMode,
  type FilterSliderId,
} from "../components/FilterPanel";
import { LevelChip } from "../components/Ui";
import { useExplorer } from "../data/DataProvider";
import { filterSchools, isCharterSchool } from "../lib/filters";
import { isCompositeUniverseSchool } from "../lib/universe";
import {
  articulationChangeStats,
  BIRTH_CHANGE_BY_AREA,
  BIRTH_CHANGE_YEARS,
  birthChangeRange,
  CURRENT_ENROLLMENT_YEAR_LABEL,
  HISTORICAL_ENROLLMENT_YEAR,
} from "../lib/districtCharts";
import { formatNumber, formatPercent, formatSignedPercent, schoolSlug, temporaryCapacityNote } from "../lib/format";
import { assetUrl } from "../lib/assetUrl";
import { colors, levelColors } from "../lib/theme";
import {
  circlePaint,
  formatSchoolMetric,
  formatSymbologyValue,
  metricRange,
  metricValue,
  needColorRanks,
  SYMBOLOGY_DIVERGING_RAMP,
  SYMBOLOGY_MISSING,
  symbologyLabel,
  symbologyRamp,
} from "../lib/symbology";
import type { MapSymbology, School } from "../types";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const BASEMAPS = [
  {
    id: "light",
    label: "Light",
    style: "mapbox://styles/mapbox/light-v11",
    preview: "basemaps/light.jpg",
  },
  {
    id: "street",
    label: "Street",
    style: "mapbox://styles/mapbox/streets-v12",
    preview: "basemaps/street.jpg",
  },
  {
    id: "satellite",
    label: "Satellite",
    style: "mapbox://styles/mapbox/satellite-streets-v12",
    preview: "basemaps/satellite.jpg",
  },
] as const;

type BasemapId = (typeof BASEMAPS)[number]["id"];

const CLOSED_SLASH_ID = "closed-slash";

/** Opening camera: centroid of the rectangle Elk Creek ES (SW) – Ryan ES (NE). */
const ELK_CREEK_ES: [number, number] = [-105.3729216, 39.47280646];
const RYAN_ES: [number, number] = [-105.0612379, 39.90533128];
const MAP_OPENING_BOUNDS: [[number, number], [number, number]] = [
  ELK_CREEK_ES,
  RYAN_ES,
];
const DISTRICT_OUTLINE = "#3a1850";

/** School name labels appear at this zoom and closer. Raise to show later. */
const SCHOOL_LABEL_MIN_ZOOM = 11.5;

/** Same idle/hover rules as the MoCo dashboard AREA_PAINT. */
const AREA_PAINT = {
  fillColor: colors.purple,
  lineColor: "#4e2a65",
  fillOpacityIdle: 0,
  fillOpacityActive: 0.14,
  hitOpacity: 0.001,
  lineWidthIdle: 1,
  lineWidthActive: 3.4,
  lineOpacityIdle: 0.55,
  lineOpacityActive: 1,
} as const;

const AREA_NONE_FILTER: FilterSpecification = ["==", ["get", "name"], "__none__"];

function featureBounds(geometry: unknown): mapboxgl.LngLatBounds | null {
  const bounds = new mapboxgl.LngLatBounds();
  let found = false;
  function walk(node: unknown) {
    if (!Array.isArray(node) || node.length === 0) return;
    if (typeof node[0] === "number" && typeof node[1] === "number") {
      bounds.extend([node[0] as number, node[1] as number]);
      found = true;
      return;
    }
    for (const child of node) walk(child);
  }
  if (geometry && typeof geometry === "object" && "coordinates" in geometry) {
    walk((geometry as { coordinates: unknown }).coordinates);
  }
  return found ? bounds : null;
}

function areaNameOf(school: School | null | undefined): string | null {
  const name = school?.articulation?.trim();
  if (!name || name === "NoArticulationArea") return null;
  return name;
}

function layerIdOf(
  feature: { layer?: { id?: string } } | undefined,
): string {
  return feature?.layer?.id ?? "";
}

function ensureClosedSlashImage(map: mapboxgl.Map) {
  try {
    if (!map.isStyleLoaded() || map.hasImage(CLOSED_SLASH_ID)) return;
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#d32f2f";
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(8, 8);
    ctx.lineTo(56, 56);
    ctx.stroke();
    map.addImage(CLOSED_SLASH_ID, ctx.getImageData(0, 0, size, size), {
      pixelRatio: 2,
    });
  } catch {
    // Style swaps can race addImage; the next style event retries.
  }
}

function toFeatureCollection(schools: School[], mode: MapSymbology) {
  const ranks = mode === "need" ? needColorRanks(schools) : null;
  return {
    type: "FeatureCollection" as const,
    features: schools
      .filter((school) => school.hasMapPoint)
      .map((school) => {
        const value = metricValue(school, mode);
        const metric = ranks ? (ranks.get(school.id) ?? 0) : (value ?? 0);
        return {
          type: "Feature" as const,
          properties: {
            id: school.id,
            name: school.name,
            schoolLevel: school.schoolLevel,
            closed: school.status === "Closed" ? 1 : 0,
            enrollment: school.enrollment ?? 0,
            metric,
            hasMetric: value != null ? 1 : 0,
          },
          geometry: {
            type: "Point" as const,
            coordinates: [school.longitude as number, school.latitude as number],
          },
        };
      }),
  };
}

function searchSchools(schools: School[], query: string, limit = 12): School[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return schools
    .filter(
      (school) =>
        isCompositeUniverseSchool(school) &&
        school.hasMapPoint &&
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

export function MapPage() {
  const { data, articulation, districtBoundary, filters, setFilters, resetFilters } =
    useExplorer();
  const [searchParams] = useSearchParams();
  const mapRef = useRef<MapRef>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const schoolFromUrl = searchParams.get("school");
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 800px)").matches,
  );
  const [filtersOpen, setFiltersOpen] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 800px)").matches,
  );
  const [mobileFilterTab, setMobileFilterTab] = useState<"layers" | "sliders">("layers");
  const [activeSlider, setActiveSlider] = useState<FilterSliderId>("enrollment");
  const [articulationColor, setArticulationColor] =
    useState<ArticulationColorMode>("default");
  const [selectedId, setSelectedId] = useState<string | null>(schoolFromUrl);
  const [pinnedAreaName, setPinnedAreaName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [basemap, setBasemap] = useState<BasemapId>("light");
  const flownToId = useRef<string | null>(null);
  const [areaHover, setAreaHover] = useState<{
    name: string | null;
    lng: number;
    lat: number;
    fromSchool: boolean;
  } | null>(null);
  const [schoolHover, setSchoolHover] = useState<{
    school: School;
    lng: number;
    lat: number;
  } | null>(null);
  const [mapCursor, setMapCursor] = useState<"pointer" | "auto">("auto");

  const visible = useMemo(
    () => filterSchools(data.schools, { ...filters, query: "" }),
    [data.schools, filters],
  );
  const matches = useMemo(
    () => searchSchools(data.schools, searchQuery),
    [data.schools, searchQuery],
  );
  const selected = data.schools.find((school) => school.id === selectedId) ?? null;
  const mapped = useMemo(() => {
    const points = visible.filter((school) => school.hasMapPoint);
    if (selected?.hasMapPoint && !points.some((school) => school.id === selected.id)) {
      return [...points, selected];
    }
    return points;
  }, [selected, visible]);
  const symbology = filters.symbology ?? "type";
  const range = useMemo(
    () => metricRange(mapped, symbology),
    [mapped, symbology],
  );
  const points = useMemo(
    () => toFeatureCollection(mapped, symbology),
    [mapped, symbology],
  );
  const pointPaint = useMemo(
    () => circlePaint(symbology, range),
    [range, symbology],
  );
  const birthRange = useMemo(() => birthChangeRange(), []);
  const enrollmentByArea = useMemo(() => {
    const stats = articulationChangeStats(data.schools);
    const values: number[] = [];
    const byName: Record<string, number> = {};
    for (const row of stats.rows) {
      if (row.change == null) continue;
      const pct = row.change * 100;
      byName[row.name] = pct;
      values.push(pct);
    }
    return {
      byName,
      min: values.length ? Math.min(...values) : -10,
      max: values.length ? Math.max(...values) : 10,
    };
  }, [data.schools]);
  const articulationWithBirths = useMemo(() => {
    if (!articulation) return null;
    return {
      ...articulation,
      features: articulation.features.map((feature) => {
        const name = feature.properties?.name?.trim() ?? "";
        const birthChange = BIRTH_CHANGE_BY_AREA[name];
        const enrollmentChangePct = enrollmentByArea.byName[name];
        return {
          ...feature,
          properties: {
            ...feature.properties,
            birthChange: birthChange ?? 0,
            hasBirthChange: birthChange == null ? 0 : 1,
            enrollmentChange: enrollmentChangePct ?? 0,
            hasEnrollmentChange: enrollmentChangePct == null ? 0 : 1,
          },
        };
      }),
    };
  }, [articulation, enrollmentByArea.byName]);
  const areaFillPaint = useMemo(() => {
    if (articulationColor === "default") {
      return {
        "fill-color": "#c8c8c8",
        "fill-opacity": 0.3,
      };
    }
    const ramp = SYMBOLOGY_DIVERGING_RAMP;
    const isBirth = articulationColor === "birthChange";
    const valueProp = isBirth ? "birthChange" : "enrollmentChange";
    const flagProp = isBirth ? "hasBirthChange" : "hasEnrollmentChange";
    const min = isBirth ? birthRange.min : enrollmentByArea.min;
    const max = isBirth ? birthRange.max : enrollmentByArea.max;
    return {
      "fill-color": [
        "case",
        ["==", ["get", flagProp], 1],
        [
          "interpolate",
          ["linear"],
          ["get", valueProp],
          min,
          ramp[0],
          0,
          ramp[1],
          max,
          ramp[2],
        ],
        SYMBOLOGY_MISSING,
      ],
      "fill-opacity": 0.52,
    };
  }, [
    articulationColor,
    birthRange.max,
    birthRange.min,
    enrollmentByArea.max,
    enrollmentByArea.min,
  ]);
  const selectedAreaName = areaNameOf(selected);
  const activeAreaName = areaHover ? areaHover.name : selectedAreaName ?? pinnedAreaName;
  const activeAreaFilter: FilterSpecification = activeAreaName
    ? ["==", ["get", "name"], activeAreaName]
    : AREA_NONE_FILTER;
  const interactiveLayerIds = [
    "school-points",
    "school-closed-slash",
    "articulation-hit",
    "articulation-fill",
  ];

  useEffect(() => {
    setActiveIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!searchRef.current?.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 800px)");
    const sync = () => setIsDesktop(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    map.resize();
    const timer = window.setTimeout(() => map.resize(), 240);
    return () => window.clearTimeout(timer);
  }, [filtersOpen]);

  function flyToSchool(school: School, map?: mapboxgl.Map) {
    if (!school.hasMapPoint || school.longitude == null || school.latitude == null) {
      return;
    }
    const target = map ?? mapRef.current;
    target?.flyTo({
      center: [school.longitude, school.latitude],
      zoom: 14,
      duration: 1100,
      essential: true,
    });
  }

  function focusSchool(school: School, map?: mapboxgl.Map) {
    setPinnedAreaName(null);
    setSelectedId(school.id);
    setSearchQuery(school.name);
    setSearchOpen(false);
    flownToId.current = school.id;
    flyToSchool(school, map);
  }

  useEffect(() => {
    if (!schoolFromUrl) return;
    const school = data.schools.find((item) => item.id === schoolFromUrl);
    if (!school) return;
    setSelectedId(school.id);
    setSearchQuery(school.name);
    if (flownToId.current === school.id) return;
    if (mapRef.current) {
      flownToId.current = school.id;
      flyToSchool(school);
    }
  }, [data.schools, schoolFromUrl]);

  function fitToArticulationArea(name: string) {
    const feature = articulation?.features.find(
      (item) => item.properties?.name?.trim() === name,
    );
    const bounds = feature ? featureBounds(feature.geometry) : null;
    const map = mapRef.current;
    if (!bounds || !map) return;
    map.fitBounds(bounds, {
      padding: { top: 56, bottom: 88, left: 36, right: 36 },
      duration: 900,
      essential: true,
      maxZoom: 13,
    });
  }

  function onMapClick(event: MapLayerMouseEvent) {
    const top = event.features?.[0];
    const layerId = layerIdOf(top);
    if (layerId === "school-points" || layerId === "school-closed-slash") {
      const id = top?.properties?.id;
      setPinnedAreaName(null);
      setSelectedId(typeof id === "string" ? id : null);
      return;
    }
    if (layerId === "articulation-fill" || layerId === "articulation-hit") {
      const name =
        typeof top?.properties?.name === "string" ? top.properties.name.trim() : "";
      if (name) {
        setSelectedId(null);
        setPinnedAreaName(name);
        fitToArticulationArea(name);
      }
      return;
    }
    setPinnedAreaName(null);
    setSelectedId(null);
  }

  function onMapMouseMove(event: MapLayerMouseEvent) {
    const features = event.features ?? [];
    const schoolFeat = features.find((feature) => {
      const id = layerIdOf(feature);
      return id === "school-points" || id === "school-closed-slash";
    });
    const areaFeat = features.find((feature) => {
      const id = layerIdOf(feature);
      return id === "articulation-fill" || id === "articulation-hit";
    });

    setMapCursor(schoolFeat || areaFeat ? "pointer" : "auto");

    const lng = event.lngLat.lng;
    const lat = event.lngLat.lat;
    if (schoolFeat) {
      const id = schoolFeat.properties?.id;
      const school =
        typeof id === "string"
          ? data.schools.find((item) => item.id === id)
          : undefined;
      setSchoolHover(school ? { school, lng, lat } : null);
      setAreaHover({
        name: areaNameOf(school),
        lng,
        lat,
        fromSchool: true,
      });
      return;
    }

    if (schoolHover) setSchoolHover(null);

    const name =
      typeof areaFeat?.properties?.name === "string"
        ? areaFeat.properties.name.trim()
        : "";
    if (name) {
      setAreaHover({ name, lng, lat, fromSchool: false });
      return;
    }
    if (areaHover) setAreaHover(null);
  }

  function onMapMouseLeave() {
    setAreaHover(null);
    setSchoolHover(null);
    setMapCursor("auto");
  }

  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setSearchOpen(false);
      return;
    }
    if (!matches.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSearchOpen(true);
      setActiveIndex((index) => (index + 1) % matches.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSearchOpen(true);
      setActiveIndex((index) => (index - 1 + matches.length) % matches.length);
      return;
    }
    if (event.key === "Enter" && searchOpen) {
      event.preventDefault();
      const school = matches[activeIndex];
      if (school) focusSchool(school);
    }
  }

  return (
    <div className="map-page">
      <div
        className={`filter-drawer${filtersOpen ? " open" : ""}${
          isDesktop ? "" : ` mobile-${mobileFilterTab}`
        }`}
        id="map-filter-drawer"
      >
        <div className="filter-drawer-head">
          {isDesktop ? <h2>Filters</h2> : (
            <div className="filter-subnav" role="tablist" aria-label="Map filter sections">
              <button
                type="button"
                role="tab"
                aria-selected={mobileFilterTab === "layers"}
                className={mobileFilterTab === "layers" ? "is-active" : undefined}
                onClick={() => setMobileFilterTab("layers")}
              >
                Map Layers
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mobileFilterTab === "sliders"}
                className={mobileFilterTab === "sliders" ? "is-active" : undefined}
                onClick={() => setMobileFilterTab("sliders")}
              >
                Map Filters
              </button>
            </div>
          )}
          <button
            type="button"
            className="btn filters-toggle"
            onClick={() => setFiltersOpen(false)}
          >
            {isDesktop ? "Hide Filters" : "Done"}
          </button>
        </div>
        <FilterPanel
          filters={filters}
          district={data.district}
          onChange={setFilters}
          onReset={resetFilters}
          section={isDesktop ? "all" : mobileFilterTab === "layers" ? "layers" : "sliders"}
          activeSlider={activeSlider}
          onActiveSliderChange={setActiveSlider}
          articulationColor={articulationColor}
          onArticulationColorChange={setArticulationColor}
          mapOptions={
            <MapOptionsControls
              basemap={basemap}
              onBasemapChange={setBasemap}
              compact
            />
          }
        />
      </div>

      <div className="map-stage">
        <button
          type="button"
          className="filter-rail-toggle"
          aria-expanded={filtersOpen}
          aria-controls="map-filter-drawer"
          aria-label={filtersOpen ? "Hide filters" : "Show filters"}
          onClick={() => setFiltersOpen((open) => !open)}
        />
        <div className="map-toolbar">
          {!filtersOpen ? (
            <button
              type="button"
              className="btn btn-ghost filters-toggle"
              aria-expanded={false}
              onClick={() => setFiltersOpen(true)}
            >
              Filters
            </button>
          ) : null}
          <div className="school-search" ref={searchRef}>
            <input
              className="search-input"
              type="search"
              placeholder="Search schools"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => {
                if (searchQuery.trim()) setSearchOpen(true);
              }}
              onKeyDown={onSearchKeyDown}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={searchOpen && Boolean(searchQuery.trim())}
              aria-controls="map-school-results"
              aria-activedescendant={
                searchOpen && matches[activeIndex]
                  ? `map-school-option-${matches[activeIndex].id}`
                  : undefined
              }
              aria-label="Search schools on the map"
            />
            {searchOpen && searchQuery.trim() ? (
              <ul className="school-search-results" id="map-school-results" role="listbox">
                {matches.length ? (
                  matches.map((school, index) => (
                    <li key={school.id} role="presentation">
                      <button
                        type="button"
                        className="school-search-option"
                        id={`map-school-option-${school.id}`}
                        role="option"
                        aria-selected={index === activeIndex}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => focusSchool(school)}
                      >
                        <strong>{school.name}</strong>
                        <span>
                          {school.schoolLevel}
                          {school.articulation &&
                          school.articulation !== "NoArticulationArea"
                            ? ` · ${school.articulation}`
                            : ""}
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
        </div>

        <div className="map-canvas">
          {MAPBOX_TOKEN ? (
            <MapGL
              ref={mapRef}
              mapLib={mapboxgl}
              localFontFamily="Montserrat"
              initialViewState={{
                bounds: MAP_OPENING_BOUNDS,
                fitBoundsOptions: {
                  padding: { top: 56, bottom: 88, left: 16, right: 16 },
                },
              }}
              mapboxAccessToken={MAPBOX_TOKEN}
              mapStyle={BASEMAPS.find((item) => item.id === basemap)?.style}
              interactiveLayerIds={interactiveLayerIds}
              onClick={onMapClick}
              onMouseMove={onMapMouseMove}
              onMouseLeave={onMapMouseLeave}
              onLoad={(event) => {
                ensureClosedSlashImage(event.target);
                if (!schoolFromUrl) return;
                const school = data.schools.find((item) => item.id === schoolFromUrl);
                if (!school || flownToId.current === school.id) return;
                flownToId.current = school.id;
                flyToSchool(school, event.target);
              }}
              onStyleData={() => {
                const map = mapRef.current?.getMap();
                if (map) ensureClosedSlashImage(map);
              }}
              cursor={mapCursor}
              style={{ width: "100%", height: "100%" }}
            >
              <NavigationControl position="top-left" />
              <GeolocateControl position="top-left" trackUserLocation />

              {articulationWithBirths ? (
                <Source
                  id="articulation"
                  type="geojson"
                  data={articulationWithBirths as never}
                  promoteId="name"
                >
                  <Layer
                    id="articulation-hit"
                    type="fill"
                    paint={{
                      "fill-color": "#ffffff",
                      "fill-opacity": AREA_PAINT.hitOpacity,
                    }}
                  />
                  <Layer
                    id="articulation-fill"
                    type="fill"
                    paint={areaFillPaint as never}
                  />
                  <Layer
                    id="articulation-line"
                    type="line"
                    paint={{
                      "line-color": AREA_PAINT.lineColor,
                      "line-width": AREA_PAINT.lineWidthIdle,
                      "line-opacity": AREA_PAINT.lineOpacityIdle,
                    }}
                  />
                  <Layer
                    id="articulation-fill-active"
                    type="fill"
                    filter={activeAreaFilter}
                    paint={{
                      "fill-color": AREA_PAINT.fillColor,
                      "fill-opacity": AREA_PAINT.fillOpacityActive,
                    }}
                  />
                  <Layer
                    id="articulation-line-active"
                    type="line"
                    filter={activeAreaFilter}
                    paint={{
                      "line-color": AREA_PAINT.lineColor,
                      "line-width": AREA_PAINT.lineWidthActive,
                      "line-opacity": AREA_PAINT.lineOpacityActive,
                    }}
                  />
                </Source>
              ) : null}

              {districtBoundary ? (
                <Source
                  id="district-boundary"
                  type="geojson"
                  data={districtBoundary as never}
                >
                  <Layer
                    id="district-outline"
                    type="line"
                    layout={{
                      "line-join": "round",
                      "line-cap": "round",
                    }}
                    paint={{
                      "line-color": DISTRICT_OUTLINE,
                      "line-width": 2.25,
                      "line-opacity": 1,
                    }}
                  />
                </Source>
              ) : null}

              <Source id="schools" type="geojson" data={points as never}>
                <Layer
                  id="school-points"
                  type="circle"
                  paint={pointPaint}
                />
                <Layer
                  id="school-closed-slash"
                  type="symbol"
                  filter={["==", ["get", "closed"], 1]}
                  layout={{
                    "icon-image": CLOSED_SLASH_ID,
                    "icon-allow-overlap": true,
                    "icon-ignore-placement": true,
                    "icon-size": [
                      "interpolate",
                      ["linear"],
                      ["zoom"],
                      8,
                      0.42,
                      11,
                      0.55,
                      14,
                      0.78,
                    ],
                  }}
                />
                <Layer
                  id="school-labels"
                  type="symbol"
                  minzoom={SCHOOL_LABEL_MIN_ZOOM}
                  layout={{
                    "text-field": ["get", "name"],
                    "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
                    "text-size": [
                      "interpolate",
                      ["linear"],
                      ["zoom"],
                      SCHOOL_LABEL_MIN_ZOOM,
                      11.5,
                      16,
                      14,
                    ],
                    "text-variable-anchor": ["top", "bottom", "left", "right"],
                    "text-radial-offset": 1.05,
                    "text-optional": true,
                    "text-padding": 6,
                    "text-max-width": 8,
                    "text-line-height": 1.05,
                    "text-allow-overlap": false,
                    "text-ignore-placement": false,
                    "symbol-sort-key": ["get", "enrollment"],
                  }}
                  paint={{
                    "text-color": colors.ink,
                    "text-halo-color": "#ffffff",
                    "text-halo-width": 1.35,
                    "text-halo-blur": 0.2,
                  }}
                />
              </Source>

              {selected?.hasMapPoint ? (
                <Source
                  id="selected-school"
                  type="geojson"
                  data={{
                    type: "Feature",
                    properties: {},
                    geometry: {
                      type: "Point",
                      coordinates: [selected.longitude, selected.latitude],
                    },
                  } as never}
                >
                  <Layer
                    id="selected-halo"
                    type="circle"
                    paint={{
                      "circle-color": "#971B72",
                      "circle-opacity": 0.22,
                      "circle-radius": 22,
                    }}
                  />
                  <Layer
                    id="selected-ring"
                    type="circle"
                    paint={{
                      "circle-color": "transparent",
                      "circle-radius": 16,
                      "circle-stroke-width": 3,
                      "circle-stroke-color": "#971B72",
                    }}
                  />
                </Source>
              ) : null}

              {selected?.hasMapPoint ? (
                <Popup
                  longitude={selected.longitude as number}
                  latitude={selected.latitude as number}
                  anchor="bottom"
                  offset={18}
                  onClose={() => setSelectedId(null)}
                  closeOnClick={false}
                >
                  <SchoolPreview school={selected} symbology={symbology} compact />
                </Popup>
              ) : null}

              {schoolHover && schoolHover.school.id !== selectedId ? (
                <Popup
                  longitude={schoolHover.school.longitude as number}
                  latitude={schoolHover.school.latitude as number}
                  closeButton={false}
                  closeOnClick={false}
                  offset={10}
                  anchor="bottom"
                  className="map-hover-popup"
                >
                  <div className="map-popup">
                    <strong>{schoolHover.school.name}</strong>
                    <span>
                      {symbologyLabel(symbology)}{" "}
                      {formatSchoolMetric(schoolHover.school, symbology) ?? "No data"}
                    </span>
                  </div>
                </Popup>
              ) : null}

              {areaHover?.name && !areaHover.fromSchool ? (
                <Popup
                  longitude={areaHover.lng}
                  latitude={areaHover.lat}
                  closeButton={false}
                  closeOnClick={false}
                  offset={10}
                  anchor="bottom"
                  className="map-hover-popup"
                >
                  <div className="map-popup">
                    <strong>{areaHover.name}</strong>
                    {articulationColor === "birthChange" ? (
                      <span>
                        Births {BIRTH_CHANGE_YEARS.start}–{BIRTH_CHANGE_YEARS.end}{" "}
                        {formatSignedPercent(BIRTH_CHANGE_BY_AREA[areaHover.name], {
                          alreadyPercent: true,
                          digits: 1,
                        })}
                      </span>
                    ) : null}
                    {articulationColor === "enrollmentChange" ? (
                      <span>
                        Enrollment {HISTORICAL_ENROLLMENT_YEAR}–{CURRENT_ENROLLMENT_YEAR_LABEL}{" "}
                        {formatSignedPercent(enrollmentByArea.byName[areaHover.name], {
                          alreadyPercent: true,
                          digits: 1,
                        })}
                      </span>
                    ) : null}
                  </div>
                </Popup>
              ) : null}
            </MapGL>
          ) : (
            <div className="error-state">
              <p>Add a Mapbox token to <code>.env</code> as <code>VITE_MAPBOX_TOKEN</code> to load the map.</p>
            </div>
          )}
        </div>

        <div className="map-corner map-corner-left">
          <div className="map-control-card">
            <MapOptionsControls
              basemap={basemap}
              onBasemapChange={setBasemap}
            />
          </div>
        </div>
        <div className="map-corner map-corner-right">
          <details
            key={isDesktop ? "legend-desktop" : "legend-mobile"}
            className="map-legend map-panel"
            aria-label="Map legend"
            {...(isDesktop ? { open: true } : {})}
          >
            <summary className="map-panel-summary legend-title">
              {symbologyLabel(symbology)}
            </summary>
            <div className="map-panel-body">
              <MapLegendControls
                symbology={symbology}
                visible={visible}
                range={range}
              />
              {articulationColor === "birthChange" ||
              articulationColor === "enrollmentChange" ? (
                <div className="legend-overlay">
                  <div className="legend-title">
                    {articulationColor === "birthChange"
                      ? `Births ${BIRTH_CHANGE_YEARS.start}–${BIRTH_CHANGE_YEARS.end}`
                      : `Enrollment ${HISTORICAL_ENROLLMENT_YEAR}–${CURRENT_ENROLLMENT_YEAR_LABEL}`}
                  </div>
                  <div
                    className="legend-ramp"
                    style={{
                      background: `linear-gradient(90deg, ${SYMBOLOGY_DIVERGING_RAMP.join(", ")})`,
                    }}
                  />
                  <div className="legend-ramp-labels">
                    <span>
                      {formatSignedPercent(
                        articulationColor === "birthChange"
                          ? birthRange.min
                          : enrollmentByArea.min,
                        { alreadyPercent: true, digits: 1 },
                      )}
                    </span>
                    <span>0%</span>
                    <span>
                      {formatSignedPercent(
                        articulationColor === "birthChange"
                          ? birthRange.max
                          : enrollmentByArea.max,
                        { alreadyPercent: true, digits: 1 },
                      )}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

function MapOptionsControls({
  basemap,
  onBasemapChange,
  defaultOpen = false,
  compact = false,
}: {
  basemap: BasemapId;
  onBasemapChange: (id: BasemapId) => void;
  defaultOpen?: boolean;
  compact?: boolean;
}) {
  const switches = (
    <div className="basemap-switch" role="group" aria-label="Change Basemap">
      {BASEMAPS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={basemap === item.id ? "is-active" : undefined}
          aria-pressed={basemap === item.id}
          onClick={() => onBasemapChange(item.id)}
        >
          {compact ? null : (
            <img
              className="basemap-preview"
              src={assetUrl(item.preview)}
              alt=""
              draggable={false}
            />
          )}
          <span className="basemap-label">{item.label}</span>
        </button>
      ))}
    </div>
  );

  if (compact) {
    return (
      <div className="basemap-picker basemap-picker-compact">
        <span className="field-label">Change Basemap</span>
        {switches}
      </div>
    );
  }

  return (
    <details className="basemap-picker map-panel" defaultOpen={defaultOpen}>
      <summary className="map-panel-summary basemap-picker-summary">
        Change Basemap
      </summary>
      {switches}
    </details>
  );
}

function MapLegendControls({
  symbology,
  visible,
  range,
}: {
  symbology: MapSymbology;
  visible: School[];
  range: { min: number; max: number };
}) {
  return (
    <>
      {symbology === "type" ? (
        Object.entries(levelColors)
          .filter(([level]) => visible.some((school) => school.schoolLevel === level))
          .map(([level, color]) => (
            <div className="legend-row" key={level}>
              <span className="swatch" style={{ background: color }} />
              {level}
            </div>
          ))
      ) : (
        <>
          <div
            className="legend-ramp"
            style={{
              background: `linear-gradient(90deg, ${symbologyRamp(symbology).join(", ")})`,
            }}
          />
          <div className="legend-ramp-labels">
            <span>{formatSymbologyValue(symbology, range.min)}</span>
            {symbology === "enrollmentChange" ? <span>0%</span> : null}
            <span>{formatSymbologyValue(symbology, range.max)}</span>
          </div>
          <div className="legend-row">
            <span className="swatch" style={{ background: SYMBOLOGY_MISSING }} />
            No data
          </div>
        </>
      )}
      {visible.some((school) => school.status === "Closed") ? (
        <div className="legend-row">
          <span className="swatch swatch-closed" aria-hidden="true" />
          Closed
        </div>
      ) : null}
    </>
  );
}

function SchoolPreview({
  school,
  symbology,
  compact = false,
}: {
  school: School;
  symbology: MapSymbology;
  compact?: boolean;
}) {
  const metric = formatSchoolMetric(school, symbology);
  const tempNote = temporaryCapacityNote(school);
  return (
    <div className={compact ? "popup" : "preview-card"}>
      <h3>{school.name}</h3>
      <p>
        <LevelChip school={school} />{" "}
        {school.articulation && school.articulation !== "NoArticulationArea"
          ? school.articulation
          : school.status}
      </p>
      {symbology !== "type" ? (
        <p>
          {symbologyLabel(symbology)} {metric ?? "No data"}
        </p>
      ) : null}
      {symbology === "enrollment" || symbology === "utilization" ? null : (
        <p>
          Enrollment ({CURRENT_ENROLLMENT_YEAR_LABEL}){" "}
          {formatNumber(school.enrollment)} · Utilization{" "}
          {formatPercent(school.utilization)}
        </p>
      )}
      {tempNote ? <p>{tempNote}</p> : null}
      <Link className="btn btn-primary" to={`/schools/${schoolSlug(school.id)}`}>
        School details
      </Link>
    </div>
  );
}
