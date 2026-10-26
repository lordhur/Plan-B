import { z } from 'zod'

// ========================
// Auth
// ========================

export const passwordSchema = z
  .string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
  .max(128)
  .regex(/[a-zA-Z]/, 'Le mot de passe doit contenir au moins une lettre')
  .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre')

export const registerSchema = z.object({
  email: z.string().email('Email invalide').toLowerCase().trim(),
  password: passwordSchema,
  firstName: z.string().trim().min(2, 'Prénom trop court').max(50),
  lastName: z.string().trim().min(2, 'Nom trop court').max(50),
  dateOfBirth: z.coerce.date().refine(
    (d) => {
      const age = (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000)
      return age >= 18 && age <= 120
    },
    { message: 'Vous devez avoir au moins 18 ans' },
  ),
  gender: z.enum(['MALE', 'FEMALE', 'NON_BINARY', 'OTHER', 'PREFER_NOT_TO_SAY']),
})
export type RegisterInput = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  email: z.string().email('Email invalide').toLowerCase().trim(),
  password: z.string().min(1, 'Mot de passe requis'),
})
export type LoginInput = z.infer<typeof loginSchema>

export const verifyCodeSchema = z.object({
  target: z.string().min(3), // email ou téléphone
  code: z.string().regex(/^\d{6}$/, 'Le code doit contenir 6 chiffres'),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email invalide').toLowerCase().trim(),
})

export const resetPasswordSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  code: z.string().regex(/^\d{6}$/),
  password: passwordSchema,
})

// ========================
// Profil
// ========================

export const updateProfileSchema = z.object({
  displayName: z.string().trim().max(60).optional(),
  bio: z.string().trim().max(500).optional(),
  city: z.string().trim().max(80).optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  phone: z
    .string()
    .regex(/^\+?[0-9 .-]{8,16}$/, 'Numéro invalide')
    .optional()
    .or(z.literal('')),
  showAge: z.boolean().optional(),
  showLastName: z.boolean().optional(),
  privacyLevel: z.enum(['PUBLIC', 'FRIENDS_OF_FRIENDS', 'FRIENDS_ONLY', 'PRIVATE']).optional(),
  allowMessagesFrom: z
    .enum(['EVERYONE', 'FRIENDS_OF_FRIENDS', 'FRIENDS_ONLY', 'NOBODY'])
    .optional(),
  allowFriendRequests: z.boolean().optional(),
})
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

export const setInterestsSchema = z.object({
  interests: z.array(z.string().min(1)).max(20),
})

// ========================
// Événements
// ========================

export const createEventSchema = z
  .object({
    // Étape 1 — les bases
    title: z.string().trim().min(3, 'Titre trop court').max(120),
    categoryId: z.string().min(1, 'Catégorie requise'),
    description: z.string().trim().min(10, 'Description trop courte (10 caractères min.)').max(5000),
    shortDescription: z.string().trim().max(180).optional(),
    coverImage: z
      .string()
      .trim()
      .max(2048, 'URL d’image trop longue')
      .refine(
        (v) => v === '' || v.startsWith('/') || /^https?:\/\//i.test(v),
        'L’image doit être une URL valide (https://…)',
      )
      .optional()
      .transform((v) => (v === '' ? undefined : v)),
    tags: z.array(z.string().trim().min(1).max(30)).max(8).default([]),
    // Publier au nom d'une page (Phase 5)
    pageId: z.string().min(1).optional(),
    // Étape 2 — quand et où
    startDate: z.coerce.date(),
    endDate: z.coerce.date().nullable().optional(),
    locationName: z.string().trim().min(2, 'Lieu requis').max(120),
    address: z.string().trim().min(2).max(255),
    city: z.string().trim().min(2).max(80),
    zipCode: z.string().trim().max(10).optional(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    isOnline: z.boolean().default(false),
    onlineLink: z.string().url().optional(),
    // Étape 3 — qui peut venir
    maxParticipants: z.number().int().min(1).max(5000).nullable().optional(),
    minParticipants: z.number().int().min(1).max(5000).default(1),
    registrationType: z.enum(['OPEN', 'APPROVAL_REQUIRED', 'INVITATION_ONLY']).default('OPEN'),
    minAge: z.number().int().min(0).max(120).nullable().optional(),
    maxAge: z.number().int().min(0).max(120).nullable().optional(),
    genderRestriction: z.enum(['ALL', 'MALE_ONLY', 'FEMALE_ONLY', 'NON_BINARY_ONLY']).default('ALL'),
    minRating: z.number().min(0).max(5).nullable().optional(),
    // Étape 4 — accessibilité & options
    wheelchairAccessible: z.boolean().default(false),
    hearingAccessible: z.boolean().default(false),
    visuallyAccessible: z.boolean().default(false),
    accessibilityNotes: z.string().trim().max(500).optional(),
    visibility: z.enum(['PUBLIC', 'FRIENDS_ONLY', 'PRIVATE', 'UNLISTED']).default('PUBLIC'),
    // Étape 5 — prix
    isFree: z.boolean().default(true),
    price: z.number().min(0).max(100000).nullable().optional(),
    // Brouillon
    isDraft: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.startDate < new Date()) {
      ctx.addIssue({ code: 'custom', path: ['startDate'], message: 'La date doit être dans le futur' })
    }
    if (data.endDate && data.endDate <= data.startDate) {
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'La fin doit être après le début' })
    }
    if (!data.isFree && (data.price == null || data.price <= 0)) {
      ctx.addIssue({ code: 'custom', path: ['price'], message: 'Prix requis pour un événement payant' })
    }
    if (data.minAge != null && data.maxAge != null && data.minAge > data.maxAge) {
      ctx.addIssue({ code: 'custom', path: ['maxAge'], message: 'Âge max inférieur au min' })
    }
  })
export type CreateEventInput = z.infer<typeof createEventSchema>

export const eventFiltersSchema = z.object({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  maxDistanceKm: z.number().min(1).max(500).optional(),
  categoryId: z.string().optional(),
  search: z.string().max(120).optional(),
  isFree: z.boolean().optional(),
  wheelchairAccessible: z.boolean().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  sort: z.enum(['relevance', 'date', 'distance', 'popularity']).default('relevance'),
  limit: z.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
})
export type EventFilters = z.infer<typeof eventFiltersSchema>

// ========================
// Divers
// ========================

export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
})
