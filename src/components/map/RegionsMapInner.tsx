'use client'

import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { ArrowLeft, Check, Crosshair, Loader2, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { MapContainer, useMap } from 'react-leaflet'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { useLocationFilter, type BBox } from '@/lib/locationFilter'
import { useLang } from '@/lib/i18n'

/** GeoJSON officiels simplifiés (chargés dans le navigateur). */
const REGIONS_URL =
  'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/regions-version-simplifiee.geojson'
const DEPTS_URL =
  'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements-version-simplifiee.geojson'

/** 13 régions métropolitaines. */
const METRO_REGIONS = new Set(['84', '27', '53', '24', '94', '44', '11', '76', '32', '28', '75', '52', '93'])

/** Cadre de la France entière (vue initiale). */
const FRANCE_BOUNDS: L.LatLngBoundsExpression = [
  [41.1, -5.4],
  [51.3, 9.8],
]

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

/**
 * Villes majeures de France [nom, lat, lon, population, département].
 * Complément de l'API geo.api.gouv.fr (limitée à 100 résultats par appel).
 */
const TOP_CITIES: [string, number, number, number, string][] = [
  ['Paris', 48.8566, 2.3522, 2102650, '75'],
  ['Marseille', 43.2965, 5.3698, 873076, '13'],
  ['Lyon', 45.764, 4.8357, 522969, '69'],
  ['Toulouse', 43.6047, 1.4442, 498003, '31'],
  ['Nice', 43.7102, 7.262, 342295, '06'],
  ['Nantes', 47.2184, -1.5536, 320732, '44'],
  ['Montpellier', 43.6108, 3.8767, 302454, '34'],
  ['Strasbourg', 48.5734, 7.7521, 287228, '67'],
  ['Bordeaux', 44.8378, -0.5792, 259809, '33'],
  ['Lille', 50.6292, 3.0573, 236234, '59'],
  ['Rennes', 48.1173, -1.6778, 225081, '35'],
  ['Reims', 49.2583, 4.0317, 182211, '51'],
  ['Saint-Étienne', 45.4397, 4.3872, 173821, '42'],
  ['Le Havre', 49.4944, 0.1079, 165830, '76'],
  ['Toulon', 43.1242, 5.928, 168701, '83'],
  ['Grenoble', 45.1885, 5.7245, 156389, '38'],
  ['Dijon', 47.322, 5.0415, 158002, '21'],
  ['Angers', 47.4784, -0.5632, 155876, '49'],
  ['Nîmes', 43.8367, 4.3601, 151001, '30'],
  ['Villeurbanne', 45.7719, 4.8902, 155027, '69'],
  ['Clermont-Ferrand', 45.7772, 3.087, 147751, '63'],
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
  ['Chambéry', 45.5646, 5.9178, 60299, '73'],
  ['Vannes', 47.6582, -2.7608, 55023, '56'],
  ['Lorient', 47.7483, -3.37, 58304, '56'],
  ['Quimper', 47.996, -4.0978, 64900, '29'],
  ['Saint-Brieuc', 48.5136, -2.7653, 46388, '22'],
  ['Saint-Malo', 48.6493, -2.0257, 47255, '35'],
  ['Laval', 48.0737, -0.7736, 50220, '53'],
  ['Niort', 46.3239, -0.4628, 59059, '79'],
  ['Angoulême', 45.6484, 0.1562, 41740, '16'],
  ['La Roche-sur-Yon', 46.6705, -1.426, 55422, '85'],
  ['Bourg-en-Bresse', 46.2044, 5.2286, 41652, '01'],
  ['Valence', 44.9334, 4.8916, 63189, '26'],
  ['Gap', 44.559, 6.0795, 40895, '05'],
  ['Digne-les-Bains', 44.0923, 6.2357, 17455, '04'],
  ['Privas', 44.735, 4.599, 8465, '07'],
  ['Rodez', 44.3506, 2.5738, 24262, '12'],
  ['Cahors', 44.4475, 1.44, 12355, '46'],
  ['Agen', 44.203, 0.6167, 33576, '47'],
  ['Montauban', 44.0175, 1.355, 61372, '82'],
  ['Albi', 43.9297, 2.148, 49234, '81'],
  ['Carcassonne', 43.213, 2.3491, 47834, '11'],
  ['Foix', 42.9639, 1.6053, 9692, '09'],
  ['Auch', 43.646, 0.586, 21935, '32'],
  ['Tarbes', 43.2333, 0.0783, 42758, '65'],
  ['Mende', 44.518, 3.5013, 12296, '48'],
  ['Le Puy-en-Velay', 45.0428, 3.8829, 19089, '43'],
  ['Aurillac', 44.9261, 2.4406, 26032, '15'],
  ['Guéret', 46.1717, 1.8717, 13266, '23'],
  ['Tulle', 45.2667, 1.7717, 14836, '19'],
  ['Brive-la-Gaillarde', 45.1583, 1.5317, 46916, '19'],
  ['Périgueux', 45.1846, 0.7181, 29896, '24'],
  ['Bergerac', 44.852, 0.4819, 26833, '24'],
  ['Dax', 43.71, -1.0528, 21620, '40'],
  ['Mont-de-Marsan', 43.893, -0.5, 31455, '40'],
  ['Arcachon', 44.6583, -1.1689, 11278, '33'],
  ['Libourne', 44.9156, -0.2417, 24668, '33'],
  ['Saintes', 45.745, -0.6333, 25874, '17'],
  ['Rochefort', 45.9414, -0.9592, 24014, '17'],
  ['Cognac', 45.6956, -0.3289, 18643, '16'],
  ['Châtellerault', 46.8172, 0.5464, 31483, '86'],
  ['Châteauroux', 46.8103, 1.6913, 43741, '36'],
  ['Bourges', 47.081, 2.3988, 64238, '18'],
  ['Nevers', 46.9896, 3.1628, 32990, '58'],
  ['Auxerre', 47.798, 3.5672, 34799, '89'],
  ['Sens', 48.1975, 3.2878, 26688, '89'],
  ['Troyes', 48.2973, 4.0744, 61957, '10'],
  ['Chaumont', 48.1117, 5.1389, 22705, '52'],
  ['Bar-le-Duc', 48.7728, 5.1611, 15538, '55'],
  ['Verdun', 49.1597, 5.3828, 16942, '55'],
  ['Thionville', 49.3589, 6.1686, 40701, '57'],
  ['Forbach', 49.19, 6.9, 21552, '57'],
  ['Épinal', 48.1744, 6.4497, 32078, '88'],
  ['Belfort', 47.638, 6.8628, 46454, '90'],
  ['Vesoul', 47.6214, 6.1542, 15223, '70'],
  ['Lons-le-Saunier', 46.6758, 5.5528, 17393, '39'],
  ['Dole', 47.0931, 5.4906, 23708, '39'],
  ['Chalon-sur-Saône', 46.7831, 4.8558, 45096, '71'],
  ['Mâcon', 46.3067, 4.8317, 33638, '71'],
  ['Roanne', 46.0367, 4.0689, 35349, '42'],
  ['Vichy', 46.1278, 3.4267, 25702, '03'],
  ['Moulins', 46.5642, 3.3325, 19715, '03'],
  ['Montluçon', 46.3408, 2.6031, 36717, '03'],
  ['Vienne', 45.5242, 4.8781, 30306, '38'],
  ['Bourgoin-Jallieu', 45.5861, 5.2736, 28587, '38'],
  ['Montélimar', 44.5581, 4.7508, 40356, '26'],
  ['Briançon', 44.8967, 6.6353, 11604, '05'],
  ['Arles', 43.6769, 4.6278, 50434, '13'],
  ['Martigues', 43.4053, 5.0475, 48188, '13'],
  ['Aubagne', 43.2936, 5.5711, 47535, '13'],
  ['Salon-de-Provence', 43.6406, 5.0972, 44980, '13'],
  ['Fréjus', 43.4331, 6.7372, 55750, '83'],
  ['Draguignan', 43.5369, 6.4644, 40440, '83'],
  ['Hyères', 43.1205, 6.13, 55589, '83'],
  ['Cannes', 43.5528, 7.0174, 73868, '06'],
  ['Antibes', 43.5804, 7.1251, 75538, '06'],
  ['Menton', 43.7764, 7.5028, 29073, '06'],
  ['Grasse', 43.6592, 6.925, 48822, '06'],
  ['Sète', 43.402, 3.6964, 44712, '34'],
  ['Béziers', 43.3442, 3.2158, 80815, '34'],
  ['Narbonne', 43.1839, 3.0036, 55576, '11'],
  ['Alès', 44.1281, 4.0817, 44223, '30'],
  ['Castres', 43.6056, 2.2397, 42700, '81'],
  ['Lunel', 43.6778, 4.1361, 26380, '34'],
  ['Carpentras', 44.0558, 5.0489, 28989, '84'],
  ['Orange', 44.1381, 4.8075, 28919, '84'],
  ['Sisteron', 44.1969, 5.9431, 7506, '04'],
  ['Barcelonnette', 44.3867, 6.6517, 2591, '04'],
  ['Castellane', 43.8472, 6.5128, 1508, '04'],
  ['Embrun', 44.5636, 6.4953, 6188, '05'],
  ['Romans-sur-Isère', 45.0464, 5.0517, 33139, '26'],
  ['Thonon-les-Bains', 46.3706, 6.4797, 34756, '74'],
  ['Chamonix-Mont-Blanc', 45.9237, 6.8694, 8612, '74'],
  ['Aix-les-Bains', 45.6886, 5.915, 30463, '73'],
  ['Albertville', 45.6758, 6.3928, 19295, '73'],
  ['Gex', 46.3333, 6.0583, 13455, '01'],
  ['Belley', 45.7583, 5.6881, 9133, '01'],
  ['Nantua', 46.1528, 5.6064, 3431, '01'],
  ['Saint-Claude', 46.3872, 5.8631, 9103, '39'],
  ['Pontarlier', 46.9061, 6.3547, 17928, '25'],
  ['Morteau', 47.0547, 6.6028, 6850, '25'],
  ['Saint-Dié-des-Vosges', 48.2842, 6.9492, 19593, '88'],
  ['Gérardmer', 48.0708, 6.8739, 8145, '88'],
  ['Sarrebourg', 48.7353, 7.0564, 12161, '57'],
  ['Sarreguemines', 49.11, 7.07, 20783, '57'],
  ['Haguenau', 48.8156, 7.7914, 35415, '67'],
  ['Sélestat', 48.2619, 7.4489, 19332, '67'],
  ['Saint-Louis', 47.5897, 7.5603, 22229, '68'],
  ['Guebwiller', 47.9075, 7.2125, 11083, '68'],
  ['Langres', 47.8625, 5.3333, 7699, '52'],
  ['Saint-Dizier', 48.6383, 5.0833, 22928, '52'],
  ['Sedan', 49.7019, 4.9403, 16193, '08'],
  ['Charleville-Mézières', 49.7719, 4.7161, 46428, '08'],
  ['Châlons-en-Champagne', 48.9566, 4.3639, 44753, '51'],
  ['Épernay', 49.0403, 3.96, 22671, '51'],
  ['Laon', 49.5647, 3.6239, 24876, '02'],
  ['Saint-Quentin', 49.8478, 3.2864, 53816, '02'],
  ['Soissons', 49.3817, 3.3236, 28530, '02'],
  ['Beauvais', 49.4294, 2.0808, 56020, '60'],
  ['Compiègne', 49.4178, 2.8264, 40542, '60'],
  ['Creil', 49.2583, 2.4833, 35657, '60'],
  ['Pontoise', 49.0508, 2.1008, 32875, '95'],
  ['Évreux', 49.027, 1.151, 49461, '27'],
  ['Vernon', 49.0919, 1.4903, 23702, '27'],
  ['Lisieux', 49.15, 0.2333, 20318, '14'],
  ['Cherbourg-en-Cotentin', 49.6386, -1.616, 44510, '50'],
  ['Saint-Lô', 49.1164, -1.09, 19342, '50'],
  ['Granville', 48.8367, -1.5989, 12799, '50'],
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
  ['Carhaix-Plouguer', 48.2767, -3.5733, 7326, '29'],
  ['Les Sables-d’Olonne', 46.4972, -1.7833, 44017, '85'],
  ['Fontenay-le-Comte', 46.4667, -0.8067, 13703, '85'],
  ['Bressuire', 46.8411, -0.4906, 19850, '79'],
  ['Thouars', 46.9764, -0.2153, 9360, '79'],
  ['Parthenay', 46.6486, -0.2469, 10134, '79'],
  ['Royan', 45.6281, -1.0297, 18419, '17'],
  ['Bellac', 46.1222, 1.0497, 4165, '87'],
  ['Saint-Junien', 45.8875, 0.9011, 11347, '87'],
  ['Ussel', 45.5475, 2.3092, 9466, '19'],
  ['Beaune', 47.025, 4.8397, 21031, '21'],
  ['Autun', 46.9511, 4.2986, 13132, '71'],
  ['Thiers', 45.8564, 3.5478, 11633, '63'],
  ['Riom', 45.8936, 3.1128, 18680, '63'],
  ['Brioude', 45.2942, 3.3842, 6609, '43'],
  ['Yssingeaux', 45.1428, 4.1236, 7459, '43'],
  ['Villefranche-de-Rouergue', 44.3525, 2.0372, 11651, '12'],
  ['Figeac', 44.6083, 2.0314, 9826, '46'],
  ['Villeneuve-sur-Lot', 44.4081, 0.705, 22504, '47'],
  ['Marmande', 44.5, 0.1653, 17668, '47'],
  ['Lourdes', 43.092, -0.0453, 13210, '65'],
  ['Saint-Gaudens', 43.1083, 0.7233, 11487, '31'],
  ['Muret', 43.4611, 1.3267, 25204, '31'],
  ['Pamiers', 43.1164, 1.6108, 15824, '09'],
  ['Prades', 42.6172, 2.4217, 6160, '66'],
  ['Céret', 42.4883, 2.7508, 7620, '66'],
  ['Limoux', 43.055, 2.2172, 10339, '11'],
  ['Lodève', 43.7317, 3.3194, 7539, '34'],
  ['Langogne', 44.7292, 3.8553, 2869, '48'],
  ['Annonay', 45.24, 4.67, 16297, '07'],
  ['Tournon-sur-Rhône', 45.0669, 4.8325, 10425, '07'],
  ['Die', 44.7536, 5.3703, 4664, '26'],
  ['Nyons', 44.3608, 5.1408, 6731, '26'],
  ['Forcalquier', 43.96, 5.7783, 5080, '04'],
  ['Florac-Trois-Rivières', 44.3264, 3.5931, 2120, '48'],
]

/** Test d'appartenance d'un point à un anneau (ray casting) — place les noms au bon endroit. */
function pointInRing(lat: number, lon: number, ring: L.LatLng[]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!
    const b = ring[j]!
    const crosses =
      a.lat > lat !== b.lat > lat &&
      lon < ((b.lng - a.lng) * (lat - a.lat)) / (b.lat - a.lat || 1e-9) + a.lng
    if (crosses) inside = !inside
  }
  return inside
}

