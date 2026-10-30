// German and English text of <synthwerk-vision>. The language rules are those of src/i18n.ts.
import { formatTime, type Lang } from '../i18n.ts'

export interface VisionMessages {
  title: string
  intro: string
  choose: string
  camera: string
  cameraPreview: string
  capture: string
  cancel: string
  preview: string
  preparing: string
  working: string
  result: string
  correction: string
  topic: string
  uncertain: string
  alternatives: string
  score: (percent: string) => string
  again: string
  saving: string
  saved: string
  signInTitle: string
  signInText: string
  signIn: string
  offline: string
  cameraDenied: string
  cameraMissing: string
  cameraBusy: string
  signedOut: string
  notAllowed: string
  tooLarge: string
  unsupported: string
  storageFull: string
  saveFailed: string
  busy: string
  quotaUntil: (time: string) => string
  quota: string
  error: string
  retry: string
}

const en: VisionMessages = {
  title: 'Image labels',
  intro: 'Choose a photo or take one with your camera. You get the labels that fit it best.',
  choose: 'Choose photo',
  camera: 'Use camera',
  cameraPreview: 'Camera view',
  capture: 'Take photo',
  cancel: 'Close camera',
  preview: 'Your photo',
  preparing: 'Preparing the photo…',
  working: 'Looking at the photo…',
  result: 'Result',
  correction: 'Corrected by your team',
  topic: 'Topic',
  uncertain: 'Not sure',
  alternatives: 'Other labels',
  score: (percent) => `${percent} match`,
  again: 'Try another photo',
  saving: 'Saving the photo…',
  saved: 'Photo saved.',
  signInTitle: 'Sign in to label photos',
  signInText: 'Image labels are for signed-in users only.',
  signIn: 'Sign in',
  offline: 'You are offline. Check your connection.',
  cameraDenied: 'The camera is blocked. Allow it in the browser settings, or choose a photo.',
  cameraMissing: 'No camera found. Choose a photo instead.',
  cameraBusy: 'The camera is in use by another app. Close it, or choose a photo.',
  signedOut: 'Your session ended. Sign in again.',
  notAllowed: 'This site cannot use image labels.',
  tooLarge: 'The photo is too large. Choose a smaller one.',
  unsupported: 'This file is not a photo we can read. Use JPEG, PNG or WebP.',
  storageFull: 'The photo storage of your team is full. The labels are still shown.',
  saveFailed: 'The photo was not saved. The labels are still shown.',
  busy: 'Image labels are busy. Try again in a moment.',
  quotaUntil: (time) => `You used all of your quota. It resets at ${time}.`,
  quota: 'You used all of your quota. Try again later.',
  error: 'Something went wrong. Try again.',
  retry: 'Try again'
}

const de: VisionMessages = {
  title: 'Bild-Labels',
  intro:
    'Wählen Sie ein Foto oder machen Sie eins mit der Kamera. Sie bekommen die Labels, die am besten passen.',
  choose: 'Foto wählen',
  camera: 'Kamera nutzen',
  cameraPreview: 'Kamerabild',
  capture: 'Foto aufnehmen',
  cancel: 'Kamera schließen',
  preview: 'Ihr Foto',
  preparing: 'Das Foto wird vorbereitet …',
  working: 'Das Foto wird geprüft …',
  result: 'Ergebnis',
  correction: 'Von Ihrem Team korrigiert',
  topic: 'Thema',
  uncertain: 'Unsicher',
  alternatives: 'Weitere Labels',
  score: (percent) => `${percent} Treffer`,
  again: 'Anderes Foto prüfen',
  saving: 'Das Foto wird gespeichert …',
  saved: 'Foto gespeichert.',
  signInTitle: 'Zum Prüfen von Fotos anmelden',
  signInText: 'Bild-Labels sind nur für angemeldete Nutzer.',
  signIn: 'Anmelden',
  offline: 'Sie sind offline. Prüfen Sie Ihre Verbindung.',
  cameraDenied:
    'Die Kamera ist blockiert. Erlauben Sie sie in den Browser-Einstellungen oder wählen Sie ein Foto.',
  cameraMissing: 'Keine Kamera gefunden. Wählen Sie stattdessen ein Foto.',
  cameraBusy: 'Eine andere App nutzt die Kamera. Schließen Sie sie oder wählen Sie ein Foto.',
  signedOut: 'Ihre Sitzung ist abgelaufen. Melden Sie sich neu an.',
  notAllowed: 'Diese Seite darf Bild-Labels nicht nutzen.',
  tooLarge: 'Das Foto ist zu groß. Wählen Sie ein kleineres.',
  unsupported: 'Diese Datei ist kein lesbares Foto. Nutzen Sie JPEG, PNG oder WebP.',
  storageFull: 'Der Fotospeicher Ihres Teams ist voll. Die Labels werden trotzdem gezeigt.',
  saveFailed: 'Das Foto wurde nicht gespeichert. Die Labels werden trotzdem gezeigt.',
  busy: 'Bild-Labels sind ausgelastet. Versuchen Sie es gleich noch einmal.',
  quotaUntil: (time) => `Ihr Kontingent ist aufgebraucht. Es wird um ${time} zurückgesetzt.`,
  quota: 'Ihr Kontingent ist aufgebraucht. Versuchen Sie es später noch einmal.',
  error: 'Etwas ist schiefgelaufen. Versuchen Sie es noch einmal.',
  retry: 'Erneut versuchen'
}

const catalog: Record<Lang, VisionMessages> = { en, de }

export function visionMessagesFor(lang: Lang): VisionMessages {
  return catalog[lang]
}

/** A score as a whole percent, for example `87 %` (de) or `87%` (en). */
export function formatScore(score: number, lang: Lang): string {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(score) ? score : 0))
  return new Intl.NumberFormat(lang === 'de' ? 'de-DE' : 'en-GB', {
    style: 'percent',
    maximumFractionDigits: 0
  }).format(clamped)
}

export { formatTime }
