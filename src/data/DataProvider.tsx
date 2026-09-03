import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { defaultFilters } from "../lib/filters";
import { restrictExplorerData } from "../lib/universe";
import { loadArticulationAreas, loadDistrictBoundary, loadExplorerData } from "./client";
import type { ArticulationCollection, ExplorerData, MapFilters } from "../types";

interface DataContextValue {
  data: ExplorerData;
  articulation: ArticulationCollection | null;
  districtBoundary: ArticulationCollection | null;
  filters: MapFilters;
  setFilters: Dispatch<SetStateAction<MapFilters>>;
  resetFilters: () => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ExplorerData | null>(null);
  const [articulation, setArticulation] = useState<ArticulationCollection | null>(
    null,
  );
  const [districtBoundary, setDistrictBoundary] =
    useState<ArticulationCollection | null>(null);
  const [filters, setFilters] = useState<MapFilters | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadExplorerData(), loadArticulationAreas(), loadDistrictBoundary()])
      .then(([explorer, areas, boundary]) => {
        if (cancelled) return;
        const restricted = restrictExplorerData(explorer);
        setData(restricted);
        setArticulation(areas);
        setDistrictBoundary(boundary);
        setFilters(defaultFilters(restricted));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unable to load data");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => {
    if (!data || !filters) return null;
    return {
      data,
      articulation,
      districtBoundary,
      filters,
      setFilters: setFilters as Dispatch<SetStateAction<MapFilters>>,
      resetFilters: () => setFilters(defaultFilters(data)),
    };
  }, [articulation, data, districtBoundary, filters]);

  if (error) {
    return (
      <div className="error-state" role="alert">
        <h1>Data could not be loaded</h1>
        <p>{error}</p>
        <p className="footnote">
          Run <code>npm run data:build</code> and <code>npx vite build</code> so
          JSON exists in <code>bundle/data</code>, then refresh.
        </p>
      </div>
    );
  }

  if (!value) {
    return (
      <div className="loading" role="status">
        <p>Loading Jeffco facility data…</p>
      </div>
    );
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useExplorer() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useExplorer must be used within DataProvider");
  return ctx;
}
