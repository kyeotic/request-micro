import url from 'node:url'
import type Http from 'node:http'
import type Https from 'node:https'

type Single<F extends (...args: any) => any> = F & {
  value?: ReturnType<F>
  called: boolean
}

export type RequestOptions = {
  url: string
  maxRedirects?: number
  json?: boolean
  body?: any
} & Https.RequestOptions

// Lazily load these, since most likely only one is necessary
let _http: typeof Http
let _https: typeof Https

const net = {
  http: function () {
    if (!_http) _http = require('node:http')
    return _http
  },
  https: function () {
    if (!_https) _https = require('node:https')
    return _https
  },
}

function once<F extends (...args: any) => any>(fn: F): Single<F> {
  let f: any = function () {
    if (f.called) return f.value
    f.called = true
    f.value = fn.apply(this, arguments)
    return f.value
  }
  f.called = false
  return f as Single<F>
}

function rawRequest(
  optionsOrUrl: RequestOptions | string,
  cb: (err: Error | null, response: Http.IncomingMessage) => void,
) {
  const options: RequestOptions =
    typeof optionsOrUrl === 'string'
      ? { url: optionsOrUrl }
      : { ...optionsOrUrl }
  const callback = once(cb)

  if (options.url) parseOptsUrl(options)
  if (options.headers == null) options.headers = {}
  if (options.maxRedirects == null) options.maxRedirects = 10

  const body = options.json ? JSON.stringify(options.body) : options.body
  options.body = undefined
  if (body && !options.method) options.method = 'POST'
  if (options.method) options.method = options.method.toUpperCase()
  if (options.json) options.headers['accept'] = 'application/json'
  if (options.json && body) options.headers['content-type'] = 'application/json'

  // Support http: and https: urls
  const protocol = options.protocol === 'https:' ? net.https() : net.http()
  const req = protocol.request(options, (res: Http.IncomingMessage) => {
    // Follow 3xx redirects
    if (
      res.statusCode! >= 300 &&
      res.statusCode! < 400 &&
      'location' in res.headers
    ) {
      options.url = res.headers.location!
      parseOptsUrl(options)
      res.resume() // Discard response

      options.maxRedirects! -= 1
      if (options.maxRedirects! > 0) {
        options.body = body
        rawRequest(options, callback)
      } else {
        // @ts-ignore
        callback(new Error('too many redirects'))
      }
      return
    }
    callback(null, res)
  })
  req.on('timeout', () => {
    req.abort()
    // @ts-ignore
    callback(new Error('Request timed out'))
  })
  req.on('error', callback)
  if (isStream(body)) body.on('error', callback).pipe(req)
  else req.end(body)
  return req
}

export { rawRequest as raw }

export default async function request(
  optionsOrUrl: RequestOptions | string,
): Promise<Http.IncomingMessage & { data?: any }> {
  return new Promise((resolve, reject) => {
    rawRequest(
      optionsOrUrl,
      function (err: Error | null, res: Http.IncomingMessage & { data?: any }) {
        if (err) return reject(err)
        const chunks: Uint8Array[] = []
        res.on('data', function (chunk) {
          chunks.push(chunk)
        })
        res.on('end', function () {
          var data = Buffer.concat(chunks)
          if (typeof optionsOrUrl === 'object' && optionsOrUrl.json) {
            if (data.length === 0) return resolve(res)
            try {
              data = JSON.parse(data.toString())
              res.data = data
            } catch (err) {
              return reject(err)
            }
          } else {
            res.data = data
          }
          resolve(res)
        })
      },
    )
  })
}

export { request }

type RequestResult = ReturnType<typeof request>
const mainRequest = request

function asMethod(method: string): typeof request {
  return function request(options: RequestOptions | string): RequestResult {
    if (typeof options === 'string') options = { url: options }
    options.method = method.toUpperCase()
    return mainRequest(options)
  }
}

export const get = asMethod('get')
export const post = asMethod('post')
export const put = asMethod('put')
export const patch = asMethod('patch')
export const head = asMethod('head')
const _delete = asMethod('delete')
export { _delete as delete }
export const options = asMethod('options')

function parseOptsUrl(opts: RequestOptions) {
  let loc = url.parse(opts.url)
  if (loc.hostname) opts.hostname = loc.hostname
  if (loc.port) opts.port = loc.port
  if (loc.protocol) opts.protocol = loc.protocol
  if (loc.auth) opts.auth = loc.auth
  opts.path = loc.path
  // @ts-ignore
  delete opts.url
}

export function isSuccessStatus(response: Http.IncomingMessage): boolean {
  return response.statusCode?.toString()[0] === '2'
}

export function isErrorStatus(response: Http.IncomingMessage): boolean {
  return !isSuccessStatus(response)
}

function isStream(o: any) {
  return o !== null && typeof o === 'object' && typeof o.pipe === 'function'
}
