const concat = require('concat-stream')
const http = require('http')
const selfSignedHttps = require('self-signed-https')
const str = require('string-to-stream')

const requestMod = require('../request')

const get = requestMod.raw
const request = requestMod.default

test('request', (done) => {
  expect.assertions(4)

  var server = http.createServer(function (req, res) {
    expect(req.url).toBe('/path')
    res.statusCode = 200
    res.end('response')
  })

  server.listen(0, function () {
    var port = server.address().port
    get('http://localhost:' + port + '/path', function (err, res) {
      expect(err).toBeFalsy()
      expect(res.statusCode).toBe(200)
      res.pipe(
        concat(function (data) {
          expect(data.toString()).toBe('response')
          server.close()
          done()
        }),
      )
    })
  })
})

test('basic auth', (done) => {
  expect.assertions(4)

  var server = http.createServer(function (req, res) {
    expect(req.headers.authorization).toBe('Basic Zm9vOmJhcg==')
    res.statusCode = 200
    res.end('response')
  })

  server.listen(0, function () {
    var port = server.address().port
    get('http://foo:bar@localhost:' + port, function (err, res) {
      expect(err).toBeFalsy()
      expect(res.statusCode).toBe(200)
      res.pipe(
        concat(function (data) {
          expect(data.toString()).toBe('response')
          server.close()
          done()
        }),
      )
    })
  })
})

test('follow redirects (up to 10)', (done) => {
  expect.assertions(13)

  var num = 1
  var server = http.createServer(function (req, res) {
    expect(req.url).toBe('/' + num)
    num += 1

    if (num <= 10) {
      res.statusCode = 301
      res.setHeader('Location', '/' + num)
      res.end()
    } else {
      res.statusCode = 200
      res.end('response')
    }
  })

  server.listen(0, function () {
    var port = server.address().port
    get('http://localhost:' + port + '/1', function (err, res) {
      expect(err).toBeFalsy()
      expect(res.statusCode).toBe(200)
      res.pipe(
        concat(function (data) {
          expect(data.toString()).toBe('response')
          server.close()
          done()
        }),
      )
    })
  })
})

test('do not follow redirects', (done) => {
  expect.assertions(2)

  var server = http.createServer(function (req, res) {
    expect(req.url).toBe('/1')

    res.statusCode = 301
    res.setHeader('Location', '/2')
    res.end()
  })

  server.listen(0, function () {
    var port = server.address().port
    get(
      {
        url: 'http://localhost:' + port + '/1',
        maxRedirects: 0,
      },
      function (err) {
        expect(err instanceof Error).toBeTruthy()
        server.close()
        done()
      },
    )
  })
})

test('follow redirects (11 is too many)', (done) => {
  expect.assertions(11)

  var num = 1
  var server = http.createServer(function (req, res) {
    expect(req.url).toBe('/' + num)
    num += 1

    res.statusCode = 301
    res.setHeader('Location', '/' + num)
    res.end()
  })

  server.listen(0, function () {
    var port = server.address().port
    get('http://localhost:' + port + '/1', function (err) {
      expect(err instanceof Error).toBeTruthy()
      server.close()
      done()
    })
  })
})

test('follow redirects with body', (done) => {
  expect.assertions(13)

  var num = 1
  var server = http.createServer(function (req, res) {
    expect(req.url).toBe('/' + num)
    // t.equal(req.body, '1')
    num += 1

    if (num <= 10) {
      res.statusCode = 307
      res.setHeader('Location', '/' + num)
      res.end()
    } else {
      res.statusCode = 200

      var chunks = []
      req.on('data', function (chunk) {
        chunks.push(chunk)
      })
      req.on('end', function () {
        res.end(Buffer.concat(chunks))
      })
    }
  })

  server.listen(0, function () {
    var port = server.address().port
    var opts = {
      method: 'POST',
      url: 'http://localhost:' + port + '/1',
      body: 'this is the body',
    }
    get(opts, function (err, res) {
      expect(err).toBeFalsy()
      expect(res.statusCode).toBe(200)
      res.pipe(
        concat(function (data) {
          expect(data.toString()).toBe('this is the body')
          server.close()
          done()
        }),
      )
    })
  })
})

test('custom headers', (done) => {
  expect.assertions(2)

  var server = http.createServer(function (req, res) {
    expect(req.headers['custom-header']).toBe('custom-value')
    res.statusCode = 200
    res.end('response')
  })

  server.listen(0, function () {
    var port = server.address().port
    get(
      {
        url: 'http://localhost:' + port,
        headers: {
          'custom-header': 'custom-value',
        },
      },
      function (err, res) {
        expect(err).toBeFalsy()
        res.resume()
        server.close()
        done()
      },
    )
  })
})

