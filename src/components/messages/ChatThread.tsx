'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Ban,
  Camera,
  Check,
  CheckCheck,
  Download,
  FileText,
  Flag,
  ImageIcon,
  Languages,
  Loader2,
  Mic,
  MoreVertical,
  Pause,
  Paperclip,
  Phone,
  Play,
  Search,
  Send,
  Smile,
  Sticker,
  Trash2,
  Users,
  Video,
  VolumeX,
  X,
} from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { EmojiPicker } from './EmojiPicker'
import { GifPicker } from './GifPicker'
import {
  CallOverlay,
  IncomingCallOverlay,
  useIncomingCall,
  type CallMode,
} from './CallOverlay'
import { uploadToStorage } from '@/lib/supabaseUpload'
import { useLang } from '@/lib/i18n'
import { GifImage } from './GifImage'
import { detectLang, useTranslation } from '@/lib/translate'
import { trpc } from '@/lib/trpc'
import { useCurrentUser } from '@/lib/session'
import { formatRelative } from '@/lib/date'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/toast'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface ChatUser {
  id: string
  firstName: string
  lastName: string
  avatarUrl: string | null
}

interface ChatMessage {
  id: string
  content: string
  createdAt: Date
  author: ChatUser
  mediaUrl?: string | null
  mediaType?: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' | null
  mediaName?: string | null
}

type MediaType = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE'

interface PendingAttachment {
  url: string
  type: MediaType
  name: string
  previewUrl?: string
}

interface ChatThreadProps {
  /** 'dm' : messagerie privée (conversationId) · 'event' : chat d'événement (eventId). */
  kind: 'dm' | 'event'
  id: string
  /** Hauteur fixe du fil (par défaut : remplit l'écran sous l'en-tête). */
  className?: string
}

const ACCEPT = 'image/*,video/mp4,video/webm,video/quicktime,audio/*,application/pdf'

/** Thèmes de conversation — bulles « moi » colorées. */
const THEMES: Record<string, { label: string; bg?: string }> = {
  defaut: { label: 'PlanB' },
  sunset: { label: 'Coucher de soleil', bg: 'linear-gradient(135deg,#f97316,#ec4899)' },
  ocean: { label: 'Océan', bg: 'linear-gradient(135deg,#0ea5e9,#6366f1)' },
  foret: { label: 'Forêt', bg: 'linear-gradient(135deg,#16a34a,#0d9488)' },
  nuit: { label: 'Nuit', bg: 'linear-gradient(135deg,#312e81,#1e293b)' },
}

function fmtTime(s: number) {
  const total = Number.isFinite(s) && s > 0 ? Math.floor(s) : 0
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

/**
 * Lecteur vocal compact — la bulle s'adapte au contenu (spec) :
 * bouton lecture/pause · barre de progression · durée · pastille de vitesse
 * (clic : x1 → x1,5 → x2 → x1).
 */
function AudioPlayer({ url }: { url: string }) {
  const ref = useRef<HTMLAudioElement>(null)
  const [rate, setRate] = useState(1)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)

  const cycle = () => {
    const next = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1
    setRate(next)
    if (ref.current) ref.current.playbackRate = next
  }

  const toggle = async () => {
    const el = ref.current
    if (!el) return
    if (el.paused) {
      try {
        await el.play()
      } catch {
        /* lecture bloquée par le navigateur */
      }
    } else {
      el.pause()
    }
  }

  const pct = duration > 0 ? Math.min(100, (current / duration) * 100) : 0

  return (
    <div className="flex w-[12.5rem] max-w-full items-center gap-1.5">
      <audio
        ref={ref}
        src={url}
        preload="metadata"
        className="hidden"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false)
          setCurrent(0)
        }}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          const el = e.currentTarget
          setDuration(Number.isFinite(el.duration) ? el.duration : 0)
          el.playbackRate = rate
        }}
      />
      <button
        type="button"
        onClick={toggle}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white transition-colors hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
        aria-label={playing ? 'Mettre en pause' : 'Lire le message vocal'}
      >
        {playing ? <Pause className="h-3.5 w-3.5 fill-current" aria-hidden /> : <Play className="ml-0.5 h-3.5 w-3.5 fill-current" aria-hidden />}
      </button>
      <input
        type="range"
        min={0}
        max={100}
        step={0.5}
        value={pct}
        onChange={(e) => {
          const el = ref.current
          if (!el || !duration) return
          const ratio = Number(e.target.value) / 100
          el.currentTime = ratio * duration
          setCurrent(el.currentTime)
        }}
        aria-label="Position de lecture"
        className="h-1.5 min-w-0 flex-1 cursor-pointer accent-primary-600"
      />
      <span className="shrink-0 text-[11px] font-semibold tabular-nums text-fg-muted">
        {fmtTime(playing ? current : duration)}
      </span>
      <button
        type="button"
        onClick={cycle}
        className="shrink-0 rounded-full bg-muted px-1.5 py-1 text-[11px] font-bold leading-none text-fg hover:bg-primary-600 hover:text-white"
        aria-label={`Vitesse de lecture : x${rate === 1.5 ? '1,5' : rate} — cliquer pour changer`}
        title="Vitesse de lecture"
      >
        x{rate === 1.5 ? '1,5' : rate}
      </button>
    </div>
  )
}

