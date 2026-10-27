'use client'

import { RealtimeClient } from '@supabase/realtime-js'
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabaseUpload'

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }],
}

export type CallMode = 'audio' | 'video'

interface SignalPayload {
  type: 'invite' | 'accept' | 'decline' | 'offer' | 'answer' | 'ice' | 'end'
  from: string
  fromName: string
  mode?: CallMode
  sdp?: string
  candidate?: unknown
}

/** Canal d'appel partagé (signalisation via Supabase Realtime). */
export function callChannelName(conversationId: string) {
  return `planb-call-${conversationId}`
}

export function createCallClient() {
  return new RealtimeClient(SUPABASE_URL, { params: { apikey: SUPABASE_ANON_KEY } })
}

/** Appel audio/vidéo WebRTC — signalisation temps réel Supabase. */
export function CallOverlay({
  conversationId,
  mode,
  peerName,
  peerAvatar,
  isCaller,
  onEnd,
}: {
  conversationId: string
  mode: CallMode
  peerName: string
  peerAvatar: string | null
  isCaller: boolean
  onEnd: () => void
}) {
  const localVideo = React.useRef<HTMLVideoElement>(null)
  const remoteVideo = React.useRef<HTMLVideoElement>(null)
  const pcRef = React.useRef<RTCPeerConnection | null>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const channelRef = React.useRef<ReturnType<ReturnType<typeof createCallClient>['channel']> | null>(null)
  const [state, setState] = React.useState<'calling' | 'connecting' | 'connected' | 'error'>('calling')
  const [camOn, setCamOn] = React.useState(mode === 'video')
  const [micOn, setMicOn] = React.useState(true)
  const endedRef = React.useRef(false)

  const send = React.useCallback((payload: Omit<SignalPayload, 'from' | 'fromName'>) => {
    void channelRef.current?.send({
      type: 'broadcast',
      event: 'signal',
      payload: { ...payload, from: 'me', fromName: '' } as SignalPayload,
    })
  }, [])

  const closeAll = React.useCallback(() => {
    if (endedRef.current) return
    endedRef.current = true
    try {
      send({ type: 'end' })
    } catch {
      /* déjà fermé */
    }
    pcRef.current?.close()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    void channelRef.current?.unsubscribe()
    onEnd()
  }, [onEnd, send])

  React.useEffect(() => {
    let cancelled = false

    const start = async () => {
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: mode === 'video',
        })
      } catch {
        setState('error')
        return
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      streamRef.current = stream
      if (localVideo.current) localVideo.current.srcObject = stream

      const client = createCallClient()
      const channel = client.channel(callChannelName(conversationId))
      channelRef.current = channel

      const pc = new RTCPeerConnection(ICE_SERVERS)
      pcRef.current = pc
      stream.getTracks().forEach((t) => pc.addTrack(t, stream))
      pc.ontrack = (e) => {
        if (remoteVideo.current) remoteVideo.current.srcObject = e.streams[0] ?? null
        setState('connected')
      }
      pc.onicecandidate = (e) => {
        if (e.candidate) send({ type: 'ice', candidate: e.candidate.toJSON() })
      }

      channel.on('broadcast', { event: 'signal' }, ({ payload }) => {
        const p = payload as SignalPayload
        if (p.type === 'end') {
          closeAll()
          return
        }
        if (p.type === 'accept' && isCaller) {
          // L'autre accepte : petit délai pour qu'il rejoigne le canal, puis on émet l'offre
          setState('connecting')
          window.setTimeout(() => {
            void pc
              .createOffer()
              .then((o) => pc.setLocalDescription(o))
              .then(() => send({ type: 'offer', sdp: pc.localDescription?.sdp }))
          }, 1500)
        }
        if (p.type === 'offer') {
          setState('connecting')
          void pc
            .setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: p.sdp ?? '' }))
            .then(() => pc.createAnswer())
            .then((a) => pc.setLocalDescription(a))
            .then(() => send({ type: 'answer', sdp: pc.localDescription?.sdp }))
        }
        if (p.type === 'answer') {
          void pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: p.sdp ?? '' }))
        }
        if (p.type === 'ice' && p.candidate) {
          void pc.addIceCandidate(new RTCIceCandidate(p.candidate as RTCIceCandidateInit))
        }
      })

      await channel.subscribe((status) => {
        if (cancelled || status !== 'SUBSCRIBED') return
        send({ type: 'invite', mode })
      })
    }

    void start()
    return () => {
      cancelled = true
      endedRef.current = true
      pcRef.current?.close()
      streamRef.current?.getTracks().forEach((t) => t.stop())
      void channelRef.current?.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleCam = () => {
    const s = streamRef.current
    if (!s) return
    const next = !camOn
    s.getVideoTracks().forEach((t) => (t.enabled = next))
    setCamOn(next)
  }
  const toggleMic = () => {
    const s = streamRef.current
    if (!s) return
    const next = !micOn
    s.getAudioTracks().forEach((t) => (t.enabled = next))
    setMicOn(next)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 text-white" role="dialog" aria-modal="true" aria-label="Appel en cours">
      {/* Vidéo distante */}
      <video ref={remoteVideo} autoPlay playsInline className="absolute inset-0 h-full w-full object-cover" />

      {/* Ma vidéo (piP) */}
      {mode === 'video' && (
        <video
          ref={localVideo}
          autoPlay
          playsInline
          muted
          className="absolute right-3 top-3 h-36 w-24 rounded-2xl border-2 border-white/30 object-cover shadow-lg"
        />
      )}
      {mode === 'audio' && <video ref={localVideo} autoPlay playsInline muted className="hidden" />}

      <div className="relative z-10 flex flex-col items-center gap-3">
        {mode === 'audio' && <Avatar src={peerAvatar} name={peerName} className="h-24 w-24" />}
        <p className="text-xl font-bold drop-shadow">{peerName}</p>
        <p className="text-sm text-white/80">
          {state === 'calling' && 'Appel en cours…'}
          {state === 'connecting' && 'Connexion…'}
          {state === 'connected' && 'En ligne'}
          {state === 'error' && 'Micro/caméra indisponibles'}
        </p>
      </div>

      <div className="absolute bottom-10 z-10 flex items-center gap-4">
        <button
          type="button"
          onClick={toggleMic}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur"
          aria-label={micOn ? 'Couper le micro' : 'Activer le micro'}
        >
          {micOn ? <Mic className="h-6 w-6" aria-hidden /> : <MicOff className="h-6 w-6 text-danger-400" aria-hidden />}
        </button>
        <button
          type="button"
          onClick={closeAll}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-danger-500 shadow-lg"
          aria-label="Raccrocher"
        >
          <PhoneOff className="h-7 w-7" aria-hidden />
        </button>
        {mode === 'video' ? (
          <button
            type="button"
            onClick={toggleCam}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur"
            aria-label={camOn ? 'Couper la caméra' : 'Activer la caméra'}
          >
            {camOn ? <Video className="h-6 w-6" aria-hidden /> : <VideoOff className="h-6 w-6 text-danger-400" aria-hidden />}
          </button>
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10" aria-hidden>
            <Phone className="h-6 w-6" />
          </span>
        )}
      </div>

      {state === 'error' && (
        <Button variant="secondary" className="absolute bottom-32 z-10" onClick={closeAll}>
          Fermer
        </Button>
      )}
    </div>
  )
}

