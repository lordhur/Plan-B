'use client'

import {
  Bell,
  HelpCircle,
  LogOut,
  Moon,
  Settings,
  Sun,
  User as UserIcon,
  UserPlus,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import * as React from 'react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLang } from '@/lib/i18n'
import { hardSignOut } from '@/lib/logout'
import { trpc } from '@/lib/trpc'

/**
 * MENU DU COMPTE — accessible depuis le bouton « trois tirets » du profil.
 * (Le menu ne contient plus « Message » ni « Mon agenda » : la messagerie a
 * son onglet et l'agenda son entrée dans Activité.)
 */
export function AccountMenu({
  unreadCount = 0,
  trigger,
}: {
  unreadCount?: number
  trigger?: React.ReactNode
}) {
  const router = useRouter()
  const { t } = useLang()
  const { theme, setTheme } = useTheme()
  const utils = trpc.useUtils()

  const logout = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      // 1. on jette la session en mémoire, 2. on jette les caches hors-ligne,
      // 3. on recharge entièrement la page : plus aucun état « connecté ».
      utils.auth.me.setData(undefined, undefined as never)
      await hardSignOut()
    },
    onError: () => {
      void hardSignOut()
    },
  })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            aria-label="Menu du compte"
            className="flex h-11 w-11 items-center justify-center rounded-full text-fg transition-colors hover:bg-bg-secondary"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden focusable="false">
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="z-[70] max-h-[min(72vh,32rem)] w-60 overflow-y-auto overscroll-contain"
      >
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <UserIcon className="h-4 w-4" aria-hidden /> Mon profil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/notifications">
            <Bell className="h-4 w-4" aria-hidden /> {t('nav_notifications')}
            {unreadCount > 0 && (
              <span className="ml-auto rounded-full bg-danger-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/friends">
            <Users className="h-4 w-4" aria-hidden /> Mes amis
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/friends/requests">
            <UserPlus className="h-4 w-4" aria-hidden /> Demandes d’amis
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() =>
            setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark')
          }
        >
          {theme === 'dark' ? (
            <Moon className="h-4 w-4" aria-hidden />
          ) : (
            <Sun className="h-4 w-4" aria-hidden />
          )}
          {t('nav_theme')} :{' '}
          {theme === 'dark'
            ? t('nav_theme_dark')
            : theme === 'light'
              ? t('nav_theme_light')
              : t('nav_theme_auto')}
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/profile/settings">
            <Settings className="h-4 w-4" aria-hidden /> {t('nav_settings')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/contact">
            <HelpCircle className="h-4 w-4" aria-hidden /> {t('nav_contact')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="text-danger-500 focus:text-danger-600"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          {logout.isPending ? 'Déconnexion…' : t('nav_logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
