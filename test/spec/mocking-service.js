'use strict';

describe('mockingService', function () {
  var $httpBackend;
  var mockingService;

  beforeEach(module('ramlEditorApp'));
  beforeEach(inject(function ($injector, $window) {
    $httpBackend   = $injector.get('$httpBackend');
    mockingService = $injector.get('mockingService');

    delete $window.RAML.Settings.proxy;
  }));

  afterEach(function() {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });

  describe('buildURL', function () {
    it('should return proper URL', function () {
      var host = mockingService.host = 'http://host';
      var base = mockingService.base = '/base';
      var path = 'path';

      mockingService.buildURL(path).should.be.equal(host + base + '/' + path);
    });

    it('should use proxy configured via $window.RAML.Settings.proxy', inject(function ($window) {
      var proxy = $window.RAML.Settings.proxy = '/proxy/';
      var host  = mockingService.host = 'http://host';
      var base  = mockingService.base = '/base';
      var path  = 'path';
      var url   = proxy + host + base + '/' + path;

      mockingService.buildURL(path).should.be.equal(url);
    }));

    it('should use proxy configured via "proxy" property', function () {
      var proxy = mockingService.proxy = '/proxy/';
      var host  = mockingService.host = 'http://host';
      var base  = mockingService.base = '/base';
      var path  = 'path';
      var url   = proxy + host + base + '/' + path;

      mockingService.buildURL(path).should.be.equal(url);
    });

    it('should use proxy configured via "proxy" property with $window.RAML.Settings.proxy configured at the same time', inject(function ($window) {
      var proxy = mockingService.proxy = '/proxy1/';
      var host  = mockingService.host = 'http://host';
      var base  = mockingService.base = '/base';
      var path  = 'path';
      var url   = proxy + host + base + '/' + path;

      $window.RAML.Settings.proxy = '/proxy2/';

      mockingService.buildURL(path).should.be.equal(url);
    }));
  });

  describe('getMock', function () {
    it('should exist', function () {
      should.exist(mockingService.getMock);
    });

    it('should make GET request to proper URL', function () {
      var mockId    = 1;
      var manageKey = 2;
      var url       = mockingService.buildURL(mockId, manageKey);

      $httpBackend.expectGET(url).respond(200, {});

      mockingService.getMock({mockId: mockId, manageKey: manageKey});

      $httpBackend.flush();
    });

    it('should eventually return mock instance', function () {
      var mockId    = 1;
      var manageKey = 2;
      var url       = mockingService.buildURL(mockId, manageKey);
      var mock;

      $httpBackend.expectGET(url).respond(
        // status
        200,

        // data
        angular.toJson({
          mockId:    mockId,
          manageKey: manageKey
        }),

        // headers
        {
          'Content-Type': 'application/json'
        }
      );

      mockingService.getMock({mockId: mockId, manageKey: manageKey}).then(function success($mock) {
        mock = $mock;
      });

      $httpBackend.flush();

      mock.should.have.property('mockId',    mockId);
      mock.should.have.property('manageKey', manageKey);
    });

    it('should handle "404" error', function () {
      var mock      = {};
      var mockId    = 1;
      var manageKey = 2;
      var url       = mockingService.buildURL(mockId, manageKey);

      $httpBackend.expectGET(url).respond(404);

      mockingService.getMock({mockId: mockId, manageKey: manageKey}).then(function success($mock) {
        mock = $mock;
      });

      $httpBackend.flush();

      should.not.exist(mock);
    });

    it('should propagate non "404" errors', function () {
      var mockId    = 1;
      var manageKey = 2;
      var url       = mockingService.buildURL(mockId, manageKey);
      var response;

      $httpBackend.expectGET(url).respond(500);

      mockingService.getMock({mockId: mockId, manageKey: manageKey}).then(
        function success()          { },
        function failure($response) {
          response = $response;
        }
      );

      $httpBackend.flush();

      response.status.should.be.equal(500);
    });
  });

  describe('createMock', function () {
    it('should exist', function () {
      should.exist(mockingService.createMock);
    });

    it('should make POST request to proper URL', function () {
      var url  = mockingService.buildURL();
      var data = {raml: '#%RAML 0.8\n---\ntitle: My API'};

      $httpBackend.expectPOST(url, data).respond(200, {});

      mockingService.createMock(data);

      $httpBackend.flush();
    });

    it('should eventually return mock instance', function () {
      var url  = mockingService.buildURL();
      var raml = '#%RAML 0.8\n---\ntitle: My API';
      var data = {raml: raml};
      var mock;

      $httpBackend.expectPOST(url, data).respond(
        // status
        200,

        // data
        angular.toJson(data),

        // headers
        {
          'Content-Type': 'application/json'
        }
      );

      mockingService.createMock(data).then(function success($mock) {
        mock = $mock;
      });

      $httpBackend.flush();

      mock.raml.should.be.equal(raml);
    });
  });

  describe('updateMock', function () {
    it('should exist', function () {
      should.exist(mockingService.updateMock);
    });

    it('should make PATCH request to proper URL', function () {
      var mock = {
        mockId:    '1',
        manageKey: '2',
        raml:      '#%RAML 0.8\n---\ntitle: My API'
      };
      var url  = mockingService.buildURL(mock.mockId, mock.manageKey);

      $httpBackend.expectPATCH(url, {raml: mock.raml}).respond(200);

      mockingService.updateMock(mock);

      $httpBackend.flush();
    });
  });

  describe('deleteMock', function () {
    it('should exist', function () {
      should.exist(mockingService.deleteMock);
    });

    it('should make DELETE request to proper URL', function () {
      var mock = {
        mockId:    '1',
        manageKey: '2'
      };
      var url  = mockingService.buildURL(mock.mockId, mock.manageKey);

      $httpBackend.expectDELETE(url).respond(200);

      mockingService.deleteMock(mock);

      $httpBackend.flush();
    });
  });
});
