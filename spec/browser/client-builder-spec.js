import ClientBuilder from 'src/client-builder'
import Manifest from 'src/manifest'
import Request from 'src/request'
import { getManifest } from 'spec/helper'

describe('ClientBuilder', () => {
  let manifest,
      gatewayClass,
      gatewayInstance,
      clientBuilder,
      client

  beforeEach(() => {
    manifest = getManifest()

    gatewayInstance = jasmine.createSpyObj('gatewayInstance', ['call'])
    gatewayClass = jasmine.createSpy('GatewayConstructor').and.returnValue(gatewayInstance)

    clientBuilder = new ClientBuilder(manifest, () => gatewayClass)
    client = clientBuilder.build()
  })

  it('creates an object with all resources, methods, and a reference to the manifest', () => {
    expect(client.User).toEqual(jasmine.any(Object))
    expect(client.User.byId).toEqual(jasmine.any(Function))

    expect(client.Blog).toEqual(jasmine.any(Object))
    expect(client.Blog.post).toEqual(jasmine.any(Function))
    expect(client.Blog.addComment).toEqual(jasmine.any(Function))

    expect(client._manifest instanceof Manifest).toEqual(true)
  })

  describe('when a resource method is called', () => {
    it('calls the gateway with the correct request', () => {
      gatewayInstance.call.and.returnValue('Promise')
      expect(client.User.byId({ id: 1 })).toEqual('Promise')
      expect(gatewayClass).toHaveBeenCalledWith(jasmine.any(Request))
      expect(gatewayInstance.call).toHaveBeenCalled()

      const request = gatewayClass.calls.argsFor(0)[0]
      expect(request).toEqual(jasmine.any(Request))
      expect(request.method()).toEqual('get')
      expect(request.host()).toEqual('http://example.org')
      expect(request.path()).toEqual('/users/1')
      expect(request.params()).toEqual({ id: 1 })
    })
  })

  describe('when manifest is not defined', () => {
    it('raises error', () => {
      expect(() => new ClientBuilder())
        .toThrowError('[Mappersmith] invalid manifest (undefined)')
    })
  })

  describe('when gatewayClass is not defined', () => {
    it('raises error', () => {
      expect(() => new ClientBuilder(manifest, null))
        .toThrowError('[Mappersmith] gateway class not configured (configs.gateway)')
    })
  })

  describe('when a resource path is not defined', () => {
    it('raises error', () => {
      manifest = { resources: { User: { all: { } } } }
      expect(() => new ClientBuilder(manifest, gatewayClass).build())
        .toThrowError('[Mappersmith] path is undefined for resource "User" method "all"')
    })
  })
})
