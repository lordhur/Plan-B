'use client'

import { ArrowDown, ArrowUp, ChevronDown, Link2, Plus, Trash2 } from 'lucide-react'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  MAX_PROFILE_LINKS,
  moveItem,
  nextFreeType,
  SOCIAL_LABELS,
  SOCIAL_PLACEHOLDERS,
  SOCIAL_TYPES,
  type ProfileLink,
  type SocialType,
} from '@/lib/socialLinks'
import { SOCIAL_BADGE_CLASS, SocialGlyph } from './SocialGlyphs'

/**
 * ÉDITEUR DE LIENS DU PROFIL
 *
 * Chaque ligne = une icône (choisie dans une liste déroulante illustrée) + une
 * adresse + deux flèches pour choisir l'ordre d'affichage sur le profil.
 * Autant de lignes que voulu (12 maximum), enregistrées dans cet ordre.
 */
export function SocialLinksEditor({
  value,
  onChange,
}: {
  value: ProfileLink[]
  onChange: (links: ProfileLink[]) => void
}) {
  const update = (index: number, patch: Partial<ProfileLink>) => {
    onChange(value.map((link, i) => (i === index ? { ...link, ...patch } : link)))
  }

  const add = () => {
    if (value.length >= MAX_PROFILE_LINKS) return
    onChange([...value, { type: nextFreeType(value), url: '' }])
  }

  const remove = (index: number) => onChange(value.filter((_, i) => i !== index))

  const move = (index: number, direction: -1 | 1) =>
    onChange(moveItem(value, index, index + direction))

  return (
    <div className="space-y-3">
      {value.length === 0 && (
        <p className="rounded-xl border border-dashed border-border bg-bg-secondary/60 px-3.5 py-3 text-sm text-fg-muted">
          Aucun lien pour le moment. Ajoutez Instagram, X, Facebook, votre site… Les logos
          n’apparaîtront sur votre profil qu’une fois le lien renseigné.
        </p>
      )}

      <ul className="space-y-3">
        {value.map((link, index) => {
          const id = `profile-link-${index}`
          return (
            <li key={index} className="rounded-xl border border-border bg-bg p-3">
              <div className="flex items-start gap-2">
                {/* 1. Type de lien — liste déroulante avec les logos */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label={`Type du lien ${index + 1} : ${SOCIAL_LABELS[link.type]}`}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-bg-secondary text-fg transition-colors hover:border-primary-400"
                    >
                      <SocialGlyph type={link.type} className="h-5 w-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="max-h-[min(70vh,26rem)] w-64 overflow-y-auto"
                  >
                    <DropdownMenuLabel>Type de lien</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {SOCIAL_TYPES.map((type) => (
                      <DropdownMenuItem
                        key={type}
                        onSelect={() => update(index, { type })}
                        className="gap-2.5"
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${SOCIAL_BADGE_CLASS[type]}`}
                        >
                          <SocialGlyph type={type as SocialType} className="h-4 w-4" />
                        </span>
                        {SOCIAL_LABELS[type]}
                        {link.type === type && (
                          <span className="ml-auto text-xs font-bold text-accent-600">✓</span>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* 2. Adresse */}
                <div className="min-w-0 flex-1">
                  <label htmlFor={id} className="sr-only">
                    {SOCIAL_LABELS[link.type]}
                  </label>
                  <Input
                    id={id}
                    value={link.url}
                    onChange={(e) => update(index, { url: e.target.value })}
                    placeholder={SOCIAL_PLACEHOLDERS[link.type]}
                    inputMode="url"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={300}
                  />
                  <div className="mt-2 flex items-center gap-1.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="flex min-h-8 items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-semibold text-fg-muted transition-colors hover:text-fg"
                          aria-label={`Changer le type du lien ${index + 1} (${SOCIAL_LABELS[link.type]})`}
                        >
                          {SOCIAL_LABELS[link.type]}
                          <ChevronDown className="h-3 w-3" aria-hidden />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        className="max-h-[min(70vh,26rem)] w-56 overflow-y-auto"
                      >
                        <DropdownMenuLabel>Type de lien</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {SOCIAL_TYPES.map((type) => (
                          <DropdownMenuItem key={type} onSelect={() => update(index, { type })}>
                            <span
                              className={`mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${SOCIAL_BADGE_CLASS[type]}`}
                            >
                              <SocialGlyph type={type} className="h-3.5 w-3.5" />
                            </span>
                            {SOCIAL_LABELS[type]}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <span className="truncate text-[11px] text-fg-muted">
                      {link.type === 'website' || link.type === 'custom'
                        ? 'Lien libre'
                        : 'Pseudo ou lien complet'}
                    </span>
                  </div>
                </div>

                {/* 3. Ordre + suppression */}
                <div className="flex shrink-0 flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={`Monter le lien ${SOCIAL_LABELS[link.type]}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-fg-muted transition-colors hover:text-fg disabled:opacity-30"
                  >
                    <ArrowUp className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === value.length - 1}
                    aria-label={`Descendre le lien ${SOCIAL_LABELS[link.type]}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-fg-muted transition-colors hover:text-fg disabled:opacity-30"
                  >
                    <ArrowDown className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    aria-label={`Supprimer le lien ${SOCIAL_LABELS[link.type]}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-danger-500 transition-colors hover:bg-danger-500/10"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={add}
          disabled={value.length >= MAX_PROFILE_LINKS}
        >
          <Plus className="h-4 w-4" aria-hidden /> Ajouter un lien
        </Button>
        <span className="text-[11px] text-fg-muted">
          {value.length}/{MAX_PROFILE_LINKS} — les flèches changent l’ordre des logos.
        </span>
      </div>

      {value.length > 0 && (
        <div className="rounded-xl bg-bg-secondary/70 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
            <Link2 className="h-3.5 w-3.5" aria-hidden /> Aperçu sur votre profil
          </p>
          <ul className="flex flex-wrap items-center gap-2.5">
            {value
              .filter((l) => l.url.trim())
              .map((link, index) => (
                <li key={`${link.type}-${index}`}>
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full ${SOCIAL_BADGE_CLASS[link.type]}`}
                  >
                    <SocialGlyph type={link.type} className="h-4 w-4" />
                  </span>
                </li>
              ))}
            {value.every((l) => !l.url.trim()) && (
              <li className="text-xs text-fg-muted">
                Les logos apparaîtront ici dès qu’une adresse sera saisie.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
