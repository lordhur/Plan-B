/**
 * Constantes PlanB — catégories d'événements et centres d'intérêt.
 * Sert au seed et aux formulaires (les icônes sont des noms Lucide).
 */

export interface CategoryDef {
  slug: string
  name: string
  icon: string
  color: string
}

export const EVENT_CATEGORIES: CategoryDef[] = [
  { slug: 'sport', name: 'Sport', icon: 'Dumbbell', color: '#22c55e' },
  { slug: 'food', name: 'Food & Sorties resto', icon: 'UtensilsCrossed', color: '#f97316' },
  { slug: 'culture', name: 'Culture', icon: 'Landmark', color: '#8b5cf6' },
  { slug: 'nightlife', name: 'Nightlife', icon: 'PartyPopper', color: '#ec4899' },
  { slug: 'jeux', name: 'Jeux', icon: 'Gamepad2', color: '#06b6d4' },
  { slug: 'nature', name: 'Nature & Rando', icon: 'Mountain', color: '#16a34a' },
  { slug: 'musique', name: 'Musique', icon: 'Music', color: '#eab308' },
  { slug: 'bien-etre', name: 'Bien-être', icon: 'Heart', color: '#f43f5e' },
  { slug: 'cinema', name: 'Cinéma', icon: 'Clapperboard', color: '#6366f1' },
  { slug: 'photo', name: 'Photo', icon: 'Camera', color: '#64748b' },
  { slug: 'bricolage', name: 'Bricolage & DIY', icon: 'Hammer', color: '#a16207' },
  { slug: 'autres', name: 'Autres', icon: 'Sparkles', color: '#8b5cf6' },
]

export const INTERESTS: { name: string; icon: string }[] = [
  { name: 'Running', icon: 'Footprints' },
  { name: 'Randonnée', icon: 'Mountain' },
  { name: 'Vélo', icon: 'Bike' },
  { name: 'Football', icon: 'Volleyball' },
  { name: 'Yoga', icon: 'Flower2' },
  { name: 'Escalade', icon: 'MountainSnow' },
  { name: 'Jeux de société', icon: 'Dices' },
  { name: 'Jeux vidéo', icon: 'Gamepad2' },
  { name: 'Cuisine', icon: 'CookingPot' },
  { name: 'Restaurants', icon: 'UtensilsCrossed' },
  { name: 'Œnologie', icon: 'Wine' },
  { name: 'Concerts', icon: 'Music' },
  { name: 'Cinéma', icon: 'Clapperboard' },
  { name: 'Lecture', icon: 'BookOpen' },
  { name: 'Musées', icon: 'Landmark' },
  { name: 'Photographie', icon: 'Camera' },
  { name: 'Voyages', icon: 'Plane' },
  { name: 'Danse', icon: 'Music4' },
  { name: 'Méditation', icon: 'Heart' },
  { name: 'Bénévolat', icon: 'HandHeart' },
  { name: 'Langues', icon: 'Languages' },
  { name: 'Astronomie', icon: 'Telescope' },
  { name: 'Jardinage', icon: 'Sprout' },
  { name: 'Animaux', icon: 'PawPrint' },
]

