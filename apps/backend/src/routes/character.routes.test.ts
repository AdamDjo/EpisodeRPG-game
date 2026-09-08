import express from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AddressInfo } from 'node:net'

const createCharacter = vi.fn()
class InvalidCharacterInputError extends Error {}
vi.mock('../services/character.service', () => ({
  createCharacter,
  InvalidCharacterInputError,
}))

const resolveVocation = vi.fn()
vi.mock('../services/vocation-resolution.service', () => ({ resolveVocation }))

const { characterRouter } = await import('./character.routes')

/** Boots the router on an ephemeral port with a fixed fake auth context. */
async function withServer(
  auth: { userId: string; isAnonymous: boolean },
  run: (baseUrl: string) => Promise<void>
): Promise<void> {
  const app = express()
  app.use(express.json())
  app.use((req, _res, next) => {
    req.auth = auth
    next()
  })
  app.use('/api/character', characterRouter)

  const server = app.listen(0)
  await new Promise<void>((resolve) => server.once('listening', () => resolve()))
  const { port } = server.address() as AddressInfo
  try {
    await run(`http://127.0.0.1:${port}`)
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

const AUTH = { userId: 'user1', isAnonymous: false }

const BASE_CHARACTER = {
  id: 'char1',
  userId: 'user1',
  name: 'Kael Vane',
  people: 'rivain',
  vocation: 'watcher',
  freeConcept: null as string | null,
  customVocationName: null as string | null,
  narrativeTrait: null as string | null,
  shiftedSkills: null as unknown,
  backstory: null as string | null,
  avatarUrl: null as string | null,
  blood: 10,
  breath: 14,
  will: 10,
  hp: 10,
  maxHp: 10,
  thirst: 100,
  hunger: 100,
  energy: 100,
  calamine: 0,
  isDying: false,
  neglectStreak: 0,
  empriseCharges: 0,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
}

beforeEach(() => {
  createCharacter.mockReset()
  resolveVocation.mockReset()
})

describe('POST /resolve-vocation', () => {
  it('rejects a missing freeConcept with 400 and never calls the service', async () => {
    await withServer(AUTH, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/character/resolve-vocation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      expect(res.status).toBe(400)
      expect(resolveVocation).not.toHaveBeenCalled()
    })
  })

  it('rejects a freeConcept over 500 characters with 400', async () => {
    await withServer(AUTH, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/character/resolve-vocation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ freeConcept: 'a'.repeat(501) }),
      })
      expect(res.status).toBe(400)
      expect(resolveVocation).not.toHaveBeenCalled()
    })
  })

  it('returns the resolution result and scopes the call to the caller', async () => {
    resolveVocation.mockResolvedValue({
      status: 'resolved',
      vocationId: 'watcher',
      customVocationName: 'Traqueuse de Cendres',
      narrativeTrait: 'Ne dort jamais deux nuits au même endroit.',
      shiftedSkills: [
        { original: 'Lecture des ruines', shifted: 'Pistage de Calcinés' },
        { original: "Prudence d'artefact", shifted: 'Instinct de traque' },
      ],
      announcement: "L'Aveugle hoche la tête.",
    })

    await withServer(AUTH, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/character/resolve-vocation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ freeConcept: 'Une vieille chasseuse de Calcinés, lasse.' }),
      })
      expect(res.status).toBe(200)
      const body = (await res.json()) as {
        success: boolean
        data: { status: string; vocationId: string }
      }
      expect(body.success).toBe(true)
      expect(body.data.status).toBe('resolved')
      expect(body.data.vocationId).toBe('watcher')
      expect(resolveVocation).toHaveBeenCalledWith(
        'user1',
        'Une vieille chasseuse de Calcinés, lasse.'
      )
    })
  })

  it('returns a fallback result as a 200 (not an error)', async () => {
    resolveVocation.mockResolvedValue({ status: 'fallback', reason: 'unintelligible_concept' })

    await withServer(AUTH, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/character/resolve-vocation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ freeConcept: 'zzzzz???' }),
      })
      expect(res.status).toBe(200)
      const body = (await res.json()) as { data: { status: string; reason: string } }
      expect(body.data).toEqual({ status: 'fallback', reason: 'unintelligible_concept' })
    })
  })
})

describe('POST /', () => {
  it('rejects a missing name with 400 and never calls the service', async () => {
    await withServer(AUTH, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/character`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peopleId: 'rivain', vocationId: 'watcher' }),
      })
      expect(res.status).toBe(400)
      expect(createCharacter).not.toHaveBeenCalled()
    })
  })

  it('returns 400 when the service throws InvalidCharacterInputError', async () => {
    createCharacter.mockRejectedValue(new InvalidCharacterInputError('unknown vocation id'))

    await withServer(AUTH, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/character`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Kael Vane', peopleId: 'rivain', vocationId: 'not-real' }),
      })
      expect(res.status).toBe(400)
    })
  })

  it('creates a plain-preset character and returns the response DTO without custom fields', async () => {
    createCharacter.mockResolvedValue(BASE_CHARACTER)

    await withServer(AUTH, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/character`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Kael Vane', peopleId: 'rivain', vocationId: 'watcher' }),
      })
      expect(res.status).toBe(200)
      const body = (await res.json()) as {
        data: { customVocationName?: string; narrativeTrait?: string; shiftedSkills?: unknown }
      }
      expect(body.data.customVocationName).toBeUndefined()
      expect(body.data.narrativeTrait).toBeUndefined()
      expect(body.data.shiftedSkills).toBeUndefined()
      expect(createCharacter).toHaveBeenCalledWith('user1', {
        name: 'Kael Vane',
        peopleId: 'rivain',
        vocationId: 'watcher',
        freeConcept: undefined,
        backstory: undefined,
        customVocationName: undefined,
        narrativeTrait: undefined,
        shiftedSkills: undefined,
      })
    })
  })

  it('creates a resolved free-concept character and returns the custom fields in the DTO', async () => {
    createCharacter.mockResolvedValue({
      ...BASE_CHARACTER,
      freeConcept: 'Une vieille chasseuse de Calcinés, lasse.',
      customVocationName: 'Traqueuse de Cendres',
      narrativeTrait: 'Ne dort jamais deux nuits au même endroit.',
      shiftedSkills: [
        { original: 'Lecture des ruines', shifted: 'Pistage de Calcinés' },
        { original: "Prudence d'artefact", shifted: 'Instinct de traque' },
      ],
    })

    await withServer(AUTH, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/character`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Kael Vane',
          peopleId: 'rivain',
          vocationId: 'watcher',
          freeConcept: 'Une vieille chasseuse de Calcinés, lasse.',
          customVocationName: 'Traqueuse de Cendres',
          narrativeTrait: 'Ne dort jamais deux nuits au même endroit.',
          shiftedSkills: [
            { original: 'Lecture des ruines', shifted: 'Pistage de Calcinés' },
            { original: "Prudence d'artefact", shifted: 'Instinct de traque' },
          ],
        }),
      })
      expect(res.status).toBe(200)
      const body = (await res.json()) as {
        data: { customVocationName?: string; narrativeTrait?: string; shiftedSkills?: unknown[] }
      }
      expect(body.data.customVocationName).toBe('Traqueuse de Cendres')
      expect(body.data.narrativeTrait).toBe('Ne dort jamais deux nuits au même endroit.')
      expect(body.data.shiftedSkills).toHaveLength(2)
    })
  })
})