test('https', (done) => {
  expect.assertions(4)

  var server = selfSignedHttps(function (req, res) {
    expect(req.url).toBe('/path')
    res.statusCode = 200
    res.end('response')
  })

  // Allow self-signed certs
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

  server.listen(0, function () {
    var port = server.address().port
    get('https://localhost:' + port + '/path', function (err, res) {
      expect(err).toBeFalsy()
      expect(res.statusCode).toBe(200)
      res.pipe(
        concat(function (data) {
          expect(data.toString()).toBe('response')
          server.close()
          done()
        }),
      )
    })
  })
})

test('redirect https to http', (done) => {
  expect.assertions(5)

  var httpPort = null
  var httpsPort = null

  var httpsServer = selfSignedHttps(function (req, res) {
    expect(req.url).toBe('/path1')
    res.statusCode = 301
    res.setHeader('Location', 'http://localhost:' + httpPort + '/path2')
    res.end()
  })

  var httpServer = http.createServer(function (req, res) {
    expect(req.url).toBe('/path2')
    res.statusCode = 200
    res.end('response')
  })

  httpsServer.listen(0, function () {
    httpsPort = httpsServer.address().port
    httpServer.listen(0, function () {
      httpPort = httpServer.address().port
      get('https://localhost:' + httpsPort + '/path1', function (err, res) {
        expect(err).toBeFalsy()
        expect(res.statusCode).toBe(200)
        res.pipe(
          concat(function (data) {
            expect(data.toString()).toBe('response')
            httpsServer.close()
            httpServer.close()
            done()
          }),
        )
      })
    })
  })
})

test('redirect http to https', (done) => {
  expect.assertions(5)

  var httpsPort = null
  var httpPort = null

  var httpServer = http.createServer(function (req, res) {
    expect(req.url).toBe('/path1')
    res.statusCode = 301
    res.setHeader('Location', 'https://localhost:' + httpsPort + '/path2')
    res.end()
  })

  var httpsServer = selfSignedHttps(function (req, res) {
    expect(req.url).toBe('/path2')
    res.statusCode = 200
    res.end('response')
  })

  httpServer.listen(0, function () {
    httpPort = httpServer.address().port
    httpsServer.listen(0, function () {
      httpsPort = httpsServer.address().port
      get('http://localhost:' + httpPort + '/path1', function (err, res) {
        expect(err).toBeFalsy()
        expect(res.statusCode).toBe(200)
        res.pipe(
          concat(function (data) {
            expect(data.toString()).toBe('response')
            httpsServer.close()
            httpServer.close()
            done()
          }),
        )
      })
    })
  })
})

test('post (text body)', (done) => {
  expect.assertions(4)

  var server = http.createServer(function (req, res) {
    expect(req.method).toBe('POST')
    res.statusCode = 200
    req.pipe(res)
  })

  server.listen(0, function () {
    var port = server.address().port
    var opts = {
      method: 'POST',
      url: 'http://localhost:' + port,
      body: 'this is the body',
    }
    get(opts, function (err, res) {
      expect(err).toBeFalsy()
      expect(res.statusCode).toBe(200)
      res.pipe(
        concat(function (data) {
          expect(data.toString()).toBe('this is the body')
          server.close()
          done()
        }),
      )
    })
  })
})

test('post (buffer body)', (done) => {
  expect.assertions(4)

  var server = http.createServer(function (req, res) {
    expect(req.method).toBe('POST')
    res.statusCode = 200
    req.pipe(res)
  })

  server.listen(0, function () {
    var port = server.address().port
    var opts = {
      method: 'POST',
      url: 'http://localhost:' + port,
      body: Buffer.from('this is the body'),
    }
    get(opts, function (err, res) {
      expect(err).toBeFalsy()
      expect(res.statusCode).toBe(200)
      res.pipe(
        concat(function (data) {
          expect(data.toString()).toBe('this is the body')
          server.close()
          done()
        }),
      )
    })
  })
})

test('post (stream body)', (done) => {
  expect.assertions(4)

  var server = http.createServer(function (req, res) {
    expect(req.method).toBe('POST')
    res.statusCode = 200
    req.pipe(res)
  })

  server.listen(0, function () {
    var port = server.address().port
    var opts = {
      method: 'POST',
      url: 'http://localhost:' + port,
      body: str('this is the body'),
    }
    get(opts, function (err, res) {
      expect(err).toBeFalsy()
      expect(res.statusCode).toBe(200)
      res.pipe(
        concat(function (data) {
          expect(data.toString()).toBe('this is the body')
          server.close()
          done()
        }),
      )
    })
  })
})

