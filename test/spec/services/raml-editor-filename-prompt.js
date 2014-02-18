describe('ramlEditorFilenamePrompt', function() {
  'use strict';

  var sandbox, ramlRepository, newFilePrompt, digest, folder;

  beforeEach(module('ramlEditorApp'));

  beforeEach(inject(function($rootScope, $injector, ramlEditorFilenamePrompt) {
    digest = function() { $rootScope.$digest(); };

    sandbox = sinon.sandbox.create();
    ramlRepository = $injector.get('ramlRepository');
    newFilePrompt = ramlEditorFilenamePrompt;
  }));

  beforeEach(function(done) {
    ramlRepository.getFolder().then(function(fetched) {
      folder = fetched;
      done();
    });
    digest();
  });

  afterEach(function() {
    ramlRepository = newFilePrompt = folder = undefined;
    localStorage.clear();
    sandbox.restore();
  });

  describe('getting a file name', function() {
    var promptSpy;
    var promptSpyReturns;

    beforeEach(function() {
      promptSpy = sandbox.stub(window, 'prompt');
    });

    it('prompts user for filename', function() {
      newFilePrompt.fileName(folder);

      promptSpy.should.have.been.calledWith('Choose a name:');
    });

    it('allows the suggested name to be overridden', function() {
      newFilePrompt.fileName(folder, 'MyName.raml');

      promptSpy.should.have.been.calledWith('Choose a name:', 'MyName.raml');
    });

    describe('upon choosing a name', function() {
      beforeEach(function() {
        promptSpy.returns('MyFile.raml');
      });

      it('resolves the promise with the chosen file name', function(done) {
        var promise = newFilePrompt.fileName(folder);

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
          folder.createFile('MYFILE.raml');

          promise = newFilePrompt.fileName(folder);
          digest();
        });

        it('alerts the user', function() {
          alertSpy.should.have.been.calledWith('That name is already taken.');
        });
      });
    });

    describe('upon cancellation', function() {
      var promise;

      beforeEach(function() {
        promptSpyReturns = [null];

        promise = newFilePrompt.fileName(folder);
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
        newFilePrompt.fileName(folder);
        promptSpy.should.have.been.calledWith(sinon.match.any, 'Untitled-1.raml');
      });

      it('does not increment the filename if you cancel', function() {
        promptSpy.returns(null);
        newFilePrompt.fileName(folder);
        newFilePrompt.fileName(folder);
        promptSpy.should.have.been.calledWith(sinon.match.any, 'Untitled-1.raml');
      });

      describe('with an existing Untitled-1.raml', function() {
        beforeEach(function() {
          folder.createFile('Untitled-1.raml');
        });

        it('defaults to Untitled-2.raml second', function() {
          promptSpy.returns('the-name-i-actually-give-the-second-file.raml');
          newFilePrompt.fileName(folder);
          promptSpy.should.have.been.calledWith(sinon.match.any, 'Untitled-2.raml');
        });
      });

      describe('given an existing Untitled-6.raml', function() {
        beforeEach(function() {
          folder.createFile('file2');
          folder.createFile('Untitled-6.raml');
          folder.createFile('Zebras');
        });

        it('it defaults to Untitled-7.raml', function() {
          newFilePrompt.fileName(folder);
          promptSpy.should.have.been.calledWith(sinon.match.any, 'Untitled-7.raml');
        });
      });
    });
  });

  describe('getting a folder name', function() {
    var promptSpy;

    beforeEach(function() {
      promptSpy = sandbox.stub(window, 'prompt');
    });

    describe('suggested filename', function() {
      it('defaults to Untitled-Folder-1 first', function() {
        newFilePrompt.folderName(folder);
        promptSpy.should.have.been.calledWith(sinon.match.any, 'Untitled-Folder-1');
      });

      it('does not increment the filename if you cancel', function() {
        promptSpy.returns(null);
        newFilePrompt.folderName(folder);
        newFilePrompt.folderName(folder);
        promptSpy.should.have.been.calledWith(sinon.match.any, 'Untitled-Folder-1');
      });

      describe('with an existing Untitled-Folder-1', function() {
        beforeEach(function(done) {
          folder.createFolder('Untitled-Folder-1').then(function() {
            done();
          });
          digest();
        });

        it('defaults to Untitled-Folder-2 second', function() {
          promptSpy.returns('the-name-i-actually-give-the-second-file.raml');
          newFilePrompt.folderName(folder);
          promptSpy.should.have.been.calledWith(sinon.match.any, 'Untitled-Folder-2');
        });
      });

      describe('when the name is already taken (case-insensitive)', function() {
        var alertSpy, promise;

        beforeEach(function(done) {
          alertSpy = sandbox.stub(window, 'alert');
          folder.createFolder('Myfolder').then(function() {
            promptSpy.returns('Myfolder');
            promise = newFilePrompt.folderName(folder);
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
