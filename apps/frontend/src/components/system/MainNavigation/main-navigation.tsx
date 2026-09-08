'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { GameBrand } from '@/components/ui/grimoire/GameBrand/GameBrand'
import { GameIcon } from '@/components/ui/grimoire/GameIcon/GameIcon'
import { GameTopBar } from '@/components/ui/grimoire/GameTopBar/GameTopBar'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { WORLD_ROUTES } from '@/config/worlds'
import { cn } from '@/lib/utils'

import type { ViewerTier } from '@/lib/viewer'
import type { MouseEvent } from 'react'

import './main-navigation.css'

type MainNavigationProps =
  | {
      context: 'marketing'
      onAnchorNavigate: (href: string) => boolean
      onMenuOpenChange?: (isOpen: boolean) => void
      tier?: never
    }
  | { context: 'game'; resumeHref?: string; tier: ViewerTier }

interface NavigationLink {
  href: string
  label: string
  priority?: boolean
}

function isCurrentPath(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === href
  if (href.startsWith(WORLD_ROUTES.velkhar.aveugle)) {
    return (
      pathname === WORLD_ROUTES.velkhar.aveugle ||
      pathname === WORLD_ROUTES.velkhar.characterCreate ||
      pathname.startsWith(`${WORLD_ROUTES.velkhar.campaign}/`) ||
      pathname.startsWith(`${WORLD_ROUTES.velkhar.session}/`)
    )
  }
  return false
}

