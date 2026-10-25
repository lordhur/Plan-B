'use client'

import { AlertOctagon } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'

interface State {
  hasError: boolean
  error?: Error
}

/** Capture les erreurs de rendu et affiche un écran de secours accessible. */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
    // Production : brancher Sentry ici (Phase 5)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
        <AlertOctagon className="mb-4 h-12 w-12 text-danger-500" aria-hidden />
        <h2 className="text-xl font-bold">Oups, quelque chose s’est mal passé</h2>
        <p className="mt-2 max-w-md text-sm text-fg-muted">
          Une erreur inattendue est survenue. Essayez de recharger la page.
        </p>
        <Button className="mt-6" onClick={() => this.setState({ hasError: false })}>
          Réessayer
        </Button>
      </div>
    )
  }
}
