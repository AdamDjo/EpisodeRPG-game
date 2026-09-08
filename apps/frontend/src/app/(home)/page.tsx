import { cookies } from 'next/headers'

import { ACTIVE_GAME_SESSION_COOKIE, getActiveGameSessionHref } from '@/lib/active-game-session'

import { LandingExperience } from './_components/LandingExperience/LandingExperience'

export default async function HomePage() {
  const cookieStore = await cookies()
  const resumeHref = getActiveGameSessionHref(cookieStore.get(ACTIVE_GAME_SESSION_COOKIE)?.value)
  return <LandingExperience resumeHref={resumeHref} />
}
