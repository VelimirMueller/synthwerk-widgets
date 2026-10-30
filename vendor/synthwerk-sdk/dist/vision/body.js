// The request body of the vision client. Classification, upload and feedback take
// `multipart/form-data`; the label routes take JSON.
/**
 * A body with a Blob value (a File is a Blob) becomes FormData: one part per field, the
 * Blob as a file part. Any other body is JSON. openapi-fetch lets the browser set the
 * multipart `Content-Type` with its boundary when the body is FormData.
 */
export function visionBody(body) {
    if (typeof body === 'object' && body !== null && !Array.isArray(body)) {
        const entries = Object.entries(body);
        if (entries.some(([, value]) => value instanceof Blob)) {
            const form = new FormData();
            for (const [name, value] of entries) {
                if (value === undefined || value === null)
                    continue;
                form.append(name, value instanceof Blob ? value : String(value));
            }
            return form;
        }
    }
    return JSON.stringify(body);
}
