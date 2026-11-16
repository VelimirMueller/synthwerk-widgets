import { errorFromResult } from "../client/errors.js";
export const synthwerkKeys = {
    all: ['synthwerk'],
    /** Everything cached for one user (`null`: before the first sign-in check). */
    user: (subject) => ['synthwerk', subject],
    me: (subject) => ['synthwerk', subject, 'identity', 'me'],
    conversation: (subject, id) => ['synthwerk', subject, 'llm', 'conversation', id],
    classify: ['synthwerk', 'vision', 'classify']
};
function subjectOf(app) {
    return app.auth.getSnapshot().user?.subject ?? null;
}
/** `GET /identity/v1/me`: the caller with orgs and roles. Errors are SynthwerkErrors. */
export function meQuery(app) {
    return {
        queryKey: synthwerkKeys.me(subjectOf(app)),
        async queryFn({ signal }) {
            const { data, error, response } = await app.sw.api.identity.GET('/v1/me', { signal });
            if (!data)
                throw errorFromResult(error, response);
            return data;
        }
    };
}
/** `GET /llm/v1/conversations/{id}`: one conversation with its messages. */
export function conversationQuery(app, id) {
    return {
        queryKey: synthwerkKeys.conversation(subjectOf(app), id),
        async queryFn({ signal }) {
            const { data, error, response } = await app.sw.api.llm.GET('/v1/conversations/{id}', {
                params: { path: { id } },
                signal
            });
            if (!data)
                throw errorFromResult(error, response);
            return data;
        }
    };
}
/** Vision classification as a mutation (widget token; needs `appId`). */
export function classifyMutation(app) {
    return {
        mutationKey: synthwerkKeys.classify,
        async mutationFn(image) {
            const widget = app.widget();
            if (!widget)
                throw new TypeError('@synthwerk/sdk: classify needs an appId (widget token)');
            const { data, error, response } = await widget.sw.api.vision.POST('/v1/classifications', {
                body: { image }
            });
            if (!data)
                throw errorFromResult(error, response);
            return data;
        }
    };
}
