import Image from 'next/image'

export type LandingArtName = 'seuil' | 'contrat' | 'partie' | 'survie' | 'heritage' | 'auberge'

/** Text-free scene plates. The browser requests only the matching mobile crop. */
export function LandingArt({
  name,
  priority = false,
}: {
  name: LandingArtName
  priority?: boolean
}) {
  return (
    <>
      {priority ? (
        <>
          <link
            rel="preload"
            as="image"
            href={`/encre-de-sel/landing/${name}-mobile.webp`}
            media="(max-width: 767px)"
            fetchPriority="high"
          />
          <link
            rel="preload"
            as="image"
            href={`/encre-de-sel/landing/${name}.webp`}
            media="(min-width: 768px)"
            fetchPriority="high"
          />
        </>
      ) : null}
      <picture className={`salt-art salt-art--${name}`} aria-hidden="true">
        <source media="(max-width: 767px)" srcSet={`/encre-de-sel/landing/${name}-mobile.webp`} />
        <Image
          alt=""
          src={`/encre-de-sel/landing/${name}.webp`}
          width={1672}
          height={941}
          sizes="100vw"
          unoptimized
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
        />
      </picture>
    </>
  )
}
