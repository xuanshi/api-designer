describe('ramlEditorFilenamePrompt', function() {
  'use strict';

  var sandbox, ramlRepository, newFilePrompt, digest;

  function createMockFile(name, options) {
    options = options || {};

    return {
      name: name,
      dirty: !!options.dirty,
      contents: options.contents
    };
  }

  angular.module('fileBrowserTest', ['ramlEditorApp', 'testFs']);
  beforeEach(module('fileBrowserTest'));

  beforeEach(inject(function($rootScope, $injector, ramlEditorFilenamePrompt) {
    digest = function() { $rootScope.$digest(); };

    sandbox = sinon.sandbox.create();
    ramlRepository = $injector.get('ramlRepository');
    newFilePrompt = ramlEditorFilenamePrompt;
  }));

  afterEach(function() {
    ramlRepository = newFilePrompt = undefined;
    sandbox.restore();
  });

  describe('getting a file name', function() {
    var promptSpy;

    beforeEach(function() {
      promptSpy = sandbox.stub(window, 'prompt');
      ramlRepository.files = [createMockFile('file1'), createMockFile('file2')];
    });

    it('prompts user for filename', function() {
      newFilePrompt.fileName(ramlRepository);

      promptSpy.should.have.been.calledWith('Choose a name:');
    });

    it('allows the suggested name to be overridden', function() {
      newFilePrompt.fileName(ramlRepository, 'MyName.raml');

      promptSpy.should.have.been.calledWith('Choose a name:', 'MyName.raml');
    });

    describe('upon choosing a name', function() {
      beforeEach(function() {
        promptSpy.returns('MyFile.raml');
      });

      it('resolves the promise with the chosen file name', function(done) {
        var promise = newFilePrompt.fileName(ramlRepository);

        promise.then(function(chosenName) {
          chosenName.should.equal('MyFile.raml');
          done();
        });
        digest();
      });

      describe('when the name is already taken (case-insensitive)', function() {
        var alertSpy, promise;

        beforeEach(function() {
          alertSpy = sandbox.stub(window, 'alert');
          ramlRepository.files.push(createMockFile('MYFILE.raml', { contents: 'my content' }));

          promise = newFilePrompt.fileName(ramlRepository);
          digest();
        });

        it('alerts the user', function() {
          alertSpy.should.have.been.calledWith('That name is already taken.');
        });

        it('rejects the promise', function(done) {
          promise.then(undefined, function() {
            done();
          });
          digest();
        });
      });
    });

    describe('upon cancellation', function() {
      var promise;

      beforeEach(function() {
        promptSpy.returns(null);

        promise = newFilePrompt.fileName(ramlRepository);
        digest();
      });

      it('rejects the promise', function(done) {
        promise.then(undefined, function() {
          done();
        });
        digest();
      });
    });

    describe('suggested filename', function() {
      it('defaults to Untitled-1.raml first', function() {
        newFilePrompt.fileName(ramlRepository);
        promptSpy.should.have.been.calledWith(sinon.match.any, 'Untitled-1.raml');
      });

      it('does not increment the filename if you cancel', function() {
        promptSpy.returns(null);
        newFilePrompt.fileName(ramlRepository);
        newFilePrompt.fileName(ramlRepository);
        promptSpy.should.have.been.calledWith(sinon.match.any, 'Untitled-1.raml');
      });

      describe('with an existing Untitled-1.raml', function() {
        beforeEach(function() {
          ramlRepository.files = [createMockFile('Untitled-1.raml')];
        });

        it('defaults to Untitled-2.raml second', function() {
          promptSpy.returns('the-name-i-actually-give-the-second-file.raml');
          newFilePrompt.fileName(ramlRepository);
          promptSpy.should.have.been.calledWith(sinon.match.any, 'Untitled-2.raml');
        });
      });

      describe('given an existing Untitled-6.raml', function() {
        beforeEach(function() {
          ramlRepository.files = [createMockFile('file2'), createMockFile('Untitled-6.raml'), createMockFile('Zebras')];
        });

        it('it defaults to Untitled-7.raml', function() {
          newFilePrompt.fileName(ramlRepository);
          promptSpy.should.have.been.calledWith(sinon.match.any, 'Untitled-7.raml');
        });
      });
    });
  });

  describe('getting a directory name', function() {
    var promptSpy;

    beforeEach(function() {
      promptSpy = sandbox.stub(window, 'prompt');
      ramlRepository.files = [createMockFile('file1'), createMockFile('file2')];
    });

    describe('suggested filename', function() {
      it('defaults to Untitled-Folder-1 first', function() {
        newFilePrompt.directoryName(ramlRepository);
        promptSpy.should.have.been.calledWith(sinon.match.any, 'Untitled-Folder-1');
      });

      it('does not increment the filename if you cancel', function() {
        promptSpy.returns(null);
        newFilePrompt.directoryName(ramlRepository);
        newFilePrompt.directoryName(ramlRepository);
        promptSpy.should.have.been.calledWith(sinon.match.any, 'Untitled-Folder-1');
      });

      describe('with an existing Untitled-Folder-1', function() {
        var oldDirectoryName;
        beforeEach(function() {
          oldDirectoryName = ramlRepository.directories[0].name;
          ramlRepository.directories[0].name = 'Untitled-Folder-1';
        });

        afterEach(function() {
          ramlRepository.directories[0].name = oldDirectoryName;
        });

        it('defaults to Untitled-Folder-2 second', function() {
          promptSpy.returns('the-name-i-actually-give-the-second-file.raml');
          newFilePrompt.directoryName(ramlRepository);
          promptSpy.should.have.been.calledWith(sinon.match.any, 'Untitled-Folder-2');
        });
      });

      describe('when the name is already taken (case-insensitive)', function() {
        var alertSpy, promise;

        beforeEach(function() {
          alertSpy = sandbox.stub(window, 'alert');
          promptSpy.returns(ramlRepository.directories[0].name);

          promise = newFilePrompt.directoryName(ramlRepository);
          digest();
        });

        it('alerts the user', function() {
          alertSpy.should.have.been.calledWith('That name is already taken.');
        });

        it('rejects the promise', function(done) {
          promise.then(undefined, function() {
            done();
          });
          digest();
        });
      });
    });
  });
});
