/**
 * Jeu COMPLET d'émojis, généré à partir des plages Unicode (aucun fichier de
 * données externe, aucun appel réseau). Chaque émoji est classé dans une
 * catégorie et dispose de mots-clés français pour la recherche.
 */

export interface EmojiCategory {
  id: string
  /** Libellé français affiché dans le menu vertical. */
  label: string
  /** Icône de l'onglet vertical. */
  icon: string
}

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  { id: 'smileys', label: 'Smileys', icon: '😀' },
  { id: 'people', label: 'Personnes', icon: '👋' },
  { id: 'nature', label: 'Animaux & nature', icon: '🐶' },
  { id: 'food', label: 'Nourriture', icon: '🍕' },
  { id: 'travel', label: 'Voyages', icon: '✈️' },
  { id: 'activity', label: 'Activités', icon: '⚽' },
  { id: 'objects', label: 'Objets', icon: '💡' },
  { id: 'symbols', label: 'Symboles', icon: '💟' },
  { id: 'flags', label: 'Drapeaux', icon: '🇫🇷' },
]

type Range = [number, number]

/** Plages (incluses) pour chaque catégorie — ordre de priorité. */
const CATEGORY_RANGES: Record<string, Range[]> = {
  smileys: [
    [0x1f600, 0x1f64f],
    [0x1f910, 0x1f92f],
    [0x1f970, 0x1f976],
    [0x1f97a, 0x1f97a],
    [0x1f9d0, 0x1f9d0],
    [0x1fa70, 0x1faff],
    [0x1f480, 0x1f480],
    [0x1f4a2, 0x1f4a2],
    [0x1f4a4, 0x1f4a4],
    [0x1f4a5, 0x1f4a5],
    [0x1f4a6, 0x1f4a6],
    [0x1f4a8, 0x1f4a8],
    [0x1f4ab, 0x1f4ab],
    [0x1f4af, 0x1f4af],
    [0x1f48b, 0x1f48c],
    [0x1f493, 0x1f49f],
    [0x1f90d, 0x1f90f],
    [0x1f9e1, 0x1f9e1],
    [0x2764, 0x2764],
    [0x2639, 0x263a],
    [0x2620, 0x2620],
    [0x1f5e3, 0x1f5e3],
    [0x1fae0, 0x1fae8],
  ],
  people: [
    [0x1f440, 0x1f450],
    [0x1f464, 0x1f487],
    [0x1f930, 0x1f93a],
    [0x1f9d1, 0x1f9dd],
    [0x1f574, 0x1f575],
    [0x1f57a, 0x1f57a],
    [0x1f590, 0x1f590],
    [0x1f595, 0x1f596],
    [0x1f6b4, 0x1f6b6],
    [0x1f6c0, 0x1f6c0],
    [0x1f918, 0x1f91f],
    [0x1f9b5, 0x1f9b9],
    [0x1f9bb, 0x1f9bb],
    [0x1f9be, 0x1f9bf],
    [0x1faf0, 0x1faf8],
  ],
  nature: [
    [0x1f300, 0x1f32c],
    [0x1f400, 0x1f43f],
    [0x1f980, 0x1f9a8],
    [0x1f9ab, 0x1f9ae],
    [0x1fab0, 0x1fabe],
    [0x1f331, 0x1f343],
    [0x1f344, 0x1f344],
    [0x1f337, 0x1f337],
    [0x1f33a, 0x1f33f],
    [0x2614, 0x2614],
    [0x2600, 0x2604],
    [0x2744, 0x2744],
    [0x26a1, 0x26a1],
    [0x1f5fb, 0x1f5ff],
    [0x26f0, 0x26f0],
    [0x26f2, 0x26f5],
  ],
  food: [
    [0x1f32d, 0x1f32f],
    [0x1f345, 0x1f37f],
    [0x1f950, 0x1f96f],
    [0x1f9c0, 0x1f9ca],
    [0x1fad0, 0x1fad9],
    [0x2615, 0x2615],
    [0x1f9cb, 0x1f9cb],
  ],
  travel: [
    [0x1f680, 0x1f6a9],
    [0x1f30d, 0x1f32a],
    [0x1f3d4, 0x1f3f0],
    [0x1f6e0, 0x1f6fa],
    [0x2708, 0x2708],
    [0x26f5, 0x26f5],
    [0x26fd, 0x26fd],
    [0x1f6a2, 0x1f6a2],
    [0x1f9f3, 0x1f9f3],
    [0x231a, 0x231b],
  ],
  activity: [
    [0x1f380, 0x1f3ca],
    [0x1f3cf, 0x1f3d3],
    [0x1f93c, 0x1f94c],
    [0x1f396, 0x1f397],
    [0x26bd, 0x26be],
    [0x26f3, 0x26f3],
    [0x26f7, 0x26f8],
    [0x1f9f8, 0x1f9f8],
    [0x1f9fc, 0x1f9fc],
  ],
  objects: [
    [0x1f4a0, 0x1f4ff],
    [0x1f9e0, 0x1f9f2],
    [0x1f9f4, 0x1f9ff],
    [0x1f507, 0x1f50b],
    [0x1f50c, 0x1f5d3],
    [0x1f5d4, 0x1f5fa],
    [0x1f58a, 0x1f58f],
    [0x1f5b1, 0x1f5b2],
    [0x1f5bc, 0x1f5bc],
    [0x1f6bd, 0x1f6bf],
    [0x2328, 0x2328],
    [0x2699, 0x2699],
  ],
  symbols: [
    [0x2190, 0x21ff],
    [0x2300, 0x23ff],
    [0x2460, 0x24ff],
    [0x25a0, 0x27bf],
    [0x2900, 0x297f],
    [0x2b00, 0x2bff],
    [0x3030, 0x3030],
    [0x303d, 0x303d],
    [0x3297, 0x3297],
    [0x3299, 0x3299],
    [0x00a9, 0x00a9],
    [0x00ae, 0x00ae],
    [0x2122, 0x2122],
    [0x203c, 0x203c],
    [0x2049, 0x2049],
    [0x1f000, 0x1f0ff],
    [0x1f170, 0x1f1ad],
    [0x1f1e6, 0x1f1ff],
  ],
}

