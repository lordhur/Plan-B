'use client'

import { ArrowLeft, MessageSquare, Pin, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { use, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { useCurrentUser } from '@/lib/session'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { toast } from '@/components/ui/toast'
import { formatRelative } from '@/lib/date'

/** Sujet du forum + réponses (spec Phase 5 §5.2). */
export default function ForumThreadPage({ params }: { params: Promise<{ slug: string; postId: string }> }) {
  const { slug, postId } = use(params)
  const { user } = useCurrentUser()
  const post = trpc.groups.post.useQuery({ postId })
  const group = trpc.groups.bySlug.useQuery({ slug })
  const utils = trpc.useUtils()
  const [content, setContent] = useState('')

  const reply = trpc.groups.reply.useMutation({
    onSuccess: () => {
      setContent('')
      void utils.groups.post.invalidate({ postId })
    },
    onError: (e) => toast.error(e.message),
  })
  const deletePost = trpc.groups.deletePost.useMutation({
    onError: (e) => toast.error(e.message),
  })

  if (post.isLoading) return <LoadingSpinner className="py-20" />
  if (!post.data) {
    return <EmptyState icon={MessageSquare} title="Sujet introuvable" description="Cette discussion a été supprimée." />
  }
  const p = post.data
  const myRole = group.data?.myRole ?? null
  const canDelete = p.authorId === user?.id || myRole === 'ADMIN' || myRole === 'MODERATOR'
  const isMember = !!myRole

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-8 md:px-0">
      <Link href={`/groups/${slug}`} className="inline-flex items-center gap-1 text-sm text-fg-muted hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden /> {p.group.name}
      </Link>

      <Card>
        <CardContent className="space-y-3 p-5">
          <h1 className="flex items-center gap-2 text-lg font-bold">
            {p.isPinned && <Pin className="h-4 w-4 shrink-0 text-primary-600" aria-label="Épinglé" />}
            {p.title}
          </h1>
          <div className="flex items-center gap-2.5">
            <Avatar src={p.author.avatarUrl} name={`${p.author.firstName} ${p.author.lastName}`} size="sm" />
            <span className="text-xs text-fg-muted">
              <span className="font-semibold text-fg">{p.author.firstName}</span> · {formatRelative(p.createdAt)}
            </span>
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-danger-500"
                disabled={deletePost.isPending}
                onClick={() => {
                  if (confirm('Supprimer ce sujet ?')) deletePost.mutate({ postId })
                }}
              >
                <Trash2 className="h-4 w-4" aria-hidden /> Supprimer
              </Button>
            )}
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{p.content}</p>
        </CardContent>
      </Card>

      <section aria-labelledby="replies-title">
        <h2 id="replies-title" className="mb-3 text-sm font-semibold uppercase tracking-wide text-fg-muted">
          {p.replies.length} réponse(s)
        </h2>
        {p.replies.length === 0 && (
          <p className="rounded-xl bg-bg-secondary p-4 text-sm text-fg-muted">Aucune réponse — soyez le premier !</p>
        )}
        <ul className="space-y-3">
          {p.replies.map((r) => (
            <li key={r.id} className="flex gap-3 rounded-2xl border border-border bg-card p-4">
              <Avatar src={r.author.avatarUrl} name={`${r.author.firstName} ${r.author.lastName}`} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-fg-muted">
                  <span className="font-semibold text-fg">{r.author.firstName}</span> · {formatRelative(r.createdAt)}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{r.content}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {isMember ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!content.trim()) return
            reply.mutate({ postId, content: content.trim() })
          }}
        >
          <label htmlFor="reply-content" className="sr-only">Votre réponse</label>
          <Textarea
            id="reply-content"
            rows={3}
            maxLength={2000}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Écrivez votre réponse…"
          />
          <Button type="submit" disabled={reply.isPending || !content.trim()}>
            {reply.isPending ? 'Envoi…' : 'Répondre'}
          </Button>
        </form>
      ) : (
        <p className="rounded-xl bg-bg-secondary p-4 text-center text-sm text-fg-muted">
          <Link href={`/groups/${slug}`} className="font-semibold text-primary-600 hover:underline">
            Rejoignez le groupe
          </Link>{' '}
          pour participer à la discussion.
        </p>
      )}
    </div>
  )
}
