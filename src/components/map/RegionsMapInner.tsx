'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import type { FeatureCollection, GeoJsonObject } from 'geojson'
import 'leaflet/dist/leaflet.css'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const REGIONS_URL =
  'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/regions-version-simplifiee.geojson'
const DEPTS_URL =
  'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements-version-simplifiee.geojson'

/**
 * GeoJSON de grégoiredavid : la géométrie vit dans un objet `features` à la
 * RACINE (pas dans feature.properties). On accepte les deux formes.
 */
interface RawGeoJSON {
  type?: string
  features?: {
    type?: string
    properties?: Record<string, unknown>
    geometry?: { type?: string; coordinates?: unknown }
  }[]
  properties?: Record<string, unknown>
  geometry?: { type?: string; coordinates?: unknown }
}

function rootFeature(f: RawGeoJSON) {
  return {
    type: 'Feature' as const,
    properties: f.properties ?? {},
    geometry: f.geometry ?? { type: 'Point', coordinates: [0, 0] },
  }
}

function featureList(data: RawGeoJSON) {
  if (data && Array.isArray(data.features)) return data.features
  if (data && data.type === 'Feature' && data.geometry) return [rootFeature(data)]
  return []
}

function getProp(props: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = props[k]
    if (typeof v === 'string' && v.trim() !== '') return v.trim()
    if (typeof v === 'number') return String(v)
  }
  return undefined
}

function regionCode(props: Record<string, unknown>): string {
  return getProp(props, 'code', 'CODE_REGION', 'reg_code', 'NCCENR') ?? ''
}

function regionName(props: Record<string, unknown>): string {
  return getProp(props, 'nom', 'NOM', 'name', 'libgeo', 'NCC') ?? 'Région'
}

function deptCode(props: Record<string, unknown>): string {
  return getProp(props, 'code', 'CODE_DEPT', 'dep_code') ?? ''
}

function deptName(props: Record<string, unknown>): string {
  return getProp(props, 'nom', 'NOM', 'name', 'libgeo', 'NCC') ?? 'Département'
}

/** Centre géométrique : parsing complet des géométries GeoJSON. */
function centreOfFeature(f: { geometry?: { type?: string; coordinates?: unknown } }): [number, number] | null {
  const g = f.geometry
  if (!g) return null

  const flat: [number, number][] = []
  const walk = (coords: unknown) => {
    if (!Array.isArray(coords)) return
    if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      flat.push([coords[0] as number, coords[1] as number])
      return
    }
    for (const c of coords) walk(c)
  }
  walk(g.coordinates)
  if (flat.length === 0) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of flat) {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  // GeoJSON : [lon, lat] → Leaflet : [lat, lon]
  return [(minY + maxY) / 2, (minX + maxX) / 2]
}

/** Point représentatif (pour le zoom département) : centroïde des polygones. */
function representativePoint(
  f: { geometry?: { type?: string; coordinates?: unknown } },
): [number, number] | null {
  const g = f.geometry
  if (!g) return null
  const t = g.type
  if (t === 'Point') {
    const c = g.coordinates as [number, number]
    return [c[1], c[0]]
  }
  if (t === 'Polygon') {
    const ring = (g.coordinates as [number, number][][] | undefined)?.[0]
    if (!ring) return null
    const [lat, lon] = centreOfRing(ring)
    return [lat, lon]
  }
  if (t === 'MultiPolygon') {
    let best: [number, number][] | null = null
    let bestArea = 0
    for (const poly of (g.coordinates as [number, number][][][]) ?? []) {
      const ring = poly[0]
      if (!ring) continue
      const area = ringArea(ring)
      if (area > bestArea) {
        bestArea = area
        best = ring
      }
    }
    if (!best) return null
    const [lat, lon] = centreOfRing(best)
    return [lat, lon]
  }
  return centreOfFeature(f)
}

function ringArea(ring: [number, number][]): number {
  let a = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const p1 = ring[j]
    const p2 = ring[i]
    if (!p1 || !p2) continue
    a += p1[0] * p2[1] - p2[0] * p1[1]
  }
  return Math.abs(a / 2)
}

function centreOfRing(ring: [number, number][]): [number, number] {
  if (ring.length === 0) return [0, 0]
  let sx = 0
  let sy = 0
  for (const [x, y] of ring) {
    sx += x
    sy += y
  }
  return [sy / ring.length, sx / ring.length]
}