export function MainNavigation(props: MainNavigationProps) {
  const t = useTranslations('Navigation')
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuTriggerRef = useRef<HTMLButtonElement>(null)
  const isMarketing = props.context === 'marketing'
  const onMenuOpenChange = props.context === 'marketing' ? props.onMenuOpenChange : undefined
  const hasAccount = props.context === 'game' && props.tier !== 'anonymous'
  const marketingLinks: readonly NavigationLink[] = [
    { href: '#velkhar', label: t('discover') },
    { href: '#gameplay', label: t('gameplay') },
    { href: '#world', label: t('world') },
  ]
  const gameAubergeLink: NavigationLink = {
    href: WORLD_ROUTES.velkhar.aveugle,
    label: t('inn'),
  }
  const gameChroniclesLink: NavigationLink = { href: '/dashboard', label: t('chronicles') }
  const links = isMarketing
    ? marketingLinks
    : props.context === 'game' && props.resumeHref
      ? [
          gameAubergeLink,
          { href: props.resumeHref, label: t('resume'), priority: true },
          gameChroniclesLink,
        ]
      : [gameAubergeLink, gameChroniclesLink]
  const brandHref = isMarketing ? '/' : hasAccount ? '/dashboard' : WORLD_ROUTES.velkhar.aveugle
  const accountHref = isMarketing
    ? '/login'
    : hasAccount
      ? '/dashboard'
      : '/login?next=%2Fdashboard'
  const accountLabel = hasAccount ? t('yourSpace') : t('signIn')

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!isMobileMenuOpen) return undefined

    const previousOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    onMenuOpenChange?.(true)

    const focusableElements = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)') ?? []
    )
    menuRef.current?.querySelector<HTMLAnchorElement>('a[href]')?.focus()

    const handleMenuKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false)
        menuTriggerRef.current?.focus()
        return
      }

      if (event.key !== 'Tab' || focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement?.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement?.focus()
      }
    }

    document.addEventListener('keydown', handleMenuKeyDown)
    return () => {
      document.documentElement.style.overflow = previousOverflow
      onMenuOpenChange?.(false)
      document.removeEventListener('keydown', handleMenuKeyDown)
    }
  }, [isMobileMenuOpen, onMenuOpenChange])

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
    menuTriggerRef.current?.focus()
  }

  const handleLinkClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (props.context === 'marketing' && href.startsWith('#')) {
      if (isMobileMenuOpen) props.onMenuOpenChange?.(false)
      if (props.onAnchorNavigate(href)) event.preventDefault()
    }
    setIsMobileMenuOpen(false)
  }

  return (
    <GameTopBar
      className={cn('main-navigation', `main-navigation--${props.context}`)}
      data-motion={isMarketing ? 'chrome' : undefined}
      label={isMarketing ? t('siteNavigation') : t('gameNavigation')}
      variant="transparent"
      start={
        <Link
          className={cn(
            'main-navigation__brand',
            isMarketing && 'main-navigation__brand--marketing'
          )}
          href={brandHref}
          aria-label={isMarketing ? t('siteHome') : t('gameHome')}
        >
          {isMarketing ? (
            <GameBrand decorative size="sm" variant="lockup" />
          ) : (
            <GameBrand decorative size="sm" variant="lockup" />
          )}
        </Link>
      }
      center={
        <nav aria-label={isMarketing ? t('siteDiscovery') : t('gameSpaces')}>
          <ul className="main-navigation__links">
            {links.map((link) => {
              const isCurrent = !isMarketing && isCurrentPath(pathname, link.href)

              return (
                <li key={link.href}>
                  <Link
                    className={link.priority ? 'main-navigation__priority-link' : undefined}
                    href={link.href}
                    aria-current={isCurrent ? 'page' : undefined}
                    onClick={(event) => handleLinkClick(event, link.href)}
                  >
                    {link.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      }
      end={
        <div className="main-navigation__actions">
          <LanguageSwitcher />
          <Link
            className="main-navigation__account main-navigation__account--desktop"
            href={accountHref}
            aria-label={!isMarketing && hasAccount ? t('openSpace') : accountLabel}
          >
            {!isMarketing ? (
              <GameIcon decorative name={hasAccount ? 'book' : 'key'} size={24} />
            ) : null}
            <span>{accountLabel}</span>
          </Link>

          <button
            ref={menuTriggerRef}
            aria-controls="main-navigation-mobile-menu"
            aria-expanded={isMobileMenuOpen}
            aria-label={isMobileMenuOpen ? t('closeMenu') : t('openMenu')}
            className="main-navigation__menu-trigger"
            onClick={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
            type="button"
          >
            <span />
            <span />
          </button>

          {isMounted && isMobileMenuOpen
            ? createPortal(
                <div
                  ref={menuRef}
                  aria-label={isMarketing ? t('siteMenu') : t('gameMenu')}
                  aria-modal="true"
                  className="main-navigation__mobile-menu"
                  id="main-navigation-mobile-menu"
                  role="dialog"
                >
                  <button
                    aria-label={t('closeNavigation')}
                    className="main-navigation__mobile-menu-close"
                    onClick={closeMobileMenu}
                    type="button"
                  >
                    <span />
                    <span />
                  </button>
                  <nav aria-label={t('mobileNavigation')}>
                    <ul>
                      {links.map((link) => {
                        const isCurrent = !isMarketing && isCurrentPath(pathname, link.href)

                        return (
                          <li key={link.href}>
                            <Link
                              aria-current={isCurrent ? 'page' : undefined}
                              className={
                                link.priority ? 'main-navigation__priority-link' : undefined
                              }
                              href={link.href}
                              onClick={(event) => handleLinkClick(event, link.href)}
                            >
                              {link.label}
                            </Link>
                          </li>
                        )
                      })}
                      <li className="main-navigation__mobile-language">
                        <LanguageSwitcher variant="menu" />
                      </li>
                      <li>
                        <Link
                          className="main-navigation__mobile-account"
                          href={accountHref}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          {!isMarketing ? (
                            <GameIcon decorative name={hasAccount ? 'book' : 'key'} size={24} />
                          ) : null}
                          <span>{accountLabel}</span>
                        </Link>
                      </li>
                    </ul>
                  </nav>
                </div>,
                document.body
              )
            : null}
        </div>
      }
    />
  )
}
