import { describe, expect, it } from 'vitest'
import { formatTime, languages, messagesFor, resolveLang } from '../../src/i18n.ts'

describe('resolveLang', () => {
  it('lang attribute - wins over the browser', () => {
    expect(resolveLang('de', ['en-US'])).toBe('de')
    expect(resolveLang('EN-gb', ['de-DE'])).toBe('en')
  })

  it('no or unknown attribute - first known browser language', () => {
    expect(resolveLang(null, ['fr-FR', 'de-AT'])).toBe('de')
    expect(resolveLang('fr', ['en'])).toBe('en')
  })

  it('nothing known - English', () => {
    expect(resolveLang(null, [])).toBe('en')
    expect(resolveLang('', ['es'])).toBe('en')
  })
})

describe('messages', () => {
  it('German and English - same keys, no empty text', () => {
    const [en, de] = languages.map(messagesFor)
    expect(Object.keys(de ?? {}).sort()).toEqual(Object.keys(en ?? {}).sort())
    for (const catalog of [en, de]) {
      for (const value of Object.values(catalog ?? {})) {
        const text = typeof value === 'function' ? value('10:00') : value
        expect(text.length).toBeGreaterThan(0)
      }
    }
  })

  it('quota with a reset time - names the time', () => {
    expect(messagesFor('de').quotaUntil('14:05')).toContain('14:05')
    expect(messagesFor('en').quotaUntil('14:05')).toContain('14:05')
  })

  it('formatTime - 24 hour clock in both languages', () => {
    const date = new Date(2026, 9, 29, 14, 5)
    expect(formatTime(date, 'de')).toBe('14:05')
    expect(formatTime(date, 'en')).toBe('14:05')
  })
})
