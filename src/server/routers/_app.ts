import { agendaRouter } from './agenda'
import { albumsRouter } from './albums'
import { authRouter } from './auth'
import { billingRouter } from './billing'
import { carpoolRouter } from './carpool'
import { contactRouter } from './contact'
import { eventsRouter } from './events'
import { groupsRouter } from './groups'
import { friendsRouter } from './friends'
import { introCardsRouter } from './introCards'
import { leaderboardRouter } from './leaderboard'
import { messagesRouter } from './messages'
import { notificationsRouter } from './notifications'
import { offersRouter } from './offers'
import { pagesRouter } from './pages'
import { storiesRouter } from './stories'
import { ratingsRouter } from './ratings'
import { usersRouter } from './users'
import { createTRPCRouter } from '../trpc'

/**
 * Router racine tRPC — chaque sous-router correspond à un domaine métier.
 * Le type `AppRouter` est importé côté client pour le typage end-to-end.
 */
export const appRouter = createTRPCRouter({
  auth: authRouter,
  events: eventsRouter,
  users: usersRouter,
  notifications: notificationsRouter,
  friends: friendsRouter,
  messages: messagesRouter,
  ratings: ratingsRouter,
  albums: albumsRouter,
  carpool: carpoolRouter,
  leaderboard: leaderboardRouter,
  billing: billingRouter,
  offers: offersRouter,
  pages: pagesRouter,
  groups: groupsRouter,
  contact: contactRouter,
  introCards: introCardsRouter,
  agenda: agendaRouter,
  stories: storiesRouter,
})

export type AppRouter = typeof appRouter
