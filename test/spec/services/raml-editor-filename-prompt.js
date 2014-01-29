describe('ramlEditorFilenamePrompt', function() {
  'use strict';

  var sandbox, ramlRepository, newFilePrompt, digest, directory;

  beforeEach(module('ramlEditorApp'));

  beforeEach(inject(function($rootScope, $injector, ramlEditorFilenamePrompt) {
    digest = function() { $rootScope.$digest(); };

    sandbox = sinon.sandbox.create();
    ramlRepository = $injector.get('ramlRepository');
    newFilePrompt = ramlEditorFilenamePrompt;
  }));

  beforeEach(function(done) {
    ramlRepository.getDirectory().then(function(fetched) {
      directory = fetched;
      done();
    });
    digest();
  });

  afterEach(function() {
    ramlRepository = newFilePrompt = directory = undefined;
    localStorage.clear();
    sandbox.restore();
  });

  describe('getting a file name', function() {
    var promptSpy;

    beforeEach(function() {
      promptSpy = sandbox.stub(window, 'prompt');
    });

    it('prompts user for filename', function() {
      newFilePrompt.fileName(directory);

      promptSpy.should.have.been.calledWith('Choose a name:');
    });

    it('allows the suggested name to be overridden', function() {
      newFilePrompt.fileName(directory, 'MyName.raml');

      promptSpy.should.have.been.calledWith('Choose a name:', 'MyName.raml');
    });

    describe('upon choosing a name', function() {
      beforeEach(function() {
        promptSpy.returns('MyFile.raml');
      });

      it('resolves the promise with the chosen file name', function(done) {
        var promise = newFilePrompt.fileName(directory);

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
          directory.createFile('MYFILE.raml');

          promise = newFilePrompt.fileName(directory);
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

        promise = newFilePrompt.fileName(directory);
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
        newFilePrompt.fileName(directory);
        promptSpy.should.have.been.calledWith(sinon.match.any, 'Untitled-1.raml');
      });

      it('does not increment the filename if you cancel', function() {
        promptSpy.returns(null);
        newFilePrompt.fileName(directory);
        newFilePrompt.fileName(directory);
        promptSpy.should.have.been.calledWith(sinon.match.any, 'Untitled-1.raml');
      });

      describe('with an existing Untitled-1.raml', function() {
        beforeEach(function() {
          directory.createFile('Untitled-1.raml');
        });

        it('defaults to Untitled-2.raml second', function() {
          promptSpy.returns('the-name-i-actually-give-the-second-file.raml');
          newFilePrompt.fileName(directory);
          promptSpy.should.have.been.calledWith(sinon.match.any, 'Untitled-2.raml');
        });
      });

      describe('given an existing Untitled-6.raml', function() {
        beforeEach(function() {
          directory.createFile('file2');
          directory.createFile('Untitled-6.raml');
          directory.createFile('Zebras');
        });

        it('it defaults to Untitled-7.raml', function() {
          newFilePrompt.fileName(directory);
          promptSpy.should.have.been.calledWith(sinon.match.any, 'Untitled-7.raml');
        });
      });
    });
  });

  describe('getting a directory name', function() {
    var promptSpy;

    beforeEach(function() {
      promptSpy = sandbox.stub(window, 'prompt');
    });

    describe('suggested filename', function() {
      it('defaults to Untitled-Folder-1 first', function() {
        newFilePrompt.directoryName(directory);
        promptSpy.should.have.been.calledWith(sinon.match.any, 'Untitled-Folder-1');
      });

      it('does not increment the filename if you cancel', function() {
        promptSpy.returns(null);
        newFilePrompt.directoryName(directory);
        newFilePrompt.directoryName(directory);
        promptSpy.should.have.been.calledWith(sinon.match.any, 'Untitled-Folder-1');
      });

      describe('with an existing Untitled-Folder-1', function() {
        beforeEach(function(done) {
          directory.createDirectory('Untitled-Folder-1').then(function() {
            done();
          });
          digest();
        });

        it('defaults to Untitled-Folder-2 second', function() {
          promptSpy.returns('the-name-i-actually-give-the-second-file.raml');
          newFilePrompt.directoryName(directory);
          promptSpy.should.have.been.calledWith(sinon.match.any, 'Untitled-Folder-2');
        });
      });

      describe('when the name is already taken (case-insensitive)', function() {
        var alertSpy, promise;

        beforeEach(function(done) {
          alertSpy = sandbox.stub(window, 'alert');
          directory.createDirectory('MyDirectory').then(function() {
            promptSpy.returns('MyDirectory');
            promise = newFilePrompt.directoryName(directory);
            done();
          });
          digest();
        });

        it('alerts the user', function() {
          alertSpy.should.have.been.calledWith('That name is already taken.');
        });

        it('rejects the promise', function(done) {
          promise.then(undefined, done);
        });
      });
    });
  });
});
