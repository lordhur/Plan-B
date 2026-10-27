'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export type Lang = 'fr' | 'en'

const STORAGE_KEY = 'planb_lang'

const dict: Record<Lang, Record<string, string>> = {
  fr: {
    // Navigation
    nav_feed: 'Fil d’actualité',
    nav_members: 'Les Membres',
    nav_activity: 'Activité',
    nav_groups: 'Groupes',
    nav_pages: 'Pages',
    nav_create: 'Créer',
    nav_new: 'Nouveau',
    nav_profile: 'Mon profil',
    nav_agenda: 'Mon agenda',
    nav_settings: 'Paramètres',
    nav_contact: 'Contactez-nous',
    nav_logout: 'Se déconnecter',
    nav_login: 'Connexion',
    nav_register: 'Inscription',
    nav_messages: 'Messages',
    nav_notifications: 'Notifications',
    nav_language: 'English',
    create_plan: 'Un plan',
    create_group: 'Un groupe',
    create_page: 'Une page',
    create_menu: 'Créer…',
    // Fil
    feed_morning: 'Bonjour',
    feed_afternoon: 'Bon après-midi',
    feed_evening: 'Bonsoir',
    feed_hook: 'Qu’est-ce qu’on fait aujourd’hui ?',
    feed_create_account: 'Créer mon compte',
    feed_see_plans: 'Voir les plans',
    feed_zone: 'Plans et membres filtrés',
    feed_intro: 'À la rencontre de…',
    feed_media: 'En images',
    feed_near_you: 'Autour de vous',
    feed_in_zone: 'Dans',
    feed_around: 'Autour de',
    feed_gps: 'position GPS',
    feed_for_you: 'Pour vous',
    feed_empty_zone: 'Aucun plan dans',
    feed_empty_near: 'Aucun plan dans les 25 km',
    feed_empty_desc_denied: 'La géolocalisation est refusée — activez-la ou validez une zone sur la carte.',
    feed_empty_desc: 'Les plans arrivent vite ! Choisissez une autre zone ou créez le vôtre.',
    feed_calm: 'Le calme avant la tempête',
    feed_calm_desc: 'Aucun plan à venir pour le moment. Soyez le premier à lancer le mouvement !',
    create_plan_btn: 'Créer un plan',
    see_activity: 'Voir l’activité',
    first_plan: 'Créer le premier plan',
    // Carte
    map_pick_region: 'Choisissez une région',
    map_pick_dept: 'choisissez un département',
    map_pick_city: 'choisissez une ville',
    map_regions: 'Régions',
    map_depts: 'Départements',
    map_validate: 'Valider',
    map_hint: 'Cliquez une région → ses départements → ses villes, puis Validez pour afficher les plans et membres de la zone.',
    // Membres
    members_title: 'Les Membres',
    members_subtitle: 'Trouvez des gens qui vous ressemblent, autour de vous.',
    members_tab_friends: 'Se faire des amis',
    members_tab_search: 'Recherche',
    members_tab_new: 'Nouveau',
    members_tab_ranking: 'Classement',
    members_search_ph: 'Nom, pseudo, ville, passion…',
    // Activité
    activity_title: 'Activité',
    activity_subtitle: 'Tous les plans à venir, jour par jour.',
    activity_tab_events: 'Événements',
    activity_tab_calendar: 'Calendrier',
    activity_tab_archive: 'Archive',
    activity_today: 'Aujourd’hui',
    // Agenda
    agenda_title: 'Mon agenda',
    agenda_subtitle: 'Tout ce qui vous concerne : inscriptions, attente, coups de cœur et souvenirs.',
    agenda_registered: 'Mes inscriptions',
    agenda_waitlist: 'Liste d’attente',
    agenda_liked: 'Plans que j’aime',
    agenda_past: 'Activités passées',
    // Classements
    rank_month: 'Ce mois-ci',
    rank_general: 'Général',
    rank_active: 'Les plus actifs',
    rank_organizers: 'Organisateurs',
    rank_category: 'Par catégorie',
    bottom_feed: 'Fil',
    bottom_members: 'Membres',
    bottom_activity: 'Activité',
    bottom_groups: 'Groupes',
  },
  en: {
    nav_feed: 'Feed',
    nav_members: 'Members',
    nav_activity: 'Activity',
    nav_groups: 'Groups',
    nav_pages: 'Pages',
    nav_create: 'Create',
    nav_new: 'New',
    nav_profile: 'My profile',
    nav_agenda: 'My agenda',
    nav_settings: 'Settings',
    nav_contact: 'Contact us',
    nav_logout: 'Log out',
    nav_login: 'Log in',
    nav_register: 'Sign up',
    nav_messages: 'Messages',
    nav_notifications: 'Notifications',
    nav_language: 'Français',
    create_plan: 'A plan',
    create_group: 'A group',
    create_page: 'A page',
    create_menu: 'Create…',
    feed_morning: 'Good morning',
    feed_afternoon: 'Good afternoon',
    feed_evening: 'Good evening',
    feed_hook: 'What are we doing today?',
    feed_create_account: 'Create my account',
    feed_see_plans: 'Browse plans',
    feed_zone: 'Plans and members filtered',
    feed_intro: 'Say hello to…',
    feed_media: 'In pictures',
    feed_near_you: 'Near you',
    feed_in_zone: 'In',
    feed_around: 'Around',
    feed_gps: 'GPS location',
    feed_for_you: 'For you',
    feed_empty_zone: 'No plans in',
    feed_empty_near: 'No plans within 25 km',
    feed_empty_desc_denied: 'Location is denied — enable it or pick a zone on the map.',
    feed_empty_desc: 'Plans are coming! Pick another zone or create yours.',
    feed_calm: 'The calm before the storm',
    feed_calm_desc: 'No upcoming plans yet. Be the first to start the movement!',
    create_plan_btn: 'Create a plan',
    see_activity: 'See activity',
    first_plan: 'Create the first plan',
    map_pick_region: 'Pick a region',
    map_pick_dept: 'pick a department',
    map_pick_city: 'pick a city',
    map_regions: 'Regions',
    map_depts: 'Departments',
    map_validate: 'Confirm',
    map_hint: 'Click a region → its departments → its cities, then Confirm to show the plans and members of the area.',
    members_title: 'Members',
    members_subtitle: 'Find people like you, around you.',
    members_tab_friends: 'Make friends',
    members_tab_search: 'Search',
    members_tab_new: 'New',
    members_tab_ranking: 'Rankings',
    members_search_ph: 'Name, nickname, city, passion…',
    activity_title: 'Activity',
    activity_subtitle: 'All upcoming plans, day by day.',
    activity_tab_events: 'Events',
    activity_tab_calendar: 'Calendar',
    activity_tab_archive: 'Archive',
    activity_today: 'Today',
    agenda_title: 'My agenda',
    agenda_subtitle: 'Everything about you: sign-ups, waitlist, favourites and memories.',
    agenda_registered: 'My sign-ups',
    agenda_waitlist: 'Waitlist',
    agenda_liked: 'Plans I like',
    agenda_past: 'Past activities',
    rank_month: 'This month',
    rank_general: 'Overall',
    rank_active: 'Most active',
    rank_organizers: 'Organizers',
    rank_category: 'By category',
    bottom_feed: 'Feed',
    bottom_members: 'Members',
    bottom_activity: 'Activity',
    bottom_groups: 'Groups',
  },
}

interface LangContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  toggle: () => void
  t: (key: string) => string
}

const LangContext = createContext<LangContextValue>({
  lang: 'fr',
  setLang: () => undefined,
  toggle: () => undefined,
  t: (k) => k,
})

/** Fournisseur de langue FR/EN — persistant (localStorage). */
export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fr')

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved === 'en' || saved === 'fr') setLangState(saved)
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    window.localStorage.setItem(STORAGE_KEY, l)
  }, [])

  const toggle = useCallback(() => {
    setLang(lang === 'fr' ? 'en' : 'fr')
  }, [lang, setLang])

  const value = useMemo<LangContextValue>(
    () => ({
      lang,
      setLang,
      toggle,
      t: (key: string) => dict[lang][key] ?? dict.fr[key] ?? key,
    }),
    [lang, setLang, toggle],
  )

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLang() {
  return useContext(LangContext)
}