/** Écoute des invitations d'appel entrant sur une conversation. */
export function useIncomingCall(
  conversationId: string | null,
  myName: string,
  onAccept: (mode: CallMode) => void,
) {
  const [incoming, setIncoming] = React.useState<{ mode: CallMode } | null>(null)
  const channelRef = React.useRef<ReturnType<ReturnType<typeof createCallClient>['channel']> | null>(null)

  React.useEffect(() => {
    if (!conversationId) return
    const client = createCallClient()
    const channel = client.channel(callChannelName(conversationId))
    channelRef.current = channel
    channel.on('broadcast', { event: 'signal' }, ({ payload }) => {
      const p = payload as SignalPayload
      if (p.type === 'invite' && p.from !== 'me') {
        setIncoming({ mode: p.mode ?? 'audio' })
      }
      if (p.type === 'end') setIncoming(null)
    })
    void channel.subscribe()
    return () => {
      void channel.unsubscribe()
    }
  }, [conversationId, myName])

  const accept = () => {
    if (!incoming) return
    // On prévient l'appelant qu'on accepte (il émettra l'offre)
    void channelRef.current?.send({
      type: 'broadcast',
      event: 'signal',
      payload: { type: 'accept', from: 'me', fromName: myName } as SignalPayload,
    })
    onAccept(incoming.mode)
    setIncoming(null)
  }
  const decline = () => {
    void channelRef.current?.send({
      type: 'broadcast',
      event: 'signal',
      payload: { type: 'end', from: 'me', fromName: myName } as SignalPayload,
    })
    setIncoming(null)
  }

  return { incoming, accept, decline }
}

/** Fenêtre d'appel entrant. */
export function IncomingCallOverlay({
  peerName,
  peerAvatar,
  mode,
  onAccept,
  onDecline,
}: {
  peerName: string
  peerAvatar: string | null
  mode: CallMode
  onAccept: () => void
  onDecline: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black/90 text-white" role="alertdialog" aria-modal="true" aria-label="Appel entrant">
      <Avatar src={peerAvatar} name={peerName} className="h-28 w-28" />
      <div className="text-center">
        <p className="text-2xl font-bold">{peerName}</p>
        <p className="text-sm text-white/70">
          Appel {mode === 'video' ? 'visio' : 'audio'} entrant…
        </p>
      </div>
      <div className="flex gap-6">
        <button
          type="button"
          onClick={onDecline}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-danger-500"
          aria-label="Refuser l'appel"
        >
          <PhoneOff className="h-7 w-7" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onAccept}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-success-500"
          aria-label="Accepter l'appel"
        >
          <Phone className="h-7 w-7" aria-hidden />
        </button>
      </div>
    </div>
  )
}
