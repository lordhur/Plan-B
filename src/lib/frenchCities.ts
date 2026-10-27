/**
 * Villes de France (nom, coordonnées, population, département) — 224 entrées.
 * Sert au géocodage local (pages, groupes, filtres) sans appel réseau :
 * la recherche par nom de ville fonctionne même hors ligne.
 */
export type FrenchCity = { name: string; lat: number; lon: number; pop: number; dept: string }

export const FRENCH_CITIES: FrenchCity[] = [
  { name: 'Paris', lat: 48.8566, lon: 2.3522, pop: 2102650, dept: '75' },
  { name: 'Marseille', lat: 43.2965, lon: 5.3698, pop: 873076, dept: '13' },
  { name: 'Lyon', lat: 45.764, lon: 4.8357, pop: 522969, dept: '69' },
  { name: 'Toulouse', lat: 43.6047, lon: 1.4442, pop: 498003, dept: '31' },
  { name: 'Nice', lat: 43.7102, lon: 7.262, pop: 342295, dept: '06' },
  { name: 'Nantes', lat: 47.2184, lon: -1.5536, pop: 320732, dept: '44' },
  { name: 'Montpellier', lat: 43.6108, lon: 3.8767, pop: 302454, dept: '34' },
  { name: 'Strasbourg', lat: 48.5734, lon: 7.7521, pop: 287228, dept: '67' },
  { name: 'Bordeaux', lat: 44.8378, lon: -0.5792, pop: 259809, dept: '33' },
  { name: 'Lille', lat: 50.6292, lon: 3.0573, pop: 236234, dept: '59' },
  { name: 'Rennes', lat: 48.1173, lon: -1.6778, pop: 225081, dept: '35' },
  { name: 'Reims', lat: 49.2583, lon: 4.0317, pop: 182211, dept: '51' },
  { name: 'Saint-Étienne', lat: 45.4397, lon: 4.3872, pop: 173821, dept: '42' },
  { name: 'Le Havre', lat: 49.4944, lon: 0.1079, pop: 165830, dept: '76' },
  { name: 'Toulon', lat: 43.1242, lon: 5.928, pop: 168701, dept: '83' },
  { name: 'Grenoble', lat: 45.1885, lon: 5.7245, pop: 156389, dept: '38' },
  { name: 'Dijon', lat: 47.322, lon: 5.0415, pop: 158002, dept: '21' },
  { name: 'Angers', lat: 47.4784, lon: -0.5632, pop: 155876, dept: '49' },
  { name: 'Nîmes', lat: 43.8367, lon: 4.3601, pop: 151001, dept: '30' },
  { name: 'Villeurbanne', lat: 45.7719, lon: 4.8902, pop: 155027, dept: '69' },
  { name: 'Clermont-Ferrand', lat: 45.7772, lon: 3.087, pop: 147751, dept: '63' },
  { name: 'Aix-en-Provence', lat: 43.5297, lon: 5.4474, pop: 147122, dept: '13' },
  { name: 'Le Mans', lat: 48.0061, lon: 0.1996, pop: 146105, dept: '72' },
  { name: 'Brest', lat: 48.3904, lon: -4.4861, pop: 142722, dept: '29' },
  { name: 'Tours', lat: 47.3941, lon: 0.6848, pop: 138659, dept: '37' },
  { name: 'Amiens', lat: 49.8985, lon: 2.2958, pop: 135501, dept: '80' },
  { name: 'Limoges', lat: 45.8336, lon: 1.2611, pop: 130879, dept: '87' },
  { name: 'Annecy', lat: 45.8992, lon: 6.1294, pop: 131715, dept: '74' },
  { name: 'Perpignan', lat: 42.6887, lon: 2.8948, pop: 121875, dept: '66' },
  { name: 'Boulogne-Billancourt', lat: 48.8352, lon: 2.2413, pop: 120071, dept: '92' },
  { name: 'Metz', lat: 49.1193, lon: 6.1757, pop: 125728, dept: '57' },
  { name: 'Besançon', lat: 47.2378, lon: 6.0241, pop: 119955, dept: '25' },
  { name: 'Orléans', lat: 47.9029, lon: 1.9093, pop: 116685, dept: '45' },
  { name: 'Saint-Denis', lat: 48.9362, lon: 2.3574, pop: 113116, dept: '93' },
  { name: 'Rouen', lat: 49.4432, lon: 1.0999, pop: 114000, dept: '76' },
  { name: 'Mulhouse', lat: 47.7508, lon: 7.3359, pop: 108312, dept: '68' },
  { name: 'Caen', lat: 49.1829, lon: -0.3707, pop: 108793, dept: '14' },
  { name: 'Argenteuil', lat: 48.9472, lon: 2.2467, pop: 110388, dept: '95' },
  { name: 'Nancy', lat: 48.6921, lon: 6.1844, pop: 105334, dept: '54' },
  { name: 'Montreuil', lat: 48.8638, lon: 2.4485, pop: 109897, dept: '93' },
  { name: 'Roubaix', lat: 50.6942, lon: 3.1746, pop: 98828, dept: '59' },
  { name: 'Tourcoing', lat: 50.7239, lon: 3.1612, pop: 99160, dept: '59' },
  { name: 'Avignon', lat: 43.9493, lon: 4.8055, pop: 91921, dept: '84' },
  { name: 'Poitiers', lat: 46.5802, lon: 0.3404, pop: 90033, dept: '86' },
  { name: 'Versailles', lat: 48.8014, lon: 2.1301, pop: 85862, dept: '78' },
  { name: 'Pau', lat: 43.2951, lon: -0.3707, pop: 77130, dept: '64' },
  { name: 'La Rochelle', lat: 46.1603, lon: -1.1511, pop: 79961, dept: '17' },
  { name: 'Calais', lat: 50.9513, lon: 1.8587, pop: 73911, dept: '62' },
  { name: 'Colmar', lat: 48.0794, lon: 7.3585, pop: 69105, dept: '68' },
  { name: 'Bayonne', lat: 43.4933, lon: -1.4748, pop: 53399, dept: '64' },
  { name: 'Ajaccio', lat: 41.9192, lon: 8.7386, pop: 70659, dept: '2A' },
  { name: 'Bastia', lat: 42.6977, lon: 9.4509, pop: 48558, dept: '2B' },
  { name: 'Chambéry', lat: 45.5646, lon: 5.9178, pop: 60299, dept: '73' },
  { name: 'Vannes', lat: 47.6582, lon: -2.7608, pop: 55023, dept: '56' },
  { name: 'Lorient', lat: 47.7483, lon: -3.37, pop: 58304, dept: '56' },
  { name: 'Quimper', lat: 47.996, lon: -4.0978, pop: 64900, dept: '29' },
  { name: 'Saint-Brieuc', lat: 48.5136, lon: -2.7653, pop: 46388, dept: '22' },
  { name: 'Saint-Malo', lat: 48.6493, lon: -2.0257, pop: 47255, dept: '35' },
  { name: 'Laval', lat: 48.0737, lon: -0.7736, pop: 50220, dept: '53' },
  { name: 'Niort', lat: 46.3239, lon: -0.4628, pop: 59059, dept: '79' },
  { name: 'Angoulême', lat: 45.6484, lon: 0.1562, pop: 41740, dept: '16' },
  { name: 'La Roche-sur-Yon', lat: 46.6705, lon: -1.426, pop: 55422, dept: '85' },
  { name: 'Bourg-en-Bresse', lat: 46.2044, lon: 5.2286, pop: 41652, dept: '01' },
  { name: 'Valence', lat: 44.9334, lon: 4.8916, pop: 63189, dept: '26' },
  { name: 'Gap', lat: 44.559, lon: 6.0795, pop: 40895, dept: '05' },
  { name: 'Digne-les-Bains', lat: 44.0923, lon: 6.2357, pop: 17455, dept: '04' },
  { name: 'Privas', lat: 44.735, lon: 4.599, pop: 8465, dept: '07' },
  { name: 'Rodez', lat: 44.3506, lon: 2.5738, pop: 24262, dept: '12' },
  { name: 'Cahors', lat: 44.4475, lon: 1.44, pop: 12355, dept: '46' },
  { name: 'Agen', lat: 44.203, lon: 0.6167, pop: 33576, dept: '47' },
  { name: 'Montauban', lat: 44.0175, lon: 1.355, pop: 61372, dept: '82' },
  { name: 'Albi', lat: 43.9297, lon: 2.148, pop: 49234, dept: '81' },
  { name: 'Carcassonne', lat: 43.213, lon: 2.3491, pop: 47834, dept: '11' },
  { name: 'Foix', lat: 42.9639, lon: 1.6053, pop: 9692, dept: '09' },
  { name: 'Auch', lat: 43.646, lon: 0.586, pop: 21935, dept: '32' },
  { name: 'Tarbes', lat: 43.2333, lon: 0.0783, pop: 42758, dept: '65' },
  { name: 'Mende', lat: 44.518, lon: 3.5013, pop: 12296, dept: '48' },
  { name: 'Le Puy-en-Velay', lat: 45.0428, lon: 3.8829, pop: 19089, dept: '43' },
  { name: 'Aurillac', lat: 44.9261, lon: 2.4406, pop: 26032, dept: '15' },
  { name: 'Guéret', lat: 46.1717, lon: 1.8717, pop: 13266, dept: '23' },
  { name: 'Tulle', lat: 45.2667, lon: 1.7717, pop: 14836, dept: '19' },
  { name: 'Brive-la-Gaillarde', lat: 45.1583, lon: 1.5317, pop: 46916, dept: '19' },
  { name: 'Périgueux', lat: 45.1846, lon: 0.7181, pop: 29896, dept: '24' },
  { name: 'Bergerac', lat: 44.852, lon: 0.4819, pop: 26833, dept: '24' },
  { name: 'Dax', lat: 43.71, lon: -1.0528, pop: 21620, dept: '40' },
  { name: 'Mont-de-Marsan', lat: 43.893, lon: -0.5, pop: 31455, dept: '40' },
  { name: 'Arcachon', lat: 44.6583, lon: -1.1689, pop: 11278, dept: '33' },
  { name: 'Libourne', lat: 44.9156, lon: -0.2417, pop: 24668, dept: '33' },
  { name: 'Saintes', lat: 45.745, lon: -0.6333, pop: 25874, dept: '17' },
  { name: 'Rochefort', lat: 45.9414, lon: -0.9592, pop: 24014, dept: '17' },
  { name: 'Cognac', lat: 45.6956, lon: -0.3289, pop: 18643, dept: '16' },
  { name: 'Châtellerault', lat: 46.8172, lon: 0.5464, pop: 31483, dept: '86' },
  { name: 'Châteauroux', lat: 46.8103, lon: 1.6913, pop: 43741, dept: '36' },
  { name: 'Bourges', lat: 47.081, lon: 2.3988, pop: 64238, dept: '18' },
  { name: 'Nevers', lat: 46.9896, lon: 3.1628, pop: 32990, dept: '58' },
  { name: 'Auxerre', lat: 47.798, lon: 3.5672, pop: 34799, dept: '89' },
  { name: 'Sens', lat: 48.1975, lon: 3.2878, pop: 26688, dept: '89' },
  { name: 'Troyes', lat: 48.2973, lon: 4.0744, pop: 61957, dept: '10' },
  { name: 'Chaumont', lat: 48.1117, lon: 5.1389, pop: 22705, dept: '52' },
  { name: 'Bar-le-Duc', lat: 48.7728, lon: 5.1611, pop: 15538, dept: '55' },
  { name: 'Verdun', lat: 49.1597, lon: 5.3828, pop: 16942, dept: '55' },
  { name: 'Thionville', lat: 49.3589, lon: 6.1686, pop: 40701, dept: '57' },
  { name: 'Forbach', lat: 49.19, lon: 6.9, pop: 21552, dept: '57' },
  { name: 'Épinal', lat: 48.1744, lon: 6.4497, pop: 32078, dept: '88' },
  { name: 'Belfort', lat: 47.638, lon: 6.8628, pop: 46454, dept: '90' },
  { name: 'Vesoul', lat: 47.6214, lon: 6.1542, pop: 15223, dept: '70' },
  { name: 'Lons-le-Saunier', lat: 46.6758, lon: 5.5528, pop: 17393, dept: '39' },
  { name: 'Dole', lat: 47.0931, lon: 5.4906, pop: 23708, dept: '39' },
  { name: 'Chalon-sur-Saône', lat: 46.7831, lon: 4.8558, pop: 45096, dept: '71' },
  { name: 'Mâcon', lat: 46.3067, lon: 4.8317, pop: 33638, dept: '71' },
  { name: 'Roanne', lat: 46.0367, lon: 4.0689, pop: 35349, dept: '42' },
  { name: 'Vichy', lat: 46.1278, lon: 3.4267, pop: 25702, dept: '03' },
  { name: 'Moulins', lat: 46.5642, lon: 3.3325, pop: 19715, dept: '03' },
  { name: 'Montluçon', lat: 46.3408, lon: 2.6031, pop: 36717, dept: '03' },
  { name: 'Vienne', lat: 45.5242, lon: 4.8781, pop: 30306, dept: '38' },
  { name: 'Bourgoin-Jallieu', lat: 45.5861, lon: 5.2736, pop: 28587, dept: '38' },
  { name: 'Montélimar', lat: 44.5581, lon: 4.7508, pop: 40356, dept: '26' },
  { name: 'Briançon', lat: 44.8967, lon: 6.6353, pop: 11604, dept: '05' },
  { name: 'Arles', lat: 43.6769, lon: 4.6278, pop: 50434, dept: '13' },
  { name: 'Martigues', lat: 43.4053, lon: 5.0475, pop: 48188, dept: '13' },
  { name: 'Aubagne', lat: 43.2936, lon: 5.5711, pop: 47535, dept: '13' },
  { name: 'Salon-de-Provence', lat: 43.6406, lon: 5.0972, pop: 44980, dept: '13' },
  { name: 'Fréjus', lat: 43.4331, lon: 6.7372, pop: 55750, dept: '83' },
  { name: 'Draguignan', lat: 43.5369, lon: 6.4644, pop: 40440, dept: '83' },
  { name: 'Hyères', lat: 43.1205, lon: 6.13, pop: 55589, dept: '83' },
  { name: 'Cannes', lat: 43.5528, lon: 7.0174, pop: 73868, dept: '06' },
  { name: 'Antibes', lat: 43.5804, lon: 7.1251, pop: 75538, dept: '06' },
  { name: 'Menton', lat: 43.7764, lon: 7.5028, pop: 29073, dept: '06' },
  { name: 'Grasse', lat: 43.6592, lon: 6.925, pop: 48822, dept: '06' },
  { name: 'Sète', lat: 43.402, lon: 3.6964, pop: 44712, dept: '34' },
  { name: 'Béziers', lat: 43.3442, lon: 3.2158, pop: 80815, dept: '34' },
  { name: 'Narbonne', lat: 43.1839, lon: 3.0036, pop: 55576, dept: '11' },
  { name: 'Alès', lat: 44.1281, lon: 4.0817, pop: 44223, dept: '30' },
  { name: 'Castres', lat: 43.6056, lon: 2.2397, pop: 42700, dept: '81' },
  { name: 'Lunel', lat: 43.6778, lon: 4.1361, pop: 26380, dept: '34' },
  { name: 'Carpentras', lat: 44.0558, lon: 5.0489, pop: 28989, dept: '84' },
  { name: 'Orange', lat: 44.1381, lon: 4.8075, pop: 28919, dept: '84' },
  { name: 'Sisteron', lat: 44.1969, lon: 5.9431, pop: 7506, dept: '04' },
  { name: 'Barcelonnette', lat: 44.3867, lon: 6.6517, pop: 2591, dept: '04' },
  { name: 'Castellane', lat: 43.8472, lon: 6.5128, pop: 1508, dept: '04' },
  { name: 'Embrun', lat: 44.5636, lon: 6.4953, pop: 6188, dept: '05' },
  { name: 'Romans-sur-Isère', lat: 45.0464, lon: 5.0517, pop: 33139, dept: '26' },
  { name: 'Thonon-les-Bains', lat: 46.3706, lon: 6.4797, pop: 34756, dept: '74' },
  { name: 'Chamonix-Mont-Blanc', lat: 45.9237, lon: 6.8694, pop: 8612, dept: '74' },
  { name: 'Aix-les-Bains', lat: 45.6886, lon: 5.915, pop: 30463, dept: '73' },
  { name: 'Albertville', lat: 45.6758, lon: 6.3928, pop: 19295, dept: '73' },
  { name: 'Gex', lat: 46.3333, lon: 6.0583, pop: 13455, dept: '01' },
  { name: 'Belley', lat: 45.7583, lon: 5.6881, pop: 9133, dept: '01' },
  { name: 'Nantua', lat: 46.1528, lon: 5.6064, pop: 3431, dept: '01' },
  { name: 'Saint-Claude', lat: 46.3872, lon: 5.8631, pop: 9103, dept: '39' },
  { name: 'Pontarlier', lat: 46.9061, lon: 6.3547, pop: 17928, dept: '25' },
  { name: 'Morteau', lat: 47.0547, lon: 6.6028, pop: 6850, dept: '25' },
  { name: 'Saint-Dié-des-Vosges', lat: 48.2842, lon: 6.9492, pop: 19593, dept: '88' },
  { name: 'Gérardmer', lat: 48.0708, lon: 6.8739, pop: 8145, dept: '88' },
  { name: 'Sarrebourg', lat: 48.7353, lon: 7.0564, pop: 12161, dept: '57' },
  { name: 'Sarreguemines', lat: 49.11, lon: 7.07, pop: 20783, dept: '57' },
  { name: 'Haguenau', lat: 48.8156, lon: 7.7914, pop: 35415, dept: '67' },
  { name: 'Sélestat', lat: 48.2619, lon: 7.4489, pop: 19332, dept: '67' },
  { name: 'Saint-Louis', lat: 47.5897, lon: 7.5603, pop: 22229, dept: '68' },
  { name: 'Guebwiller', lat: 47.9075, lon: 7.2125, pop: 11083, dept: '68' },
  { name: 'Langres', lat: 47.8625, lon: 5.3333, pop: 7699, dept: '52' },
  { name: 'Saint-Dizier', lat: 48.6383, lon: 5.0833, pop: 22928, dept: '52' },
  { name: 'Sedan', lat: 49.7019, lon: 4.9403, pop: 16193, dept: '08' },
  { name: 'Charleville-Mézières', lat: 49.7719, lon: 4.7161, pop: 46428, dept: '08' },
  { name: 'Châlons-en-Champagne', lat: 48.9566, lon: 4.3639, pop: 44753, dept: '51' },
  { name: 'Épernay', lat: 49.0403, lon: 3.96, pop: 22671, dept: '51' },
  { name: 'Laon', lat: 49.5647, lon: 3.6239, pop: 24876, dept: '02' },
  { name: 'Saint-Quentin', lat: 49.8478, lon: 3.2864, pop: 53816, dept: '02' },
  { name: 'Soissons', lat: 49.3817, lon: 3.3236, pop: 28530, dept: '02' },
  { name: 'Beauvais', lat: 49.4294, lon: 2.0808, pop: 56020, dept: '60' },
  { name: 'Compiègne', lat: 49.4178, lon: 2.8264, pop: 40542, dept: '60' },
  { name: 'Creil', lat: 49.2583, lon: 2.4833, pop: 35657, dept: '60' },
  { name: 'Pontoise', lat: 49.0508, lon: 2.1008, pop: 32875, dept: '95' },
  { name: 'Évreux', lat: 49.027, lon: 1.151, pop: 49461, dept: '27' },
  { name: 'Vernon', lat: 49.0919, lon: 1.4903, pop: 23702, dept: '27' },
  { name: 'Lisieux', lat: 49.15, lon: 0.2333, pop: 20318, dept: '14' },
  { name: 'Cherbourg-en-Cotentin', lat: 49.6386, lon: -1.616, pop: 44510, dept: '50' },
  { name: 'Saint-Lô', lat: 49.1164, lon: -1.09, pop: 19342, dept: '50' },
  { name: 'Granville', lat: 48.8367, lon: -1.5989, pop: 12799, dept: '50' },
  { name: 'Fougères', lat: 48.3528, lon: -1.1997, pop: 20671, dept: '35' },
  { name: 'Vitré', lat: 48.1236, lon: -1.2097, pop: 18311, dept: '35' },
  { name: 'Redon', lat: 47.6517, lon: -2.0836, pop: 9090, dept: '35' },
  { name: 'Pontivy', lat: 48.0683, lon: -2.9664, pop: 14964, dept: '56' },
  { name: 'Lannion', lat: 48.7322, lon: -3.4594, pop: 20231, dept: '22' },
  { name: 'Guingamp', lat: 48.5625, lon: -3.1514, pop: 7044, dept: '22' },
  { name: 'Dinan', lat: 48.4556, lon: -2.0417, pop: 14477, dept: '22' },
  { name: 'Morlaix', lat: 48.5783, lon: -3.8297, pop: 14837, dept: '29' },
  { name: 'Concarneau', lat: 47.8731, lon: -3.9189, pop: 19816, dept: '29' },
  { name: 'Douarnenez', lat: 48.0928, lon: -4.3303, pop: 14036, dept: '29' },
  { name: 'Carhaix-Plouguer', lat: 48.2767, lon: -3.5733, pop: 7326, dept: '29' },
  { name: 'Les Sables-d’Olonne', lat: 46.4972, lon: -1.7833, pop: 44017, dept: '85' },
  { name: 'Fontenay-le-Comte', lat: 46.4667, lon: -0.8067, pop: 13703, dept: '85' },
  { name: 'Bressuire', lat: 46.8411, lon: -0.4906, pop: 19850, dept: '79' },
  { name: 'Thouars', lat: 46.9764, lon: -0.2153, pop: 9360, dept: '79' },
  { name: 'Parthenay', lat: 46.6486, lon: -0.2469, pop: 10134, dept: '79' },
  { name: 'Royan', lat: 45.6281, lon: -1.0297, pop: 18419, dept: '17' },
  { name: 'Bellac', lat: 46.1222, lon: 1.0497, pop: 4165, dept: '87' },
  { name: 'Saint-Junien', lat: 45.8875, lon: 0.9011, pop: 11347, dept: '87' },
  { name: 'Ussel', lat: 45.5475, lon: 2.3092, pop: 9466, dept: '19' },
  { name: 'Beaune', lat: 47.025, lon: 4.8397, pop: 21031, dept: '21' },
  { name: 'Autun', lat: 46.9511, lon: 4.2986, pop: 13132, dept: '71' },
  { name: 'Thiers', lat: 45.8564, lon: 3.5478, pop: 11633, dept: '63' },
  { name: 'Riom', lat: 45.8936, lon: 3.1128, pop: 18680, dept: '63' },
  { name: 'Brioude', lat: 45.2942, lon: 3.3842, pop: 6609, dept: '43' },
  { name: 'Yssingeaux', lat: 45.1428, lon: 4.1236, pop: 7459, dept: '43' },
  { name: 'Villefranche-de-Rouergue', lat: 44.3525, lon: 2.0372, pop: 11651, dept: '12' },
  { name: 'Figeac', lat: 44.6083, lon: 2.0314, pop: 9826, dept: '46' },
  { name: 'Villeneuve-sur-Lot', lat: 44.4081, lon: 0.705, pop: 22504, dept: '47' },
  { name: 'Marmande', lat: 44.5, lon: 0.1653, pop: 17668, dept: '47' },
  { name: 'Lourdes', lat: 43.092, lon: -0.0453, pop: 13210, dept: '65' },
  { name: 'Saint-Gaudens', lat: 43.1083, lon: 0.7233, pop: 11487, dept: '31' },
  { name: 'Muret', lat: 43.4611, lon: 1.3267, pop: 25204, dept: '31' },
  { name: 'Pamiers', lat: 43.1164, lon: 1.6108, pop: 15824, dept: '09' },
  { name: 'Prades', lat: 42.6172, lon: 2.4217, pop: 6160, dept: '66' },
  { name: 'Céret', lat: 42.4883, lon: 2.7508, pop: 7620, dept: '66' },
  { name: 'Limoux', lat: 43.055, lon: 2.2172, pop: 10339, dept: '11' },
  { name: 'Lodève', lat: 43.7317, lon: 3.3194, pop: 7539, dept: '34' },
  { name: 'Langogne', lat: 44.7292, lon: 3.8553, pop: 2869, dept: '48' },
  { name: 'Annonay', lat: 45.24, lon: 4.67, pop: 16297, dept: '07' },
  { name: 'Tournon-sur-Rhône', lat: 45.0669, lon: 4.8325, pop: 10425, dept: '07' },
  { name: 'Die', lat: 44.7536, lon: 5.3703, pop: 4664, dept: '26' },
  { name: 'Nyons', lat: 44.3608, lon: 5.1408, pop: 6731, dept: '26' },
  { name: 'Forcalquier', lat: 43.96, lon: 5.7783, pop: 5080, dept: '04' },
  { name: 'Florac-Trois-Rivières', lat: 44.3264, lon: 3.5931, pop: 2120, dept: '48' },
]

