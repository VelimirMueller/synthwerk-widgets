export type { Auth, AuthOptions, AuthUser, GetToken, TokenAuthOptions } from './auth/types.ts';
export { createSynthwerk, type Synthwerk, type SynthwerkOptions } from './client/create.ts';
export { type ClientErrorCode, type ErrorCode, isSynthwerkError, SynthwerkError, type SynthwerkErrorInit } from './client/errors.ts';
export type { ChatOptions, ChatRequest, SendMessageRequest } from './llm/chat.ts';
export type { ChatEvent, FinishReason, Usage } from './llm/events.ts';
import type { components as IdentityComponents, paths as IdentityPaths } from './generated/identity.ts';
import type { components as LlmComponents, paths as LlmPaths } from './generated/llm.ts';
export type { IdentityPaths, LlmPaths };
export type Conversation = LlmComponents['schemas']['Conversation'];
export type Message = LlmComponents['schemas']['Message'];
/** RFC 9457 problem details with the stable `code`. */
export type Problem = LlmComponents['schemas']['Problem'];
export type Me = IdentityComponents['schemas']['Me'];
export type Org = IdentityComponents['schemas']['Org'];
export type Role = IdentityComponents['schemas']['Role'];
