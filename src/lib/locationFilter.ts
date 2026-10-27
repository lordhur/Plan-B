import { create } from 'zustand'

export interface BBox {
  minLat: number
  maxLat: number
  minLon: number
  maxLon: number
}

export type LocationFilter =
  | { type: 'region' | 'dept'; name: string; bbox: BBox }
  | { type: 'city'; name: string; lat: number; lon: number }
  | null

interface LocationStore {
  filter: LocationFilter
  setFilter: (f: LocationFilter) => void
  clear: () => void
}

/** Filtre géographique partagé : la carte le définit, le fil et les membres le suivent. */
export const useLocationFilter = create<LocationStore>((set) => ({
  filter: null,
  setFilter: (filter) => set({ filter }),
  clear: () => set({ filter: null }),
}))
