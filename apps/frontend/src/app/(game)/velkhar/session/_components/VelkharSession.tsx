'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react'

import { GameButton } from '@/components/ui/grimoire/GameButton/GameButton'
import { GameIcon } from '@/components/ui/grimoire/GameIcon/GameIcon'
import { GameSceneLayout } from '@/components/ui/grimoire/GameSceneLayout/GameSceneLayout'
import { GameTopBar } from '@/components/ui/grimoire/GameTopBar/GameTopBar'
import { NarrativeComposer } from '@/components/ui/grimoire/NarrativeComposer/NarrativeComposer'
import { SoftSignupPrompt } from '@/features/auth/components/SoftSignupPrompt/SoftSignupPrompt'
import { ChronicleEndExperience } from '@/features/chronicle/components/ChronicleEndExperience'
import { gameSessionApi } from '@/features/game-session/api/game-session-api'
import { ChoiceList } from '@/features/game-session/components/ChoiceList'
import { ConsequenceList } from '@/features/game-session/components/ConsequenceList'
import { DiceRoll } from '@/features/game-session/components/DiceRoll'
import { NarrativePanel } from '@/features/game-session/components/NarrativePanel'
import { useGameSession } from '@/features/game-session/hooks/use-game-session'
import { detectBrowserLocale } from '@/features/game-session/lib/browser-locale'
import { getAuthHref } from '@/lib/internal-navigation'

import { VELKHAR_WORLD } from '../../_config/velkhar-world'

import { VelkharSessionToolPanel, type VelkharSessionTool } from './VelkharSessionToolPanel'
import { VelkharSurvivalHud } from './VelkharSurvivalHud'

import type {
  Character,
  GameNotification,
  Locale,
  SceneResponse,
  SurvivalStats,
} from '@grimoire/shared'

import '../_theme/velkhar-session.css'
import '@/features/chronicle/chronicle.css'

interface VelkharSessionProps {
  initialCharacter: Character
  locale?: Locale
}

function readSurvival(stats: Record<string, number>, previous: SurvivalStats): SurvivalStats {
  return {
    hp: stats.hp ?? previous.hp,
    maxHp: stats.maxHp ?? previous.maxHp,
    thirst: stats.thirst ?? previous.thirst,
    hunger: stats.hunger ?? previous.hunger,
    energy: stats.energy ?? previous.energy,
    calamine: stats.calamine ?? previous.calamine,
    empriseCharges: stats.empriseCharges ?? previous.empriseCharges,
    isDying: previous.isDying,
    neglectStreak: previous.neglectStreak,
  }
}

function formatChange(value: number): string {
  return value > 0 ? `+${value}` : `${value}`
}

interface ConsequenceCopy {
  found: (item: string) => string
  gold: (value: string) => string
  lost: (item: string) => string
  stat: (stat: string, value: string) => string
}

function consequenceMessages(response: SceneResponse | null, copy: ConsequenceCopy): string[] {
  if (!response) return []

  const messages = response.notifications.map(
    (notification: GameNotification) => notification.message
  )
  const consequences = response.scene.consequences

  if (!consequences) return messages

  for (const [stat, value] of Object.entries(consequences.survivalChanges ?? {})) {
    messages.push(copy.stat(stat, formatChange(value)))
  }
  for (const item of consequences.itemsGained ?? []) messages.push(copy.found(item))
  for (const item of consequences.itemsLost ?? []) messages.push(copy.lost(item))
  if (consequences.goldGained) messages.push(copy.gold(formatChange(consequences.goldGained)))

  return messages
}