/**
 * Centre « utile » d'une région / d'un département : le point intérieur le plus
 * proche du centre du cadre (évite de poser le nom en mer ou sur une île lointaine).
 */
function areaCenter(layer: L.Layer): L.LatLng | null {
  try {
    const poly = layer as L.Polygon
    const raw = typeof poly.getLatLngs === 'function' ? poly.getLatLngs() : null
    if (!raw || raw.length === 0) return null

    // Polygon : [[LatLng]] · MultiPolygon : [[[LatLng]]]
    const isMulti = Array.isArray((raw as unknown as unknown[][])[0]?.[0])
    const polys = isMulti ? (raw as unknown as L.LatLng[][][]) : [raw as unknown as L.LatLng[][]]

    // On garde la plus grande île / le plus grand morceau de la zone.
    let outer: L.LatLng[] | null = null
    let bestArea = -1
    for (const piece of polys) {
      const ring = piece[0]
      if (!ring || ring.length < 3) continue
      const b = L.latLngBounds(ring)
      const area = (b.getNorth() - b.getSouth()) * (b.getEast() - b.getWest())
      if (area > bestArea) {
        bestArea = area
        outer = ring
      }
    }
    if (!outer) return poly.getBounds?.().getCenter() ?? null

    const bb = L.latLngBounds(outer)
    const center = bb.getCenter()
    if (pointInRing(center.lat, center.lng, outer)) return center

    // Centre hors des terres (littoral, baie) : échantillonnage d'une grille.
    let found: L.LatLng | null = null
    let bestDist = Infinity
    const N = 14
    for (let i = 1; i < N; i++) {
      for (let j = 1; j < N; j++) {
        const lat = bb.getSouth() + ((bb.getNorth() - bb.getSouth()) * i) / N
        const lng = bb.getWest() + ((bb.getEast() - bb.getWest()) * j) / N
        if (!pointInRing(lat, lng, outer)) continue
        const d = (lat - center.lat) ** 2 + (lng - center.lng) ** 2
        if (d < bestDist) {
          bestDist = d
          found = L.latLng(lat, lng)
        }
      }
    }
    return found ?? center
  } catch {
    return null
  }
}

