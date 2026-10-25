import { authRouter } from './auth'
import { eventsRouter } from './events'
import { notificationsRouter } from './notifications'
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
})

export type AppRouter = typeof appRouter
