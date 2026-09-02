import { useMemo } from "react";
import { Link } from "react-router-dom";
import MapGL, { Layer, Source } from "react-map-gl/mapbox";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useExplorer } from "../data/DataProvider";
import { schoolSlug } from "../lib/format";
import { snapshotSchools } from "../lib/peers";
import { LEVEL_COLOR_MATCH } from "../lib/symbology";
import { colors } from "../lib/theme";
import type { School } from "../types";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

function toInsetPoints(schools: School[], featuredId: string) {
  return {
    type: "FeatureCollection" as const,
    features: schools
      .filter((school) => school.hasMapPoint && school.longitude != null && school.latitude != null)
      .map((school) => ({
        type: "Feature" as const,
        properties: {
          id: school.id,
          name: school.name,
          schoolLevel: school.schoolLevel,
          featured: school.id === featuredId ? 1 : 0,
          enrollment: school.enrollment ?? 0,
        },
        geometry: {
          type: "Point" as const,
          coordinates: [school.longitude as number, school.latitude as number],
        },
      })),
  };
}

export function SchoolInsetMap({ school }: { school: School }) {
  const { data } = useExplorer();
  const mapUrl = `/map?school=${schoolSlug(school.id)}`;
  const ready =
    Boolean(MAPBOX_TOKEN) &&
    school.hasMapPoint &&
    school.longitude != null &&
    school.latitude != null;
  const points = useMemo(() => {
    const mapped = snapshotSchools(data.schools);
    const list =
      school.hasMapPoint && !mapped.some((item) => item.id === school.id)
        ? [...mapped, school]
        : mapped;
    return toInsetPoints(list, school.id);
  }, [data.schools, school]);

  return (
    <div className="school-inset-map">
      {ready ? (
        <MapGL
          mapLib={mapboxgl}
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/light-v11"
          initialViewState={{
            longitude: school.longitude as number,
            latitude: school.latitude as number,
            zoom: 13,
          }}
          attributionControl
          dragRotate={false}
          localFontFamily="Montserrat"
          style={{ width: "100%", height: "100%" }}
          aria-label={`Map showing ${school.name} and nearby schools`}
        >
          <Source id="inset-schools" type="geojson" data={points as never}>
            <Layer
              id="inset-others"
              type="circle"
              filter={["!=", ["get", "featured"], 1]}
              paint={{
                "circle-color": LEVEL_COLOR_MATCH as never,
                "circle-radius": 4,
                "circle-stroke-width": 1,
                "circle-stroke-color": "#ffffff",
              }}
            />
            <Layer
              id="inset-halo"
              type="circle"
              filter={["==", ["get", "featured"], 1]}
              paint={{
                "circle-color": "#971B72",
                "circle-opacity": 0.2,
                "circle-radius": 18,
              }}
            />
            <Layer
              id="inset-focus"
              type="circle"
              filter={["==", ["get", "featured"], 1]}
              paint={{
                "circle-color": LEVEL_COLOR_MATCH as never,
                "circle-radius": 8,
                "circle-stroke-width": 2,
                "circle-stroke-color": "#ffffff",
              }}
            />
            <Layer
              id="inset-other-labels"
              type="symbol"
              filter={["!=", ["get", "featured"], 1]}
              layout={{
                "text-field": ["get", "name"],
                "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
                "text-size": 11,
                "text-variable-anchor": ["top", "bottom", "left", "right"],
                "text-radial-offset": 0.95,
                "text-optional": true,
                "text-allow-overlap": false,
                "text-ignore-placement": false,
                "text-padding": 4,
                "text-max-width": 8,
                "text-line-height": 1.05,
                "symbol-sort-key": ["-", 0, ["get", "enrollment"]],
              }}
              paint={{
                "text-color": colors.ink,
                "text-halo-color": "#ffffff",
                "text-halo-width": 1.2,
                "text-halo-blur": 0.2,
              }}
            />
            <Layer
              id="inset-label"
              type="symbol"
              filter={["==", ["get", "featured"], 1]}
              layout={{
                "text-field": ["get", "name"],
                "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
                "text-size": 12,
                "text-variable-anchor": ["top", "bottom", "left", "right"],
                "text-radial-offset": 1.1,
                "text-optional": false,
                "text-allow-overlap": true,
                "text-ignore-placement": true,
                "text-max-width": 10,
              }}
              paint={{
                "text-color": colors.ink,
                "text-halo-color": "#ffffff",
                "text-halo-width": 1.35,
                "text-halo-blur": 0.2,
              }}
            />
          </Source>
        </MapGL>
      ) : (
        <p className="school-inset-map-fallback">
          {MAPBOX_TOKEN
            ? "This site does not have map coordinates in the current GIS export."
            : "Add a Mapbox token to load the map."}
        </p>
      )}
      <Link className="btn school-inset-map-link" to={mapUrl}>
        View on the map
      </Link>
    </div>
  );
}
