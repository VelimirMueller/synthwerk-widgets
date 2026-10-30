/**
 * A body with a Blob value (a File is a Blob) becomes FormData: one part per field, the
 * Blob as a file part. Any other body is JSON. openapi-fetch lets the browser set the
 * multipart `Content-Type` with its boundary when the body is FormData.
 */
export declare function visionBody(body: unknown): FormData | string;