/** Nom de région / de département posé au centre de la zone (jamais cliquable). */
function areaLabelIcon(
  name: string,
  kind: 'region' | 'dept',
  fontSize: number,
  maxWidth: number,
  dx = 0,
  dy = 0,
): L.DivIcon {
  const safe = String(name).replace(/</g, '&lt;')
  return L.divIcon({
    className: 'area-label',
    html:
      `<span class="area-name ${kind}" style="font-size:${fontSize}px;max-width:${maxWidth}px;` +
      `transform:translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))">${safe}</span>`,
    iconSize: undefined,
    iconAnchor: [0, 0],
  })
}

/** Surface approximative d'une zone (les grandes zones gardent leur nom au centre). */
function featureArea(feature: GeoJSON.Feature): number {
  try {
    const b = L.geoJSON(feature).getBounds()
    return Math.abs((b.getNorth() - b.getSouth()) * (b.getEast() - b.getWest()))
  } catch {
    return 0
  }
}

/** Trie les zones de la plus grande à la plus petite avant de poser les noms. */
function sortedFeatures(
  collection: GeoJSON.FeatureCollection,
  keep: (code: string) => boolean,
): GeoJSON.FeatureCollection {
  const features = (collection.features ?? [])
    .filter((f) => keep(String(f.properties?.code ?? '')))
    .sort((a, b) => featureArea(b) - featureArea(a))
  return { type: 'FeatureCollection', features } as GeoJSON.FeatureCollection
}

