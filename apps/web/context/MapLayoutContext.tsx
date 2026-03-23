"use client";

/**
 * Map layout context — controls the map/list split-pane position and sizing
 * on the search page. This is NOT tenant theming (that's driven by brand.json
 * → Tailwind CSS variables). Named MapLayoutContext to avoid confusion.
 */

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

type MapSide = "left" | "right";
type PaneDominance = "left" | "right";

interface MapLayoutContextValue {
  mapSide: MapSide;
  paneDominance: PaneDominance;
  setMapSide: (side: MapSide) => void;
  setPaneDominance: (side: PaneDominance) => void;
}

const MapLayoutContext = createContext<MapLayoutContextValue | undefined>(undefined);

export function MapLayoutProvider({ children }: { children: ReactNode }) {
  const [mapSide, setMapSide] = useState<MapSide>("left");
  const [paneDominance, setPaneDominance] = useState<PaneDominance>("left");

  return (
    <MapLayoutContext.Provider
      value={{ mapSide, paneDominance, setMapSide, setPaneDominance }}
    >
      {children}
    </MapLayoutContext.Provider>
  );
}

export function useMapLayout(): MapLayoutContextValue {
  const ctx = useContext(MapLayoutContext);
  if (!ctx) {
    throw new Error("useMapLayout must be used within MapLayoutProvider");
  }
  return ctx;
}
