// The widget session comes from the SDK: `createWidgetSession` (@synthwerk/sdk 0.3.0,
// synthwerk#52) was ported from this file and keeps its rules (cache per user token, one
// trade per user token, reset() drops the cache and a running trade never fills it).
// This file keeps only what the SDK does not export: the host hook reader.
import type { GetUserToken } from '@synthwerk/sdk'

export type { GetUserToken } from '@synthwerk/sdk'

/** The user token, or `null`. A host hook that throws counts as signed out. */
export async function userToken(get: GetUserToken | null | undefined): Promise<string | null> {
  if (!get) return null
  try {
    const token = await get()
    return typeof token === 'string' && token !== '' ? token : null
  } catch {
    return null
  }
}