type LabelRect = { x: number; y: number; w: number; h: number }

/**
 * Placeur d'étiquettes de zones : évite que deux noms se chevauchent (décalage
 * autour du centre, comme pour les villes) et laisse un écart de 5 px minimum.
 */
function createLabelPlacer(map: L.Map) {
  const placed: LabelRect[] = []
  const gap = 5
  return (center: L.LatLng, text: string, fontSize: number, maxWidth: number) => {
    const p = map.latLngToContainerPoint(center)
    const rawW = text.length * fontSize * 0.6
    const w = Math.min(maxWidth, Math.max(22, rawW))
    const lines = Math.max(1, Math.ceil(rawW / maxWidth))
    const h = lines * fontSize * 1.18 + 2
    const offsets: [number, number][] = [
      [0, 0],
      [0, -h],
      [0, h],
      [w / 2, 0],
      [-w / 2, 0],
      [w / 2, -h],
      [-w / 2, -h],
      [w / 2, h],
      [-w / 2, h],
      [0, -2 * h],
      [0, 2 * h],
    ]
    for (const [dx, dy] of offsets) {
      const r: LabelRect = { x: p.x + dx - w / 2, y: p.y + dy - h / 2, w, h }
      const hit = placed.some(
        (o) =>
          r.x < o.x + o.w + gap &&
          r.x + r.w + gap > o.x &&
          r.y < o.y + o.h + gap &&
          r.y + r.h + gap > o.y,
      )
      if (!hit) {
        placed.push(r)
        return { dx, dy }
      }
    }
    return null
  }
}

