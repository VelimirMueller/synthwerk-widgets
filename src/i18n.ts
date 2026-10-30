// German and English UI text. The `lang` attribute wins; else the browser language; else English.

export const languages = ['en', 'de'] as const
export type Lang = (typeof languages)[number]

export interface Messages {
  open: string
  close: string
  title: string
  greeting: string
  placeholder: string
  send: string
  stop: string
  you: string
  assistant: string
  stopped: string
  signInTitle: string
  signInText: string
  signIn: string
  offline: string
  quota: string
  quotaUntil: (time: string) => string
  busy: string
  notAllowed: string
  tooLong: string
  interrupted: string
  error: string
  retry: string
}

const en: Messages = {
  open: 'Open chat',
  close: 'Close chat',
  title: 'Chat',
  greeting: 'Hello. Ask a question to start.',
  placeholder: 'Write a message',
  send: 'Send',
  stop: 'Stop',
  you: 'You',
  assistant: 'Assistant',
  stopped: 'Stopped.',
  signInTitle: 'Sign in to chat',
  signInText: 'The chat is for signed-in users only.',
  signIn: 'Sign in',
  offline: 'You are offline. Check your connection.',
  quota: 'You used all of your chat quota. Try again later.',
  quotaUntil: (time) => `You used all of your chat quota. It resets at ${time}.`,
  busy: 'The chat is busy. Try again in a moment.',
  notAllowed: 'This site cannot use the chat.',
  tooLong: 'The message is too long. Make it shorter.',
  interrupted: 'The answer stopped. Try again.',
  error: 'Something went wrong. Try again.',
  retry: 'Try again'
}

const de: Messages = {
  open: 'Chat öffnen',
  close: 'Chat schließen',
  title: 'Chat',
  greeting: 'Hallo. Stellen Sie eine Frage, um zu beginnen.',
  placeholder: 'Nachricht schreiben',
  send: 'Senden',
  stop: 'Stopp',
  you: 'Sie',
  assistant: 'Assistent',
  stopped: 'Gestoppt.',
  signInTitle: 'Zum Chatten anmelden',
  signInText: 'Der Chat ist nur für angemeldete Nutzer.',
  signIn: 'Anmelden',
  offline: 'Sie sind offline. Prüfen Sie Ihre Verbindung.',
  quota: 'Ihr Chat-Kontingent ist aufgebraucht. Versuchen Sie es später noch einmal.',
  quotaUntil: (time) => `Ihr Chat-Kontingent ist aufgebraucht. Es wird um ${time} zurückgesetzt.`,
  busy: 'Der Chat ist ausgelastet. Versuchen Sie es gleich noch einmal.',
  notAllowed: 'Diese Seite darf den Chat nicht nutzen.',
  tooLong: 'Die Nachricht ist zu lang. Kürzen Sie sie.',
  interrupted: 'Die Antwort wurde unterbrochen. Versuchen Sie es noch einmal.',
  error: 'Etwas ist schiefgelaufen. Versuchen Sie es noch einmal.',
  retry: 'Erneut versuchen'
}

const catalog: Record<Lang, Messages> = { en, de }

/** The language for an explicit `lang` value and the browser languages. */
export function resolveLang(attribute: string | null, browser: readonly string[] = []): Lang {
  for (const candidate of [attribute, ...browser]) {
    const base = candidate?.trim().toLowerCase().split('-')[0]
    if (base === 'de' || base === 'en') return base
  }
  return 'en'
}

export function messagesFor(lang: Lang): Messages {
  return catalog[lang]
}

/** Local clock time of a reset, for example `14:05`. */
export function formatTime(date: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === 'de' ? 'de-DE' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}