/** Villes majeures de France (nom, lat, lon, population, département). */
const TOP_CITIES: [string, number, number, number, string][] = [
  ['Paris', 48.8566, 2.3522, 2102650, '75'],
  ['Marseille', 43.2965, 5.3698, 873076, '13'],
  ['Lyon', 45.7640, 4.8357, 522969, '69'],
  ['Toulouse', 43.6047, 1.4442, 498003, '31'],
  ['Nice', 43.7102, 7.2620, 342295, '06'],
  ['Nantes', 47.2184, -1.5536, 320732, '44'],
  ['Montpellier', 43.6108, 3.8767, 302454, '34'],
  ['Strasbourg', 48.5734, 7.7521, 287228, '67'],
  ['Bordeaux', 44.8378, -0.5792, 259809, '33'],
  ['Lille', 50.6292, 3.0573, 236234, '59'],
  ['Rennes', 48.1173, -1.6778, 225081, '35'],
  ['Reims', 49.2583, 4.0317, 182211, '51'],
  ['Saint-Étienne', 45.4397, 4.3872, 173821, '42'],
  ['Le Havre', 49.4944, 0.1079, 165830, '76'],
  ['Toulon', 43.1242, 5.9280, 168701, '83'],
  ['Grenoble', 45.1885, 5.7245, 156389, '38'],
  ['Dijon', 47.3220, 5.0415, 158002, '21'],
  ['Angers', 47.4784, -0.5632, 155876, '49'],
  ['Nîmes', 43.8367, 4.3601, 151001, '30'],
  ['Villeurbanne', 45.7719, 4.8902, 155027, '69'],
  ['Clermont-Ferrand', 45.7772, 3.0870, 147751, '63'],
  ['Aix-en-Provence', 43.5297, 5.4474, 147122, '13'],
  ['Le Mans', 48.0061, 0.1996, 146105, '72'],
  ['Brest', 48.3904, -4.4861, 142722, '29'],
  ['Tours', 47.3941, 0.6848, 138659, '37'],
  ['Amiens', 49.8985, 2.2958, 135501, '80'],
  ['Limoges', 45.8336, 1.2611, 130879, '87'],
  ['Annecy', 45.8992, 6.1294, 131715, '74'],
  ['Perpignan', 42.6887, 2.8948, 121875, '66'],
  ['Boulogne-Billancourt', 48.8352, 2.2413, 120071, '92'],
  ['Metz', 49.1193, 6.1757, 125728, '57'],
  ['Besançon', 47.2378, 6.0241, 119955, '25'],
  ['Orléans', 47.9029, 1.9093, 116685, '45'],
  ['Saint-Denis', 48.9362, 2.3574, 113116, '93'],
  ['Rouen', 49.4432, 1.0999, 114000, '76'],
  ['Mulhouse', 47.7508, 7.3359, 108312, '68'],
  ['Caen', 49.1829, -0.3707, 108793, '14'],
  ['Argenteuil', 48.9472, 2.2467, 110388, '95'],
  ['Nancy', 48.6921, 6.1844, 105334, '54'],
  ['Montreuil', 48.8638, 2.4485, 109897, '93'],
  ['Roubaix', 50.6942, 3.1746, 98828, '59'],
  ['Tourcoing', 50.7239, 3.1612, 99160, '59'],
  ['Avignon', 43.9493, 4.8055, 91921, '84'],
  ['Poitiers', 46.5802, 0.3404, 90033, '86'],
  ['Versailles', 48.8014, 2.1301, 85862, '78'],
  ['Pau', 43.2951, -0.3707, 77130, '64'],
  ['La Rochelle', 46.1603, -1.1511, 79961, '17'],
  ['Calais', 50.9513, 1.8587, 73911, '62'],
  ['Colmar', 48.0794, 7.3585, 69105, '68'],
  ['Bayonne', 43.4933, -1.4748, 53399, '64'],
  ['Ajaccio', 41.9192, 8.7386, 70659, '2A'],
  ['Bastia', 42.6977, 9.4509, 48558, '2B'],
  ['Annemasse', 46.1956, 6.2364, 37493, '74'],
  ['Chambéry', 45.5646, 5.9178, 60299, '73'],
  ['Vannes', 47.6582, -2.7608, 55023, '56'],
  ['Lorient', 47.7483, -3.3700, 58304, '56'],
  ['Quimper', 47.9960, -4.0978, 64900, '29'],
  ['Saint-Brieuc', 48.5136, -2.7653, 46388, '22'],
  ['Saint-Malo', 48.6493, -2.0257, 47255, '35'],
  ['Laval', 48.0737, -0.7736, 50220, '53'],
  ['Niort', 46.3239, -0.4628, 59059, '79'],
  ['Angoulême', 45.6484, 0.1562, 41740, '16'],
  ['La Roche-sur-Yon', 46.6705, -1.4260, 55422, '85'],
  ['Bourg-en-Bresse', 46.2044, 5.2286, 41652, '01'],
  ['Valence', 44.9334, 4.8916, 63189, '26'],
  ['Gap', 44.5590, 6.0795, 40895, '05'],
  ['Digne-les-Bains', 44.0923, 6.2357, 17455, '04'],
  ['Privas', 44.7350, 4.5990, 8465, '07'],
  ['Rodez', 44.3506, 2.5738, 24262, '12'],
  ['Cahors', 44.4475, 1.4400, 12355, '46'],
  ['Agen', 44.2030, 0.6167, 33576, '47'],
  ['Montauban', 44.0175, 1.3550, 61372, '82'],
  ['Albi', 43.9297, 2.1480, 49234, '81'],
  ['Carcassonne', 43.2130, 2.3491, 47834, '11'],
  ['Foix', 42.9639, 1.6053, 9692, '09'],
  ['Auch', 43.6460, 0.5860, 21935, '32'],
  ['Tarbes', 43.2333, 0.0783, 42758, '65'],
  ['Mende', 44.5180, 3.5013, 12296, '48'],
  ['Le Puy-en-Velay', 45.0428, 3.8829, 19089, '43'],
  ['Aurillac', 44.9261, 2.4406, 26032, '15'],
  ['Guéret', 46.1717, 1.8717, 13266, '23'],
  ['Tulle', 45.2667, 1.7717, 14836, '19'],
  ['Brive-la-Gaillarde', 45.1583, 1.5317, 46916, '19'],
  ['Périgueux', 45.1846, 0.7181, 29896, '24'],
  ['Bergerac', 44.8520, 0.4819, 26833, '24'],
  ['Sarlat-la-Canéda', 44.8892, 1.2167, 9127, '24'],
  ['Dax', 43.7100, -1.0528, 21620, '40'],
  ['Mont-de-Marsan', 43.8930, -0.5000, 31455, '40'],
  ['Arcachon', 44.6583, -1.1689, 11278, '33'],
  ['Libourne', 44.9156, -0.2417, 24668, '33'],
  ['Saintes', 45.7450, -0.6333, 25874, '17'],
  ['Rochefort', 45.9414, -0.9592, 24014, '17'],
  ['Cognac', 45.6956, -0.3289, 18643, '16'],
  ['Châtellerault', 46.8172, 0.5464, 31483, '86'],
  ['Châteauroux', 46.8103, 1.6913, 43741, '36'],
  ['Bourges', 47.0810, 2.3988, 64238, '18'],
  ['Nevers', 46.9896, 3.1628, 32990, '58'],
  ['Auxerre', 47.7980, 3.5672, 34799, '89'],
  ['Sens', 48.1975, 3.2878, 26688, '89'],
  ['Troyes', 48.2973, 4.0744, 61957, '10'],
  ['Chaumont', 48.1117, 5.1389, 22705, '52'],
  ['Bar-le-Duc', 48.7728, 5.1611, 15538, '55'],
  ['Verdun', 49.1597, 5.3828, 16942, '55'],
  ['Thionville', 49.3589, 6.1686, 40701, '57'],
  ['Forbach', 49.1900, 6.9000, 21552, '57'],
  ['Épinal', 48.1744, 6.4497, 32078, '88'],
  ['Belfort', 47.6380, 6.8628, 46454, '90'],
  ['Vesoul', 47.6214, 6.1542, 15223, '70'],
  ['Lons-le-Saunier', 46.6758, 5.5528, 17393, '39'],
  ['Dole', 47.0931, 5.4906, 23708, '39'],
  ['Chalon-sur-Saône', 46.7831, 4.8558, 45096, '71'],
  ['Mâcon', 46.3067, 4.8317, 33638, '71'],
  ['Roanne', 46.0367, 4.0689, 35349, '42'],
  ['Vichy', 46.1278, 3.4267, 25702, '03'],
  ['Moulins', 46.5642, 3.3325, 19715, '03'],
  ['Montluçon', 46.3408, 2.6031, 36717, '03'],
  ['Saint-Flour', 45.0336, 3.0931, 6625, '15'],
  ['Issoire', 45.5442, 3.2489, 15524, '63'],
  ['Vienne', 45.5242, 4.8781, 30306, '38'],
  ['Bourgoin-Jallieu', 45.5861, 5.2736, 28587, '38'],
  ['Voiron', 45.3667, 5.5897, 20874, '38'],
  ['Aubenas', 44.6203, 4.3903, 12368, '07'],
  ['Montélimar', 44.5581, 4.7508, 40356, '26'],
  ['Briançon', 44.8967, 6.6353, 11604, '05'],
  ['Arles', 43.6769, 4.6278, 50434, '13'],
  ['Martigues', 43.4053, 5.0475, 48188, '13'],
  ['Aubagne', 43.2936, 5.5711, 47535, '13'],
  ['Salon-de-Provence', 43.6406, 5.0972, 44980, '13'],
  ['Fréjus', 43.4331, 6.7372, 55750, '83'],
  ['Draguignan', 43.5369, 6.4644, 40440, '83'],
  ['Hyères', 43.1205, 6.1300, 55589, '83'],
  ['Cannes', 43.5528, 7.0174, 73868, '06'],
  ['Antibes', 43.5804, 7.1251, 75538, '06'],
  ['Menton', 43.7764, 7.5028, 29073, '06'],
  ['Grasse', 43.6592, 6.9250, 48822, '06'],
  ['Sète', 43.4020, 3.6964, 44712, '34'],
  ['Béziers', 43.3442, 3.2158, 80815, '34'],
  ['Narbonne', 43.1839, 3.0036, 55576, '11'],
  ['Alès', 44.1281, 4.0817, 44223, '30'],
  ['Castres', 43.6056, 2.2397, 42700, '81'],
  ['Millau', 44.0986, 3.0783, 22166, '12'],
  ['Lunel', 43.6778, 4.1361, 26380, '34'],
  ['Carpentras', 44.0558, 5.0489, 28989, '84'],
  ['Orange', 44.1381, 4.8075, 28919, '84'],
  ['Cavaillon', 43.8367, 5.0372, 25949, '84'],
  ['Apt', 43.8761, 5.3964, 11229, '84'],
  ['Forcalquier', 43.9600, 5.7783, 5080, '04'],
  ['Sisteron', 44.1969, 5.9431, 7506, '04'],
  ['Barcelonnette', 44.3867, 6.6517, 2591, '04'],
  ['Castellane', 43.8472, 6.5128, 1508, '04'],
  ['Embrun', 44.5636, 6.4953, 6188, '05'],
  ['Nyons', 44.3608, 5.1408, 6731, '26'],
  ['Die', 44.7536, 5.3703, 4664, '26'],
  ['Romans-sur-Isère', 45.0464, 5.0517, 33139, '26'],
  ['Thonon-les-Bains', 46.3706, 6.4797, 34756, '74'],
  ['Chamonix-Mont-Blanc', 45.9237, 6.8694, 8612, '74'],
  ['Aix-les-Bains', 45.6886, 5.9150, 30463, '73'],
  ['Albertville', 45.6758, 6.3928, 19295, '73'],
  ['Bourg-Saint-Maurice', 45.6183, 6.7697, 7284, '73'],
  ['Gex', 46.3333, 6.0583, 13455, '01'],
  ['Belley', 45.7583, 5.6881, 9133, '01'],
  ['Nantua', 46.1528, 5.6064, 3431, '01'],
  ['Saint-Claude', 46.3872, 5.8631, 9103, '39'],
  ['Champagnole', 46.7436, 5.9103, 8043, '39'],
  ['Pontarlier', 46.9061, 6.3547, 17928, '25'],
  ['Morteau', 47.0547, 6.6028, 6850, '25'],
  ['Saint-Dié-des-Vosges', 48.2842, 6.9492, 19593, '88'],
  ['Remiremont', 48.0069, 6.5917, 7892, '88'],
  ['Gérardmer', 48.0708, 6.8739, 8145, '88'],
  ['Sarrebourg', 48.7353, 7.0564, 12161, '57'],
  ['Sarreguemines', 49.1100, 7.0700, 20783, '57'],
  ['Haguenau', 48.8156, 7.7914, 35415, '67'],
  ['Sélestat', 48.2619, 7.4489, 19332, '67'],
  ['Saint-Louis', 47.5897, 7.5603, 22229, '68'],
  ['Guebwiller', 47.9075, 7.2125, 11083, '68'],
  ['Sainte-Marie-aux-Mines', 48.2483, 7.1917, 5105, '68'],
  ['Langres', 47.8625, 5.3333, 7699, '52'],
  ['Saint-Dizier', 48.6383, 5.0833, 22928, '52'],
  ['Sedan', 49.7019, 4.9403, 16193, '08'],
  ['Charleville-Mézières', 49.7719, 4.7161, 46428, '08'],
  ['Rethel', 49.5097, 4.3672, 7642, '08'],
  ['Châlons-en-Champagne', 48.9566, 4.3639, 44753, '51'],
  ['Épernay', 49.0403, 3.9600, 22671, '51'],
  ['Vitry-le-François', 48.7247, 4.5844, 12249, '51'],
  ['Laon', 49.5647, 3.6239, 24876, '02'],
  ['Saint-Quentin', 49.8478, 3.2864, 53816, '02'],
  ['Soissons', 49.3817, 3.3236, 28530, '02'],
  ['Beauvais', 49.4294, 2.0808, 56020, '60'],
  ['Compiègne', 49.4178, 2.8264, 40542, '60'],
  ['Creil', 49.2583, 2.4833, 35657, '60'],
  ['Pontoise', 49.0508, 2.1008, 32875, '95'],
  ['Évreux', 49.0270, 1.1510, 49461, '27'],
  ['Vernon', 49.0919, 1.4903, 23702, '27'],
  ['Bernay', 49.0889, 0.5983, 10042, '27'],
  ['Lisieux', 49.1500, 0.2333, 20318, '14'],
  ['Vire', 48.8386, -0.8892, 12257, '14'],
  ['Cherbourg-en-Cotentin', 49.6386, -1.6160, 44510, '50'],
  ['Saint-Lô', 49.1164, -1.0900, 19342, '50'],
  ['Granville', 48.8367, -1.5989, 12799, '50'],
  ['Avranches', 48.6844, -1.3572, 7571, '50'],
  ['Fougères', 48.3528, -1.1997, 20671, '35'],
  ['Vitré', 48.1236, -1.2097, 18311, '35'],
  ['Redon', 47.6517, -2.0836, 9090, '35'],
  ['Pontivy', 48.0683, -2.9664, 14964, '56'],
  ['Lannion', 48.7322, -3.4594, 20231, '22'],
  ['Guingamp', 48.5625, -3.1514, 7044, '22'],
  ['Dinan', 48.4556, -2.0417, 14477, '22'],
  ['Morlaix', 48.5783, -3.8297, 14837, '29'],
  ['Concarneau', 47.8731, -3.9189, 19816, '29'],
  ['Douarnenez', 48.0928, -4.3303, 14036, '29'],
  ['Châteaulin', 48.1950, -4.0897, 5219, '29'],
  ['Carhaix-Plouguer', 48.2767, -3.5733, 7326, '29'],
  ['Les Sables-d’Olonne', 46.4972, -1.7833, 44017, '85'],
  ['Fontenay-le-Comte', 46.4667, -0.8067, 13703, '85'],
  ['Bressuire', 46.8411, -0.4906, 19850, '79'],
  ['Thouars', 46.9764, -0.2153, 9360, '79'],
  ['Parthenay', 46.6486, -0.2469, 10134, '79'],
  ['Saint-Jean-d’Angély', 45.9444, -0.5214, 7170, '17'],
  ['Jonzac', 45.4486, -0.4350, 3572, '17'],
  ['Royan', 45.6281, -1.0297, 18419, '17'],
  ['Barbezieux-Saint-Hilaire', 45.4717, -0.1531, 4738, '16'],
  ['Confolens', 46.0136, 0.6722, 2726, '16'],
  ['Bellac', 46.1222, 1.0497, 4165, '87'],
  ['Saint-Junien', 45.8875, 0.9011, 11347, '87'],
  ['Ussel', 45.5475, 2.3092, 9466, '19'],
  ['Argentat-sur-Dordogne', 45.0906, 1.8722, 3145, '19'],
  ['Montbard', 47.6228, 4.3367, 5028, '21'],
  ['Beaune', 47.0250, 4.8397, 21031, '21'],
  ['Autun', 46.9511, 4.2986, 13132, '71'],
  ['Charolles', 46.4347, 4.2753, 2721, '71'],
  ['Louhans', 46.6264, 5.2247, 6483, '71'],
  ['Ambert', 45.5497, 3.7414, 6633, '63'],
  ['Thiers', 45.8564, 3.5478, 11633, '63'],
  ['Riom', 45.8936, 3.1128, 18680, '63'],
  ['Brioude', 45.2942, 3.3842, 6609, '43'],
  ['Yssingeaux', 45.1428, 4.1236, 7459, '43'],
  ['Florac', 44.3264, 3.5931, 1996, '48'],
  ['Marvejols', 44.5536, 3.2933, 4752, '48'],
  ['Villefranche-de-Rouergue', 44.3525, 2.0372, 11651, '12'],
  ['Saint-Affrique', 43.9556, 2.7536, 8306, '12'],
  ['Figeac', 44.6083, 2.0314, 9826, '46'],
  ['Gourdon', 44.7361, 1.3814, 4273, '46'],
  ['Villeneuve-sur-Lot', 44.4081, 0.7050, 22504, '47'],
  ['Marmande', 44.5000, 0.1653, 17668, '47'],
  ['Nérac', 44.1367, 0.3389, 7076, '47'],
  ['Condom', 43.9575, 0.3725, 6454, '32'],
  ['Mirande', 43.5144, 0.4042, 3558, '32'],
  ['Lourdes', 43.0920, -0.0453, 13210, '65'],
  ['Bagnères-de-Bigorre', 43.0644, 0.1478, 7337, '65'],
  ['Argelès-Gazost', 43.0028, -0.0989, 3034, '65'],
  ['Saint-Gaudens', 43.1083, 0.7233, 11487, '31'],
  ['Muret', 43.4611, 1.3267, 25204, '31'],
  ['Pamiers', 43.1164, 1.6108, 15824, '09'],
  ['Saint-Girons', 42.9847, 1.1461, 6256, '09'],
  ['Prades', 42.6172, 2.4217, 6160, '66'],
  ['Céret', 42.4883, 2.7508, 7620, '66'],
  ['Limoux', 43.0550, 2.2172, 10339, '11'],
  ['Lézignan-Corbières', 43.2008, 2.7589, 11275, '11'],
  ['Lodève', 43.7317, 3.3194, 7539, '34'],
  ['Clermont-l’Hérault', 43.6289, 3.4306, 9137, '34'],
  ['Florac-Trois-Rivières', 44.3264, 3.5931, 2120, '48'],
  ['Langogne', 44.7292, 3.8553, 2869, '48'],
  ['Privas-Veyras', 44.7167, 4.5833, 1580, '07'],
  ['Tournon-sur-Rhône', 45.0669, 4.8325, 10425, '07'],
  ['Annonay', 45.2400, 4.6700, 16297, '07'],
  ['Guilherand-Granges', 44.9400, 4.8672, 11191, '07'],
]

