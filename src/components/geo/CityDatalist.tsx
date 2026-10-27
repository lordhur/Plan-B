'use client'

import { FRENCH_CITIES } from '@/lib/frenchCities'

/**
 * Liste de villes proposées pour un champ texte (autocomplétion native du
 * navigateur, accessible et sans dépendance). Le nom saisi est géocodé côté
 * serveur pour alimenter le filtre par rayon (km).
 */
export function CityDatalist({ id }: { id: string }) {
  return (
    <datalist id={id}>
      {FRENCH_CITIES.map((c) => (
        <option key={`${c.name}-${c.dept}`} value={c.name}>
          {`${c.name} (${c.dept})`}
        </option>
      ))}
    </datalist>
  )
}
