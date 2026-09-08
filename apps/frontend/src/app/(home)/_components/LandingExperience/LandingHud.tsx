import Image from 'next/image'
import { useTranslations } from 'next-intl'

import { GameSessionHud } from '@/features/game-session/components/GameSessionHud'

export function LandingHud() {
  const t = useTranslations('SaltLanding')
  return (
    <GameSessionHud
      className="salt-hud"
      label={t('hud')}
      statusBars={[
        { id: 'blood', label: t('blood'), value: 3, max: 5, tone: 'danger' },
        { id: 'breath', label: t('breath'), value: 3, max: 5, tone: 'aqua' },
        { id: 'hunger', label: t('hunger'), value: 2, max: 5, tone: 'ember' },
        {
          id: 'thirst',
          label: t('thirst'),
          value: 2,
          max: 5,
          tone: 'ember',
          className: 'salt-hud__thirst',
        },
        { id: 'calamine', label: t('calamine'), value: 2, max: 100, tone: 'ember' },
      ].map((stat) => ({
        ...stat,
        tone: stat.tone as 'danger' | 'aqua' | 'ember',
        icon: <Image alt="" width={36} height={36} src={`/encre-de-sel/icons/${stat.id}.webp`} />,
      }))}
      statusGauges={[]}
      tools={[]}
    />
  )
}
