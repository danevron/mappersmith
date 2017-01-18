import Request from 'src/request'
import MethodDescriptor from 'src/method-descriptor'

describe('Request', () => {
  let methodDescriptor

  beforeEach(() => {
    methodDescriptor = new MethodDescriptor({})
  })

  describe('#params', () => {
    describe('without "requestParams"', () => {
      it('returns the "params" configured in the method descriptor', () => {
        methodDescriptor.params = { id: 1 }
        const request = new Request(methodDescriptor)
        expect(request.params()).toEqual({ id: 1 })
      })
    })

    describe('with "requestParams"', () => {
      it('merges "requestParams" and configured "params"', () => {
        methodDescriptor.params = { id: 1 }
        const request = new Request(methodDescriptor, { title: 'test' })
        expect(request.params()).toEqual({ id: 1, title: 'test' })
      })
    })

    it('does not return the body configured param', () => {
      methodDescriptor.params = { id: 1, payload: 'abc' }
      methodDescriptor.bodyAttr = 'payload'
      const request = new Request(methodDescriptor, { title: 'test' })
      expect(request.params()).toEqual({ id: 1, title: 'test' })
    })

    it('does not return the headers configured param', () => {
      methodDescriptor.params = { id: 1, myHeaders: { a: 1 } }
      methodDescriptor.headersAttr = 'myHeaders'
      const request = new Request(methodDescriptor, { title: 'test' })
      expect(request.params()).toEqual({ id: 1, title: 'test' })
    })
  })

  describe('#host', () => {
    it('has blank as the default host', () => {
      expect(new Request(methodDescriptor).host()).toEqual('')
    })

    it('removes trailing "/"', () => {
      methodDescriptor.host = 'http://example.org/'
      const host = new Request(methodDescriptor).host()
      expect(host).toEqual('http://example.org')
    })
  })

  describe('#path', () => {
    it('ensures leading "/"', () => {
      methodDescriptor.path = 'api/example.json'
      const path = new Request(methodDescriptor).path()
      expect(path).toEqual('/api/example.json')
    })

    it('append params as query string', () => {
      methodDescriptor.path = '/api/example.json'
      methodDescriptor.params = { id: 1, title: 'test' }
      const path = new Request(methodDescriptor).path()
      expect(path).toEqual('/api/example.json?id=1&title=test')
    })

    it('interpolates paths with dynamic sections', () => {
      methodDescriptor.path = '/api/example/{id}.json'
      methodDescriptor.params = { id: 1, title: 'test' }
      const path = new Request(methodDescriptor).path()
      expect(path).toEqual('/api/example/1.json?title=test')
    })

    describe('when dynamic section is not provided', () => {
      it('raises an exception', () => {
        methodDescriptor.path = '/api/example/{id}.json'
        expect(() => new Request(methodDescriptor).path())
          .toThrowError('[Mappersmith] required parameter missing (id), "/api/example/{id}.json" cannot be resolved')
      })
    })

    it('does not include headers', () => {
      methodDescriptor.path = '/api/example.json'
      methodDescriptor.params = { [methodDescriptor.headersAttr]: { 'Content-Type': 'application/json' } }
      const path = new Request(methodDescriptor).path()
      expect(path).toEqual('/api/example.json')
    })

    it('does not include body', () => {
      methodDescriptor.path = '/api/example.json'
      methodDescriptor.bodyAttr = 'body'
      methodDescriptor.params = { [methodDescriptor.bodyAttr]: 'body-payload' }
      const path = new Request(methodDescriptor).path()
      expect(path).toEqual('/api/example.json')
    })
  })

  describe('#url', () => {
    it('joins host and path', () => {
      methodDescriptor.host = 'http://example.org'
      methodDescriptor.path = 'api/example.json'
      const url = new Request(methodDescriptor).url()
      expect(url).toEqual('http://example.org/api/example.json')
    })
  })

  describe('#headers', () => {
    describe('with pre configured headers', () => {
      it('returns available headers', () => {
        methodDescriptor.headers = { Authorization: 'token-123' }
        const request = new Request(methodDescriptor)
        expect(request.headers()).toEqual({ authorization: 'token-123' })
      })
    })

    describe('with request headers', () => {
      it('returns available headers', () => {
        methodDescriptor.headers = { Authorization: 'token-123' }
        const request = new Request(methodDescriptor, {
          headers: {
            'Content-Type': 'application/json'
          }
        })

        expect(request.headers()).toEqual({
          authorization: 'token-123',
          'content-type': 'application/json'
        })
      })
    })
  })

  describe('#body', () => {
    it('returns the configured body param from params', () => {
      methodDescriptor.bodyAttr = 'differentParam'
      const request = new Request(methodDescriptor, { differentParam: 'abc123' })
      expect(request.body()).toEqual('abc123')
    })
  })

  describe('#method', () => {
    it('returns the http method always in lowercase', () => {
      methodDescriptor.method = 'GET'
      const request = new Request(methodDescriptor)
      expect(request.method()).toEqual('get')
    })
  })

  describe('#enhance', () => {
    it('creates a new request based on the current request merging the params', () => {
      const request = new Request(methodDescriptor, { a: 1 })
      const enhancedRequest = request.enhance({ params: { b: 2 } })
      expect(enhancedRequest).not.toEqual(request)
      expect(enhancedRequest.params()).toEqual({ a: 1, b: 2 })
    })

    it('creates a new request based on the current request merging the headers', () => {
      const request = new Request(methodDescriptor, { headers: { 'x-old': 'no' } })
      const enhancedRequest = request.enhance({ headers: { 'x-special': 'yes' } })
      expect(enhancedRequest).not.toEqual(request)
      expect(enhancedRequest.headers()).toEqual({ 'x-old': 'no', 'x-special': 'yes' })
    })

    it('creates a new request based on the current request replacing the body', () => {
      const request = new Request(methodDescriptor, { body: 'payload-1' })
      const enhancedRequest = request.enhance({ body: 'payload-2' })
      expect(enhancedRequest).not.toEqual(request)
      expect(enhancedRequest.body()).toEqual('payload-2')
    })

    describe('for requests with a different "headers" key', () => {
      beforeEach(() => {
        methodDescriptor = new MethodDescriptor({ headersAttr: 'snowflake' })
      })

      it('creates a new request based on the current request merging the custom "headers" key', () => {
        const request = new Request(methodDescriptor, { snowflake: { 'x-old': 'no' } })
        const enhancedRequest = request.enhance({ headers: { 'x-special': 'yes' } })
        expect(enhancedRequest).not.toEqual(request)
        expect(enhancedRequest.headers()).toEqual({ 'x-old': 'no', 'x-special': 'yes' })
      })
    })

    describe('for requests with a different "body" key', () => {
      beforeEach(() => {
        methodDescriptor = new MethodDescriptor({ bodyAttr: 'snowflake' })
      })

      it('creates a new request based on the current request replacing the custom "body"', () => {
        const request = new Request(methodDescriptor, { snowflake: 'payload-1' })
        const enhancedRequest = request.enhance({ body: 'payload-2' })
        expect(enhancedRequest).not.toEqual(request)
        expect(enhancedRequest.body()).toEqual('payload-2')
      })
    })
  })
})