interface CityItem {
  name: string
  lat: number
  lon: number
  pop: number
  dept: string
}

const FRANCE_CENTER: [number, number] = [46.6, 2.4]

/** FeatureCollection typée pour react-leaflet. */
function fc(features: NonNullable<RawGeoJSON['features']>): GeoJsonObject {
  return { type: 'FeatureCollection', features } as unknown as FeatureCollection as unknown as GeoJsonObject
}

/** Villes affichées selon le zoom (les grandes d'abord). */
function citiesForZoom(cities: CityItem[], zoom: number): CityItem[] {
  if (zoom < 7) return cities.filter((c) => c.pop >= 150000)
  if (zoom < 9) return cities.filter((c) => c.pop >= 40000)
  if (zoom < 11) return cities.filter((c) => c.pop >= 10000)
  return cities
}

/** Anti-chevauchement : on place les libellés des plus grandes villes d'abord. */
function declutter(cities: CityItem[], map: L.Map): CityItem[] {
  const placed: { x: number; y: number; w: number; h: number }[] = []
  const out: CityItem[] = []
  const zoom = map.getZoom()

  for (const c of cities) {
    const p = map.latLngToContainerPoint([c.lat, c.lon])
    const size = c.pop >= 300000 ? 15 : c.pop >= 80000 ? 13 : c.pop >= 20000 ? 12 : 11
    const w = Math.max(24, c.name.length * size * 0.56)
    const h = size + 8
    const rect = { x: p.x - w / 2, y: p.y - h - 6, w, h }

    const collides = placed.some(
      (r) => rect.x < r.x + r.w && rect.x + rect.w > r.x && rect.y < r.y + r.h && rect.y + rect.h > r.y,
    )
    if (!collides) {
      placed.push(rect)
      out.push(c)
    }
  }
  return out
}

