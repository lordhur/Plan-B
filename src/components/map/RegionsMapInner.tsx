'use client'

import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { ArrowLeft, Check, Crosshair, Loader2, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useLocationFilter, type BBox } from '@/lib/locationFilter'

/** GeoJSON officiels simplifiés (chargés dans le navigateur). */
const REGIONS_URL =
  'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/regions-version-simplifiee.geojson'
const DEPTS_URL =
  'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements-version-simplifiee.geojson'

/** 13 régions métropolitaines. */
const METRO_REGIONS = new Set(['84', '27', '53', '24', '94', '44', '11', '76', '32', '28', '75', '52', '93'])

/** Département → code région (table officielle). */
const DEPT_TO_REGION: Record<string, string> = {
  '01': '84', '02': '32', '03': '84', '04': '93', '05': '93', '06': '93', '07': '84', '08': '44',
  '09': '76', '10': '44', '11': '76', '12': '76', '13': '93', '14': '28', '15': '84', '16': '75',
  '17': '75', '18': '24', '19': '75', '21': '27', '22': '53', '23': '75', '24': '75', '25': '27',
  '26': '84', '27': '28', '28': '24', '29': '53', '30': '76', '31': '76', '32': '76', '33': '75',
  '34': '76', '35': '53', '36': '24', '37': '24', '38': '84', '39': '27', '40': '75', '41': '24',
  '42': '84', '43': '84', '44': '52', '45': '24', '46': '76', '47': '75', '48': '76', '49': '52',
  '50': '28', '51': '44', '52': '44', '53': '52', '54': '44', '55': '44', '56': '53', '57': '44',
  '58': '27', '59': '32', '60': '32', '61': '28', '62': '32', '63': '84', '64': '75', '65': '76',
  '66': '76', '67': '44', '68': '44', '69': '84', '70': '27', '71': '27', '72': '52', '73': '84',
  '74': '84', '75': '11', '76': '28', '77': '11', '78': '11', '79': '75', '80': '32', '81': '76',
  '82': '76', '83': '93', '84': '93', '85': '52', '86': '75', '87': '75', '88': '44', '89': '27',
  '90': '27', '91': '11', '92': '11', '93': '11', '94': '11', '95': '11', '2A': '94', '2B': '94',
}

type Level = 'regions' | 'depts' | 'cities'

interface Selection {
  level: Level
  code: string
  name: string
  bounds?: L.LatLngBounds
  lat?: number
  lon?: number
}

interface Commune {
  nom: string
  centre: { lat: number; lon: number }
  population: number
}

/** Étiquette « contour » du nom de ville — légère et lisible. */
function cityLabelIcon(name: string, selected: boolean): L.DivIcon {
  return L.divIcon({
    className: 'city-outline-label',
    html: `<span class="${selected ? 'sel' : ''}">${name}</span>`,
    iconSize: [0, 0],
  })
}

/** Recentre la carte quand la sélection change. */
function FitBounds({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap()
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [16, 16], maxZoom: 11 })
  }, [bounds, map])
  return null
}

