import { authRouter } from './auth'
import { eventsRouter } from './events'
import { friendsRouter } from './friends'
import { messagesRouter } from './messages'
import { notificationsRouter } from './notifications'
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
})

export type AppRouter = typeof appRouter
