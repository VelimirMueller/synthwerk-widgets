import { describe, expect, it } from 'vitest'
import {
  readVisionAttributes,
  resolveVisionConfig,
  visionAttributes
} from '../../src/vision/config.ts'
import { formatScore, visionMessagesFor } from '../../src/vision/i18n.ts'

const base = 'https://host.test/page'

describe('readVisionAttributes', () => {
  it('attributes - shared ones plus save-photos, no position', () => {
    expect(visionAttributes).toContain('save-photos')
    expect(visionAttributes).not.toContain('position')
    const attrs: Record<string, string> = {
      'app-id': ' app ',
      'api-url': 'https://api.test',
      mode: 'dark',
      theme: 'nope',
      'save-photos': '',
      'sign-in-url': 'javascript:alert(1)'
    }
    expect(readVisionAttributes((name) => attrs[name] ?? null, base)).toEqual({
      appId: 'app',
      apiUrl: 'https://api.test',
      lang: null,
      mode: 'dark',
      theme: null,
      accent: null,
      signInUrl: null,
      savePhotos: true
    })
  })

  it.each([
    [null, false],
    ['false', false],
    ['', true],
    ['true', true]
  ])('save-photos %s - %s', (value, expected) => {
    const attrs = readVisionAttributes((name) => (name === 'save-photos' ? value : null), base)
    expect(attrs.savePhotos).toBe(expected)
  })
})

describe('resolveVisionConfig', () => {
  it('no attributes - browser language and the defaults', () => {
    const attrs = readVisionAttributes(() => null, base)
    expect(resolveVisionConfig(attrs, ['de-DE'])).toMatchObject({
      lang: 'de',
      mode: 'system',
      theme: 'default',
      accent: 'flagship',
      savePhotos: false
    })
  })

  it('lang attribute - wins over the browser', () => {
    const attrs = readVisionAttributes((name) => (name === 'lang' ? 'en' : null), base)
    expect(resolveVisionConfig(attrs, ['de-DE']).lang).toBe('en')
  })
})

describe('vision text', () => {
  it('German and English - the same keys', () => {
    expect(Object.keys(visionMessagesFor('de')).sort()).toEqual(
      Object.keys(visionMessagesFor('en')).sort()
    )
    expect(visionMessagesFor('de').choose).toBe('Foto wählen')
  })

  it.each([
    [0.814, 'en', '81%'],
    [0.814, 'de', '81 %'],
    [7, 'en', '100%'],
    [Number.NaN, 'en', '0%']
  ] as const)('score %d in %s - %s', (score, lang, text) => {
    expect(formatScore(score, lang).replace(/ /g, ' ')).toBe(text)
  })
})
