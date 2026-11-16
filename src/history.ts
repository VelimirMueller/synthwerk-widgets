// Past conversations of the signed-in user (synthwerk#54): llm `GET /v1/conversations`.
// The vendored SDK (0.3.0) has no generated type for this route yet, so this file
// types it locally from synthwerk-contracts `llm.listConversations` (spec 0.6.0).
// Move to the SDK client once its contracts pin passes 0.6.0.
//
// llm binds every widget conversation to the widget token's origin: the list holds
// only the conversations the user had on this site.
import type { Synthwerk } from '@synthwerk/sdk'
import { problemError } from './errors.ts'

/** Contract `ConversationSummary`. */
export interface ConversationSummary {
  id: string
  model: string
  /** Plain text, at most 80 characters. Never HTML. */
  title: string
  created_at: string
}

/** Contract `ConversationPage`. */
export interface ConversationPage {
  items: ConversationSummary[]
  next_cursor?: string
}

/** The one call of the openapi-fetch client this file makes, typed from the contract. */
interface ListClient {
  GET(
    path: '/v1/conversations',
    init: { params: { query: { limit: number; cursor?: string } } }
  ): Promise<{ data?: ConversationPage; error?: unknown; response: Response }>
}

/** Page size of the history list. */
export const HISTORY_PAGE = 20

/** One page of the user's past conversations, newest first. Throws a SynthwerkError. */
export async function listConversations(
  sw: Pick<Synthwerk, 'api'>,
  cursor?: string
): Promise<ConversationPage> {
  // The same openapi-fetch client, with the route typed here (see the file comment).
  const client = sw.api.llm as unknown as ListClient
  const query = cursor ? { limit: HISTORY_PAGE, cursor } : { limit: HISTORY_PAGE }
  const { data, error, response } = await client.GET('/v1/conversations', { params: { query } })
  if (!data) throw problemError(error, response)
  return data
}
