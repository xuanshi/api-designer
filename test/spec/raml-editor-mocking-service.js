'use strict';

describe('Mocking Service Controller', function () {
  var $scope;
  var editor;
  var baseUri        = 'http://base.url';
  var baseUriLine    = 'baseUri: ' + baseUri;
  var oldBaseUriLine = 'baseUri: http://old.url';

  beforeEach(module('ramlEditorApp'));
  beforeEach(inject(function ($injector, $rootScope, $controller) {
    $scope  = $rootScope.$new();
    editor  = $scope.editor = getEditor($injector.get('codeMirror'));

    $controller('ramlEditorMockingService', {
      $scope:         $scope,
      mockingService: $injector.get('mockingService')
    });
  }));

  describe('addBaseUri', function () {
    it('should add baseUri when document is empty', function () {
      editor.setValue([
        ''
      ].join('\n'));

      $scope.mock = {baseUri: baseUri};
      $scope.addBaseUri();

      editor.getLine(0).should.be.equal(baseUriLine);
    });

    it('should add baseUri after RAML directive', function () {
      editor.setValue([
        '#%RAML 0.8'
      ].join('\n'));

      $scope.mock = {baseUri: baseUri};
      $scope.addBaseUri();

      editor.getLine(1).should.be.equal(baseUriLine);
    });

    it('should add baseUri after document start mark', function () {
      editor.setValue([
        '#%RAML 0.8',
        '---'
      ].join('\n'));

      $scope.mock = {baseUri: baseUri};
      $scope.addBaseUri();

      editor.getLine(2).should.be.equal(baseUriLine);
    });

    it('should add baseUri after title', function () {
      editor.setValue([
        '#%RAML 0.8',
        '---',
        'title: My API'
      ].join('\n'));

      $scope.mock = {baseUri: baseUri};
      $scope.addBaseUri();

      editor.getLine(3).should.be.equal(baseUriLine);
    });

    it('should comment out current baseUri and add a mocked one after it', function () {
      editor.setValue([
        '#%RAML 0.8',
        '---',
        'title: My API',
        oldBaseUriLine
      ].join('\n'));

      $scope.mock = {baseUri: baseUri};
      $scope.addBaseUri();

      editor.getLine(3).should.be.equal('#' + oldBaseUriLine);
      editor.getLine(4).should.be.equal(baseUriLine);
    });

    it('should do nothing when old baseUri is commented out and mocked one is already presented', function () {
      editor.setValue([
        '#%RAML 0.8',
        '---',
        'title: My API',
        '#' + oldBaseUriLine,
        baseUriLine
      ].join('\n'));

      $scope.mock = {baseUri: baseUri};
      $scope.addBaseUri();

      editor.lineCount().should.be.equal(5);
      editor.getLine(3).should.be.equal('#' + oldBaseUriLine);
      editor.getLine(4).should.be.equal(baseUriLine);
    });
  });

  describe('removeBaseUri', function () {
    it('should remove baseUri when presented', function () {
      editor.setValue([
        '#%RAML 0.8',
        '---',
        'title: My API',
        baseUriLine
      ].join('\n'));

      $scope.mock = {baseUri: baseUri};
      $scope.removeBaseUri();

      editor.lineCount().should.be.equal(3);
      editor.getLine(2).should.be.equal('title: My API');
    });

    it('should remove baseUri and restore old one', function () {
      editor.setValue([
        '#%RAML 0.8',
        '---',
        'title: My API',
        '#' + oldBaseUriLine,
        baseUriLine
      ].join('\n'));

      $scope.mock = {baseUri: baseUri};
      $scope.removeBaseUri();

      editor.lineCount().should.be.equal(4);
      editor.getLine(3).should.be.equal(oldBaseUriLine);
    });

    it('should remove restore old one with whitespaces around', function () {
      editor.setValue([
        '#%RAML 0.8',
        '---',
        'title: My API',
        '# ' + oldBaseUriLine + ' ',
        baseUriLine
      ].join('\n'));

      $scope.mock = {baseUri: baseUri};
      $scope.removeBaseUri();

      editor.lineCount().should.be.equal(4);
      editor.getLine(3).should.be.equal(oldBaseUriLine);
    });
  });
});
