/**
 * Seed PlanB — données de démonstration (département du Var + quelques grands villes).
 *
 * Usage : npm run db:local (dans un autre terminal) puis npm run db:seed
 *
 * Compte de démo : thomas@planb.app — mot de passe : planb1234 (email vérifié)
 * Autres comptes  : marie@planb.app, julie@planb.app… (même mot de passe)
 */
import 'dotenv/config'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { hash } from '@node-rs/argon2'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import { BADGES, EVENT_CATEGORIES, INTERESTS } from '../src/lib/constants'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// ----------------------------- Helpers de dates -----------------------------

const DAY = 24 * 3600 * 1000
const now = new Date()

/** Prochaine occurrence d'un jour de la semaine (0=dimanche) à une heure donnée. */
function nextWeekday(weekday: number, hour: number, minute = 0, weekOffset = 0): Date {
  const d = new Date(now)
  const delta = (weekday - d.getDay() + 7) % 7
  d.setDate(d.getDate() + delta + weekOffset * 7)
  d.setHours(hour, minute, 0, 0)
  if (d.getTime() < now.getTime()) d.setDate(d.getDate() + 7)
  return d
}

function inDays(days: number, hour: number, minute = 0): Date {
  const d = new Date(now.getTime() + days * DAY)
  d.setHours(hour, minute, 0, 0)
  return d
}

function daysAgo(days: number): Date {
  return new Date(now.getTime() - days * DAY)
}

// ----------------------------- Données -----------------------------

interface SeedUser {
  email: string
  firstName: string
  lastName: string
  gender: 'MALE' | 'FEMALE' | 'NON_BINARY'
  dateOfBirth: Date
  city: string
  latitude: number
  longitude: number
  bio: string
  interests: string[]
  emailVerified?: boolean
  phoneVerified?: boolean
}

const USERS: SeedUser[] = [
  {
    email: 'thomas@planb.app',
    firstName: 'Thomas',
    lastName: 'Durand',
    gender: 'MALE',
    dateOfBirth: new Date('1997-04-12'),
    city: 'Draguignan',
    latitude: 43.5377,
    longitude: 6.4643,
    bio: 'Passionné de sport et de rencontres. Toujours partant pour un plan !',
    interests: ['Running', 'Jeux de société', 'Randonnée', 'Photographie', 'Cuisine'],
    emailVerified: true,
    phoneVerified: true,
  },
  {
    email: 'marie@planb.app',
    firstName: 'Marie',
    lastName: 'Dubois',
    gender: 'FEMALE',
    dateOfBirth: new Date('1993-09-23'),
    city: 'Draguignan',
    latitude: 43.5401,
    longitude: 6.4671,
    bio: 'Prof de yoga, amoureuse de la Provence. Le matin, on court ; le soir, on refait le monde.',
    interests: ['Yoga', 'Running', 'Méditation', 'Restaurants'],
    emailVerified: true,
  },
  {
    email: 'julie@planb.app',
    firstName: 'Julie',
    lastName: 'Martin',
    gender: 'FEMALE',
    dateOfBirth: new Date('1999-01-30'),
    city: 'Trans-en-Provence',
    latitude: 43.6144,
    longitude: 6.4736,
    bio: 'Gameuse et pâtissière du dimanche. J’adore les soirées jeux et les bons petits plats.',
    interests: ['Jeux de société', 'Jeux vidéo', 'Cuisine', 'Cinéma'],
    emailVerified: true,
  },
  {
    email: 'pierre@planb.app',
    firstName: 'Pierre',
    lastName: 'Leroy',
    gender: 'MALE',
    dateOfBirth: new Date('1985-06-17'),
    city: 'Lorgues',
    latitude: 43.4946,
    longitude: 6.3676,
    bio: 'Vigneron et épicurien. Je connais toutes les bonnes tables du Var.',
    interests: ['Œnologie', 'Restaurants', 'Randonnée'],
    emailVerified: true,
  },
  {
    email: 'sophie@planb.app',
    firstName: 'Sophie',
    lastName: 'Bernard',
    gender: 'FEMALE',
    dateOfBirth: new Date('2001-11-05'),
    city: 'Draguignan',
    latitude: 43.536,
    longitude: 6.4695,
    bio: 'Étudiante en STAPS. Escalade, trail et apéros au soleil.',
    interests: ['Escalade', 'Running', 'Danse'],
    emailVerified: true,
  },
  {
    email: 'karim@planb.app',
    firstName: 'Karim',
    lastName: 'Haddad',
    gender: 'MALE',
    dateOfBirth: new Date('1990-03-08'),
    city: 'Le Muy',
    latitude: 43.4753,
    longitude: 6.5667,
    bio: 'Guide de rando bénévole. Les sentiers du Verdon n’ont plus de secret pour moi.',
    interests: ['Randonnée', 'Photographie', 'Astronomie'],
    emailVerified: true,
  },
  {
    email: 'lea@planb.app',
    firstName: 'Léa',
    lastName: 'Rossi',
    gender: 'FEMALE',
    dateOfBirth: new Date('1996-07-21'),
    city: 'Flayosc',
    latitude: 43.5311,
    longitude: 6.4014,
    bio: 'Musicienne et noctambule. Un concert, un vinyle, un coucher de soleil — la trinité.',
    interests: ['Concerts', 'Danse', 'Photographie'],
    emailVerified: true,
  },
  {
    email: 'antoine@planb.app',
    firstName: 'Antoine',
    lastName: 'Moreau',
    gender: 'MALE',
    dateOfBirth: new Date('1988-12-02'),
    city: 'Draguignan',
    latitude: 43.5328,
    longitude: 6.4602,
    bio: 'Pétanque le samedi, bricolage le dimanche. Bon vivant.',
    interests: ['Cuisine', 'Jardinage', 'Bénévolat'],
    emailVerified: true,
  },
]