/** Velkhar composition for the shared game-session controller and components. */
export function VelkharSession({ initialCharacter, locale }: VelkharSessionProps) {
  const uiLocale = useLocale()
  const t = useTranslations('Session')
  const navigation = useTranslations('Navigation')
  // La langue de narration priorise : locale fournie par le parcours de jeu,
  // puis le choix explicite du switcher en jeu, puis le navigateur (#168, #181).
  const [detectedLocale] = useState<Locale | undefined>(() => detectBrowserLocale())
  const effectiveLocale = locale ?? detectedLocale
  const [freeAction, setFreeAction] = useState('')
  const [openTool, setOpenTool] = useState<VelkharSessionTool | null>(null)
  const reduceWorldState = useCallback(
    (previous: SurvivalStats, response: SceneResponse) =>
      response.survival ?? readSurvival(response.updatedStats, previous),
    []
  )
  const session = useGameSession<SurvivalStats, SceneResponse>({
    api: gameSessionApi,
    initialWorldState: initialCharacter.stats.survival,
    locale: effectiveLocale,
    explicitLocale: uiLocale as Locale,
    reduceWorldState,
    resumeHref: `${VELKHAR_WORLD.routes.session}/resume`,
  })
  const abandonSession = session.abandon
  const closeTool = useCallback(() => setOpenTool(null), [])

  const narrative = session.scene?.narrative ?? t('openingNarrative')
  const notifications = useMemo(() => {
    const statLabels: Record<string, string> = {
      ash: t('calamine'),
      calamine: t('calamine'),
      energy: t('fatigue'),
      hp: t('health'),
      hunger: t('hunger'),
      thirst: t('thirst'),
    }
    return consequenceMessages(session.response, {
      found: (item) => t('found', { item }),
      gold: (value) => t('goldChange', { value }),
      lost: (item) => t('lost', { item }),
      stat: (stat, value) => `${statLabels[stat] ?? stat}: ${value}`,
    })
  }, [session.response, t])

  useEffect(() => {
    setFreeAction('')
  }, [session.turn])

  const submitFreeAction = useCallback(
    (draft = freeAction) => {
      const action = draft.trim()
      if (!action) return
      session.submitFreeAction(action)
    },
    [freeAction, session]
  )

  const handleComposerKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== 'Enter' || event.shiftKey) return
      event.preventDefault()
      submitFreeAction(event.currentTarget.value)
    },
    [submitFreeAction]
  )

  const handleAbandon = useCallback(async () => {
    const abandoned = await abandonSession()
    if (abandoned) closeTool()
  }, [abandonSession, closeTool])

  return (
    <>
      <GameSceneLayout
        className="velkhar-session"
        background={
          <Image
            alt={t('backgroundAlt')}
            className="velkhar-session__background"
            fill
            priority
            sizes="(max-width: 1120px) 100vw, 58vw"
            src={session.scene?.imageUrl ?? VELKHAR_WORLD.session.fallbackBackground}
          />
        }
        top={
          <GameTopBar
            className="velkhar-session__topbar"
            label={t('mainNavigation')}
            start={
              <div className="game-top-bar__nav velkhar-session__nav-group">
                <Link href={`${VELKHAR_WORLD.routes.aveugle}?return=run`}>
                  {VELKHAR_WORLD.name}
                </Link>
                <span aria-hidden="true">|</span>
                <span>{t('regionLabel')}</span>
              </div>
            }
            center={
              <strong className="game-top-bar__title velkhar-session__nav-title">
                {session.scene?.location ?? t('saltRoad')}
              </strong>
            }
            end={
              <div className="game-top-bar__nav velkhar-session__nav-group velkhar-session__nav-group--tools">
                <span className="velkhar-session__gm-status" data-online={session.source === 'ai'}>
                  <span aria-hidden="true" />
                  {session.source === 'ai'
                    ? t('gameMasterConnected')
                    : t('gameMasterFallbackShort')}
                </span>
                <span aria-hidden="true">|</span>
                <Link href={getAuthHref('/login', `${VELKHAR_WORLD.routes.session}/resume`)}>
                  {navigation('signIn')}
                </Link>
                <span aria-hidden="true">|</span>
                <button type="button" onClick={() => setOpenTool('menu')}>
                  {t('navOptions')}
                </button>
              </div>
            }
          />
        }
        scene={
          <div className="velkhar-session__visual">
            <span className="velkhar-session__visual-location">
              {session.scene?.location ?? t('saltRoad')}
            </span>
          </div>
        }
        reader={
          <main className="velkhar-session__main">
            <div className="velkhar-session__stage" key={session.scene?.id ?? 'opening'}>
              <ConsequenceList messages={notifications} />

              {session.limitReached ? (
                <div className="velkhar-session__state" role="alert">
                  <GameIcon decorative name="lock" size={48} />
                  <h1>{t('chronicleWaiting')}</h1>
                  <p>{t('limitBody')}</p>
                  <Link href={getAuthHref('/signup', `${VELKHAR_WORLD.routes.session}/resume`)}>
                    {t('createAccount')}
                  </Link>
                </div>
              ) : session.error ? (
                <div className="velkhar-session__state" role="alert">
                  <GameIcon decorative name={session.online ? 'warning' : 'hourglass'} size={48} />
                  <h1>{session.online ? t('gameMasterSilent') : t('roadUnavailable')}</h1>
                  <p>{t('requestError')}</p>
                  <GameButton
                    type="button"
                    variant="secondary"
                    onClick={session.retry}
                    disabled={!session.online}
                  >
                    {t('retry')}
                  </GameButton>
                </div>
              ) : session.gameOver ? (
                <ChronicleEndExperience
                  endReason={session.endReason}
                  sessionId={session.sessionId}
                  turnCount={session.turn}
                />
              ) : (
                <>
                  <header className="velkhar-session__reader-heading">
                    <h1>{session.scene?.location ?? t('saltRoad')}</h1>
                  </header>
                  <NarrativePanel narrative={narrative} loading={session.loading} />

                  {session.roll ? <DiceRoll key={session.turn} roll={session.roll} /> : null}

                  {session.scene ? (
                    <>
                      <ChoiceList
                        choices={session.scene.choices}
                        disabled={session.loading}
                        selectedChoiceId={session.selectedChoiceId}
                        onChoose={session.choose}
                      />

                      <NarrativeComposer
                        aria-label={t('describeAction')}
                        actionDisabled={session.loading || freeAction.trim().length === 0}
                        actionLabel={t('attemptAction')}
                        maxLength={500}
                        placeholder={t('actionPlaceholder')}
                        value={freeAction}
                        onAction={() => submitFreeAction()}
                        onChange={(event) => setFreeAction(event.target.value)}
                        onKeyDown={handleComposerKeyDown}
                      />
                      <p className="velkhar-session__composer-hint">{t('composerHint')}</p>
                    </>
                  ) : null}
                </>
              )}
            </div>
          </main>
        }
        bottom={
          <VelkharSurvivalHud
            inventory={session.inventory}
            survival={session.worldState}
            onOpenCharacter={() => setOpenTool('character')}
            onOpenInventory={() => setOpenTool('inventory')}
            onOpenMenu={() => setOpenTool('menu')}
          />
        }
      />
      <VelkharSessionToolPanel
        character={initialCharacter}
        ending={session.ending}
        conditions={session.conditions}
        gold={session.gold}
        inventory={session.inventory}
        openTool={openTool}
        survival={session.worldState}
        onAbandon={handleAbandon}
        onClose={closeTool}
        onInventoryAction={session.performInventoryAction}
      />
      <SoftSignupPrompt />
    </>
  )
}
