module.exports = request
module.exports.raw = rawRequest

var url = require('url')

// Lazily load these, since most likely only one is necessary
var _http, _https
var net = {
  http: function () {
    if (_http === undefined) _http = require('http')
    return _http
  },
  https: function () {
    if (_https === undefined) _https = require('https')
    return _https
  }
}

const isStream = o => o !== null && typeof o === 'object' && typeof o.pipe === 'function'

function once (fn) {
  var f = function () {
    if (f.called) return f.value
    f.called = true
    f.value = fn.apply(this, arguments)
    return f.value
  }
  f.called = false
  return f
}

function shallowCopy (target, source) {
  for (var key in source) {
    if (source.hasOwnProperty(key)) {
      target[key] = source[key]
    }
  }
  return target
}

function rawRequest (opts, cb) {
  opts = typeof opts === 'string' ? { url: opts } : shallowCopy(opts)
  cb = once(cb)

  if (opts.url) parseOptsUrl(opts)
  if (opts.headers == null) opts.headers = {}
  if (opts.maxRedirects == null) opts.maxRedirects = 10

  var body = opts.json ? JSON.stringify(opts.body) : opts.body
  opts.body = undefined
  if (body && !opts.method) opts.method = 'POST'
  if (opts.method) opts.method = opts.method.toUpperCase()
  if (opts.json) opts.headers.accept = 'application/json'
  if (opts.json && body) opts.headers['content-type'] = 'application/json'

  // Support http: and https: urls
  var protocol = opts.protocol === 'https:' ? net.https() : net.http()
  var req = protocol.request(opts, function (res) {
    // Follow 3xx redirects
    if (res.statusCode >= 300 && res.statusCode < 400 && 'location' in res.headers) {
      opts.url = res.headers.location
      parseOptsUrl(opts)
      res.resume() // Discard response

      opts.maxRedirects -= 1
      if (opts.maxRedirects > 0) rawRequest(opts, cb)
      else cb(new Error('too many redirects'))
      return
    }
    cb(null, res)
  })
  req.on('error', cb)
  if (isStream(body)) body.on('error', cb).pipe(req)
  else req.end(body)
  return req
}

function request (opts, cb) {
  if (cb === undefined) {
    if (typeof global.Promise === 'function') {
      return new Promise(function (resolve, reject) {
        request(opts, function (err, result) {
          if (err) reject(err)
          else resolve(result)
        })
      })
    }
    // Otherwise
    throw new Error('No callback was supplied, and global.Promise is not a function. You must provide an async interface')
  }
  return rawRequest(opts, function (err, res) {
    if (err) return cb(err)
    var chunks = []
    res.on('data', function (chunk) {
      chunks.push(chunk)
    })
    res.on('end', function () {
      var data = Buffer.concat(chunks)
      if (opts.json) {
        if (data.length === 0) return cb(err, res, null)
        try {
          data = JSON.parse(data.toString())
          res.data = data
        } catch (err) {
          return cb(err, res, data)
        }
      } else {
        res.data = data
      }
      cb(null, res, data)
    })
  })
}

;['get', 'post', 'put', 'patch', 'head', 'delete'].forEach(function (method) {
  module.exports[method] = function (opts, cb) {
    if (typeof opts === 'string') opts = { url: opts }
    opts.method = method.toUpperCase()
    return request(opts, cb)
  }
})

function parseOptsUrl (opts) {
  var loc = url.parse(opts.url)
  if (loc.hostname) opts.hostname = loc.hostname
  if (loc.port) opts.port = loc.port
  if (loc.protocol) opts.protocol = loc.protocol
  if (loc.auth) opts.auth = loc.auth
  opts.path = loc.path
  delete opts.url
}