/** Pièce jointe : image, vidéo, audio (lecteur + vitesse) ou document. */
function AttachmentView({
  url,
  type,
  name,
  compact,
}: {
  url: string
  type: MediaType | null | undefined
  name?: string | null
  compact?: boolean
}) {
  if (type === 'IMAGE') {
    return (
      <GifImage
        src={url}
        alt={name ?? 'Image'}
        className={cn('max-w-full rounded-lg object-cover', compact ? 'max-h-48' : 'max-h-64')}
      />
    )
  }
  if (type === 'VIDEO') {
    return <video src={url} controls playsInline className="max-h-64 max-w-full rounded-lg" />
  }
  if (type === 'AUDIO') {
    return <AudioPlayer url={url} />
  }
  return (
    <a
      href={url}
      download={name ?? undefined}
      className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
    >
      {type === 'FILE' ? <FileText className="h-4 w-4" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
      <span className="max-w-[16rem] truncate">{name ?? 'Document'}</span>
    </a>
  )
}

/** ✓ envoyé · ✓✓ reçu · ✓✓ vert lu. */
function StatusTicks({ read, delivered }: { read: boolean; delivered: boolean }) {
  const { t } = useLang()
  if (read) {
    return <CheckCheck className="h-4 w-4 text-success-500" aria-label={t('msg_read')} />
  }
  if (delivered) {
    return <CheckCheck className="h-4 w-4" aria-label={t('msg_received')} />
  }
  return <Check className="h-4 w-4" aria-label={t('msg_sent')} />
}

/**
 * Contenu du message, avec traduction à la demande (spec) :
 * la pastille « Traduire » / « Voir l'original » permet d'afficher la version
 * traduite ou d'annuler la traduction, message par message.
 */
function MsgText({
  text,
  translate,
  onToggle,
  lang,
}: {
  text: string
  mine?: boolean
  translate: boolean
  onToggle: () => void
  lang: string
}) {
  const { t } = useLang()
  // Message déjà dans la langue de l'interface ? Inutile de proposer une traduction.
  const sameLang = detectLang(text) === lang
  const active = translate && !sameLang
  const { text: shown, loading } = useTranslation(text, active, lang)
  return (
    <>
      <span className="whitespace-pre-wrap break-words">{shown}</span>
      {!sameLang && (
        <button
          type="button"
          onClick={onToggle}
          className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-fg-muted transition-colors hover:text-primary-600"
          aria-pressed={active}
          title={active ? t('trans_original') : t('trans_translate')}
        >
          <Languages className="h-3 w-3" aria-hidden />
          {loading ? t('trans_loading') : active ? t('trans_original') : t('trans_translate')}
        </button>
      )}
    </>
  )
}

export function ChatThread({ kind, id, className }: ChatThreadProps) {
  const { lang, t } = useLang()
  const { user } = useCurrentUser()
  const router = useRouter()
  const [input, setInput] = useState('')
  const [attachment, setAttachment] = useState<PendingAttachment | null>(null)
  const [sending, setSending] = useState(false)
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showGif, setShowGif] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [mediaOnly, setMediaOnly] = useState(false)
  // Traduction automatique de la conversation (DM et événements) — persistée
  const [autoTranslate, setAutoTranslate] = useState(false)
  const [manualTranslate, setManualTranslate] = useState<Record<string, boolean>>({})
  useEffect(() => {
    try {
      setAutoTranslate(window.localStorage.getItem('planb_autotranslate') === '1')
    } catch {
      /* stockage indisponible */
    }
  }, [])
  const toggleAutoTranslate = () => {
    setAutoTranslate((v) => {
      const next = !v
      try {
        window.localStorage.setItem('planb_autotranslate', next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }
  const isTranslated = (id: string) => manualTranslate[id] ?? autoTranslate
  const toggleMsgTranslate = (id: string) =>
    setManualTranslate((prev) => ({ ...prev, [id]: !(prev[id] ?? autoTranslate) }))
  const [menuSection, setMenuSection] = useState<null | 'main' | 'mute' | 'ephemeral' | 'theme' | 'members' | 'report' | 'block' | 'erase' | 'group'>(null)
  const [actionMsg, setActionMsg] = useState<ChatMessage | null>(null)
  const [reportText, setReportText] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const areaRef = useRef<HTMLTextAreaElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const [recording, setRecording] = useState(false)
  const [recSeconds, setRecSeconds] = useState(0)

  // Appel audio/visio (DM uniquement)
  const [call, setCall] = useState<{ mode: CallMode; isCaller: boolean } | null>(null)

  const meta = trpc.messages.eventChat.useQuery(
    { eventId: id },
    { enabled: kind === 'event' && !!user, refetchInterval: false },
  )
  const dm = trpc.messages.messages.useQuery(
    { conversationId: id, limit: 1 },
    { enabled: kind === 'dm', refetchInterval: false },
  )

  const dmData = kind === 'dm' ? dm.data : undefined
  const otherMember = kind === 'dm' ? (dmData?.members ?? []).find((m) => m.id !== user?.id) ?? null : null
  const iAmAdmin = kind === 'dm' ? dmData?.myRole === 'admin' : false

  const { incoming, accept: acceptCall, decline: declineCall } = useIncomingCall(
    kind === 'dm' ? id : null,
    user ? `${user.firstName} ${user.lastName}` : '',
    (mode) => setCall({ mode, isCaller: false }),
  )

  const evQuery = trpc.messages.eventChat.useQuery(
    { eventId: id, limit: 60 },
    { enabled: kind === 'event' && !!user, refetchInterval: 5000 },
  )
  const dmQuery = trpc.messages.messages.useQuery(
    { conversationId: id, limit: 60 },
    { enabled: kind === 'dm' && !!user, refetchInterval: 5000 },
  )

  const messages: ChatMessage[] =
    kind === 'event'
      ? (evQuery.data ?? []).map((m) => ({
          id: m.id,
          content: m.content,
          createdAt: m.createdAt,
          author: m.user,
          mediaUrl: m.mediaUrl,
          mediaType: m.mediaType,
          mediaName: null,
        }))
      : (dmQuery.data?.messages ?? []).map((m) => ({
          id: m.id,
          content: m.content,
          createdAt: m.createdAt,
          author: m.sender,
          mediaUrl: m.mediaUrl,
          mediaType: m.mediaType,
          mediaName: m.mediaName,
        }))
  const refetchMessages = () => (kind === 'event' ? evQuery.refetch() : dmQuery.refetch())

  const theme = THEMES[dmData?.theme ?? 'defaut'] ?? { label: 'PlanB' as const }
  const readAt = dmData?.otherReadAt ? new Date(dmData.otherReadAt).getTime() : 0
  const deliveredAt = dmData?.otherDeliveredAt ? new Date(dmData.otherDeliveredAt).getTime() : 0

  const sendEvent = trpc.messages.sendEventMessage.useMutation()
  const sendDm = trpc.messages.send.useMutation()
  const sending2 = kind === 'event' ? sendEvent.isPending : sendDm.isPending

  // ---- Mutations menu ----
  const setMute = trpc.messages.setMute.useMutation({ onSuccess: () => toast.success('Notifications mises à jour') })
  const setTheme = trpc.messages.setTheme.useMutation()
  const setEphemeral = trpc.messages.setEphemeral.useMutation()
  const hideMessage = trpc.messages.hideMessage.useMutation({
    onSuccess: () => {
      setActionMsg(null)
      void refetchMessages()
    },
  })
  const deleteForAll = trpc.messages.deleteForAll.useMutation({
    onSuccess: () => {
      setActionMsg(null)
      void refetchMessages()
    },
  })
  const eraseConversation = trpc.messages.eraseConversation.useMutation({
    onSuccess: () => {
      setMenuSection(null)
      router.push('/messages')
    },
  })
  const report = trpc.messages.report.useMutation({
    onSuccess: () => {
      setMenuSection(null)
      setReportText('')
      toast.success('Signalement transmis aux administrateurs')
    },
  })
  const blockUser = trpc.messages.blockUser.useMutation({
    onSuccess: () => {
      setMenuSection(null)
      toast.success('Utilisateur bloqué')
      router.push('/messages')
    },
  })
  const setAdmin = trpc.messages.setAdmin.useMutation({ onSuccess: () => void dm.refetch() })
  const setGroupAvatar = trpc.messages.setGroupAvatar.useMutation({ onSuccess: () => void dm.refetch() })

  useEffect(() => {
    const el = scrollerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, kind])

  const sendText = async (
    text: string,
    media?: { url: string; type: MediaType; name?: string },
  ) => {
    const trimmed = text.trim()
    if (!trimmed && !media) return
    setSending(true)
    setAttachmentError(null)
    try {
      if (kind === 'event') {
        await sendEvent.mutateAsync({
          eventId: id,
          content: trimmed,
          mediaUrl: media?.url,
          mediaType: media?.type,
        })
      } else {
        await sendDm.mutateAsync({
          conversationId: id,
          content: trimmed,
          mediaUrl: media?.url,
          mediaType: media?.type,
          mediaName: media?.name,
        })
      }
      setInput('')
      if (areaRef.current) areaRef.current.style.height = 'auto'
      setAttachment(null)
      setShowEmoji(false)
      setShowGif(false)
      await refetchMessages()
      const el = scrollerRef.current
      if (el) el.scrollTop = el.scrollHeight
    } catch (e) {
      setAttachmentError(e instanceof Error ? e.message : "L'envoi a échoué")
    } finally {
      setSending(false)
    }
  }

  const attach = async (file: File) => {
    setAttachmentError(null)
    setSending(true)
    try {
      const url = await uploadToStorage(file, 'message')
      const type: MediaType = file.type.startsWith('image/')
        ? 'IMAGE'
        : file.type.startsWith('video/')
          ? 'VIDEO'
          : file.type.startsWith('audio/')
            ? 'AUDIO'
            : 'FILE'
      setAttachment({ url, type, name: file.name })
    } catch (e) {
      setAttachmentError(e instanceof Error ? e.message : 'Téléversement impossible')
    } finally {
      setSending(false)
    }
  }

  // ---- Message vocal ----
  useEffect(() => {
    if (!recording) return
    const t = window.setInterval(() => setRecSeconds((s) => s + 1), 1000)
    return () => window.clearInterval(t)
  }, [recording])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      chunksRef.current = []
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' })
        const ext = (rec.mimeType || '').includes('mp4') ? 'm4a' : 'webm'
        const file = new File([blob], `vocal-${Date.now()}.${ext}`, { type: blob.type || 'audio/webm' })
        void attachAudio(file)
      }
      recorderRef.current = rec
      rec.start()
      setRecSeconds(0)
      setRecording(true)
    } catch {
      toast.error('Micro indisponible')
    }
  }

  const stopRecording = () => {
    recorderRef.current?.stop()
    recorderRef.current = null
    setRecording(false)
  }

  const attachAudio = async (file: File) => {
    setSending(true)
    try {
      const url = await uploadToStorage(file, 'voice')
      await sendText('Message vocal', { url, type: 'AUDIO', name: file.name })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Envoi vocal impossible')
    } finally {
      setSending(false)
    }
  }

  const visible = messages.filter((m) => {
    if (mediaOnly && !m.mediaUrl) return false
    if (searchQ && !m.content.toLowerCase().includes(searchQ.toLowerCase())) return false
    return true
  })

  const isBlockedTarget = kind === 'dm' && !!otherMember
  const canDeleteForAll = (m: ChatMessage) =>
    m.author.id === user?.id && Date.now() - new Date(m.createdAt).getTime() < 60 * 60 * 1000

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      {/* Barre d'outils de la conversation */}
      <div className="flex items-center justify-end gap-1 border-b border-border px-2 py-1">
        <Button
          variant={autoTranslate ? 'default' : 'ghost'}
          size="sm"
          onClick={toggleAutoTranslate}
          aria-pressed={autoTranslate}
          title={
            autoTranslate ? t('trans_auto_on_title') : t('trans_auto_title')
          }
        >
          <Languages className="h-4 w-4" aria-hidden />
          <span className="sr-only sm:not-sr-only sm:ml-1">
            {autoTranslate ? t('trans_on') : t('trans_translate')}
          </span>
        </Button>
        {kind === 'dm' && (
          <>
            <Button variant="ghost" size="icon" aria-label={t('msg_call')} onClick={() => setCall({ mode: 'audio', isCaller: true })}>
              <Phone className="h-4 w-4" aria-hidden />
            </Button>
            <Button variant="ghost" size="icon" aria-label={t('msg_visio')} onClick={() => setCall({ mode: 'video', isCaller: true })}>
              <Video className="h-4 w-4" aria-hidden />
            </Button>
          </>
        )}
        <Button
          variant={menuSection ? 'secondary' : 'ghost'}
          size="icon"
          aria-label={t('msg_menu')}
          aria-expanded={!!menuSection}
          onClick={() => setMenuSection(menuSection ? null : 'main')}
        >
          <MoreVertical className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      {/* Panneau menu 3 points */}
      {menuSection && kind === 'dm' && (
        <div className="border-b border-border bg-muted/40 p-3 text-sm">
          {menuSection === 'main' && (
            <div className="grid gap-1">
              {dmData?.isGroup ? (
                <button type="button" className="flex items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-muted" onClick={() => setMenuSection('members')}>
                  <Users className="h-4 w-4" aria-hidden /> {t('msg_members')}
                </button>
              ) : (
                otherMember && (
                  <Link href={`/u/${otherMember.id}`} className="flex items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-muted" onClick={() => setMenuSection(null)}>
                    <Users className="h-4 w-4" aria-hidden /> {t('msg_profile_of')} {otherMember.firstName}
                  </Link>
                )
              )}
              <button type="button" className="flex items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-muted" onClick={() => { setSearchOpen(true); setMenuSection(null) }}>
                <Search className="h-4 w-4" aria-hidden /> {t('msg_search')}
              </button>
              <button type="button" className="flex items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-muted" onClick={() => { setMediaOnly((v) => !v); setMenuSection(null) }}>
                <ImageIcon className="h-4 w-4" aria-hidden /> {mediaOnly ? t('msg_title') : t('msg_media')}
              </button>
              <button type="button" className="flex items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-muted" onClick={() => setMenuSection('mute')}>
                <VolumeX className="h-4 w-4" aria-hidden /> {t('msg_mute')}
              </button>
              <button type="button" className="flex items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-muted" onClick={() => setMenuSection('ephemeral')}>
                <CheckCheck className="h-4 w-4" aria-hidden /> {t('msg_ephemeral')}
              </button>
              <button type="button" className="flex items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-muted" onClick={() => setMenuSection('theme')}>
                <Smile className="h-4 w-4" aria-hidden /> {t('msg_theme')}
              </button>
              <button type="button" className="flex items-center gap-2 rounded-lg px-2 py-2 text-left text-danger-600 hover:bg-muted" onClick={() => setMenuSection('report')}>
                <Flag className="h-4 w-4" aria-hidden /> {t('msg_report')}
              </button>
              {isBlockedTarget && (
                <button type="button" className="flex items-center gap-2 rounded-lg px-2 py-2 text-left text-danger-600 hover:bg-muted" onClick={() => setMenuSection('block')}>
                  <Ban className="h-4 w-4" aria-hidden /> {t('msg_block')} {otherMember?.firstName}
                </button>
              )}
              <button type="button" className="flex items-center gap-2 rounded-lg px-2 py-2 text-left text-danger-600 hover:bg-muted" onClick={() => setMenuSection('erase')}>
                <Trash2 className="h-4 w-4" aria-hidden /> {t('msg_erase_conv')}
              </button>
            </div>
          )}

          {menuSection === 'mute' && (
            <div className="grid gap-1">
              <p className="mb-1 font-medium">Notifications en sourdine</p>
              {[
                { label: '8 heures', hours: 8 },
                { label: '1 jour', hours: 24 },
                { label: '1 semaine', hours: 168 },
                { label: 'Toujours', hours: 876000 },
              ].map((o) => (
                <button
                  key={o.hours}
                  type="button"
                  className="rounded-lg px-2 py-2 text-left hover:bg-muted"
                  onClick={() => {
                    setMute.mutate({ conversationId: id, hours: o.hours })
                    setMenuSection(null)
                  }}
                >
                  {o.label}
                </button>
              ))}
              <button
                type="button"
                className="rounded-lg px-2 py-2 text-left font-medium hover:bg-muted"
                onClick={() => {
                  setMute.mutate({ conversationId: id, hours: null })
                  setMenuSection(null)
                }}
              >
                Annuler le mode silencieux
              </button>
            </div>
          )}

          {menuSection === 'ephemeral' && (
            <div className="grid gap-1">
              <p className="mb-1 font-medium">Les messages disparaissent pour tout le monde</p>
              {([
                { label: '24 heures', hours: 24 },
                { label: '7 jours', hours: 168 },
                { label: '30 jours', hours: 720 },
                { label: 'Désactivé', hours: null },
              ] as { label: string; hours: 24 | 168 | 720 | null }[]).map((o) => (
                <button
                  key={String(o.hours)}
                  type="button"
                  className={cn(
                    'rounded-lg px-2 py-2 text-left hover:bg-muted',
                    (dmData?.ephemeralHours ?? null) === o.hours && 'bg-muted font-medium',
                  )}
                  onClick={() => {
                    setEphemeral.mutate({ conversationId: id, hours: o.hours })
                    setMenuSection(null)
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}

          {menuSection === 'theme' && (
            <div className="grid gap-1">
              <p className="mb-1 font-medium">{t('msg_theme')}</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(THEMES).map(([key, t]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setTheme.mutate({ conversationId: id, theme: key })
                      void dm.refetch()
                      setMenuSection(null)
                    }}
                    className={cn(
                      'flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-medium',
                      (dmData?.theme ?? 'defaut') === key && 'ring-2 ring-primary',
                    )}
                  >
                    <span
                      className="h-4 w-4 rounded-full border border-border"
                      style={{ background: t.bg ?? 'var(--primary, #7c3aed)' }}
                      aria-hidden
                    />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {menuSection === 'members' && (
            <div className="grid gap-1">
              <p className="mb-1 font-medium">{t('msg_members')}</p>
              {(dmData?.members ?? []).map((m) => {
                const role = (dmData?.memberRoles ?? []).find((r) => r.userId === m.id)?.role ?? 'member'
                return (
                  <div key={m.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5">
                    <Avatar src={m.avatarUrl} name={m.firstName} className="h-7 w-7" />
                    <span className="flex-1">
                      {m.firstName} {m.lastName}
                      {m.id === user?.id && ' (moi)'}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase">
                      {role === 'admin' ? 'Admin' : 'Membre'}
                    </span>
                    {iAmAdmin && m.id !== user?.id && (
                      <button
                        type="button"
                        className="text-xs font-medium text-primary hover:underline"
                        onClick={() => setAdmin.mutate({ conversationId: id, userId: m.id, admin: role !== 'admin' })}
                      >
                        {role === 'admin' ? 'Retirer admin' : 'Rendre admin'}
                      </button>
                    )}
                  </div>
                )
              })}
              {iAmAdmin && (
                <label className="mt-1 flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left font-medium text-primary hover:bg-muted">
                  <Camera className="h-4 w-4" aria-hidden /> Changer la photo du groupe
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={async (e) => {
                      const f = e.target.files?.[0]
                      if (!f) return
                      try {
                        const url = await uploadToStorage(f, 'avatar')
                        setGroupAvatar.mutate({ conversationId: id, avatarUrl: url })
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : 'Upload impossible')
                      }
                    }}
                  />
                </label>
              )}
            </div>
          )}

          {menuSection === 'report' && (
            <div className="grid gap-2">
              <p className="font-medium">Signaler cette discussion aux administrateurs</p>
              <textarea
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                rows={3}
                placeholder="Décris le problème (harcèlement, spam, contenu inapproprié…)"
                className="rounded-lg border border-border bg-background p-2 text-sm outline-none"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={reportText.trim().length < 3 || report.isPending}
                  onClick={() => report.mutate({ conversationId: id, reason: reportText.trim() })}
                >
                  {report.isPending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden />}
                  Envoyer le signalement
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setMenuSection(null)}>
                  Annuler
                </Button>
              </div>
            </div>
          )}

          {menuSection === 'block' && (
            <div className="grid gap-2">
              <p className="font-medium">
                Bloquer {otherMember?.firstName} ? Il ne verra plus ton profil ni tes messages, et ton
                pseudo disparaîtra des événements communs (ton compte reste compté dans les inscrits).
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={blockUser.isPending || !otherMember}
                  onClick={() => otherMember && blockUser.mutate({ userId: otherMember.id })}
                >
                  {blockUser.isPending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden />}
                  Bloquer
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setMenuSection(null)}>
                  Annuler
                </Button>
              </div>
            </div>
          )}

          {menuSection === 'erase' && (
            <div className="grid gap-2">
              <p className="font-medium">Effacer la discussion ? Elle disparaîtra de ta liste (ton interlocuteur la conserve).</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={eraseConversation.isPending}
                  onClick={() => eraseConversation.mutate({ conversationId: id })}
                >
                  {eraseConversation.isPending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden />}
                  Effacer
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setMenuSection(null)}>
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recherche dans la discussion */}
      {searchOpen && (
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
          <input
            autoFocus
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder={t('msg_search_ph')}
            className="h-8 flex-1 bg-transparent text-sm outline-none"
            aria-label={t('msg_search_ph')}
          />
          <Button variant="ghost" size="icon" aria-label="Fermer la recherche" onClick={() => { setSearchOpen(false); setSearchQ('') }}>
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      )}

      <div
        ref={scrollerRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3"
        role="log"
        aria-live="polite"
        // Le contenu des messages a ses propres boutons « Traduire / Original »
        data-no-translate
        style={theme.bg ? { backgroundImage: theme.bg } : undefined}
      >
        {kind === 'event' && meta.isLoading && <LoadingSpinner label="Chargement du chat" />}
        {kind === 'dm' && dm.isLoading && <LoadingSpinner label="Chargement de la conversation" />}
        {kind === 'event' && dmData === undefined && meta.data && (
          <p className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            Le chat s&apos;ouvre aux participants inscrits à l&apos;événement.
          </p>
        )}
        {visible.length === 0 && !meta.isLoading && !dm.isLoading && (
          <p className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            {searchQ || mediaOnly ? 'Aucun message ne correspond.' : 'Aucun message pour le moment — lance la conversation !'}
          </p>
        )}

        {visible.map((m) => {
          const mine = m.author.id === user?.id
          const created = new Date(m.createdAt).getTime()
          // Vocal : pas de libellé dans la bulle (spec) — juste le lecteur
          const isVoice = m.mediaType === 'AUDIO'
          const caption = m.content && !isVoice ? m.content : null
          const noCaption = !!m.mediaUrl && !caption && m.mediaType !== 'FILE'
          return (
            <div key={m.id} className={cn('group flex items-end gap-2', mine && 'flex-row-reverse')}>
              {!mine && <Avatar src={m.author.avatarUrl} name={m.author.firstName} className="h-8 w-8 shrink-0" />}
              <div className={cn('flex w-fit min-w-0 max-w-[85%] flex-col sm:max-w-[70%]', mine ? 'items-end' : 'items-start')}>
                <div
                  className={cn(
                    'w-fit max-w-full rounded-2xl border border-border bg-card text-left text-sm shadow-sm',
                    noCaption ? 'p-1.5' : 'px-3 py-2',
                    mine ? 'rounded-br-sm' : 'rounded-bl-sm',
                  )}
                >
                  {!mine && kind === 'event' && (
                    <p className="mb-0.5 text-xs font-semibold text-primary">
                      {m.author.firstName} {m.author.lastName}
                    </p>
                  )}
                  {m.mediaUrl ? (
                    <div className="w-fit max-w-full">
                      <AttachmentView url={m.mediaUrl} type={m.mediaType} name={m.mediaName} />
                    </div>
                  ) : null}
                  {caption && (
                    <p className={cn(m.mediaUrl && 'mt-1.5')}>
                      <MsgText
                        text={caption}
                        mine={mine}
                        translate={isTranslated(m.id)}
                        onToggle={() => toggleMsgTranslate(m.id)}
                        lang={lang}
                      />
                    </p>
                  )}
                  {dmData?.ephemeralHours && (
                    <p className={cn('mt-1 flex items-center gap-1 text-[10px] text-muted-foreground', mine && 'justify-end')}>
                      <Loader2 className="h-2.5 w-2.5" aria-hidden /> disparaît dans{' '}
                      {dmData.ephemeralHours >= 720
                        ? '30 j'
                        : dmData.ephemeralHours >= 168
                          ? '7 j'
                          : '24 h'}
                    </p>
                  )}
                </div>
                <p className={cn('mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground', mine && 'justify-end')}>
                  <time dateTime={new Date(m.createdAt).toISOString()}>{formatRelative(m.createdAt)}</time>
                  {kind === 'dm' && mine && (
                    <StatusTicks read={readAt >= created} delivered={deliveredAt >= created} />
                  )}
                </p>
              </div>
              {/* Actions sur le message */}
              <button
                type="button"
                onClick={() => setActionMsg(m)}
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-60 hover:bg-muted hover:opacity-100 md:opacity-0 md:group-hover:opacity-100',
                )}
                aria-label={`Options du message de ${m.author.firstName}`}
              >
                <MoreVertical className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          )
        })}
      </div>

      {/* Actions message : supprimer pour moi / pour tous (1h) */}
      {actionMsg && (
        <div className="border-t border-border bg-muted/60 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-auto max-w-[50%] truncate text-xs text-muted-foreground">
              « {actionMsg.content || actionMsg.mediaName || 'Média'} »
            </p>
            <Button size="sm" variant="outline" disabled={hideMessage.isPending} onClick={() => hideMessage.mutate({ messageId: actionMsg.id })}>
              {t('msg_delete_me')}
            </Button>
            {canDeleteForAll(actionMsg) && (
              <Button size="sm" variant="destructive" disabled={deleteForAll.isPending} onClick={() => deleteForAll.mutate({ messageId: actionMsg.id })}>
                {t('msg_delete_all')}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setActionMsg(null)}>
              Fermer
            </Button>
          </div>
          {actionMsg.author.id !== user?.id && (
            <p className="mt-1 text-[11px] text-muted-foreground">Le message d&apos;un autre membre ne peut être supprimé que pour toi.</p>
          )}
        </div>
      )}

      {attachmentError && (
        <p role="alert" className="px-3 pt-2 text-sm text-danger-600">
          {attachmentError}
        </p>
      )}

      {/* Enregistrement vocal en cours */}
      {recording && (
        <div className="flex items-center gap-3 border-t border-border px-3 py-2">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger-500 opacity-75" aria-hidden />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-danger-500" aria-hidden />
          </span>
          <p className="text-sm font-medium" aria-live="polite">
            Enregistrement… {Math.floor(recSeconds / 60)}:{String(recSeconds % 60).padStart(2, '0')}
          </p>
          <Button size="sm" variant="destructive" className="ml-auto" onClick={stopRecording}>
            Stop & envoyer
          </Button>
        </div>
      )}

      {/* Composer — toujours visible en bas de la fenêtre */}
      <div className="relative z-20 shrink-0 border-t border-border bg-card p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:pb-2">
        {showEmoji && (
          <EmojiPicker
            onPick={(e: string) => setInput((v) => v + e)}
            onClose={() => setShowEmoji(false)}
          />
        )}
        {showGif && (
          <GifPicker
            onClose={() => setShowGif(false)}
            onPick={(url, text) => {
              if (url) void sendText('', { url, type: 'IMAGE', name: 'GIF' })
              else if (text) void sendText(text)
            }}
          />
        )}

        {attachment && (
          <div className="mb-2 flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-2">
            <div className="min-w-0 flex-1">
              <AttachmentView url={attachment.url} type={attachment.type} name={attachment.name} compact />
              <p className="mt-1 truncate text-xs text-muted-foreground">{attachment.name}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAttachment(null)}
              aria-label="Retirer la pièce jointe"
            >
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        )}

        {kind === 'dm' && (dmData?.ephemeralHours ?? 0) > 0 && (
          <p className="mb-1.5 px-1 text-[11px] font-medium text-muted-foreground">
            Messages éphémères activés — suppression automatique pour tout le monde.
          </p>
        )}

        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          aria-hidden
          tabIndex={-1}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void attach(f)
            e.target.value = ''
          }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          aria-hidden
          tabIndex={-1}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void attach(f)
            e.target.value = ''
          }}
        />

        {/* Ligne d'icônes : GIF/sticker · photo · pièce jointe · vocal (spec) */}
        <div className="mb-1 flex items-center gap-0.5">
          <Button
            type="button"
            variant={showGif ? 'secondary' : 'ghost'}
            size="icon"
            className="h-10 w-10"
            aria-label={t('msg_sticker')}
            title={t('msg_sticker')}
            aria-expanded={showGif}
            onClick={() => { setShowGif((v) => !v); setShowEmoji(false) }}
          >
            <Sticker className="h-[18px] w-[18px]" aria-hidden />
          </Button>
          <Button
            type="button"
            variant={showEmoji ? 'secondary' : 'ghost'}
            size="icon"
            className="h-10 w-10"
            aria-label="Insérer un emoji"
            aria-expanded={showEmoji}
            onClick={() => { setShowEmoji((v) => !v); setShowGif(false) }}
          >
            <Smile className="h-[18px] w-[18px]" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            aria-label={t('msg_photo')}
            title={t('msg_photo')}
            onClick={() => cameraRef.current?.click()}
          >
            <Camera className="h-[18px] w-[18px]" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            aria-label={t('msg_attach')}
            title={t('msg_attach')}
            onClick={() => fileRef.current?.click()}
          >
            <Paperclip className="h-[18px] w-[18px]" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            aria-label={recording ? "Arrêter" : t('msg_voice')}
            title={t('msg_voice')}
            onClick={() => (recording ? stopRecording() : void startRecording())}
          >
            <Mic className={cn('h-[18px] w-[18px]', recording && 'text-danger-500')} aria-hidden />
          </Button>
        </div>

        {/* Ligne de saisie : texte auto-agrandi + bouton envoyer (spec) */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void sendText(input, attachment ?? undefined)
          }}
          className="flex items-end gap-1.5"
        >
          <textarea
            ref={areaRef}
            value={input}
            rows={1}
            onChange={(e) => {
              setInput(e.target.value)
              const el = e.target
              el.style.height = 'auto'
              el.style.height = `${Math.min(el.scrollHeight, 140)}px`
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void sendText(input, attachment ?? undefined)
              }
            }}
            placeholder={kind === 'event' ? t('msg_write_group') : t('msg_write')}
            className="max-h-36 min-h-10 min-w-0 flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none"
            aria-label="Message"
          />
          <Button
            type="submit"
            disabled={sending || sending2 || (!input.trim() && !attachment)}
            aria-label="Envoyer le message"
          >
            {sending || sending2 ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Send className="h-4 w-4" aria-hidden />
            )}
          </Button>
        </form>
      </div>

      {/* Appels */}
      {incoming && otherMember && (
        <IncomingCallOverlay
          peerName={`${otherMember.firstName} ${otherMember.lastName}`}
          peerAvatar={otherMember.avatarUrl}
          mode={incoming.mode}
          onAccept={acceptCall}
          onDecline={declineCall}
        />
      )}
      {call && (
        <CallOverlay
          conversationId={id}
          mode={call.mode}
          peerName={otherMember ? `${otherMember.firstName} ${otherMember.lastName}` : 'Appel'}
          peerAvatar={otherMember?.avatarUrl ?? null}
          isCaller={call.isCaller}
          onEnd={() => setCall(null)}
        />
      )}
    </div>
  )
}