async function main() {
  console.log('🌱 Seed PlanB…')

  // Nettoyage (ordre respectant les contraintes)
  await prisma.notification.deleteMany()
  await prisma.media.deleteMany()
  await prisma.eventAlbum.deleteMany()
  await prisma.carpoolRequest.deleteMany()
  await prisma.carpoolOffer.deleteMany()
  await prisma.directMessage.deleteMany()
  await prisma.conversation.deleteMany()
  await prisma.eventChatMessage.deleteMany()
  await prisma.friendRequest.deleteMany()
  await prisma.friendship.deleteMany()
  await prisma.userRating.deleteMany()
  await prisma.waitlistEntry.deleteMany()
  await prisma.eventParticipation.deleteMany()
  await prisma.eventInvitation.deleteMany()
  await prisma.event.deleteMany()
  await prisma.eventCategory.deleteMany()
  await prisma.interest.deleteMany()
  await prisma.userBadge.deleteMany()
  await prisma.badge.deleteMany()
  await prisma.user.deleteMany()

  // Catégories & intérêts
  const categories: Record<string, string> = {}
  for (const c of EVENT_CATEGORIES) {
    const cat = await prisma.eventCategory.create({ data: c })
    categories[c.slug] = cat.id
  }
  const interestByName: Record<string, string> = {}
  for (const i of INTERESTS) {
    const created = await prisma.interest.create({ data: i })
    interestByName[i.name] = created.id
  }

  // Badges
  for (const b of BADGES) {
    await prisma.badge.create({
      data: {
        code: b.code,
        name: b.name,
        description: b.description,
        icon: b.icon,
        color: b.color,
        category: b.category as 'TRUST' | 'ORGANIZER' | 'PARTICIPANT' | 'SOCIAL' | 'CATEGORY' | 'SPECIAL',
        criteria: b.criteria as object,
      },
    })
  }

  // Utilisateurs
  const passwordHash = await hash('planb1234', { memoryCost: 19456, timeCost: 2, parallelism: 1 })
  const userByEmail: Record<string, string> = {}
  for (const u of USERS) {
    const user = await prisma.user.create({
      data: {
        email: u.email,
        passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        dateOfBirth: u.dateOfBirth,
        gender: u.gender,
        bio: u.bio,
        city: u.city,
        latitude: u.latitude,
        longitude: u.longitude,
        emailVerified: u.emailVerified ?? false,
        phoneVerified: u.phoneVerified ?? false,
        averageRating: 4.3 + ((u.firstName.length % 7) / 10), // 4.3–4.9
        totalRatings: 3 + (u.lastName.length % 40),
        trustScore: 65 + (u.firstName.length % 30),
        eventsAttended: 4 + (u.lastName.length % 20),
        eventsCreated: u.email === 'marie@planb.app' ? 6 : u.email === 'karim@planb.app' ? 5 : 1 + (u.firstName.length % 4),
        interests: { connect: u.interests.filter((n) => interestByName[n]).map((n) => ({ id: interestByName[n]! })) },
      },
    })
    userByEmail[u.email] = user.id
  }
  const U = (email: string) => userByEmail[email]!

  // ----------------------------- Événements à venir -----------------------------

  interface SeedEvent {
    title: string
    slug: string
    organizer: string
    category: string
    description: string
    startDate: Date
    endDate?: Date
    locationName: string
    address: string
    city: string
    latitude: number
    longitude: number
    maxParticipants: number | null
    registrationType?: 'OPEN' | 'APPROVAL_REQUIRED' | 'INVITATION_ONLY'
    minAge?: number
    maxAge?: number
    minRating?: number
    wheelchairAccessible?: boolean
    isFree?: boolean
    price?: number
    tags: string[]
    participants: string[] // emails
    waitlist?: string[]
    isSponsored?: boolean
    createdAtOffsetDays?: number
  }

  const EVENTS: SeedEvent[] = [
    {
      title: 'Footing dans la nature — parcours du Col de l’Ange',
      slug: 'footing-col-de-l-ange',
      organizer: 'marie@planb.app',
      category: 'sport',
      description:
        'Sortie running conviviale de 8 km (allure modérée, on discute !). Rendez-vous au parking du parc Haussmann. Prévoyez de l’eau, il fera beau. Après l’effort, café en terrasse pour ceux qui veulent.',
      startDate: nextWeekday(6, 9),
      endDate: nextWeekday(6, 10, 30),
      locationName: 'Parc Haussmann',
      address: 'Boulevard Georges Clemenceau, 83300 Draguignan',
      city: 'Draguignan',
      latitude: 43.5396,
      longitude: 6.4665,
      maxParticipants: 5,
      wheelchairAccessible: false,
      tags: ['running', 'sport', 'matin'],
      participants: ['sophie@planb.app', 'antoine@planb.app'],
      createdAtOffsetDays: 1,
    },
    {
      title: 'Soirée jeux de société chez moi 🎲',
      slug: 'soiree-jeux-de-societe',
      organizer: 'julie@planb.app',
      category: 'jeux',
      description:
        'Soirée jeux à la maison : Loups-garous, 7 Wonders, Codenames… Il y en a pour tous les goûts. J’apporte les jeux, vous apportez votre bonne humeur (et éventuellement un petit quelque chose à grignoter). Inscription sur validation pour garder un groupe symp.',
      startDate: nextWeekday(5, 20),
      endDate: nextWeekday(5, 23, 30),
      locationName: 'Chez Julie',
      address: 'Quartier Saint-Hermentaire, 83300 Draguignan',
      city: 'Draguignan',
      latitude: 43.5412,
      longitude: 6.4601,
      maxParticipants: 8,
      registrationType: 'APPROVAL_REQUIRED',
      minAge: 18,
      maxAge: 35,
      tags: ['jeux', 'soirée', 'convivial'],
      participants: ['lea@planb.app'],
      createdAtOffsetDays: 2,
    },
    {
      title: 'Rando au Rocher de Roquebrune 🥾',
      slug: 'rando-rocher-roquebrune',
      organizer: 'karim@planb.app',
      category: 'nature',
      description:
        'Boucle de 12 km avec 500 m de dénivelé jusqu’au sommet du Rocher. Vue à 360° sur l’Argens et les Maures. Niveau intermédiaire — prévoyez de bonnes chaussures, 2 L d’eau et un pique-nique. Départ tôt pour éviter la chaleur.',
      startDate: nextWeekday(0, 8, 30),
      endDate: nextWeekday(0, 15),
      locationName: 'Parking des Amarines',
      address: 'Route du Rocher, 83520 Roquebrune-sur-Argens',
      city: 'Roquebrune-sur-Argens',
      latitude: 43.4445,
      longitude: 6.6371,
      maxParticipants: 12,
      minRating: 4.0,
      tags: ['randonnée', 'nature', 'montagne'],
      participants: ['thomas@planb.app', 'sophie@planb.app', 'pierre@planb.app', 'marie@planb.app'],
      createdAtOffsetDays: 4,
    },
    {
      title: 'Dégustation de vins de Provence 🍷',
      slug: 'degustation-vins-provence',
      organizer: 'pierre@planb.app',
      category: 'food',
      description:
        'Je vous fais découvrir le domaine familial : rosés de Provence, cuvées bio et planches de produits locaux. Dégustation commentée, sans chichi. 15 € par personne (6 verres + planche). L’abus d’alcool est dangereux pour la santé — venez avec un Sam !',
      startDate: nextWeekday(6, 18),
      endDate: nextWeekday(6, 20, 30),
      locationName: 'Domaine de la Rose Trémière',
      address: 'Chemin des Vignettes, 83510 Lorgues',
      city: 'Lorgues',
      latitude: 43.4946,
      longitude: 6.3676,
      maxParticipants: 10,
      minAge: 18,
      isFree: false,
      price: 15,
      wheelchairAccessible: true,
      tags: ['vin', 'dégustation', 'provence'],
      participants: ['antoine@planb.app', 'lea@planb.app', 'marie@planb.app'],
      createdAtOffsetDays: 3,
    },
    {
      title: 'Concert jazz au Café des Arcades 🎷',
      slug: 'concert-jazz-cafe-arcades',
      organizer: 'lea@planb.app',
      category: 'musique',
      description:
        'Le quartet local « Mistral Swing » joue au Café des Arcades — entrée libre, consommation sur place. On se retrouve à 20h30, table réservée au fond. Ambiance détendue, parfait pour rencontrer du monde.',
      startDate: nextWeekday(5, 20, 30),
      endDate: nextWeekday(5, 23),
      locationName: 'Café des Arcades',
      address: '12 Place René Cassin, 83300 Draguignan',
      city: 'Draguignan',
      latitude: 43.5371,
      longitude: 6.4653,
      maxParticipants: 20,
      tags: ['jazz', 'concert', 'soirée'],
      participants: ['julie@planb.app', 'thomas@planb.app'],
      createdAtOffsetDays: 1,
    },
    {
      title: 'Session escalade au Blavet 🧗',
      slug: 'session-escalade-blavet',
      organizer: 'sophie@planb.app',
      category: 'sport',
      description:
        'Grimpe sur les dalles du massif du Blavet (Bagnols-en-Forêt). Niveaux 4 à 6a, je peux assurer les débutants. Matériel fourni pour 3 personnes (prévenez-moi), sinon apportez baudrier et chaussons. Casque obligatoire — j’en ai 4.',
      startDate: inDays(4, 16, 30),
      endDate: inDays(4, 19),
      locationName: 'Massif du Blavet',
      address: 'Chemin du Blavet, 83600 Bagnols-en-Forêt',
      city: 'Bagnols-en-Forêt',
      latitude: 43.6088,
      longitude: 6.6517,
      maxParticipants: 6,
      minRating: 4.0,
      minAge: 16,
      tags: ['escalade', 'sport', 'outdoor'],
      participants: ['karim@planb.app'],
      createdAtOffsetDays: 2,
    },
    {
      title: 'Cinéma en plein air : « Le Grand Bleu » 🎬',
      slug: 'cinema-plein-air-grand-bleu',
      organizer: 'antoine@planb.app',
      category: 'cinema',
      description:
        'Projection gratuite en plein air sur le cours. Apportez plaids et coussins, des transats sont disposés. Buvette associative sur place. On se retrouve dès 21h pour le pique-nique avant la séance.',
      startDate: nextWeekday(4, 21),
      endDate: nextWeekday(4, 23, 30),
      locationName: 'Cours de la République',
      address: 'Cours de la République, 83720 Trans-en-Provence',
      city: 'Trans-en-Provence',
      latitude: 43.6144,
      longitude: 6.4736,
      maxParticipants: 30,
      wheelchairAccessible: true,
      tags: ['cinéma', 'soirée', 'gratuit'],
      participants: ['julie@planb.app', 'lea@planb.app', 'marie@planb.app'],
      createdAtOffsetDays: 5,
    },
    {
      title: 'Yoga au parc — séance découverte gratuite 🧘',
      slug: 'yoga-au-parc-decouverte',
      organizer: 'marie@planb.app',
      category: 'bien-etre',
      description:
        'Séance de hatha yoga d’une heure accessible à tous, sur l’herbe du parc. Tapis fournis si besoin. On termine par une petite méditation guidée. Venez 10 min avant pour l’installation.',
      startDate: nextWeekday(3, 18, 30),
      endDate: nextWeekday(3, 19, 45),
      locationName: 'Parc Haussmann',
      address: 'Boulevard Georges Clemenceau, 83300 Draguignan',
      city: 'Draguignan',
      latitude: 43.5396,
      longitude: 6.4665,
      maxParticipants: 15,
      wheelchairAccessible: true,
      tags: ['yoga', 'bien-être', 'gratuit'],
      participants: ['julie@planb.app', 'sophie@planb.app'],
      createdAtOffsetDays: 1,
    },
    {
      title: 'Tournoi de pétanque du vieux village 🏆',
      slug: 'tournoi-petanque-vieux-village',
      organizer: 'antoine@planb.app',
      category: 'jeux',
      description:
        'Doublettes formées sur place au tirage au sort — l’occasion de rencontrer du monde ! Inscription 5 € par personne, lots à gagner (et le trophée du Fada d’Or). Buvette et frites maison.',
      startDate: nextWeekday(6, 14, 30),
      endDate: nextWeekday(6, 19),
      locationName: 'Place de l’Église',
      address: 'Place de l’Église, 83490 Le Muy',
      city: 'Le Muy',
      latitude: 43.4753,
      longitude: 6.5667,
      maxParticipants: 24,
      isFree: false,
      price: 5,
      wheelchairAccessible: true,
      tags: ['pétanque', 'tournoi', 'village'],
      participants: ['pierre@planb.app', 'karim@planb.app'],
      createdAtOffsetDays: 6,
    },
    {
      title: 'Atelier photo — coucher de soleil à Châteaudouble 📸',
      slug: 'atelier-photo-coucher-soleil',
      organizer: 'karim@planb.app',
      category: 'photo',
      description:
        'Sortie photo au belvédère de Châteaudouble : on shoote le coucher de soleil sur les gorges de la Nartuby. Tous niveaux, tous appareils (même smartphone). Je partagerai mes réglages et on débriefe autour d’un verre après.',
      startDate: inDays(9, 19, 30),
      endDate: inDays(9, 22),
      locationName: 'Belvédère de Châteaudouble',
      address: 'Route de Châteaudouble, 83300 Châteaudouble',
      city: 'Châteaudouble',
      latitude: 43.6163,
      longitude: 6.4572,
      maxParticipants: 8,
      tags: ['photo', 'sunset', 'nature'],
      participants: ['lea@planb.app'],
      createdAtOffsetDays: 2,
    },
    {
      title: 'Brunch entre voisins ☕ (complet !)',
      slug: 'brunch-entre-voisins',
      organizer: 'julie@planb.app',
      category: 'food',
      description:
        'Petit brunch collaboratif dans mon jardin : chacun apporte un plat ou une boisson. Ambiance sans prise de tête, idéal pour rencontrer ses voisins. 4 places seulement — liste d’attente active !',
      startDate: nextWeekday(0, 11),
      endDate: nextWeekday(0, 14),
      locationName: 'Jardin de Julie',
      address: 'Quartier Saint-Hermentaire, 83300 Draguignan',
      city: 'Draguignan',
      latitude: 43.5412,
      longitude: 6.4601,
      maxParticipants: 4,
      tags: ['brunch', 'voisins', 'convivial'],
      participants: ['marie@planb.app', 'lea@planb.app', 'antoine@planb.app'],
      waitlist: ['thomas@planb.app', 'pierre@planb.app'],
      createdAtOffsetDays: 3,
    },
    {
      title: 'Soirée quiz au O’Sullivan’s 🍻',
      slug: 'soiree-quiz-o-sullivans',
      organizer: 'lea@planb.app',
      category: 'nightlife',
      description:
        'Quiz musical et culture générale par équipes de 4 (on mélange les équipes sur place). Une conso offerte à l’équipe gagnante. On arrive à 19h pour former les équipes et manger un morceau.',
      startDate: nextWeekday(4, 19, 30),
      endDate: nextWeekday(4, 23),
      locationName: 'O’Sullivan’s Pub',
      address: '8 Rue de la République, 83300 Draguignan',
      city: 'Draguignan',
      latitude: 43.5368,
      longitude: 6.464,
      maxParticipants: 16,
      minAge: 18,
      tags: ['quiz', 'pub', 'soirée'],
      participants: ['julie@planb.app', 'sophie@planb.app', 'thomas@planb.app'],
      createdAtOffsetDays: 1,
      isSponsored: true,
    },
    {
      title: 'Marché nocturne & food trucks 🌮',
      slug: 'marche-nocturne-food-trucks',
      organizer: 'pierre@planb.app',
      category: 'food',
      description:
        'Premier marché nocturne de la saison : food trucks, artisans locaux et concert acoustique. On se donne rendez-vous à l’entrée pour faire le tour ensemble. Plan sponsorisé par l’Office de Tourisme.',
      startDate: nextWeekday(3, 18),
      endDate: nextWeekday(3, 22),
      locationName: 'Esplanade du Marché',
      address: 'Boulevard Maréchal Foch, 83300 Draguignan',
      city: 'Draguignan',
      latitude: 43.5389,
      longitude: 6.462,
      maxParticipants: null,
      tags: ['food', 'marché', 'famille'],
      participants: ['antoine@planb.app'],
      createdAtOffsetDays: 4,
      isSponsored: true,
    },
    {
      title: 'Pique-nique au lac de Sainte-Croix 🚣',
      slug: 'pique-nique-sainte-croix',
      organizer: 'karim@planb.app',
      category: 'nature',
      description:
        'Journée au lac : pique-nique, baignade et pédalo pour les motivés. Covoiturage organisé depuis Draguignan (1h de route). Chacun apporte son pique-nique, je m’occupe du café et des jeux de plage.',
      startDate: inDays(12, 10),
      endDate: inDays(12, 17),
      locationName: 'Plage du lac',
      address: 'Route des Salles, 83630 Sainte-Croix-du-Verdon',
      city: 'Sainte-Croix-du-Verdon',
      latitude: 43.7691,
      longitude: 6.1514,
      maxParticipants: 15,
      wheelchairAccessible: false,
      tags: ['lac', 'pique-nique', 'baignade'],
      participants: ['thomas@planb.app', 'lea@planb.app'],
      createdAtOffsetDays: 2,
    },
  ]

  for (const e of EVENTS) {
    const event = await prisma.event.create({
      data: {
        title: e.title,
        slug: e.slug,
        organizerId: U(e.organizer),
        categoryId: categories[e.category]!,
        description: e.description,
        shortDescription: e.description.split('.')[0]!.slice(0, 170),
        startDate: e.startDate,
        endDate: e.endDate,
        locationName: e.locationName,
        address: e.address,
        city: e.city,
        latitude: e.latitude,
        longitude: e.longitude,
        maxParticipants: e.maxParticipants,
        currentParticipants: e.participants.length + 1, // + organisateur
        registrationType: e.registrationType ?? 'OPEN',
        minAge: e.minAge,
        maxAge: e.maxAge,
        minRating: e.minRating,
        wheelchairAccessible: e.wheelchairAccessible ?? false,
        isFree: e.isFree ?? true,
        price: e.isFree === false ? e.price ?? 0 : 0,
        isSponsored: e.isSponsored ?? false,
        tags: e.tags,
        status: 'UPCOMING',
        createdAt: daysAgo(e.createdAtOffsetDays ?? 1),
      },
    })

    // Organisateur = participant confirmé
    await prisma.eventParticipation.create({
      data: { eventId: event.id, userId: U(e.organizer), status: 'CONFIRMED' },
    })
    for (const email of e.participants) {
      await prisma.eventParticipation.create({
        data: {
          eventId: event.id,
          userId: U(email),
          status: e.registrationType === 'APPROVAL_REQUIRED' && email !== 'thomas@planb.app' ? 'CONFIRMED' : 'CONFIRMED',
          joinedAt: daysAgo(Math.max(0, (e.createdAtOffsetDays ?? 1) - 1)),
        },
      })
    }
    // Demande en attente pour Thomas sur l'événement "sur validation"
    if (e.registrationType === 'APPROVAL_REQUIRED' && !e.participants.includes('thomas@planb.app')) {
      await prisma.eventParticipation.create({
        data: { eventId: event.id, userId: U('thomas@planb.app'), status: 'PENDING' },
      })
    }
    // Liste d'attente
    if (e.waitlist) {
      let position = 1
      for (const email of e.waitlist) {
        await prisma.waitlistEntry.create({
          data: { eventId: event.id, userId: U(email), position: position++ },
        })
      }
    }
  }

  // ----------------------------- Événements passés (profil + avis) -----------------------------

  const past = await prisma.event.create({
    data: {
      title: 'Rando des gorges de la Nartuby',
      slug: 'rando-gorges-nartuby',
      organizerId: U('karim@planb.app'),
      categoryId: categories['nature']!,
      description:
        'Belle boucle de 10 km le long des cascades de la Nartuby. Météo parfaite, groupe au top — on remet ça le mois prochain !',
      shortDescription: 'Boucle de 10 km le long des cascades de la Nartuby.',
      startDate: daysAgo(14),
      endDate: daysAgo(14),
      locationName: 'Parking des cascades',
      address: 'Route de Figanières, 83830 Figanières',
      city: 'Figanières',
      latitude: 43.5853,
      longitude: 6.5131,
      maxParticipants: 10,
      currentParticipants: 5,
      status: 'COMPLETED',
      tags: ['randonnée', 'nature'],
      createdAt: daysAgo(21),
    },
  })
  for (const email of ['karim@planb.app', 'thomas@planb.app', 'sophie@planb.app', 'marie@planb.app', 'lea@planb.app']) {
    await prisma.eventParticipation.create({
      data: { eventId: past.id, userId: U(email), status: 'ATTENDED', hasRated: true },
    })
  }
  await prisma.user.updateMany({
    where: { email: { in: ['thomas@planb.app', 'sophie@planb.app', 'marie@planb.app', 'lea@planb.app'] } },
    data: { eventsAttended: { increment: 1 } },
  })

  // Avis sur l'événement passé (visibles sur les profils)
  const ratings: [from: string, to: string, rating: number, comment: string][] = [
    ['thomas@planb.app', 'karim@planb.app', 5, 'Super organisateur, parcours magnifique et rythme adapté à tous.'],
    ['marie@planb.app', 'karim@planb.app', 5, 'Karim connaît chaque sentier. Une référence !'],
    ['sophie@planb.app', 'thomas@planb.app', 5, 'Thomas est toujours de bonne humeur, un vrai moteur dans le groupe.'],
    ['lea@planb.app', 'thomas@planb.app', 4, 'Très sympa, bonne énergie. On remet ça !'],
    ['karim@planb.app', 'marie@planb.app', 5, 'Marie a géré la pause yoga au sommet, moment magique.'],
  ]
  for (const [from, to, rating, comment] of ratings) {
    await prisma.userRating.create({
      data: { fromId: U(from), toId: U(to), eventId: past.id, rating, comment },
    })
  }

  // ----------------------------- Réseau social (Phase 2) -----------------------------

  // Amitiés : thomas ↔ marie, karim, lea · marie ↔ karim
  const friendships: [a: string, b: string][] = [
    ['thomas@planb.app', 'marie@planb.app'],
    ['thomas@planb.app', 'karim@planb.app'],
    ['thomas@planb.app', 'lea@planb.app'],
    ['marie@planb.app', 'karim@planb.app'],
  ]
  for (const [a, b] of friendships) {
    const [x, y] = U(a) < U(b) ? [U(a), U(b)] : [U(b), U(a)]
    await prisma.friendship.create({ data: { userAId: x, userBId: y, createdAt: daysAgo(30) } })
    await prisma.user.update({ where: { id: x }, data: { friendCount: { increment: 1 } } })
    await prisma.user.update({ where: { id: y }, data: { friendCount: { increment: 1 } } })
  }

  // Demandes en attente : sophie → thomas (démo acceptation), pierre → thomas
  for (const from of ['sophie@planb.app', 'pierre@planb.app']) {
    await prisma.friendRequest.create({
      data: { senderId: U(from), receiverId: U('thomas@planb.app'), createdAt: daysAgo(1) },
    })
  }

  // Conversation privée thomas ↔ julie avec quelques messages
  const conv = await prisma.conversation.create({
    data: {
      isGroup: false,
      members: { create: [{ userId: U('thomas@planb.app') }, { userId: U('julie@planb.app') }] },
    },
  })
  const dmScript: [from: string, content: string, minutesAgo: number][] = [
    ['julie@planb.app', 'Salut Thomas ! Tu viens au brunch dimanche ? 🥐', 180],
    ['thomas@planb.app', 'Oui bien sûr ! J’adore le Marché des Halles.', 170],
    ['julie@planb.app', 'Top ! On se retrouve sur place vers 11h ?', 45],
  ]
  for (const [from, content, minutesAgo] of dmScript) {
    await prisma.directMessage.create({
      data: {
        conversationId: conv.id,
        senderId: U(from),
        receiverId: U(from === 'julie@planb.app' ? 'thomas@planb.app' : 'julie@planb.app'),
        content,
        createdAt: new Date(Date.now() - minutesAgo * 60_000),
      },
    })
  }

  // Chat de l'événement passé (rando) — visible par les participants
  const chatScript: [from: string, content: string, minutesAgo: number][] = [
    ['karim@planb.app', 'Bienvenue à tous ! Départ dans 10 minutes du parking 🥾', 60 * 24 * 14 + 30],
    ['sophie@planb.app', 'J’apporte de quoi pique-niquer pour tout le monde 🥗', 60 * 24 * 14 + 10],
    ['thomas@planb.app', 'Les cascades étaient magnifiques, merci Karim !', 60 * 24 * 14 - 60],
    ['lea@planb.app', 'On remet ça quand ? 😄', 60 * 24 * 14 - 55],
  ]
  for (const [from, content, minutesAgo] of chatScript) {
    await prisma.eventChatMessage.create({
      data: {
        eventId: past.id,
        userId: U(from),
        content,
        createdAt: new Date(Date.now() - minutesAgo * 60_000),
      },
    })
  }

  // ----------------------------- Album photos + covoiturage (Phase 3) -----------------------------

  // Album de la rando passée : 3 photos générées (dégradés) dans data/uploads
  const album = await prisma.eventAlbum.create({ data: { eventId: past.id } })
  const uploadDir = path.join(process.cwd(), 'data', 'uploads')
  await mkdir(uploadDir, { recursive: true })
  const photoSeeds: [name: string, from: string, to: string, caption: string, uploader: string][] = [
    ['cascades', '#0ea5e9', '#14532d', 'Les cascades de la Nartuby 💦', 'sophie@planb.app'],
    ['sommet', '#f59e0b', '#7c2d12', 'Pause au sommet, vue sur les Maures', 'karim@planb.app'],
    ['groupe', '#ec4899', '#4c1d95', 'Le groupe au complet ! 🥾', 'lea@planb.app'],
  ]
  for (const [name, from, to, caption, uploader] of photoSeeds) {
    const svg = `<svg width="800" height="800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="800" height="800" fill="url(#g)"/><text x="400" y="420" font-size="120" text-anchor="middle" fill="white" opacity="0.85" font-family="sans-serif">📷</text></svg>`
    const full = await sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toBuffer()
    const thumb = await sharp(Buffer.from(svg)).resize(400, 400).jpeg({ quality: 75 }).toBuffer()
    await writeFile(path.join(uploadDir, `seed-${name}.jpg`), full)
    await writeFile(path.join(uploadDir, `thumb-seed-${name}.jpg`), thumb)
    await prisma.media.create({
      data: {
        albumId: album.id,
        uploaderId: U(uploader),
        url: `/api/media/file/seed-${name}.jpg`,
        thumbnailUrl: `/api/media/file/thumb-seed-${name}.jpg`,
        type: 'IMAGE',
        caption,
      },
    })
  }

  // Covoiturage pour la rando de Roquebrune : karim conduit, thomas accepté, sophie en attente
  const roquebrune = await prisma.event.findUnique({ where: { slug: 'rando-rocher-roquebrune' } })
  if (roquebrune) {
    const offer = await prisma.carpoolOffer.create({
      data: {
        eventId: roquebrune.id,
        driverId: U('karim@planb.app'),
        departurePoint: 'Place René Cassin, Draguignan',
        departureLatitude: 43.5377,
        departureLongitude: 6.4661,
        departureTime: new Date(roquebrune.startDate.getTime() - 45 * 60_000),
        availableSeats: 4,
        pricePerSeat: 3,
        notes: 'Je passe par la N7, départ précis !',
      },
    })
    await prisma.carpoolRequest.create({
      data: { offerId: offer.id, passengerId: U('thomas@planb.app'), status: 'ACCEPTED' },
    })
    await prisma.carpoolRequest.create({
      data: { offerId: offer.id, passengerId: U('sophie@planb.app'), status: 'PENDING' },
    })
  }

  // ----------------------------- Badges attribués -----------------------------

  const badgeByCode: Record<string, string> = {}
  for (const b of await prisma.badge.findMany()) badgeByCode[b.code] = b.id
  const earned: [email: string, code: string][] = [
    ['thomas@planb.app', 'VERIFIED'],
    ['thomas@planb.app', 'FIRST_EVENT'],
    ['thomas@planb.app', 'SOCIAL_BUTTERFLY'],
    ['marie@planb.app', 'ORGANIZER_BRONZE'],
    ['marie@planb.app', 'TRUSTED'],
    ['karim@planb.app', 'ORGANIZER_BRONZE'],
    ['karim@planb.app', 'VERIFIED'],
    ['julie@planb.app', 'FIRST_EVENT'],
    ['lea@planb.app', 'SOCIAL_BUTTERFLY'],
  ]
  for (const [email, code] of earned) {
    await prisma.userBadge.create({
      data: { userId: U(email), badgeId: badgeByCode[code]!, earnedAt: daysAgo(5) },
    })
  }

  // ----------------------------- Notifications (compte démo) -----------------------------

  const demo = U('thomas@planb.app')
  await prisma.notification.createMany({
    data: [
      {
        userId: demo,
        type: 'EVENT_REMINDER',
        title: 'Demain : Rando au Rocher de Roquebrune 🥾',
        body: 'Départ à 08:30 — Parking des Amarines. N’oubliez pas l’eau et le pique-nique !',
        link: '/events/rando-rocher-roquebrune',
      },
      {
        userId: demo,
        type: 'EVENT_NEW_PARTICIPANT',
        title: 'Nouveau participant 👋',
        body: 'Léa Rossi a rejoint « Concert jazz au Café des Arcades »',
        link: '/events/concert-jazz-cafe-arcades',
        isRead: true,
      },
      {
        userId: demo,
        type: 'SYSTEM',
        title: 'Bienvenue sur PlanB 🎉',
        body: 'Créez votre premier plan ou rejoignez ceux autour de vous. Bonnes sorties !',
      },
    ],
  })

  console.log('✅ Seed terminé')
  console.log('   Compte démo : thomas@planb.app / planb1234')
  console.log(`   ${EVENTS.length + 1} événements, ${USERS.length} utilisateurs`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