/** Recalcule l'anti-chevauchement à chaque zoom/déplacement. */
function CityLabels({ cities }: { cities: CityItem[] }) {
  const map = useMap()
  const [visible, setVisible] = useState<CityItem[]>([])

  const recompute = useCallback(() => {
    const zoomed = citiesForZoom(cities, map.getZoom())
    setVisible(declutter(zoomed, map))
  }, [cities, map])

  useMapEvents({
    zoomend: recompute,
    moveend: recompute,
  })

  useEffect(() => {
    recompute()
  }, [recompute])

  return (
    <>
      {visible.map((c) => {
        const size = c.pop >= 300000 ? 15 : c.pop >= 80000 ? 13 : c.pop >= 20000 ? 12 : 11
        return (
          <Marker
            key={`${c.dept}-${c.name}`}
            position={[c.lat, c.lon]}
            icon={L.divIcon({
              className: 'city-outline-label',
              iconSize: undefined,
              html: `<span class="city-dot" aria-hidden="true"></span><span style="font-size:${size}px">${c.name}</span>`,
            })}
          >
            <span className="sr-only">{c.name}</span>
          </Marker>
        )
      })}
    </>
  )
}

export function RegionsMapInner({ className }: { className?: string }) {
  const [selected, setSelected] = useState<{ code: string; name: string } | null>(null)
  const [regions, setRegions] = useState<NonNullable<RawGeoJSON['features']>>([])
  const [depts, setDepts] = useState<NonNullable<RawGeoJSON['features']>>([])
  const [regionsError, setRegionsError] = useState<string | null>(null)
  const [deptsError, setDeptsError] = useState<string | null>(null)
  const [regionsLoading, setRegionsLoading] = useState(true)
  const [deptsLoading, setDeptsLoading] = useState(true)
  const [deptCities, setDeptCities] = useState<CityItem[]>([])
  const [cityZoom, setCityZoom] = useState<{ code: string; lat: number; lon: number } | null>(null)
  const [mapKey, setMapKey] = useState(0)

  useEffect(() => {
    const ctrl = new AbortController()

    const load = async (url: string, label: string) => {
      const res = await fetch(url, { signal: ctrl.signal })
      if (!res.ok) throw new Error(`${label} : HTTP ${res.status}`)
      const data = (await res.json()) as RawGeoJSON
      const list = featureList(data)
      if (list.length === 0) throw new Error(`${label} : aucune région trouvée`)
      return list
    }

    void (async () => {
      try {
        setRegions(await load(REGIONS_URL, 'Régions'))
        setRegionsError(null)
      } catch (e) {
        if (!ctrl.signal.aborted) setRegionsError(e instanceof Error ? e.message : 'Erreur régions')
      } finally {
        setRegionsLoading(false)
      }
      try {
        setDepts(await load(DEPTS_URL, 'Départements'))
        setDeptsError(null)
      } catch (e) {
        if (!ctrl.signal.aborted) setDeptsError(e instanceof Error ? e.message : 'Erreur départements')
      } finally {
        setDeptsLoading(false)
      }
    })()

    return () => ctrl.abort()
  }, [])

  /** Clic sur un département : zoom + toutes ses villes (API + liste statique). */
  const selectDept = useCallback(async (code: string, _name: string, lat: number, lon: number) => {
    if (!code) return
    setCityZoom({ code, lat, lon })
    setMapKey((k) => k + 1)
    setDeptCities([])

    const merged = new Map<string, CityItem>()
    for (const [name, cLat, cLon, pop, dep] of TOP_CITIES) {
      if (dep === code) merged.set(name.toLowerCase(), { name, lat: cLat, lon: cLon, pop, dept: dep })
    }

    try {
      const res = await fetch(
        `https://geo.api.gouv.fr/communes?codeDepartement=${code}&fields=nom,centre,population&format=geojson&limit=100&boost=population`,
      )
      if (res.ok) {
        const data = (await res.json()) as {
          nom?: string
          centre?: { type?: string; coordinates?: [number, number] }
          population?: number
        }[]
        for (const c of data) {
          const key = (c.nom ?? '').toLowerCase()
          if (!key || !c.centre) continue
          const [cLon, cLat] = c.centre.coordinates ?? [0, 0]
          if (!cLat || !cLon) continue
          if (!merged.has(key)) {
            merged.set(key, { name: c.nom!, lat: cLat, lon: cLon, pop: c.population ?? 0, dept: code })
          }
        }
      }
    } catch {
      /* liste statique seule */
    }

    setDeptCities([...merged.values()].sort((a, b) => b.pop - a.pop))
  }, [])

  const reset = useCallback(() => {
    setSelected(null)
    setCityZoom(null)
    setDeptCities([])
    setMapKey((k) => k + 1)
  }, [])

  const cities = useMemo<CityItem[]>(() => {
    if (deptCities.length > 0) return deptCities
    return TOP_CITIES.map(([name, lat, lon, pop, dept]) => ({ name, lat, lon, pop, dept }))
  }, [deptCities])

  const hasError = !!regionsError
  const hasData = regions.length > 0

  return (
    <div className={cn('relative h-full w-full overflow-hidden rounded-2xl border border-border', className)}>
      {(regionsLoading || deptsLoading) && (
        <div className="absolute left-1/2 top-1/2 z-[1000] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-bg/90 px-4 py-2 text-sm font-medium shadow-md">
          Chargement de la carte…
        </div>
      )}
      {hasError && (
        <div className="absolute left-1/2 top-1/2 z-[1000] max-w-xs -translate-x-1/2 -translate-y-1/2 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-center text-sm text-danger-700 shadow-md">
          Impossible de charger la carte des régions.
          <br />
          <span className="text-xs text-danger-600">{regionsError}</span>
          <br />
          <Button variant="outline" size="sm" className="mt-2" onClick={() => window.location.reload()}>
            Réessayer
          </Button>
        </div>
      )}
      {!hasError && !regionsLoading && !hasData && (
        <div className="absolute left-1/2 top-1/2 z-[1000] max-w-xs -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card px-4 py-3 text-center text-sm shadow-md">
          Aucune région disponible.
          <br />
          <Button variant="outline" size="sm" className="mt-2" onClick={() => window.location.reload()}>
            Réessayer
          </Button>
        </div>
      )}

      {selected && (
        <div className="absolute left-3 top-3 z-[1000] flex items-center gap-2 rounded-full bg-bg/90 px-3 py-1.5 text-sm font-medium shadow-md backdrop-blur-sm">
          <span>{selected.name}</span>
          <Button variant="ghost" size="sm" onClick={reset} aria-label="Voir toute la France">
            France entière
          </Button>
        </div>
      )}

      {!selected && cityZoom && (
        <div className="absolute left-3 top-3 z-[1000] flex items-center gap-2 rounded-full bg-bg/90 px-3 py-1.5 text-sm font-medium shadow-md backdrop-blur-sm">
          <span>Département {cityZoom.code}</span>
          <Button variant="ghost" size="sm" onClick={reset} aria-label="Voir toute la France">
            France entière
          </Button>
        </div>
      )}

      <MapContainer
        key={mapKey}
        center={cityZoom ? [cityZoom.lat, cityZoom.lon] : FRANCE_CENTER}
        zoom={cityZoom ? 10 : 6}
        className="h-full w-full"
        zoomControl
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {!selected && regions.length > 0 && (
          <GeoJSON
            data={fc(regions)}
            style={() => ({
              color: 'var(--primary, #7c3aed)',
              weight: 1.5,
              fillColor: 'var(--primary, #7c3aed)',
              fillOpacity: 0.08,
            })}
            onEachFeature={(feature, layer) => {
              const props = (feature.properties ?? {}) as Record<string, unknown>
              const code = regionCode(props)
              const name = regionName(props)
              layer.bindTooltip(name, { sticky: true })
              layer.on('click', () => setSelected({ code, name }))
            }}
          />
        )}

        {!selected && depts.length > 0 && (
          <GeoJSON
            data={fc(depts)}
            style={() => ({
              color: '#64748b',
              weight: 0.8,
              fill: false,
              dashArray: '3 3',
            })}
            onEachFeature={(feature, layer) => {
              const props = (feature.properties ?? {}) as Record<string, unknown>
              const code = deptCode(props)
              const name = deptName(props)
              layer.bindTooltip(name, { sticky: true })
              layer.on('click', (e) => {
                L.DomEvent.stopPropagation(e as unknown as Event)
                const pt = representativePoint(feature as { geometry?: { type?: string; coordinates?: unknown } })
                if (pt) void selectDept(code, name, pt[0], pt[1])
              })
            }}
          />
        )}

        {selected && regions.length > 0 && (
          <GeoJSON
            data={fc(
              regions.filter(
                (f) => regionCode((f.properties ?? {}) as Record<string, unknown>) === selected.code,
              ),
            )}
            style={() => ({
              color: 'var(--primary, #7c3aed)',
              weight: 2,
              fillColor: 'var(--primary, #7c3aed)',
              fillOpacity: 0.15,
            })}
          />
        )}

        <CityLabels cities={cities} />
      </MapContainer>

    </div>
  )
}
