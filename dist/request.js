"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isErrorStatus = exports.isSuccessStatus = exports.options = exports.delete = exports.head = exports.patch = exports.put = exports.post = exports.get = exports.request = exports.raw = void 0;
const tslib_1 = require("tslib");
const node_url_1 = tslib_1.__importDefault(require("node:url"));
let _http;
let _https;
const net = {
    http: function () {
        if (!_http)
            _http = require('http');
        return _http;
    },
    https: function () {
        if (!_https)
            _https = require('https');
        return _https;
    },
};
function once(fn) {
    let f = function () {
        if (f.called)
            return f.value;
        f.called = true;
        f.value = fn.apply(this, arguments);
        return f.value;
    };
    f.called = false;
    return f;
}
function rawRequest(optionsOrUrl, cb) {
    const options = typeof optionsOrUrl === 'string'
        ? { url: optionsOrUrl }
        : { ...optionsOrUrl };
    const callback = once(cb);
    if (options.url)
        parseOptsUrl(options);
    if (options.headers == null)
        options.headers = {};
    if (options.maxRedirects == null)
        options.maxRedirects = 10;
    const body = options.json ? JSON.stringify(options.body) : options.body;
    options.body = undefined;
    if (body && !options.method)
        options.method = 'POST';
    if (options.method)
        options.method = options.method.toUpperCase();
    if (options.json)
        options.headers['accept'] = 'application/json';
    if (options.json && body)
        options.headers['content-type'] = 'application/json';
    const protocol = options.protocol === 'https:' ? net.https() : net.http();
    const req = protocol.request(options, (res) => {
        if (res.statusCode >= 300 &&
            res.statusCode < 400 &&
            'location' in res.headers) {
            options.url = res.headers.location;
            parseOptsUrl(options);
            res.resume();
            options.maxRedirects -= 1;
            if (options.maxRedirects > 0) {
                options.body = body;
                rawRequest(options, callback);
            }
            else {
                callback(new Error('too many redirects'));
            }
            return;
        }
        callback(null, res);
    });
    req.on('timeout', () => {
        req.abort();
        callback(new Error('Request timed out'));
    });
    req.on('error', callback);
    if (isStream(body))
        body.on('error', callback).pipe(req);
    else
        req.end(body);
    return req;
}
exports.raw = rawRequest;
async function request(optionsOrUrl) {
    return new Promise((resolve, reject) => {
        rawRequest(optionsOrUrl, function (err, res) {
            if (err)
                return reject(err);
            const chunks = [];
            res.on('data', function (chunk) {
                chunks.push(chunk);
            });
            res.on('end', function () {
                var data = Buffer.concat(chunks);
                if (typeof optionsOrUrl === 'object' && optionsOrUrl.json) {
                    if (data.length === 0)
                        return resolve(res);
                    try {
                        data = JSON.parse(data.toString());
                        res.data = data;
                    }
                    catch (err) {
                        return reject(err);
                    }
                }
                else {
                    res.data = data;
                }
                resolve(res);
            });
        });
    });
}
exports.default = request;
exports.request = request;
const mainRequest = request;
function asMethod(method) {
    return function request(options) {
        if (typeof options === 'string')
            options = { url: options };
        options.method = method.toUpperCase();
        return mainRequest(options);
    };
}
exports.get = asMethod('get');
exports.post = asMethod('post');
exports.put = asMethod('put');
exports.patch = asMethod('patch');
exports.head = asMethod('head');
const _delete = asMethod('delete');
exports.delete = _delete;
exports.options = asMethod('options');
function parseOptsUrl(opts) {
    let loc = node_url_1.default.parse(opts.url);
    if (loc.hostname)
        opts.hostname = loc.hostname;
    if (loc.port)
        opts.port = loc.port;
    if (loc.protocol)
        opts.protocol = loc.protocol;
    if (loc.auth)
        opts.auth = loc.auth;
    opts.path = loc.path;
    delete opts.url;
}
function isSuccessStatus(response) {
    return response.statusCode?.toString()[0] === '2';
}
exports.isSuccessStatus = isSuccessStatus;
function isErrorStatus(response) {
    return !isSuccessStatus(response);
}
exports.isErrorStatus = isErrorStatus;
function isStream(o) {
    return o !== null && typeof o === 'object' && typeof o.pipe === 'function';
}
