'use client'

import { CheckCircle2, HelpCircle, Mail, Send } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { trpc } from '@/lib/trpc'
import { useCurrentUser } from '@/lib/session'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'

const schema = z.object({
  subject: z.enum(['PROBLEME', 'DEMANDE', 'PARTENARIAT', 'AUTRE']),
  message: z.string().trim().min(10, 'Message trop court (10 caractères min.)').max(4000),
  email: z.string().trim().email('Email invalide').max(160).optional().or(z.literal('')),
  name: z.string().trim().max(80).optional(),
})

type FormValues = z.infer<typeof schema>

const SUBJECTS: { value: FormValues['subject']; label: string; hint: string }[] = [
  { value: 'PROBLEME', label: '🐛 Signaler un problème', hint: 'Bug, compte bloqué, contenu inapproprié…' },
  { value: 'DEMANDE', label: '💬 Une demande', hint: 'Question, suggestion, besoin d’aide…' },
  { value: 'PARTENARIAT', label: '🤝 Un partenariat', hint: 'Association, commerce, collectivité…' },
  { value: 'AUTRE', label: '✉️ Autre', hint: 'Tout le reste !' },
]

/** Contactez-nous — problème, demande, partenariat. Réponse par email. */
export default function ContactPage() {
  const { user } = useCurrentUser()
  const [sent, setSent] = useState(false)

  const send = trpc.contact.send.useMutation({
    onSuccess: () => setSent(true),
    onError: (e) => toast.error('Envoi impossible', e.message),
  })

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { subject: 'DEMANDE', email: user?.email ?? '' },
  })
  const subject = watch('subject')
  const hint = SUBJECTS.find((s) => s.value === subject)?.hint

  if (sent) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center md:px-0">
        <CheckCircle2 className="mx-auto h-14 w-14 text-success-500" aria-hidden />
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Message envoyé !</h1>
        <p className="mt-2 text-fg-muted">
          Merci de nous avoir écrits. Nous répondons généralement sous 48 h à l’adresse indiquée.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl space-y-5 px-4 py-8 md:px-0">
      <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
        <HelpCircle className="h-6 w-6 text-primary-600" aria-hidden /> Contactez-nous
      </h1>
      <p className="text-sm text-fg-muted">
        Un problème, une demande, une idée de partenariat ? Écrivez-nous — une vraie personne
        vous répondra.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Votre message</CardTitle>
          <CardDescription>Nous répondons par email, généralement sous 48 h.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={handleSubmit((values) =>
              send.mutate({
                subject: values.subject,
                message: values.message,
                email: values.email || undefined,
                name: values.name || undefined,
              }),
            )}
          >
            <div>
              <Label htmlFor="contact-subject">Sujet *</Label>
              <Select id="contact-subject" {...register('subject')}>
                {SUBJECTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
              {hint && <p className="mt-1 text-xs text-fg-muted">{hint}</p>}
            </div>

            {!user && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="contact-name">Votre nom</Label>
                  <Input id="contact-name" {...register('name')} placeholder="Camille Dupont" />
                </div>
                <div>
                  <Label htmlFor="contact-email">Email *</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    {...register('email')}
                    placeholder="vous@exemple.fr"
                    aria-invalid={!!errors.email}
                  />
                  {errors.email && (
                    <p role="alert" className="mt-1 text-xs text-danger-500">
                      {errors.email.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="contact-message">Message *</Label>
              <Textarea
                id="contact-message"
                rows={6}
                {...register('message')}
                placeholder="Décrivez votre demande en quelques lignes…"
                aria-invalid={!!errors.message}
              />
              {errors.message && (
                <p role="alert" className="mt-1 text-xs text-danger-500">
                  {errors.message.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={send.isPending}>
              {send.isPending ? 'Envoi…' : (<><Send className="h-4 w-4" aria-hidden /> Envoyer le message</>)}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-fg-muted">
        <Mail className="h-3.5 w-3.5" aria-hidden />
        Urgence absolue ? Écrivez directement à <span className="font-semibold">contact@planb.app</span>
      </p>
    </div>
  )
}