/** Carte régions → départements → villes avec bouton Valider. */
export function RegionsMapInner() {
  const mapRef = useRef<L.Map | null>(null)
  const [level, setLevel] = useState<Level>('regions')
  const [selection, setSelection] = useState<Selection | null>(null)
  const [regionSel, setRegionSel] = useState<{ code: string; name: string } | null>(null)
  const [deptSel, setDeptSel] = useState<{ code: string; name: string } | null>(null)
  const [geo, setGeo] = useState<{ regions: GeoJSON.FeatureCollection | null; depts: GeoJSON.FeatureCollection | null }>({ regions: null, depts: null })
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [communes, setCommunes] = useState<Commune[]>([])
  const [citySel, setCitySel] = useState<Commune | null>(null)
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null)
  const layersRef = useRef<L.LayerGroup | null>(null)

  const { setFilter, clear } = useLocationFilter()

  // Chargement des contours
  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch(REGIONS_URL).then((r) => (r.ok ? r.json() : null)),
      fetch(DEPTS_URL).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([regions, depts]) => {
        if (cancelled) return
        if (!regions || !depts) {
          setError(true)
        } else {
          setGeo({ regions, depts })
        }
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setError(true)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Rendu des couches selon le niveau
  useEffect(() => {
    const map = mapRef.current
    if (!map || !geo.regions || !geo.depts) return
    if (layersRef.current) {
      layersRef.current.remove()
      layersRef.current = null
    }
    const group = L.layerGroup().addTo(map)
    layersRef.current = group

    const style = (active: boolean): L.PathOptions => ({
      color: '#7c3aed',
      weight: active ? 2.5 : 1.2,
      fillColor: '#8b5cf6',
      fillOpacity: active ? 0.35 : 0.12,
    })

    if (level === 'regions') {
      L.geoJSON(geo.regions, {
        filter: (f) => METRO_REGIONS.has(String(f.properties?.code ?? '')),
        style: () => style(false),
        onEachFeature: (feature, layer) => {
          const code = String(feature.properties?.code ?? '')
          const name = String(feature.properties?.nom ?? '')
          layer.bindTooltip(name, { sticky: true, direction: 'top', className: 'region-tooltip' })
          layer.on('click', () => {
            const l = layer as L.Path & { getBounds: () => L.LatLngBounds }
            const b = (layer as unknown as { getBounds: () => L.LatLngBounds }).getBounds()
            setRegionSel({ code, name })
            setSelection({ level: 'depts', code, name, bounds: b })
            setLevel('depts')
            setBounds(b)
          })
          layer.on('mouseover', function (this: L.Path) {
            this.setStyle({ fillOpacity: 0.3 })
          })
          layer.on('mouseout', function (this: L.Path) {
            this.setStyle(style(false))
          })
        },
      }).addTo(group)
    } else if (level === 'depts' && regionSel) {
      L.geoJSON(geo.depts, {
        filter: (f) => DEPT_TO_REGION[String(f.properties?.code ?? '')] === regionSel.code,
        style: () => style(false),
        onEachFeature: (feature, layer) => {
          const code = String(feature.properties?.code ?? '')
          const name = String(feature.properties?.nom ?? '')
          layer.bindTooltip(name, { sticky: true, direction: 'top', className: 'region-tooltip' })
          layer.on('click', () => {
            const b = (layer as unknown as { getBounds: () => L.LatLngBounds }).getBounds()
            setDeptSel({ code, name })
            setSelection({ level: 'cities', code, name, bounds: b })
            setLevel('cities')
            setBounds(b)
            setCitySel(null)
            // Villes du département (API officielle, triées par population)
            setCommunes([])
            fetch(
              `https://geo.api.gouv.fr/communes?codeDepartement=${code}&fields=nom,centre,population&boost=population&limit=18`,
            )
              .then((r) => (r.ok ? r.json() : []))
              .then((data: Commune[]) => setCommunes(data.filter((c) => c.centre)))
              .catch(() => setCommunes([]))
          })
          layer.on('mouseover', function (this: L.Path) {
            this.setStyle({ fillOpacity: 0.3 })
          })
          layer.on('mouseout', function (this: L.Path) {
            this.setStyle(style(false))
          })
        },
      }).addTo(group)
    } else if (level === 'cities' && deptSel) {
      // Fond : le département sélectionné
      L.geoJSON(geo.depts, {
        filter: (f) => String(f.properties?.code ?? '') === deptSel.code,
        style: () => style(true),
      }).addTo(group)
      // Villes : étiquettes contour cliquables
      for (const c of communes) {
        const m = L.marker([c.centre.lat, c.centre.lon], {
          icon: cityLabelIcon(c.nom, citySel?.nom === c.nom),
          keyboard: true,
          title: c.nom,
          alt: c.nom,
        })
        m.on('click', () => {
          setCitySel(c)
          setSelection({ level: 'cities', code: deptSel.code, name: c.nom, lat: c.centre.lat, lon: c.centre.lon })
        })
        m.addTo(group)
      }
    }

    return () => {
      group.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo, level, regionSel, deptSel, communes, citySel])

  const goRegions = useCallback(() => {
    setLevel('regions')
    setSelection(null)
    setRegionSel(null)
    setDeptSel(null)
    setCitySel(null)
    setBounds(null)
    mapRef.current?.fitBounds(
      L.latLngBounds(L.latLng(41.2, -5.1), L.latLng(51.2, 9.6)),
      { padding: [8, 8] },
    )
  }, [])

  const goDepts = useCallback(() => {
    if (!regionSel) return
    setLevel('depts')
    setDeptSel(null)
    setCitySel(null)
    setSelection({ level: 'depts', code: regionSel.code, name: regionSel.name })
  }, [regionSel])

  const validate = () => {
    if (!selection) return
    if (selection.level === 'cities' && selection.lat != null && selection.lon != null) {
      setFilter({ type: 'city', name: selection.name, lat: selection.lat, lon: selection.lon })
    } else if (selection.bounds) {
      const b = selection.bounds
      const bbox: BBox = {
        minLat: b.getSouth(),
        maxLat: b.getNorth(),
        minLon: b.getWest(),
        maxLon: b.getEast(),
      }
      setFilter({ type: selection.level === 'depts' ? 'dept' : 'region', name: selection.name, bbox })
    }
  }

  const useGps = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setFilter({
          type: 'city',
          name: 'Ma position',
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        }),
      () => undefined,
      { timeout: 8000 },
    )
  }

  const title =
    level === 'regions'
      ? 'Choisissez une région'
      : level === 'depts'
        ? `${regionSel?.name} — choisissez un département`
        : `${deptSel?.name} — choisissez une ville`

  const canValidate =
    selection != null && (selection.level !== 'cities' ? !!selection.bounds : citySel != null)

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-fg-muted">
          <Crosshair className="h-4 w-4 text-primary-600" aria-hidden />
          {title}
        </h2>
        <div className="flex gap-1.5">
          {level !== 'regions' && (
            <Button variant="outline" size="sm" onClick={level === 'cities' ? goDepts : goRegions}>
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              {level === 'cities' ? 'Départements' : 'Régions'}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={useGps}>
            <Crosshair className="h-3.5 w-3.5" aria-hidden /> GPS
          </Button>
          <Button size="sm" disabled={!canValidate} onClick={validate}>
            <Check className="h-3.5 w-3.5" aria-hidden /> Valider
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clear()
              goRegions()
            }}
            aria-label="Réinitialiser la carte"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      </div>

      <div className="relative h-80 overflow-hidden rounded-xl border border-border">
        {loading && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-bg/70">
            <Loader2 className="h-7 w-7 animate-spin text-primary-600" aria-label="Chargement de la carte" />
          </div>
        )}
        {error ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
            <p className="text-sm text-fg-muted">
              Impossible de charger les contours de la carte. Vérifiez votre connexion et
              réessayez.
            </p>
            <Button size="sm" onClick={() => window.location.reload()}>
              Réessayer
            </Button>
          </div>
        ) : (
          <MapContainer
            center={[46.6, 2.4]}
            zoom={6}
            scrollWheelZoom
            className="h-full w-full"
            ref={(m) => {
              mapRef.current = m ?? null
            }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds bounds={bounds} />
          </MapContainer>
        )}
      </div>

      <p className={cn('mt-1.5 text-center text-[11px] text-fg-muted')}>
        Cliquez une région → ses départements → ses villes, puis <strong>Valider</strong> pour
        afficher les plans et membres de la zone.
      </p>
    </div>
  )
}
