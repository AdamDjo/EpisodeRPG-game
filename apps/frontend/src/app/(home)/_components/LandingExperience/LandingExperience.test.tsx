import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { LandingExperience } from './LandingExperience'

vi.mock('./use-landing-motion', () => ({ useLandingMotion: vi.fn() }))
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ refresh: vi.fn() }),
}))

describe('Encre de Sel landing', () => {
  it('keeps the six chapters, real destinations and native anchors accessible', () => {
    const { container } = render(<LandingExperience />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(container.querySelectorAll('main > section')).toHaveLength(6)
    expect(screen.getByRole('link', { name: 'Begin' })).toHaveAttribute('href', '/velkhar/aveugle')
    expect(screen.getByRole('link', { name: 'See a game' })).toHaveAttribute('href', '#gameplay')
    for (const link of container.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')) {
      expect(container.querySelector(link.hash)).not.toBeNull()
    }
  })

  it('resumes the actual saved destination in both primary CTAs', () => {
    render(<LandingExperience resumeHref="/velkhar/session/active-session" />)
    const links = screen.getAllByRole('link', { name: 'Resume my game' })
    expect(links).toHaveLength(2)
    links.forEach((link) => expect(link).toHaveAttribute('href', '/velkhar/session/active-session'))
  })

  it('explains a preview choice without inventing an outcome or changing resources', async () => {
    const user = userEvent.setup()
    render(<LandingExperience />)
    const demo = screen.getByRole('region', { name: 'Illustrative example — no active game' })
    const blood = within(demo).getByRole('progressbar', { name: 'Blood' })
    await user.click(
      screen.getByRole('button', { name: 'Place a tooth in the toll keeper’s hand.' })
    )
    expect(within(demo).getByRole('status')).toHaveTextContent('This is an interface preview.')
    expect(blood).toHaveAttribute('aria-valuenow', '3')
    expect(within(demo).getByRole('link', { name: 'Enter the inn' })).toHaveAttribute(
      'href',
      '/velkhar/aveugle'
    )
  })

  it('supports free action input while keeping the demo boundary explicit', async () => {
    const user = userEvent.setup()
    render(<LandingExperience />)
    const submit = screen.getByRole('button', { name: 'Try this action' })
    expect(submit).toBeDisabled()
    await user.type(screen.getByRole('textbox', { name: 'Free action' }), 'I inspect the gate.')
    await user.click(submit)
    expect(screen.getByRole('status')).toHaveTextContent('the rules to resolve your action')
  })
})