type LabelPlacer = ReturnType<typeof createLabelPlacer>

/** Ajoute le nom au centre d'une zone (région ou département). */
function addAreaLabel(
  group: L.LayerGroup,
  layer: L.Layer,
  name: string,
  kind: 'region' | 'dept',
  place: LabelPlacer,
): void {
  const center = areaCenter(layer)
  if (!center) return
  const fontSize = kind === 'region' ? 11 : 10.5
  const maxWidth = kind === 'region' ? 104 : 92
  // Chevauchement impossible à éviter : le nom reste accessible au survol.
  const pos = place(center, name, fontSize, maxWidth)
  if (!pos) return
  L.marker(center, {
    icon: areaLabelIcon(name, kind, fontSize, maxWidth, pos.dx, pos.dy),
    interactive: false,
    keyboard: false,
    zIndexOffset: -200,
  }).addTo(group)
}

type Level = 'regions' | 'depts' | 'cities'

/** Cadre géographique simple (pas d'objet Leaflet dans l'état React). */
type Box = { south: number; west: number; north: number; east: number }

interface Commune {
  nom: string
  lat: number
  lon: number
  population: number
}

/** Étiquette « contour » du nom de ville — décalable (dx/dy) en cas de chevauchement. */
function cityLabelIcon(name: string, selected: boolean, size: number, dx = 0, dy = 0): L.DivIcon {
  const safe = String(name).replace(/</g, '&lt;')
  const shift = dx || dy ? `transform:translate(${dx}px,${dy}px)` : ''
  return L.divIcon({
    className: 'city-outline-label',
    html: `<span class="city-shift" style="${shift}"><span class="city-dot" aria-hidden="true"></span><span class="city-name${selected ? ' sel' : ''}" style="font-size:${size}px">${safe}</span></span>`,
    iconSize: undefined,
    iconAnchor: [0, 0],
  })
}

/** Taille du nom selon la population (villages plus petits pour en caser davantage). */
function labelSize(pop: number): number {
  if (pop >= 300000) return 15
  if (pop >= 80000) return 13
  if (pop >= 20000) return 12
  if (pop >= 2000) return 11
  return 10
}

/** Écart minimal exigé entre deux noms de villes (spec : 5 px). */
const LABEL_GAP = 5

/**
 * Placement des libellés (spec) :
 *  - écart minimal de 5 px entre deux noms ;
 *  - en cas de chevauchement, l'étiquette est DÉCALÉE (quelques pixels autour du
 *    point) au lieu d'être masquée → les villes ET les villages restent visibles ;
 *  - les plus grandes villes choisissent leur place en premier.
 */
export type PlacedLabel = { commune: Commune; dx: number; dy: number }

function placeLabels(cities: Commune[], map: L.Map, pinned?: Commune | null): PlacedLabel[] {
  const bounds = map.getBounds().pad(0.12)
  const candidates = cities.filter((c) => bounds.contains([c.lat, c.lon]))
  candidates.sort((a, b) => b.population - a.population)

  const placed: { x: number; y: number; w: number; h: number }[] = []
  const out: PlacedLabel[] = []

  /** Rectangle occupé par une étiquette décalée de (dx, dy) autour du point p. */
  const rectAt = (p: L.Point, w: number, h: number, dx: number, dy: number) => ({
    x: p.x + dx - w / 2,
    y: p.y + dy - h / 2,
    w,
    h,
  })

  const collides = (r: { x: number; y: number; w: number; h: number }) =>
    placed.some(
      (o) =>
        r.x < o.x + o.w + LABEL_GAP &&
        r.x + r.w + LABEL_GAP > o.x &&
        r.y < o.y + o.h + LABEL_GAP &&
        r.y + r.h + LABEL_GAP > o.y,
    )

  for (const c of candidates) {
    const p = map.latLngToContainerPoint([c.lat, c.lon])
    const size = labelSize(c.population)
    const h = size + 3
    // Pastille 7 px + 4 px d'écart + nom (voir globals.css)
    const w = Math.max(14, c.nom.length * size * 0.58) + 13
    // Positions essayées, de la plus proche à la plus éloignée : on ne « saute »
    // que de quelques pixels pour que le nom reste attaché à sa ville.
    const offsets: [number, number][] = [
      [0, 0],
      [0, -h - LABEL_GAP],
      [0, h + LABEL_GAP],
      [w / 2 + LABEL_GAP, -h / 2],
      [-(w / 2 + LABEL_GAP), -h / 2],
      [w / 2 + LABEL_GAP, h / 2],
      [-(w / 2 + LABEL_GAP), h / 2],
      [0, -2 * (h + LABEL_GAP)],
      [0, 2 * (h + LABEL_GAP)],
      [w + LABEL_GAP, 0],
      [-(w + LABEL_GAP), 0],
      [w / 2 + LABEL_GAP, -h - LABEL_GAP],
      [-(w / 2 + LABEL_GAP), -h - LABEL_GAP],
      [w / 2 + LABEL_GAP, h + LABEL_GAP],
      [-(w / 2 + LABEL_GAP), h + LABEL_GAP],
      [0, 3 * (h + LABEL_GAP)],
      [0, -3 * (h + LABEL_GAP)],
    ]
    let best: { dx: number; dy: number } | null = null
    for (const [dx, dy] of offsets) {
      if (!collides(rectAt(p, w, h, dx, dy))) {
        best = { dx, dy }
        break
      }
    }
    if (best) {
      placed.push(rectAt(p, w, h, best.dx, best.dy))
      out.push({ commune: c, dx: best.dx, dy: best.dy })
    }
  }

  // La ville sélectionnée reste toujours visible, même si elle chevauche.
  if (pinned && !out.some((l) => l.commune.nom === pinned.nom)) {
    out.push({ commune: pinned, dx: 0, dy: 0 })
  }
  return out
}