/** Badges de la spécification — attribués automatiquement par le cron update-badges (Phase 2). */
export const BADGES = [
  // Confiance
  { code: 'VERIFIED', name: 'Profil vérifié', category: 'TRUST', icon: 'BadgeCheck', color: '#06b6d4', description: 'Email et téléphone vérifiés', criteria: { emailVerified: true, phoneVerified: true } },
  { code: 'TRUSTED', name: 'Membre de confiance', category: 'TRUST', icon: 'ShieldCheck', color: '#22c55e', description: 'Trust score ≥ 80 et 10 événements', criteria: { trustScore: 80, eventsAttended: 10 } },
  // Organisateur
  { code: 'FIRST_EVENT', name: 'Premier plan', category: 'ORGANIZER', icon: 'Rocket', color: '#fb923c', description: 'A créé son premier événement', criteria: { eventsCreated: 1 } },
  { code: 'ORGANIZER_BRONZE', name: 'Organisateur Bronze', category: 'ORGANIZER', icon: 'Medal', color: '#b45309', description: '5 événements créés', criteria: { eventsCreated: 5 } },
  { code: 'ORGANIZER_SILVER', name: 'Organisateur Argent', category: 'ORGANIZER', icon: 'Medal', color: '#94a3b8', description: '20 événements créés', criteria: { eventsCreated: 20 } },
  { code: 'ORGANIZER_GOLD', name: 'Organisateur Or', category: 'ORGANIZER', icon: 'Trophy', color: '#eab308', description: '50 événements créés', criteria: { eventsCreated: 50 } },
  // Participant
  { code: 'SOCIAL_BUTTERFLY', name: 'Papillon social', category: 'PARTICIPANT', icon: 'Butterfly', color: '#ec4899', description: '10 événements participés', criteria: { eventsAttended: 10 } },
  { code: 'ADVENTURER', name: 'Aventurier', category: 'PARTICIPANT', icon: 'Compass', color: '#8b5cf6', description: '50 événements participés', criteria: { eventsAttended: 50 } },
  { code: 'LEGEND', name: 'Légende', category: 'PARTICIPANT', icon: 'Crown', color: '#f59e0b', description: '100 événements participés', criteria: { eventsAttended: 100 } },
  // Social
  { code: 'POPULAR', name: 'Populaire', category: 'SOCIAL', icon: 'Users', color: '#06b6d4', description: '50 amis', criteria: { friendCount: 50 } },
  { code: 'INFLUENCER', name: 'Influenceur', category: 'SOCIAL', icon: 'Megaphone', color: '#f43f5e', description: '200 amis', criteria: { friendCount: 200 } },
  // Catégories
  { code: 'SPORTIF', name: 'Sportif', category: 'CATEGORY', icon: 'Dumbbell', color: '#22c55e', description: '20 événements sport', criteria: { categoryAttended: 'sport', count: 20 } },
  { code: 'GOURMET', name: 'Gourmet', category: 'CATEGORY', icon: 'UtensilsCrossed', color: '#f97316', description: '20 événements food', criteria: { categoryAttended: 'food', count: 20 } },
  { code: 'NIGHT_OWL', name: 'Noctambule', category: 'CATEGORY', icon: 'Moon', color: '#6366f1', description: '20 événements nightlife', criteria: { categoryAttended: 'nightlife', count: 20 } },
  // Spéciaux
  { code: 'EARLY_ADOPTER', name: 'Early Adopter', category: 'SPECIAL', icon: 'Zap', color: '#eab308', description: 'Inscrit avant le 31/12/2025', criteria: { registeredBefore: '2025-12-31' } },
  { code: 'TOP_RATED', name: 'Top Noté', category: 'SPECIAL', icon: 'Star', color: '#f59e0b', description: 'Note ≥ 4.8 sur 20 avis', criteria: { averageRating: 4.8, totalRatings: 20 } },
  { code: 'PHOTOGRAPHER', name: 'Photographe', category: 'SPECIAL', icon: 'Camera', color: '#64748b', description: '50 photos partagées', criteria: { photosUploaded: 50 } },
] as const

/** Labels français des enums affichés dans l'UI. */
export const REGISTRATION_TYPE_LABELS: Record<string, string> = {
  OPEN: 'Inscription libre',
  APPROVAL_REQUIRED: 'Sur validation',
  INVITATION_ONLY: 'Sur invitation',
}

export const GENDER_LABELS: Record<string, string> = {
  MALE: 'Homme',
  FEMALE: 'Femme',
  NON_BINARY: 'Non-binaire',
  OTHER: 'Autre',
  PREFER_NOT_TO_SAY: 'Préfère ne pas dire',
}

export const GENDER_RESTRICTION_LABELS: Record<string, string> = {
  ALL: 'Tous',
  MALE_ONLY: 'Hommes uniquement',
  FEMALE_ONLY: 'Femmes uniquement',
  NON_BINARY_ONLY: 'Non-binaire uniquement',
}

export const VISIBILITY_LABELS: Record<string, string> = {
  PUBLIC: 'Public',
  FRIENDS_ONLY: 'Amis uniquement',
  PRIVATE: 'Privé',
  UNLISTED: 'Non-listé (lien direct)',
}

// ========================
// Abonnements premium (Phase 4 §4.2)
// ========================

export interface PlanDef {
  id: 'ORGANIZER_PRO' | 'PREMIUM' | 'BUSINESS'
  name: string
  price: number // €/mois
  tagline: string
  perks: string[]
}

export const PLANS: PlanDef[] = [
  {
    id: 'PREMIUM',
    name: 'Premium',
    price: 4.9,
    tagline: 'Pour les membres actifs',
    perks: [
      'Badge Premium sur le profil',
      'Inscription prioritaire aux plans complets',
      'Voir qui a consulté votre profil',
    ],
  },
  {
    id: 'ORGANIZER_PRO',
    name: 'Organisateur Pro',
    price: 9.9,
    tagline: 'Pour les organisateurs réguliers',
    perks: [
      'Statistiques détaillées de vos plans',
      'Plans mis en avant dans le fil',
      'Export des participants (CSV)',
      'Sondages de date intégrés',
    ],
  },
  {
    id: 'BUSINESS',
    name: 'Business',
    price: 19.9,
    tagline: 'Pour les pages et commerces',
    perks: [
      'Page vérifiée avec badge ✓',
      'Offres partenaires illimitées',
      'Événements sponsorisés',
      'Statistiques d’audience',
    ],
  },
]
