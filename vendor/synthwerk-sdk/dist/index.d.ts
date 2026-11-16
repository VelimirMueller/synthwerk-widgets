export { type AuthSnapshot, type AuthStatus, createSynthwerkApp, type SynthwerkApp, type SynthwerkAppOptions } from './app/app.ts';
export type { Auth, AuthOptions, AuthUser, GetToken, TokenAuthOptions } from './auth/types.ts';
export { createSynthwerk, type Synthwerk, type SynthwerkOptions } from './client/create.ts';
export { type ClientErrorCode, type ErrorCode, errorFromResult, isSynthwerkError, type QuotaExceeded, SynthwerkError, type SynthwerkErrorInit } from './client/errors.ts';
export { createWidgetSession, type GetUserToken, WIDGET_TOKEN_EXPIRY_MARGIN_S, type WidgetSession, type WidgetSessionOptions } from './identity/widget-session.ts';
export { requestWidgetToken, type WidgetToken, type WidgetTokenGrant, type WidgetTokenRequest, type WidgetTokenResult } from './identity/widget-token.ts';
export type { ChatOptions, ChatRequest, SendMessageRequest } from './llm/chat.ts';
export type { ChatEvent, FinishReason, Usage } from './llm/events.ts';
export { type ChatMessage, type ChatMessageStatus, type ChatSnapshot, type ChatSource, type ChatStore, type ChatStoreOptions, createChatStore } from './state/chat-store.ts';
export { type ClassifySnapshot, type ClassifySource, type ClassifyStatus, type ClassifyStore, createClassifyStore } from './state/classify-store.ts';
export { type ErrorKind, type ErrorState, toErrorState } from './state/error-state.ts';
export { classifyMutation, conversationQuery, meQuery, type SynthwerkMutation, type SynthwerkQuery, synthwerkKeys } from './state/queries.ts';
export type { Readable } from './state/store.ts';
import type { components as IdentityComponents, paths as IdentityPaths } from './generated/identity.ts';
import type { components as LlmComponents, paths as LlmPaths } from './generated/llm.ts';
import type { components as VisionComponents, paths as VisionPaths } from './generated/vision.ts';
export type { IdentityPaths, LlmPaths, VisionPaths };
export type Conversation = LlmComponents['schemas']['Conversation'];
export type Message = LlmComponents['schemas']['Message'];
/** RFC 9457 problem details with the stable `code`. */
export type Problem = LlmComponents['schemas']['Problem'];
export type Me = IdentityComponents['schemas']['Me'];
export type Org = IdentityComponents['schemas']['Org'];
export type Role = IdentityComponents['schemas']['Role'];
/** Answer of vision `POST /v1/classifications`. `correction` is null when none matches. */
export type Classification = VisionComponents['schemas']['Classification'];
export type ScoredLabel = VisionComponents['schemas']['ScoredLabel'];
export type ScoredTopic = VisionComponents['schemas']['ScoredTopic'];
export type Correction = VisionComponents['schemas']['Correction'];
/** Answer of vision `POST /v1/images`: the stored image and its generated id. */
export type VisionImage = VisionComponents['schemas']['Image'];
/** FastAPI error body `{detail}` of vision. Branch on the status, never on `detail`. */
export type VisionError = VisionComponents['schemas']['Error'];
