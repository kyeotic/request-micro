/// <reference types="node" />
/// <reference types="node" />
import type Http from 'node:http';
import type Https from 'node:https';
export declare type RequestOptions = {
    url: string;
    maxRedirects?: number;
    json?: boolean;
    body?: any;
} & Https.RequestOptions;
declare function rawRequest(optionsOrUrl: RequestOptions | string, cb: (err: Error | null, response: Http.IncomingMessage) => void): Http.ClientRequest;
export { rawRequest as raw };
export default function request(optionsOrUrl: RequestOptions | string): Promise<Http.IncomingMessage & {
    data?: any;
}>;
export { request };
export declare const get: typeof request;
export declare const post: typeof request;
export declare const put: typeof request;
export declare const patch: typeof request;
export declare const head: typeof request;
declare const _delete: typeof request;
export { _delete as delete };
export declare const options: typeof request;
export declare function isSuccessStatus(response: Http.IncomingMessage): boolean;
export declare function isErrorStatus(response: Http.IncomingMessage): boolean;