const EMOJI_PRESENTATION = /\p{Emoji_Presentation}/u
const EXTENDED_PICTOGRAPHIC = /\p{Extended_Pictographic}/u

const RANGES: Range[] = [
  [0x00a9, 0x00ae],
  [0x203c, 0x2049],
  [0x2122, 0x2122],
  [0x2190, 0x21ff],
  [0x2300, 0x23ff],
  [0x2460, 0x24ff],
  [0x25a0, 0x27bf],
  [0x2900, 0x297f],
  [0x2b00, 0x2bff],
  [0x3030, 0x3030],
  [0x303d, 0x303d],
  [0x3297, 0x3297],
  [0x3299, 0x3299],
  [0x1f000, 0x1f0ff],
  [0x1f100, 0x1f1ad],
  [0x1f200, 0x1f2ff],
  [0x1f300, 0x1f5ff],
  [0x1f600, 0x1f64f],
  [0x1f650, 0x1f67f],
  [0x1f680, 0x1f6ff],
  [0x1f700, 0x1f77f],
  [0x1f780, 0x1f7ff],
  [0x1f800, 0x1f8ff],
  [0x1f900, 0x1f9ff],
  [0x1fa70, 0x1faff],
]

/** Modificateurs de carnation : jamais affichés seuls dans le sélecteur. */
const SKIN_TONES: Range[] = [
  [0x1f3fb, 0x1f3ff],
  [0x1f9b0, 0x1f9b3],
  [0xfe00, 0xfe0f],
]

/** Indicateurs régionaux (drapeaux) : traités par paires. */
const isRegional = (cp: number) => cp >= 0x1f1e6 && cp <= 0x1f1ff
const isSkinTone = (cp: number) => SKIN_TONES.some(([a, b]) => cp >= a && cp <= b)

function categoryOf(cp: number): string {
  for (const [id, ranges] of Object.entries(CATEGORY_RANGES)) {
    if (id === 'symbols') continue
    if (ranges.some(([a, b]) => cp >= a && cp <= b)) return id
  }
  return 'symbols'
}

