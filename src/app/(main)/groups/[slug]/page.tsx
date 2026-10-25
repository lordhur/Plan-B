'use client'

import { ArrowLeft, Lock, MessageSquare, Pin, Users } from 'lucide-react'
import Link from 'next/link'
import { use, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { toast } from '@/components/ui/toast'
import { formatRelative } from '@/lib/date'

/** Page d'un groupe : infos, adhésion et forum (spec Phase 5 §5.2). */
export default function GroupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const group = trpc.groups.bySlug.useQuery({ slug })
  const utils = trpc.useUtils()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const join = trpc.groups.toggleJoin.useMutation({
    onSuccess: (res) => {
      toast.success(res.joined ? 'Bienvenue dans le groupe !' : 'Vous avez quitté le groupe')
      void utils.groups.bySlug.invalidate({ slug })
    },
    onError: (e) => toast.error(e.message),
  })
  const createPost = trpc.groups.createPost.useMutation({
    onSuccess: () => {
      toast.success('Sujet publié')
      setTitle('')
      setContent('')
      void utils.groups.bySlug.invalidate({ slug })
    },
    onError: (e) => toast.error(e.message),
  })

  if (group.isLoading) return <LoadingSpinner className="py-20" />
  if (!group.data) {
    return <EmptyState icon={Users} title="Groupe introuvable" description="Ce groupe n’existe pas." />
  }
  const g = group.data

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 md:px-0">
      <Link href="/groups" className="inline-flex items-center gap-1 text-sm text-fg-muted hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Tous les groupes
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-xl">
            {g.name}
            {g.isPrivate && (
              <span className="flex items-center gap-1 rounded-full bg-bg-secondary px-2 py-0.5 text-xs font-medium text-fg-muted">
                <Lock className="h-3 w-3" aria-hidden /> Privé
              </span>
            )}
          </CardTitle>
          <p className="text-sm text-fg-muted">
            {g.memberCount} membre(s) · {g.category}
            {g.myRole === 'ADMIN' && ' · vous êtes admin'}
            {g.myRole === 'MODERATOR' && ' · vous êtes modérateur'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {g.description && <p className="text-sm text-fg-muted">{g.description}</p>}
          <Button
            variant={g.myRole ? 'secondary' : 'default'}
            disabled={join.isPending}
            onClick={() => join.mutate({ groupId: g.id })}
          >
            {g.myRole ? 'Quitter le groupe' : g.isPrivateHidden ? 'Rejoindre (groupe privé)' : 'Rejoindre le groupe'}
          </Button>
        </CardContent>
      </Card>

      {g.isPrivateHidden ? (
        <p className="rounded-xl bg-bg-secondary p-4 text-sm text-fg-muted">
          🔒 Rejoignez le groupe pour voir les discussions.
        </p>
      ) : (
        <>
          {/* Nouveau sujet */}
          {g.myRole && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ouvrir un sujet</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (title.trim().length < 3 || content.trim().length < 1) {
                      toast.error('Titre et message requis')
                      return
                    }
                    createPost.mutate({ groupId: g.id, title: title.trim(), content: content.trim() })
                  }}
                >
                  <label htmlFor="post-title" className="sr-only">Titre du sujet</label>
                  <Input
                    id="post-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={140}
                    placeholder="Titre du sujet…"
                  />
                  <label htmlFor="post-content" className="sr-only">Message</label>
                  <Textarea
                    id="post-content"
                    rows={3}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    maxLength={5000}
                    placeholder="Votre message…"
                  />
                  <Button type="submit" size="sm" disabled={createPost.isPending}>
                    <MessageSquare className="h-4 w-4" aria-hidden />
                    {createPost.isPending ? 'Publication…' : 'Publier'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Liste des sujets */}
          {g.forumPosts.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="Aucune discussion"
              description={g.myRole ? 'Lancez le premier sujet !' : 'Rejoignez le groupe pour participer.'}
            />
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {g.forumPosts.map((post) => (
                <li key={post.id}>
                  <Link href={`/groups/${g.slug}/p/${post.id}`} className="flex items-start gap-3 p-4 transition-colors hover:bg-bg-secondary">
                    <Avatar src={post.author.avatarUrl} name={`${post.author.firstName} ${post.author.lastName}`} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 font-semibold">
                        {post.isPinned && <Pin className="h-3.5 w-3.5 shrink-0 text-primary-600" aria-label="Épinglé" />}
                        <span className="truncate">{post.title}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-sm text-fg-muted">{post.content}</span>
                      <span className="mt-1 block text-[11px] text-fg-muted">
                        {post.author.firstName} · {formatRelative(post.createdAt)} · {post._count.replies} réponse(s)
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
