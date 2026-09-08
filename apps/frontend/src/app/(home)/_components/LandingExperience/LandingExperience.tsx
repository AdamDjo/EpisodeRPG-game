'use client'

import { useTranslations } from 'next-intl'
import { useRef } from 'react'

import { MainNavigation } from '@/components/system/MainNavigation/main-navigation'
import { GameLink } from '@/components/ui/game-link'
import { WORLD_ROUTES } from '@/config/worlds'

import { LandingArt } from './LandingArt'
import { LandingDemo } from './LandingDemo'
import { LandingHud } from './LandingHud'
import { useLandingMotion } from './use-landing-motion'

import './salt-landing.css'

// Native anchors preserve keyboard navigation, history and reduced-motion preferences.
const useNativeAnchor = () => false

export function LandingExperience({ resumeHref }: { resumeHref?: string }) {
  const t = useTranslations('SaltLanding')
  const root = useRef<HTMLDivElement>(null)
  useLandingMotion(root)
  const beginHref = resumeHref ?? WORLD_ROUTES.velkhar.aveugle

  return (
    <div className="salt-landing" ref={root}>
      <a className="salt-skip" href="#landing-content">
        {t('skip')}
      </a>
      <div className="salt-progress" aria-hidden="true" />
      <MainNavigation context="marketing" onAnchorNavigate={useNativeAnchor} />
      <main id="landing-content">
        <section id="velkhar" className="salt-plan salt-seuil" aria-labelledby="salt-title">
          <LandingArt name="seuil" priority />
          <div className="salt-ash salt-ash--gate" aria-hidden="true">
            {Array.from({ length: 7 }, (_, i) => (
              <i key={i} />
            ))}
          </div>
          <div className="salt-depth salt-depth--near" aria-hidden="true" />
          <div className="salt-copy">
            <p className="salt-eyebrow">{t('genre')}</p>
            <h1 id="salt-title">{t('heroTitle')}</h1>
            <p>{t('heroBody')}</p>
            <div className="salt-actions">
              <GameLink variant="landing" href={beginHref} size="lg">
                {t(resumeHref ? 'resume' : 'start')}
              </GameLink>
              <a href="#gameplay">{t('watch')}</a>
            </div>
          </div>
          <a className="salt-scroll" href="#contrat">
            <i aria-hidden="true">↓</i> <span>{t('threshold')}</span>
          </a>
          <div className="salt-door" aria-hidden="true" />
        </section>
        <section id="contrat" className="salt-plan salt-contrat" aria-labelledby="contract-title">
          <LandingArt name="contrat" />
          <div className="salt-copy">
            <p className="salt-eyebrow">{t('contractLabel')}</p>
            <h2 id="contract-title">{t('contractTitle')}</h2>
            <p>{t('contractBody')}</p>
            <a className="salt-text-link" href="#gameplay">
              {t('contractLink')} →
            </a>
          </div>
          <div className="salt-contract-details">
            <dl>
              {(
                [
                  ['destination', 'fingers'],
                  ['danger', 'hard'],
                  ['duration', 'long'],
                ] as const
              ).map(([key, value]) => (
                <div key={key}>
                  <dt>{t(key)}</dt>
                  <dd>{t(value)}</dd>
                </div>
              ))}
            </dl>
            <p>{t('contractNote')}</p>
          </div>
          <div className="salt-paper" aria-hidden="true" />
        </section>
        <section id="gameplay" className="salt-plan salt-partie" aria-labelledby="play-title">
          <header className="salt-copy">
            <p className="salt-eyebrow">{t('playLabel')}</p>
            <h2 id="play-title">{t('playTitle')}</h2>
            <p>{t('playBody')}</p>
            <GameLink variant="landing" href={beginHref}>
              {t('try')} →
            </GameLink>
          </header>
          <LandingDemo />
        </section>
        <section id="survie" className="salt-plan salt-survie" aria-labelledby="survival-title">
          <LandingArt name="survie" />
          <div className="salt-copy">
            <p className="salt-eyebrow">{t('survivalLabel')}</p>
            <h2 id="survival-title">{t('survivalTitle')}</h2>
            <p>{t('survivalBody')}</p>
            <p className="salt-detail">{t('survivalDetail')}</p>
            <a className="salt-text-link" href="#world">
              {t('survivalLink')} →
            </a>
          </div>
          <LandingHud />
          <div className="salt-wipe salt-wipe--salt" aria-hidden="true" />
          <div className="salt-wipe salt-wipe--black" aria-hidden="true" />
        </section>
        <section id="world" className="salt-plan salt-heritage" aria-labelledby="heritage-title">
          <LandingArt name="heritage" />
          <div className="salt-ash salt-ash--memory" aria-hidden="true">
            {Array.from({ length: 5 }, (_, i) => (
              <i key={i} />
            ))}
          </div>
          <div className="salt-copy">
            <p className="salt-eyebrow">{t('heritageLabel')}</p>
            <h2 id="heritage-title">{t('heritageTitle')}</h2>
            <p>{t('heritageBody')}</p>
          </div>
          <div className="salt-times">
            <div>
              <strong>{t('salt')}</strong>
              <span>{t('saltTime')}</span>
            </div>
            <div>
              <strong>{t('ash')}</strong>
              <span>{t('ashTime')}</span>
            </div>
            <div>
              <strong>{t('black')}</strong>
              <span>{t('blackTime')}</span>
            </div>
            <i aria-hidden="true" />
          </div>
          <div className="salt-heritage__end">
            <GameLink variant="landing" href="#outro">
              {t('heritageLink')} →
            </GameLink>
            <p>{t('heritageNote')}</p>
          </div>
          <div className="salt-door" aria-hidden="true" />
        </section>
        <section id="outro" className="salt-plan salt-auberge" aria-labelledby="outro-title">
          <LandingArt name="auberge" />
          <div className="salt-values" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <div className="salt-copy">
            <p className="salt-eyebrow">{t('outroLabel')}</p>
            <h2 id="outro-title">{t('outroTitle')}</h2>
            <p>{t('outroBody')}</p>
            <div className="salt-actions">
              <GameLink variant="landing" href={beginHref} size="lg">
                {t(resumeHref ? 'resume' : 'enter')}
              </GameLink>
              <a href="/dashboard">{t('chronicle')}</a>
            </div>
            <p className="salt-meta">{t('meta')}</p>
          </div>
        </section>
      </main>
      <footer className="salt-footer">
        <span>GRIMOIRE © 2026</span>
        <span>{t('created')}</span>
        <a href="https://github.com/AdamDjo/Grimoire-game">GitHub</a>
      </footer>
    </div>
  )
}