function pushRange(bucket: string[], from: number, to: number, seen: Set<string>) {
  for (let cp = from; cp <= to; cp++) {
    if (isRegional(cp) || isSkinTone(cp)) continue
    if (cp >= 0x1f650 && cp <= 0x1f67f) continue
    const ch = String.fromCodePoint(cp)
    if (/^[0-9#*]$/.test(ch)) continue
    const isEmoji = EMOJI_PRESENTATION.test(ch)
    if (!isEmoji && !EXTENDED_PICTOGRAPHIC.test(ch)) continue
    const char = isEmoji ? ch : `${ch}\uFE0F`
    if (seen.has(char)) continue
    seen.add(char)
    bucket.push(char)
  }
}

function buildEmojis(): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const c of EMOJI_CATEGORIES) out[c.id] = []
  const seen = new Set<string>()

  // 1) Chaque catégorie dans l'ordre de ses propres plages (les smileys
  //    commencent donc par 😀, les animaux par 🐶…).
  for (const cat of EMOJI_CATEGORIES) {
    if (cat.id === 'flags' || cat.id === 'symbols') continue
    const bucket = out[cat.id]!
    for (const [from, to] of CATEGORY_RANGES[cat.id] ?? []) pushRange(bucket, from, to, seen)
  }

  // 2) Symboles explicites, puis tout le reste (aucun émoji n'est perdu).
  const symbols = out.symbols!
  for (const [from, to] of CATEGORY_RANGES.symbols ?? []) pushRange(symbols, from, to, seen)
  for (const [from, to] of RANGES) pushRange(symbols, from, to, seen)

  // 3) Drapeaux : symboles drapeaux + toutes les paires de lettres.
  const flags: string[] = ['🏳️', '🏴', '🏁', '🚩', '🏳️‍🌈', '🏳️‍⚧️', '🏴‍☠️']
  const regions = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
  for (const a of regions) {
    for (const b of regions) flags.push(`${letterFlag(a)}${letterFlag(b)}`)
  }
  out.flags = flags

  return out
}

function letterFlag(letter: string): string {
  return String.fromCodePoint(0x1f1e6 + letter.charCodeAt(0) - 65)
}

let cache: Record<string, string[]> | null = null

/** Tous les émojis, groupés par catégorie. */
export function allEmojis(): Record<string, string[]> {
  if (!cache) cache = buildEmojis()
  return cache
}

/** Liste à plat (pour la recherche et les compteurs). */
export function emojiFlatList(): string[] {
  return EMOJI_CATEGORIES.flatMap((c) => allEmojis()[c.id] ?? [])
}

/**
 * Mots-clés français pour la recherche — couvre les émojis les plus utilisés.
 * Les autres restent accessibles par leur catégorie.
 */
