// @synthwerk/sdk 0.3.0: the stable public surface. Everything else is internal.
export { createSynthwerkApp } from "./app/app.js";
export { createSynthwerk } from "./client/create.js";
export { errorFromResult, isSynthwerkError, SynthwerkError } from "./client/errors.js";
export { createWidgetSession, WIDGET_TOKEN_EXPIRY_MARGIN_S } from "./identity/widget-session.js";
export { requestWidgetToken } from "./identity/widget-token.js";
export { createChatStore } from "./state/chat-store.js";
export { createClassifyStore } from "./state/classify-store.js";
export { toErrorState } from "./state/error-state.js";
export { classifyMutation, conversationQuery, meQuery, synthwerkKeys } from "./state/queries.js";