test('request', (done) => {
  expect.assertions(3)
  var server = http.createServer(function (req, res) {
    res.statusCode = 200
    res.end('blah blah blah')
  })

  server.listen(0, function () {
    var port = server.address().port
    request('http://localhost:' + port)
      .then((res) => {
        expect(res.statusCode).toBe(200)
        expect(Buffer.isBuffer(res.data)).toBeTruthy()
        expect(res.data.toString()).toBe('blah blah blah')
        server.close()
        done()
      })
      .catch((err) => {
        expect(err).toBeUndefined()
      })
  })
})

test('request data with promise', (done) => {
  expect.assertions(3)
  var server = http.createServer(function (req, res) {
    res.statusCode = 200
    res.end('blah blah blah')
  })

  server.listen(0, function () {
    var port = server.address().port
    request('http://localhost:' + port)
      .then((res) => {
        expect(res.statusCode).toBe(200)
        expect(Buffer.isBuffer(res.data)).toBeTruthy()
        expect(res.data.toString()).toBe('blah blah blah')
        server.close()
        done()
      })
      .catch((err) => {
        expect(err).toBeFalsy()
        server.close()
        done()
      })
  })
})

test('access `req` object', (done) => {
  expect.assertions(2)

  var server = http.createServer(function (req, res) {
    res.statusCode = 200
    res.end('response')
  })

  server.listen(0, function () {
    var port = server.address().port
    var req = get('http://localhost:' + port, function (err, res) {
      expect(err).toBeFalsy()
      res.resume() // discard data
      server.close()
      done()
    })

    req.on('socket', () => {
      expect(true).toBe(true)
    })
  })
})

test('request json', (done) => {
  expect.assertions(5)

  var server = http.createServer(function (req, res) {
    expect(req.url).toBe('/path')
    expect(req.headers['accept']).toBe('application/json')
    res.statusCode = 200
    res.end('{"message":"response"}')
  })

  server.listen(0, function () {
    var port = server.address().port
    var opts = {
      url: 'http://localhost:' + port + '/path',
      json: true,
    }
    get(opts, function (err, res) {
      expect(err).toBeFalsy()
      expect(res.statusCode).toBe(200)
      res.pipe(
        concat(function (data) {
          expect(data.toString()).toBe('{"message":"response"}')
          server.close()
          done()
        }),
      )
    })
  })
})

test('request json', (done) => {
  expect.assertions(2)
  var server = http.createServer(function (req, res) {
    res.statusCode = 200
    res.end('{"message":"response"}')
  })

  server.listen(0, function () {
    var port = server.address().port
    var opts = {
      url: 'http://localhost:' + port + '/path',
      json: true,
    }
    request(opts)
      .then((res) => {
        expect(res.statusCode).toBe(200)
        expect(res.data.message).toBe('response')
        server.close()
        done()
      })
      .catch((err) => {
        expect(err).toBeFalsy()
        server.close()
        done()
      })
  })
})

test('request json error', (done) => {
  expect.assertions(1)
  var server = http.createServer(function (req, res) {
    res.statusCode = 500
    res.end('not json')
  })

  server.listen(0, function () {
    var port = server.address().port
    var opts = {
      url: 'http://localhost:' + port + '/path',
      json: true,
    }
    request(opts)
      .then((res) => {
        expect(res).toBeFalsy()
      })
      .catch((err) => {
        expect(err instanceof Error).toBeTruthy()
        server.close()
        done()
      })
  })
})

test('post (json body)', (done) => {
  expect.assertions(4)

  var server = http.createServer(function (req, res) {
    expect(req.method).toBe('POST')
    expect(req.headers['content-type']).toBe('application/json')
    res.statusCode = 200
    req.pipe(res)
  })

  server.listen(0, function () {
    var port = server.address().port
    var opts = {
      method: 'POST',
      url: 'http://localhost:' + port,
      body: {
        message: 'this is the body',
      },
      json: true,
    }
    request(opts)
      .then((res) => {
        expect(res.statusCode).toBe(200)
        expect(res.data.message).toBe('this is the body')
        server.close()
        done()
      })
      .catch((err) => {
        expect(err).toBeFalsy()
        server.close()
        done()
      })
  })
})