export const EMOJI_KEYWORDS: Record<string, string> = {
  '😀': 'sourire joyeux heureux',
  '😃': 'sourire heureux content',
  '😄': 'rire joie content',
  '😁': 'sourire dents joie',
  '😆': 'rire fort',
  '😅': 'sueur rire gêne',
  '🤣': 'mort de rire mdr',
  '😂': 'larmes rire mdr',
  '🙂': 'sourire léger',
  '🙃': 'tête en bas ironie',
  '😉': 'clin oeil',
  '😊': 'sourire timide content',
  '😇': 'ange innocent',
  '🥰': 'amour coeurs',
  '😍': 'amour yeux coeurs',
  '🤩': 'étoiles admiration',
  '😘': 'bisou',
  '😗': 'bisou sifflet',
  '😚': 'bisou timide',
  '😙': 'bisou sourire',
  '🥲': 'larme émotion',
  '😋': 'miam gourmand',
  '😛': 'langue',
  '😜': 'langue clin oeil',
  '🤪': 'fou dingue',
  '😝': 'langue grimace',
  '🤑': 'argent dollars',
  '🤗': 'câlin',
  '🤭': 'rire main bouche',
  '🤫': 'chut silence',
  '🤔': 'réfléchit pensif',
  '🤐': 'bouche fermée',
  '🤨': 'sourcil sceptique',
  '😐': 'neutre',
  '😑': 'sans expression',
  '😶': 'sans bouche silence',
  '😏': 'sourire narquois',
  '😒': 'blasé',
  '🙄': 'yeux au ciel',
  '😬': 'grimace gêne',
  '🤥': 'mensonge',
  '😌': 'soulagé calme',
  '😔': 'triste pensif',
  '😪': 'fatigué somnolent',
  '🤤': 'bave gourmand',
  '😴': 'dort dormir',
  '😷': 'masque malade',
  '🤒': 'fièvre malade',
  '🤕': 'blessé pansement',
  '🤢': 'nausée malade',
  '🤮': 'vomi',
  '🤧': 'éternue mouchoir',
  '🥵': 'chaud canicule',
  '🥶': 'froid gel',
  '🥴': 'ivre',
  '😵': 'étourdi',
  '🤯': 'explose tête choc',
  '🤠': 'cowboy',
  '🥳': 'fête anniversaire',
  '😎': 'lunettes cool',
  '🤓': 'intello',
  '🧐': 'monocle analyse',
  '😕': 'confus',
  '😟': 'inquiet',
  '🙁': 'triste',
  '😮': 'surpris',
  '😯': 'surpris calme',
  '😲': 'choqué',
  '😳': 'rouge gêne',
  '🥺': 'supplice yeux',
  '😦': 'déçu',
  '😧': 'angoisse',
  '😨': 'peur',
  '😰': 'peur sueur',
  '😥': 'triste sueur',
  '😢': 'pleure larme triste',
  '😭': 'pleure fort',
  '😱': 'cri peur',
  '😖': 'frustré',
  '😣': 'persévérant',
  '😞': 'déçu triste',
  '😓': 'sueur',
  '😩': 'fatigué',
  '😫': 'épuisé',
  '🥱': 'bâille',
  '😤': 'souffle victoire',
  '😡': 'colère rouge',
  '😠': 'fâché',
  '🤬': 'jurons insultes',
  '😈': 'diable sourire',
  '👿': 'diable',
  '💀': 'crâne mort',
  '☠️': 'tête de mort poison',
  '💩': 'caca',
  '🤡': 'clown',
  '👻': 'fantôme halloween',
  '👽': 'alien',
  '🤖': 'robot',
  '😺': 'chat sourire',
  '😸': 'chat rire',
  '😹': 'chat larmes',
  '😻': 'chat amour',
  '🙈': 'singe cache',
  '🙉': 'singe oreilles',
  '🙊': 'singe bouche',
  '👋': 'salut main coucou',
  '🤚': 'main levée',
  '🖐️': 'main doigts',
  '✋': 'main stop',
  '🖖': 'vulcain',
  '👌': 'ok parfait',
  '🤌': 'italien pince',
  '🤏': 'petit',
  '✌️': 'paix victoire',
  '🤞': 'doigts croisés chance',
  '🤟': 'je t aime',
  '🤘': 'rock',
  '🤙': 'appel téléphone main',
  '👈': 'gauche',
  '👉': 'droite',
  '👆': 'haut',
  '👇': 'bas',
  '☝️': 'index haut',
  '👍': 'pouce haut bravo oui',
  '👎': 'pouce bas non',
  '✊': 'poing levé',
  '👊': 'poing',
  '🤛': 'poing gauche',
  '🤜': 'poing droit',
  '👏': 'applaudit bravo',
  '🙌': 'mains levées youpi',
  '👐': 'mains ouvertes',
  '🤲': 'paumes',
  '🤝': 'poignée de main accord',
  '🙏': 'prière merci',
  '✍️': 'écrit',
  '💅': 'ongles manucure',
  '💪': 'muscle force',
  '🦾': 'bras robot',
  '🦿': 'jambe robot',
  '🦵': 'jambe',
  '🦶': 'pied',
  '👂': 'oreille',
  '👃': 'nez',
  '🧠': 'cerveau',
  '🫀': 'coeur organe',
  '🫁': 'poumons',
  '🦷': 'dent',
  '👀': 'yeux regard',
  '👁️': 'oeil',
  '👅': 'langue',
  '👄': 'bouche lèvres',
  '🧑': 'personne',
  '👶': 'bébé',
  '🧒': 'enfant',
  '👦': 'garçon',
  '👧': 'fille',
  '🧓': 'personne âgée',
  '👩': 'femme',
  '👨': 'homme',
  '🧑‍🎓': 'étudiant diplôme',
  '🧑‍🍳': 'cuisinier chef',
  '🧑‍🎤': 'chanteur',
  '🧑‍🚀': 'astronaute',
  '🕺': 'danseur',
  '💃': 'danseuse',
  '🕴️': 'costume',
  '🧘': 'yoga méditation',
  '🏃': 'course courir',
  '🚶': 'marche',
  '🧍': 'debout',
  '🧎': 'agenouillé',
  '❤️': 'coeur amour rouge',
  '🧡': 'coeur orange',
  '💛': 'coeur jaune',
  '💚': 'coeur vert',
  '💙': 'coeur bleu',
  '💜': 'coeur violet',
  '🖤': 'coeur noir',
  '🤍': 'coeur blanc',
  '🤎': 'coeur marron',
  '💔': 'coeur brisé rupture',
  '❣️': 'coeur exclamation',
  '💕': 'deux coeurs',
  '💞': 'coeurs tournants',
  '💓': 'coeur battant',
  '💗': 'coeur grandissant',
  '💖': 'coeur scintillant',
  '💘': 'coeur flèche',
  '💝': 'coeur cadeau',
  '💟': 'coeur déco',
  '💯': 'cent parfait',
  '💢': 'colère symbole',
  '💥': 'explosion',
  '💫': 'étourdi étoile',
  '💦': 'gouttes eau',
  '💨': 'courant vitesse',
  '🕳️': 'trou',
  '💬': 'bulle message',
  '💭': 'pensée bulle',
  '💤': 'sommeil zzz',
  '🔥': 'feu flamme chaud',
  '✨': 'étincelles magie',
  '🌟': 'étoile brillante',
  '⭐': 'étoile',
  '🌙': 'lune nuit',
  '☀️': 'soleil',
  '⛅': 'nuage soleil',
  '☁️': 'nuage',
  '🌧️': 'pluie',
  '⛈️': 'orage',
  '❄️': 'flocon neige',
  '🌈': 'arc en ciel',
  '🌊': 'vague mer océan',
  '🍕': 'pizza',
  '🍔': 'burger',
  '🍟': 'frites',
  '🌮': 'taco',
  '🍣': 'sushi',
  '🍜': 'ramen nouilles',
  '🥗': 'salade',
  '🥘': 'plat cuisiné',
  '🍝': 'pâtes',
  '🍰': 'gâteau part',
  '🎂': 'anniversaire gâteau',
  '🍩': 'donut',
  '🍪': 'cookie',
  '🍫': 'chocolat',
  '🍿': 'popcorn cinéma',
  '🥐': 'croissant',
  '☕': 'café',
  '🍵': 'thé',
  '🍺': 'bière',
  '🍻': 'bières trinquer',
  '🥂': 'champagne trinquer',
  '🍷': 'vin verre',
  '🥃': 'whisky',
  '🍹': 'cocktail',
  '⚽': 'football ballon',
  '🏀': 'basket',
  '🏈': 'football américain',
  '⚾': 'baseball',
  '🎾': 'tennis',
  '🏐': 'volley beach',
  '🏉': 'rugby',
  '🎱': 'billard',
  '🏓': 'ping pong',
  '🏸': 'badminton',
  '🥊': 'boxe',
  '🎯': 'fléchette cible',
  '🎳': 'bowling',
  '🎮': 'jeu vidéo manette',
  '🎲': 'dé jeu',
  '🧩': 'puzzle',
  '🎨': 'art peinture',
  '🎭': 'théâtre',
  '🎬': 'cinéma clap',
  '🎤': 'micro chant',
  '🎧': 'casque musique',
  '🎸': 'guitare',
  '🎹': 'piano',
  '🥁': 'batterie tambour',
  '🎺': 'trompette',
  '🎻': 'violon',
  '🎉': 'fête confettis',
  '🎊': 'confettis',
  '🎁': 'cadeau',
  '🎈': 'ballon fête',
  '🏆': 'trophée',
  '🥇': 'médaille or',
  '🥈': 'médaille argent',
  '🥉': 'médaille bronze',
  '📸': 'photo appareil',
  '📷': 'appareil photo',
  '🎥': 'caméra',
  '📱': 'téléphone portable',
  '💻': 'ordinateur portable',
  '⌨️': 'clavier',
  '🖥️': 'écran ordinateur',
  '🖨️': 'imprimante',
  '💡': 'ampoule idée',
  '🔑': 'clé',
  '🔒': 'cadenas fermé',
  '💰': 'argent sac',
  '💳': 'carte bancaire',
  '📅': 'calendrier date',
  '📆': 'calendrier',
  '📌': 'épingle',
  '📍': 'localisation lieu',
  '🗺️': 'carte monde',
  '🧭': 'boussole',
  '🚗': 'voiture',
  '🚕': 'taxi',
  '🚌': 'bus',
  '🚆': 'train',
  '🚇': 'métro',
  '✈️': 'avion voyage',
  '🚀': 'fusée',
  '🛸': 'ovni',
  '🚲': 'vélo',
  '🛴': 'trottinette',
  '🏍️': 'moto',
  '⛵': 'voilier bateau',
  '🚢': 'bateau',
  '🏖️': 'plage',
  '🏔️': 'montagne',
  '⛰️': 'montagne',
  '🌲': 'sapin arbre',
  '🌴': 'palmier',
  '🌵': 'cactus',
  '🌸': 'fleur cerisier',
  '🌹': 'rose',
  '🌻': 'tournesol',
  '🍀': 'trèfle chance',
  '🐶': 'chien',
  '🐱': 'chat',
  '🐭': 'souris',
  '🐹': 'hamster',
  '🐰': 'lapin',
  '🦊': 'renard',
  '🐻': 'ours',
  '🐼': 'panda',
  '🐨': 'koala',
  '🐯': 'tigre',
  '🦁': 'lion',
  '🐮': 'vache',
  '🐷': 'cochon',
  '🐸': 'grenouille',
  '🐵': 'singe',
  '🐔': 'poule',
  '🐧': 'pingouin',
  '🐦': 'oiseau',
  '🦅': 'aigle',
  '🦆': 'canard',
  '🦉': 'chouette hibou',
  '🐴': 'cheval',
  '🦄': 'licorne',
  '🐝': 'abeille',
  '🦋': 'papillon',
  '🐌': 'escargot',
  '🐞': 'coccinelle',
  '🐢': 'tortue',
  '🐍': 'serpent',
  '🐙': 'pieuvre',
  '🦑': 'calmar',
  '🦐': 'crevette',
  '🦞': 'homard',
  '🐟': 'poisson',
  '🐬': 'dauphin',
  '🐳': 'baleine',
  '🦈': 'requin',
  '🐊': 'crocodile',
  '🦓': 'zèbre',
  '🦒': 'girafe',
  '🐘': 'éléphant',
  '🦕': 'dinosaure',
  '🦖': 't-rex dinosaure',
  '🇫🇷': 'france drapeau',
  '🇧🇪': 'belgique drapeau',
  '🇨🇭': 'suisse drapeau',
  '🇨🇦': 'canada drapeau',
  '🇬🇧': 'royaume uni angleterre drapeau',
  '🇺🇸': 'états unis usa drapeau',
  '🇩🇪': 'allemagne drapeau',
  '🇪🇸': 'espagne drapeau',
  '🇮🇹': 'italie drapeau',
  '🏳️‍🌈': 'fierté arc en ciel drapeau',
  '✅': 'validé ok coche',
  '❌': 'croix non',
  '❎': 'croix bouton',
  '⚠️': 'attention danger',
  '⛔': 'interdit',
  '🚫': 'interdit',
  '♻️': 'recyclage',
  '🔴': 'rouge',
  '🟠': 'orange',
  '🟡': 'jaune',
  '🟢': 'vert',
  '🔵': 'bleu',
  '🟣': 'violet',
  '⚫': 'noir',
  '⚪': 'blanc',
  '🔺': 'triangle haut',
  '🔻': 'triangle bas',
  '❗': 'exclamation',
  '❓': 'question',
}

/** Recherche tolérante (accents, casse) dans les mots-clés et la catégorie. */
export function searchEmojis(query: string, limit = 240): string[] {
  const q = query
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
  if (!q) return []

  // Recherche par nom de catégorie (« animaux », « drapeaux »…).
  const cat = EMOJI_CATEGORIES.find((c) =>
    c.label
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .includes(q),
  )
  if (cat && q.length >= 3) return (allEmojis()[cat.id] ?? []).slice(0, limit)

  const out: string[] = []
  for (const emoji of emojiFlatList()) {
    if (emoji === query) {
      out.unshift(emoji)
      continue
    }
    const kw = EMOJI_KEYWORDS[emoji]
    if (kw) {
      const flat = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      if (flat.includes(q)) {
        out.push(emoji)
        if (out.length >= limit) break
      }
    }
  }
  return out.slice(0, limit)
}

/** Nombre total d'émojis disponibles (affiché dans l'interface). */
export function emojiCount(): number {
  return emojiFlatList().length
}
