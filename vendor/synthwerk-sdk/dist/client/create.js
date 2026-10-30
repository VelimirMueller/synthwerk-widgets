import createClient, {} from 'openapi-fetch';
import { createTokenAuth } from "../auth/token.js";
import { chat } from "../llm/chat.js";
import { visionBody } from "../vision/body.js";
import { createTransport } from "./transport.js";
function trimSlash(url) {
    return url.replace(/\/+$/, '');
}
export function createSynthwerk(options) {
    if (options.auth.mode !== 'token') {
        throw new TypeError(`@synthwerk/sdk: auth mode "${String(options.auth.mode)}" is not supported`);
    }
    const auth = createTokenAuth(options.auth);
    const baseFetch = options.fetch ?? ((input) => globalThis.fetch(input));
    const send = createTransport({ auth, fetch: baseFetch, tracing: options.tracing ?? false });
    const apiUrl = trimSlash(options.apiUrl);
    const identityUrl = trimSlash(options.services?.identity ?? `${apiUrl}/identity`);
    const llmUrl = trimSlash(options.services?.llm ?? `${apiUrl}/llm`);
    const visionUrl = trimSlash(options.services?.vision ?? `${apiUrl}/vision`);
    return {
        auth: {
            signIn: auth.signIn,
            signOut: auth.signOut,
            getUser: auth.getUser,
            getAccessToken: auth.getAccessToken,
            onChange: auth.onChange
        },
        api: {
            identity: createClient({ baseUrl: identityUrl, fetch: send }),
            llm: createClient({ baseUrl: llmUrl, fetch: send }),
            vision: createClient({
                baseUrl: visionUrl,
                fetch: send,
                bodySerializer: visionBody
            })
        },
        llm: {
            chat: (request, chatOptions) => chat(send, llmUrl, request, chatOptions)
        }
    };
}
