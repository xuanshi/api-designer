'use strict';

describe('RAML Repository', function () {
  var $rootScope, $q, ramlRepository, fileSystem, sandbox;

  beforeEach(module('fs'));
  beforeEach(function () {
    module(function($exceptionHandlerProvider) {
      $exceptionHandlerProvider.mode('log');
    });
  });

  beforeEach(inject(function ($injector) {
    $rootScope = $injector.get('$rootScope');
    $q = $injector.get('$q');
    ramlRepository = $injector.get('ramlRepository');
    fileSystem = $injector.get('fileSystem');

    sandbox = sinon.sandbox.create();
  }));

  afterEach(inject(function() {
    sandbox.restore();
  }));

  describe('getFolder', function () {
    it('should reflect the contents of a folder on success', function () {
      // Arrange
      var folderDeferred = $q.defer();
      sinon.stub(fileSystem, 'folder').returns(folderDeferred.promise);
      var success = sinon.stub();
      var files = {
        path: '/',
        name: '/',
        children: [
          {
            path: '/example.raml',
            name: 'example.raml',
            content: ''
          }
        ]
      };

      // Act
      ramlRepository.getFolder('/').then(success);

      folderDeferred.resolve(files);
      $rootScope.$apply();

      // Assert
      var folder = success.firstCall.args[0];
      folder.files[0].path.should.be.equal(files.children[0].path);
      folder.files[0].name.should.be.equal(files.children[0].name);
      folder.files[0].dirty.should.be.false;
      folder.files[0].persisted.should.be.true;
    });

    it('should handle errors', function () {
      // Arrange
      var folderDeferred = $q.defer();
      sinon.stub(fileSystem, 'folder').returns(folderDeferred.promise);
      var error = sinon.stub();
      var errorData = {message: 'Error occurred'};

      // Act
      ramlRepository.getFolder('/').then(function () {}, error);

      folderDeferred.reject(errorData);
      $rootScope.$apply();

      // Assert
      error.firstCall.args[0].should.be.deep.equal(errorData);
    });
  });

  describe('loadFile', function () {
    it('should reflect the content of a file on success', function () {
      // Arrange
      var loadDeferred = $q.defer();
      sinon.stub(fileSystem, 'load').returns(loadDeferred.promise);
      var success = sinon.stub();
      var fileContent = 'this is the file content';
      var file;

      // Act
      ramlRepository.loadFile({}).then(success);

      loadDeferred.resolve(fileContent);
      $rootScope.$apply();

      // Assert
      file = success.firstCall.args[0];
      file.dirty.should.be.equal(false);
      file.contents.should.be.equal(fileContent);
      should.not.exist(file.error);
    });

    it('should handle errors', function () {
      // Arrange
      var loadDeferred = $q.defer();
      sinon.stub(fileSystem, 'load').returns(loadDeferred.promise);
      var error = sinon.stub();
      var errorData = {message: 'Error occurred'};
      var fileMock = {};

      // Act
      ramlRepository.loadFile(fileMock).then(function () {}, error);

      loadDeferred.reject(errorData);
      $rootScope.$apply();

      // Assert
      error.firstCall.args[0].should.be.equal(errorData);

      fileMock.error.should.be.equal(errorData);
    });
  });

  describe('removeFile', function () {
    it('should update file on success', function () {
      // Arrange
      var removeDeferred = $q.defer();
      sinon.stub(fileSystem, 'remove').returns(removeDeferred.promise);
      var success = sinon.stub();
      var fileMock = {};

      // Act
      ramlRepository.removeFile(fileMock).then(success);

      removeDeferred.resolve();
      $rootScope.$apply();

      // Assert
      fileMock.dirty.should.be.equal(false);
      should.not.exist(fileMock.error);
    });

    it('should handle errors', function () {
      // Arrange
      var removeDeferred = $q.defer();
      sinon.stub(fileSystem, 'remove').returns(removeDeferred.promise);
      var error = sinon.stub();
      var fileMock = {};
      var errorData = {message: 'This is the error description'};

      // Act
      ramlRepository.removeFile(fileMock).then(function () {}, error);

      removeDeferred.reject(errorData);
      $rootScope.$apply();

      // Assert
      error.firstCall.args[0].should.be.equal(errorData);

      fileMock.error.should.be.equal(errorData);
    });
  });

  describe('saveFile', function () {
    it('should update file state on success', function () {
      // Arrange
      var saveDeferred = $q.defer();
      sinon.stub(fileSystem, 'save').returns(saveDeferred.promise);
      var success = sinon.stub();
      var fileMock = {
        path: '/',
        name: 'example.raml',
        dirty: true
      };
      var file;

      // Act
      ramlRepository.saveFile(fileMock).then(success);

      saveDeferred.resolve();
      $rootScope.$apply();

      // Assert
      file = success.firstCall.args[0];
      file.dirty.should.be.equal(false);
      file.persisted.should.be.equal(true);
      should.not.exist(file.error);
    });

    it('should handle errors', function () {
      // Arrange
      var saveDeferred = $q.defer();
      sinon.stub(fileSystem, 'save').returns(saveDeferred.promise);
      var error = sinon.stub();
      var fileMock = {
        path: '/',
        name: 'example.raml',
        dirty: true
      };
      var errorData = {message: 'This is the error description'};

      // Act
      ramlRepository.saveFile(fileMock).then(function () {}, error);

      saveDeferred.reject(errorData);
      $rootScope.$apply();

      // Assert
      error.firstCall.args[0].should.be.equal(errorData);

      fileMock.error.should.be.equal(errorData);
    });
  });

  describe('renameFile', function () {
    var file, fileSystemMock, renameFile;

    beforeEach(function() {
      file = { name: 'currentName', path: '/currentPath/currentName', persisted: true };
      fileSystemMock = sandbox.stub(fileSystem, 'rename');
    });

    describe('by default', function() {
      beforeEach(function() {
        renameFile = function() {
          ramlRepository.renameFile(file, 'newName');
        };
      });

      it('delegates to the fileSystem, providing the file\'s current path', function() {
        fileSystemMock.returns(promise.stub());
        renameFile();

        fileSystemMock.should.have.been.calledWith('/currentPath/currentName', '/currentPath/newName');
      });

      describe('upon fileSystem success', function() {
        beforeEach(function() {
          fileSystemMock.returns(promise.resolved());
        });

        it('updates the name', function() {
          renameFile();

          file.name.should.equal('newName');
        });
      });

      describe('upon fileSystem failure', function() {
        beforeEach(function() {
          fileSystemMock.returns(promise.rejected('errorMessage'));
        });

        it('assigns the error message on the file', function() {
          try {
            renameFile();
          } catch (e) {}

          file.error.should.equal('errorMessage');
        });
      });
    });

    describe('unsaved files', function() {
      beforeEach(function() {
        file.persisted = false;
        renameFile = function() {
          ramlRepository.renameFile(file, 'newName');
        };
      });

      it('does not delegate to the file system', function() {
        renameFile();

        fileSystemMock.should.not.have.been.called;
      });
    });
  });

  describe('createFile', function () {
    var broadcastSpy, file, snippet;

    beforeEach(inject(function($rootScope, ramlSnippets) {
      snippet = 'This is an empty RAML file content';
      sinon.stub(ramlSnippets, 'getEmptyRaml').returns(snippet);

      broadcastSpy = sandbox.spy($rootScope, '$broadcast');
      file = ramlRepository.createFile('/untitled.raml');
    }));

    it('defaults the content', function () {
      file.contents.should.be.equal(snippet);
    });

    it('emits an event indicating that a file has been added', function() {
      broadcastSpy.should.have.been.calledWith('event:raml-editor-file-created', sinon.match({ name: 'untitled.raml' }));
    });
  });
});
