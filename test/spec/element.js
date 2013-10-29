'use strict';

var mockConfig;

describe('Configurable Elements Service', function () {

  beforeEach(function () {

    module('raml');

    module(function ($provide) {
      $provide.decorator('config', function () {
        return {
          get: sinon.stub(),
          set: sinon.stub()
        };
      });
    });

    inject(function (_config_) {
      mockConfig = sinon.stub();
    });

  });

});
