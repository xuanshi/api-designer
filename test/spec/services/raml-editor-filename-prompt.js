describe('ramlEditorFilenamePrompt', function() {
  'use strict';

  var sandbox, root, newFilePrompt, digest;

  beforeEach(module('ramlEditorApp'));

  beforeEach(function(done) {
    inject(function($rootScope, fileSystem, ramlEditorFilenamePrompt) {
      digest = function() { $rootScope.$digest(); };
      sandbox = sinon.sandbox.create();
      newFilePrompt = ramlEditorFilenamePrompt;
      fileSystem.root.then(function(folder) {
        root = folder;
      }).then(done);
      digest();
    });
  });

  afterEach(function() {
    root = newFilePrompt = undefined;
    localStorage.clear();
    sandbox.restore();
  });

  describe('getting a file name', function() {
    var promptSpy;

    beforeEach(function() {
      promptSpy = sandbox.stub(window, 'prompt');
    });

    it('prompts user for filename', function() {
      newFilePrompt.fileName(root);

      promptSpy.should.have.been.calledWith('Choose a name:');
    });

    it('allows the suggested name to be overridden', function() {
      newFilePrompt.fileName(root, 'MyName.raml');

      promptSpy.should.have.been.calledWith('Choose a name:', 'MyName.raml');
    });

    describe('upon choosing a name', function() {
      beforeEach(function() {
        promptSpy.returns('MyFile.raml');
      });

      it('resolves the promise with the chosen file name', function(done) {
        var promise = newFilePrompt.fileName(root);

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
          root.createFile('MYFILE.raml');

          promise = newFilePrompt.fileName(root);
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

        promise = newFilePrompt.fileName(root);
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
        newFilePrompt.fileName(root);
        promptSpy.should.have.been.calledWith(sinon.match.any, 'Untitled-1.raml');
      });

      it('does not increment the filename if you cancel', function() {
        promptSpy.returns(null);
        newFilePrompt.fileName(root);
        newFilePrompt.fileName(root);
        promptSpy.should.have.been.calledWith(sinon.match.any, 'Untitled-1.raml');
      });

      describe('with an existing Untitled-1.raml', function() {
        beforeEach(function() {
          root.createFile('Untitled-1.raml');
        });

        it('defaults to Untitled-2.raml second', function() {
          promptSpy.returns('the-name-i-actually-give-the-second-file.raml');
          newFilePrompt.fileName(root);
          promptSpy.should.have.been.calledWith(sinon.match.any, 'Untitled-2.raml');
        });
      });

      describe('given an existing Untitled-6.raml', function() {
        beforeEach(function() {
          root.createFile('file2');
          root.createFile('Untitled-6.raml');
          root.createFile('Zebras');
        });

        it('it defaults to Untitled-7.raml', function() {
          newFilePrompt.fileName(root);
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
        newFilePrompt.folderName(root);
        promptSpy.should.have.been.calledWith(sinon.match.any, 'Untitled-Folder-1');
      });

      it('does not increment the filename if you cancel', function() {
        promptSpy.returns(null);
        newFilePrompt.folderName(root);
        newFilePrompt.folderName(root);
        promptSpy.should.have.been.calledWith(sinon.match.any, 'Untitled-Folder-1');
      });

      describe('with an existing Untitled-Folder-1', function() {
        beforeEach(function(done) {
          root.createFolder('Untitled-Folder-1').then(function() {
            done();
          });
          digest();
        });

        it('defaults to Untitled-Folder-2 second', function() {
          promptSpy.returns('the-name-i-actually-give-the-second-file.raml');
          newFilePrompt.folderName(root);
          promptSpy.should.have.been.calledWith(sinon.match.any, 'Untitled-Folder-2');
        });
      });

      describe('when the name is already taken (case-insensitive)', function() {
        var alertSpy, promise;

        beforeEach(function(done) {
          alertSpy = sandbox.stub(window, 'alert');
          root.createFolder('Myfolder').then(function() {
            promptSpy.returns('Myfolder');
            promise = newFilePrompt.folderName(root);
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
