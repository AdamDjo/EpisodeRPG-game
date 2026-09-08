'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { GameLink } from '@/components/ui/game-link'
import { DialogueChoice } from '@/components/ui/grimoire/DialogueChoice/DialogueChoice'
import { GameSceneLayout } from '@/components/ui/grimoire/GameSceneLayout/GameSceneLayout'
import { NarrativeComposer } from '@/components/ui/grimoire/NarrativeComposer/NarrativeComposer'
import { WORLD_ROUTES } from '@/config/worlds'

import { LandingArt } from './LandingArt'
import { LandingHud } from './LandingHud'

export function LandingDemo() {
  const t = useTranslations('SaltLanding')
  const [action, setAction] = useState('')
  const [selected, setSelected] = useState<number>()
  const [showExplanation, setShowExplanation] = useState(false)

  return (
    <GameSceneLayout
      className="salt-demo"
      aria-label={t('demo')}
      top={
        <div className="salt-demo__location">
          {t('scene')}
          <small>{t('demo')}</small>
        </div>
      }
      background={<LandingArt name="partie" />}
      scene={<span className="salt-demo__scene-marker" aria-hidden="true" />}
      reader={
        <div className="salt-demo__reader">
          <h3>{t('toll')}</h3>
          <p>{t('passage')}</p>
          <div className="salt-demo__choices">
            {(['choice1', 'choice2', 'choice3'] as const).map((key, index) => (
              <DialogueChoice
                key={key}
                number={index + 1}
                selected={selected === index}
                onClick={() => {
                  setSelected(index)
                  setShowExplanation(true)
                }}
              >
                {t(key)}
              </DialogueChoice>
            ))}
          </div>
          <NarrativeComposer
            aria-label={t('free')}
            heading={t('free')}
            placeholder={t('placeholder')}
            actionLabel={t('submit')}
            value={action}
            maxLength={1000}
            onChange={(event) => setAction(event.target.value)}
            actionDisabled={!action.trim()}
            onAction={() => setShowExplanation(true)}
          />
          <div role="status" className="salt-demo__response">
            {showExplanation ? (
              <>
                <p>{t('demoResponse')}</p>
                <GameLink variant="landing" href={WORLD_ROUTES.velkhar.aveugle}>
                  {t('enter')}
                </GameLink>
              </>
            ) : null}
          </div>
        </div>
      }
      bottom={<LandingHud />}
    />
  )
}
