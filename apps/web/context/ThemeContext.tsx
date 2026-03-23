"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

type MapSide = "left" | "right";
type PaneDominance = "left" | "right";

interface ThemeContextValue {
  mapSide: MapSide;
  paneDominance: PaneDominance;
  setMapSide: (side: MapSide) => void;
  setPaneDominance: (side: PaneDominance) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mapSide, setMapSide] = useState<MapSide>("left");
  const [paneDominance, setPaneDominance] = useState<PaneDominance>("left");

  return (
    <ThemeContext.Provider
      value={{ mapSide, paneDominance, setMapSide, setPaneDominance }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
