'use client'

import { useRouter } from 'next/navigation'
import { StoryCreateDialog } from '@/components/stories/StoryRail'

/** Page « Ajouter une story » — ouverte depuis le menu « + ». */
export default function NewStoryPage() {
  const router = useRouter()
  return <StoryCreateDialog onClose={() => router.push('/')} />
}
