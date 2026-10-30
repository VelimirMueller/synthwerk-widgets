import type { SynthwerkApp } from '../app/app.ts';
import type { components as IdentityComponents } from '../generated/identity.ts';
import type { components as LlmComponents } from '../generated/llm.ts';
import type { components as VisionComponents } from '../generated/vision.ts';
type Me = IdentityComponents['schemas']['Me'];
type Conversation = LlmComponents['schemas']['Conversation'];
type Classification = VisionComponents['schemas']['Classification'];
export declare const synthwerkKeys: {
    all: readonly ["synthwerk"];
    /** Everything cached for one user (`null`: before the first sign-in check). */
    user: (subject: string | null) => readonly ["synthwerk", string | null];
    me: (subject: string | null) => readonly ["synthwerk", string | null, "identity", "me"];
    conversation: (subject: string | null, id: string) => readonly ["synthwerk", string | null, "llm", "conversation", string];
    classify: readonly ["synthwerk", "vision", "classify"];
};
export interface SynthwerkQuery<T, K extends readonly unknown[]> {
    queryKey: K;
    queryFn: (context: {
        signal: AbortSignal;
    }) => Promise<T>;
}
export interface SynthwerkMutation<T, V> {
    mutationKey: readonly unknown[];
    mutationFn: (variables: V) => Promise<T>;
}
type Source = Pick<SynthwerkApp, 'sw' | 'auth'>;
/** `GET /identity/v1/me`: the caller with orgs and roles. Errors are SynthwerkErrors. */
export declare function meQuery(app: Source): SynthwerkQuery<Me, ReturnType<typeof synthwerkKeys.me>>;
/** `GET /llm/v1/conversations/{id}`: one conversation with its messages. */
export declare function conversationQuery(app: Source, id: string): SynthwerkQuery<Conversation, ReturnType<typeof synthwerkKeys.conversation>>;
/** Vision classification as a mutation (widget token; needs `appId`). */
export declare function classifyMutation(app: Pick<SynthwerkApp, 'widget'>): SynthwerkMutation<Classification, Blob>;
export {};