/** Recentre la carte quand le cadre change. */
function FitBox({ box }: { box: Box | null }) {
  const map = useMap()
  const key = box ? `${box.south},${box.west},${box.north},${box.east}` : ''
  useEffect(() => {
    if (!box) return
    try {
      map.fitBounds(L.latLngBounds([box.south, box.west], [box.north, box.east]), {
        padding: [12, 12],
        maxZoom: 12,
      })
    } catch {
      /* cadre invalide : on ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map])
  return null
}

/** Carte régions → départements → villes avec bouton Valider. */
export function RegionsMapInner() {
  const { t } = useLang()
  const mapRef = useRef<L.Map | null>(null)
  const layersRef = useRef<L.LayerGroup | null>(null)
  const cityLayerRef = useRef<L.LayerGroup | null>(null)
  const [level, setLevel] = useState<Level>('regions')
  const [regionSel, setRegionSel] = useState<{ code: string; name: string } | null>(null)
  const [deptSel, setDeptSel] = useState<{ code: string; name: string } | null>(null)
  const [citySel, setCitySel] = useState<Commune | null>(null)
  const [box, setBox] = useState<Box | null>(null)
  const [geo, setGeo] = useState<{
    regions: GeoJSON.FeatureCollection | null
    depts: GeoJSON.FeatureCollection | null
  }>({ regions: null, depts: null })
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [communes, setCommunes] = useState<Commune[]>([])
  const [mapError, setMapError] = useState<string | null>(null)
  // Animation de confirmation après « Valider » (spec)
  const [celebrate, setCelebrate] = useState<string | null>(null)
  const celebrateTimer = useRef<number | null>(null)

  const fireCelebration = useCallback((label: string) => {
    setCelebrate(label)
    if (celebrateTimer.current) window.clearTimeout(celebrateTimer.current)
    celebrateTimer.current = window.setTimeout(() => setCelebrate(null), 2200)
  }, [])

  useEffect(
    () => () => {
      if (celebrateTimer.current) window.clearTimeout(celebrateTimer.current)
    },
    [],
  )

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
        if (!regions || !depts) setError(true)
        else setGeo({ regions, depts })
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

  /**
   * Dessine les villes ET villages — uniquement au niveau « département »
   * (spec : aucune ville en vue France ni en vue région).
   */
  const drawCities = useCallback(() => {
    const map = mapRef.current
    const group = cityLayerRef.current
    if (!map || !group) return
    try {
      group.clearLayers()
      if (level !== 'cities' || communes.length === 0) return
      const visible = placeLabels(communes, map, citySel)
      for (const { commune: c, dx, dy } of visible) {
        const m = L.marker([c.lat, c.lon], {
          icon: cityLabelIcon(c.nom, citySel?.nom === c.nom, labelSize(c.population), dx, dy),
          keyboard: true,
          title: c.nom,
          alt: c.nom,
        })
        m.on('click', () => setCitySel(c))
        m.addTo(group)
      }
    } catch (err) {
      console.error('[FranceMap] villes', err)
    }
  }, [communes, citySel, level])

  // Rendu des couches selon le niveau — protégé : une erreur Leaflet ne casse pas la page
  useEffect(() => {
    const map = mapRef.current
    if (!map || !geo.regions || !geo.depts) return
    try {
      if (layersRef.current) {
        layersRef.current.remove()
        layersRef.current = null
      }
      cityLayerRef.current = null
      const group = L.layerGroup().addTo(map)
      layersRef.current = group

      // Carte VIERGE : aucun fond satellite ni plan de rues, juste les contours
      // administratifs sur fond uni (spec).
      const style = (active: boolean): L.PathOptions => ({
        color: active ? '#6d28d9' : '#7c3aed',
        weight: active ? 2.5 : 1.2,
        fillColor: active ? '#ede9fe' : '#ffffff',
        fillOpacity: 1,
        dashArray: undefined,
      })

      /** Survol : la zone cliquable se teinte légèrement. */
      const hoverIn = (e: L.LeafletMouseEvent) => {
        const layer = e.target as L.Path
        layer.setStyle({ fillColor: '#ede9fe', color: '#6d28d9', weight: 2 })
        layer.bringToFront()
      }
      const hoverOut = (e: L.LeafletMouseEvent) => {
        const layer = e.target as L.Path
        layer.setStyle(style(false))
      }

      const boxOf = (layer: unknown): Box | null => {
        try {
          const b = (layer as { getBounds?: () => L.LatLngBounds }).getBounds?.()
          if (!b) return null
          return {
            south: b.getSouth(),
            west: b.getWest(),
            north: b.getNorth(),
            east: b.getEast(),
          }
        } catch {
          return null
        }
      }

      // Calque des noms de régions / départements (affichés en permanence).
      const areaLabels = L.layerGroup().addTo(group)
      const placeArea: LabelPlacer = createLabelPlacer(map)

      if (level === 'regions') {
        L.geoJSON(sortedFeatures(geo.regions, (code) => METRO_REGIONS.has(code)), {
          style: () => style(false),
          onEachFeature: (feature, layer) => {
            const code = String(feature.properties?.code ?? '')
            const name = String(feature.properties?.nom ?? '')
            layer.bindTooltip(name, { sticky: true, direction: 'top', className: 'region-tooltip' })
            addAreaLabel(areaLabels, layer, name, 'region', placeArea)
            layer.on('mouseover', hoverIn)
            layer.on('mouseout', hoverOut)
            layer.on('click', () => {
              setRegionSel({ code, name })
              setDeptSel(null)
              setCitySel(null)
              setLevel('depts')
              setBox(boxOf(layer))
            })
          },
        }).addTo(group)
      } else if (level === 'depts' && regionSel) {
        L.geoJSON(sortedFeatures(geo.depts, (code) => DEPT_TO_REGION[code] === regionSel.code), {
          style: () => style(false),
          onEachFeature: (feature, layer) => {
            const code = String(feature.properties?.code ?? '')
            const name = String(feature.properties?.nom ?? '')
            layer.bindTooltip(name, { sticky: true, direction: 'top', className: 'region-tooltip' })
            addAreaLabel(areaLabels, layer, name, 'dept', placeArea)
            layer.on('mouseover', hoverIn)
            layer.on('mouseout', hoverOut)
            layer.on('click', () => {
              setDeptSel({ code, name })
              setCitySel(null)
              setLevel('cities')
              // Le cadrage est assuré par <FitBox> (déclenché par le nouveau cadre).
              const b = boxOf(layer)
              setBox(b)
              setCommunes([])
              // Toutes les villes du département : liste statique + API officielle,
              // fusionnées et triées par population décroissante.
              const merged = new Map<string, Commune>()
              for (const [nom, lat, lon, pop, dep] of TOP_CITIES) {
                if (dep === code) merged.set(nom.toLowerCase(), { nom, lat, lon, population: pop })
              }
              fetch(
                `https://geo.api.gouv.fr/departements/${code}/communes?fields=nom,centre,population`,
              )
                .then((r) => (r.ok ? r.json() : null))
                .then((data) =>
                  // Repli : l'ancien endpoint limité à 100 communes
                  data && Array.isArray(data)
                    ? data
                    : fetch(
                        `https://geo.api.gouv.fr/communes?codeDepartement=${code}&fields=nom,centre,population&limit=100`,
                      ).then((r) => (r.ok ? r.json() : []))
                )
                .then((data: unknown) => {
                  if (Array.isArray(data)) {
                    for (const c of data) {
                      const cc = c as {
                        nom?: string
                        centre?: { coordinates?: [number, number] }
                        population?: number
                      }
                      const key = (cc.nom ?? '').toLowerCase()
                      const lon2 = cc.centre?.coordinates?.[0]
                      const lat2 = cc.centre?.coordinates?.[1]
                      if (!key || typeof lat2 !== 'number' || typeof lon2 !== 'number') continue
                      if (!merged.has(key)) {
                        merged.set(key, { nom: cc.nom!, lat: lat2, lon: lon2, population: cc.population ?? 0 })
                      }
                    }
                  }
                  setCommunes([...merged.values()].sort((a, b2) => b2.population - a.population))
                })
                .catch(() =>
                  setCommunes([...merged.values()].sort((a, b2) => b2.population - a.population)),
                )
            })
          },
        }).addTo(group)
      } else if (level === 'cities' && deptSel) {
        // Fond : le département sélectionné
        L.geoJSON(geo.depts, {
          filter: (f) => String(f.properties?.code ?? '') === deptSel.code,
          style: () => style(true),
        }).addTo(group)
      }

      // Couche villes : présente à tous les niveaux, redessinée à chaque zoom
      {
        const cityGroup = L.layerGroup().addTo(group)
        cityLayerRef.current = cityGroup
      }
      setMapError(null)
    } catch (err) {
      console.error('[FranceMap]', err)
      setMapError(t('map_error'))
    }

    return () => {
      try {
        layersRef.current?.remove()
        layersRef.current = null
        cityLayerRef.current = null
      } catch {
        /* déjà retiré */
      }
    }
  }, [geo, level, regionSel, deptSel])

  // (Re)dessin des villes dès qu'elles changent + à chaque zoom/déplacement
  useEffect(() => {
    const map = mapRef.current
    if (!map || !geo.depts) return
    drawCities()
    const onChange = () => drawCities()
    map.on('zoomend', onChange)
    map.on('moveend', onChange)
    return () => {
      map.off('zoomend', onChange)
      map.off('moveend', onChange)
    }
  }, [level, drawCities, communes, geo])

  const goRegions = useCallback(() => {
    setLevel('regions')
    setRegionSel(null)
    setDeptSel(null)
    setCitySel(null)
    setBox(null)
    setCommunes([])
    try {
      mapRef.current?.fitBounds(L.latLngBounds(FRANCE_BOUNDS as [number, number][]), {
        padding: [8, 8],
      })
    } catch {
      /* carte pas prête */
    }
  }, [])

  const goDepts = useCallback(() => {
    if (!regionSel) return
    setLevel('depts')
    setDeptSel(null)
    setCitySel(null)
    setCommunes([])
  }, [regionSel])

  const validate = () => {
    if (level === 'cities' && citySel) {
      setFilter({ type: 'city', name: citySel.nom, lat: citySel.lat, lon: citySel.lon })
      fireCelebration(citySel.nom)
      toast.success(t('map_validated'), `${citySel.nom} — ${t('map_validated_desc')}`)
      return
    }
    if (!box) return
    const bbox: BBox = {
      minLat: box.south,
      maxLat: box.north,
      minLon: box.west,
      maxLon: box.east,
    }
    if (level === 'depts' && regionSel) {
      setFilter({ type: 'region', name: regionSel.name, bbox })
      fireCelebration(regionSel.name)
      toast.success(t('map_validated'), `${regionSel.name} — ${t('map_validated_desc')}`)
    } else if (level === 'cities' && deptSel) {
      setFilter({ type: 'dept', name: deptSel.name, bbox })
      fireCelebration(deptSel.name)
      toast.success(t('map_validated'), `${deptSel.name} — ${t('map_validated_desc')}`)
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
      ? t('map_pick_region')
      : level === 'depts'
        ? `${regionSel?.name} — ${t('map_pick_dept')}`
        : `${deptSel?.name} — ${t('map_pick_city')}`

  const canValidate = level === 'cities' ? !!citySel || !!box : !!box

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-fg-muted">
          <Crosshair className="h-4 w-4 text-primary-600" aria-hidden />
          {title}
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {level !== 'regions' && (
            <Button variant="outline" size="sm" onClick={level === 'cities' ? goDepts : goRegions}>
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              {level === 'cities' ? t('map_depts') : t('map_regions')}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={useGps}>
            <Crosshair className="h-3.5 w-3.5" aria-hidden /> GPS
          </Button>
          <Button
            size="sm"
            disabled={!canValidate}
            onClick={validate}
            className={cn(
              'transition-transform',
              celebrate && 'scale-105 bg-success-600 from-success-600 via-success-600 to-success-600 shadow-glow',
            )}
          >
            <Check
              className={cn('h-3.5 w-3.5', celebrate && 'animate-[validate-pop_.5s_ease-out]')}
              aria-hidden
            />
            {celebrate ? t('map_validated_btn') : t('map_validate')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clear()
              goRegions()
            }}
            aria-label={t('map_clear')}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      </div>

      <div
        className={cn(
          'relative h-80 overflow-hidden rounded-xl border border-border transition-colors sm:h-96',
          celebrate && 'validate-flash border-success-500',
        )}
      >
        {loading && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-bg/70">
            <Loader2 className="h-7 w-7 animate-spin text-primary-600" aria-label="Chargement de la carte" />
          </div>
        )}
        {error ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
            <p className="text-sm text-fg-muted">{t('map_load_error')}</p>
            <Button size="sm" onClick={() => window.location.reload()}>
              {t('map_retry')}
            </Button>
          </div>
        ) : (
          <MapContainer
            bounds={FRANCE_BOUNDS}
            scrollWheelZoom
            attributionControl={false}
            zoomControl={false}
            className="map-blank h-full w-full"
            ref={(m) => {
              mapRef.current = m ?? null
            }}
          >
            {/* Carte vierge : aucun fond satellite ni plan de rues (spec) */}
            <FitBox box={box} />
          </MapContainer>
        )}
        {mapError && (
          <div className="absolute inset-x-2 bottom-2 z-[1000] rounded-lg bg-danger-500/90 px-3 py-2 text-center text-xs font-semibold text-white">
            {mapError}
          </div>
        )}

        {/* Confirmation animée du « Valider » (spec) */}
        {celebrate && (
          <div
            className="pointer-events-none absolute inset-0 z-[1100] flex items-center justify-center overflow-hidden"
            role="status"
            aria-live="polite"
          >
            <span className="validate-ripple absolute h-32 w-32 rounded-full" aria-hidden />
            <span className="validate-ripple absolute h-32 w-32 rounded-full [animation-delay:.35s]" aria-hidden />
            <span className="validate-badge">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/25">
                <Check className="h-4 w-4" strokeWidth={3.5} aria-hidden />
              </span>
              <span className="min-w-0 truncate">{celebrate}</span>
            </span>
          </div>
        )}
      </div>

      <p className="mt-1.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-[11px] text-fg-muted">
        <span>
          {level === 'regions'
            ? t('map_lvl_regions')
            : level === 'depts'
              ? t('map_lvl_depts')
              : t('map_lvl_cities')}
        </span>
        <span aria-hidden>·</span>
        <span>{t('map_hint')}</span>
      </p>
    </div>
  )
}