/** Normalise un nom de ville pour la comparaison (accents, casse, tirets). */
export function normalizeCityName(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const CITY_INDEX = new Map<string, FrenchCity>()
for (const c of FRENCH_CITIES) {
  const key = normalizeCityName(c.name)
  if (!CITY_INDEX.has(key)) CITY_INDEX.set(key, c)
}

/** Retrouve une ville par son nom (tolère accents, casse, ponctuation). */
export function findCity(input: string | null | undefined): FrenchCity | null {
  if (!input) return null
  const key = normalizeCityName(input)
  if (!key) return null
  const direct = CITY_INDEX.get(key)
  if (direct) return direct
  // « Saint-Denis (93) », « 83000 Toulon »… : on teste les mots du libellé
  const words = key.split(' ').filter((w) => w.length > 2)
  for (const w of words) {
    const hit = CITY_INDEX.get(w)
    if (hit) return hit
  }
  return null
}

/** Coordonnées d'une ville (ou null si inconnue). */
export function cityCoords(input: string | null | undefined): { lat: number; lon: number } | null {
  const city = findCity(input)
  return city ? { lat: city.lat, lon: city.lon } : null
}

/** Liste des villes « proches » d'une saisie (autocomplétion locale). */
export function searchCities(query: string, limit = 6): FrenchCity[] {
  const q = normalizeCityName(query)
  if (q.length < 2) return []
  const starts: FrenchCity[] = []
  const contains: FrenchCity[] = []
  for (const c of FRENCH_CITIES) {
    const n = normalizeCityName(c.name)
    if (n.startsWith(q)) starts.push(c)
    else if (n.includes(q)) contains.push(c)
  }
  return [...starts, ...contains].slice(0, limit)
}
