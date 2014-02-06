'use strict';

describe('RAML.FileSystem.Folder', function() {
  beforeEach(module('fs'));

  var digest, defer, File, Folder;
  beforeEach(inject(function($q, $rootScope) {
    digest = function() {
      $rootScope.$digest();
    };

    defer = function() {
      return $q.defer();
    };
  }));

  beforeEach(inject(function($q, $rootScope, ramlSnippets) {
    this.sandbox = sinon.sandbox.create();
    this.fileSystem = new RAML.FileSystem();
    this.$rootScope = $rootScope;

    File = RAML.FileSystem.createFileClass(this.fileSystem);
    Folder = RAML.FileSystem.createFolderClass(File, $q, $rootScope, this.fileSystem, ramlSnippets);
  }));

  afterEach(function() {
    this.sandbox.restore();
  });

  function verifyFolderBehaviors(path, createFolder) {
    beforeEach(function() {
      this.meta = { created: 1391031180 };
    });

    describe('by default', function() {
      beforeEach(function() {
        this.folder = createFolder(this.meta);
      });

      it('sets the metadata', function() {
        this.folder.meta.should.eql(this.meta);
      });

      it('sets files', function() {
        this.folder.files.should.eql([]);
      });

      it('sets folders', function() {
        this.folder.folders.should.eql([]);
      });
    });

    describe('with contents', function() {
      beforeEach(function() {
        this.sandbox.spy(Folder, 'create');
        this.sandbox.spy(File, 'create');

        this.contents = [
          { path: path + 'beta.raml', contents: 'my contents', type: 'file', meta: { created: 0 } },
          { path: path + 'alpha.raml', contents: '', type: 'file', meta: { created: 1 } },
          { path: path + 'beta/', type: 'folder', meta: { created: 2 } },
          { path: path + 'alpha/', type: 'folder', meta: { created: 3 } }
        ];

        this.folder = createFolder(this.meta, this.contents);
      });

      it('separates folders', function() {
        this.folder.folders.length.should.eql(2);
        Folder.create.should.have.been.calledWith(this.folder, path + 'beta/', { created: 2 });
        Folder.create.should.have.been.calledWith(this.folder, path + 'alpha/', { created: 3 });
      });

      it('sorts folders', function() {
        var folderNames = this.folder.folders.map(function(folder) { return folder.name; });
        folderNames.should.eql(['alpha', 'beta']);
      });

      it('separates files', function() {
        this.folder.files.length.should.eq(2);
        File.create.should.have.been.calledWith(this.folder, path + 'alpha.raml', '', { created: 1, dirty: false, persisted: true });
        File.create.should.have.been.calledWith(this.folder, path + 'beta.raml', 'my contents', { created: 0, dirty: false, persisted: true });
      });

      it('sorts files', function() {
        var fileNames = this.folder.files.map(function(file) { return file.name; });
        fileNames.should.eql(['alpha.raml', 'beta.raml']);
      });
    });

    describe('creating a sub folder', function() {
      beforeEach(function() {
        this.folder = createFolder();
        this.deferred = defer();
        this.sandbox.stub(this.fileSystem, 'createFolder').returns(this.deferred.promise);

        this.newFolderPromise = this.folder.createFolder('beta');
        digest();
      });

      it('delegates to the file system', function() {
        this.fileSystem.createFolder.should.have.been.calledWith(path + 'beta');
      });

      it('inserts the folder in the folder list', function() {
        var paths = this.folder.folders.map(function(folder) { return folder.path; });
        paths.should.eql([path + 'beta']);
      });

      describe('on success', function() {
        beforeEach(function(done) {
          this.newFolderPromise.then(function(newFolder) {
            this.newFolder = newFolder;
          }.bind(this)).then(done);

          this.deferred.resolve();
          digest();
        });

        it('yields the new folder', function() {
          this.newFolder.path.should.equal(path + 'beta');
        });
      });

      describe('on failure', function() {
        beforeEach(function(done) {
          this.newFolderPromise.then(function(newFolder) {
            this.newFolder = newFolder;
          }.bind(this)).then(done);

          this.deferred.reject('error!');
          digest();
        });

        it('yields the error message', function() {
          this.newFolder.error.should.eql('error!');
        });

        it('retains the new folder', function() {
          this.folder.folders.should.include(this.newFolder);
        });
      });

      describe('adding another folder', function() {
        beforeEach(function() {
          this.folder.createFolder('alpha');
          digest();
        });

        it('keeps the folder list sorted', function() {
          var paths = this.folder.folders.map(function(folder) { return folder.path; });
          paths.should.eql([path + 'alpha', path + 'beta']);
        });
      });
    });

    describe('removing a sub folder', function() {
      beforeEach(function() {
        this.sandbox.stub(this.fileSystem, 'createFolder').returns(defer().promise);
        this.folder = createFolder();
        this.folder.createFolder('beta');
        this.subFolder = this.folder.folders[0];
      });

      beforeEach(function() {
        this.deferred = defer();
        this.sandbox.stub(this.fileSystem, 'remove').returns(this.deferred.promise);
        this.removedFolderPromise = this.folder.removeFolder(this.subFolder);
        digest();
      });

      it('delegates to the file system', function() {
        this.fileSystem.remove.should.have.been.calledWith(this.subFolder.path);
      });

      it('removes the folder from the folder list', function() {
        var paths = this.folder.folders.map(function(folder) { return folder.path; });
        paths.should.eql([]);
      });

      describe('on success', function(done) {
        beforeEach(function() {
          this.removedFolderPromise.then(function(removedFolder) {
            this.removedFolder = removedFolder;
          }.bind(this)).then(done);

          this.deferred.resolve();
          digest();
        });

        it('yields the folder', function() {
          this.removedFolder.should.eql(this.subFolder);
        });

        it('freezes the folder', function() {
          Object.isFrozen(this.subFolder).should.be.true;
        });
      });

      describe('on failure', function() {
        beforeEach(function(done) {
          this.removedFolderPromise.then(function(removedFolder) {
            this.removedFolder = removedFolder;
          }.bind(this)).then(done);

          this.deferred.reject('error!');
          digest();
        });

        it('yields the error message', function() {
          this.removedFolder.error.should.eql('error!');
        });

        it('does not restore the folder', function() {
          this.folder.folders.should.not.include(this.removedFolder);
        });
      });
    });

    describe('creating a file in this folder', function() {
      beforeEach(function() {
        this.sandbox.spy(this.$rootScope, '$broadcast');
        this.sandbox.spy(File, 'create');
        this.folder = createFolder();
        this.file = this.folder.createFile('beta.raml');
      });

      it('creates a new file', function() {
        File.create.should.have.been.calledWith(this.folder, path + 'beta.raml');
      });

      it('includes the new file in the file list', function() {
        var names = this.folder.files.map(function(file) { return file.name; });
        names.should.eql(['beta.raml']);
      });

      it('keeps the file list sorted', function() {
        this.file = this.folder.createFile('alpha.raml');
        var names = this.folder.files.map(function(file) { return file.name; });
        names.should.eql(['alpha.raml', 'beta.raml']);
      });

      it('broadcasts an event', function() {
        this.$rootScope.$broadcast.should.have.been.calledWith('event:raml-editor-file-created', this.file);
      });
    });

    describe('renaming a file in this folder', function() {
      beforeEach(function() {
        this.deferred = defer();
        this.sandbox.stub(this.fileSystem, 'rename').returns(this.deferred.promise);

        this.folder = createFolder();
        this.file = this.folder.createFile('beta.raml');
      });

      describe('by default', function() {
        beforeEach(function() {
          this.renamedFilePromise = this.folder.renameFile(this.file, 'alpha.raml');
        });

        it('updates the file in the file list', function() {
          var names = this.folder.files.map(function(file) { return file.name; });
          names.should.eql(['alpha.raml']);
        });

        describe('on success', function() {
          beforeEach(function() {
            this.deferred.resolve();
          });

          it('yields the file', function(done) {
            this.renamedFilePromise.then(function(renamedFile) {
              renamedFile.should.eql(this.file);
            }.bind(this)).then(done);
            digest();
          });
        });
      });

      describe('when the file is persisted', function() {
        beforeEach(function() {
          this.file.persisted = true;
          this.originalName = this.file.name;
          this.renamedFilePromise = this.folder.renameFile(this.file, 'alpha.raml');
        });

        it('delegates to the file system', function() {
          this.fileSystem.rename.should.have.been.calledWith(path + this.originalName, path + 'alpha.raml');
        });

        describe('on failure', function() {
          beforeEach(function(done) {
            this.renamedFilePromise.then(function(renamedFile) {
              this.renamedFile = renamedFile;
            }.bind(this)).then(done);

            this.deferred.reject('error!');
            digest();
          });

          it('does not restore the file', function() {
            this.renamedFile.name.should.eql('alpha.raml');
          });

          it('yields the error message', function() {
            this.renamedFile.error.should.eql('error!');
          });
        });
      });

      describe('when the file is not persisted', function() {
        beforeEach(function() {
          this.file.persisted = false;
          this.folder.renameFile(this.file, 'alpha.raml');
        });

        it('does not delegate to the file system', function() {
          this.fileSystem.rename.should.not.have.been.called;
        });
      });
    });

    describe('removing a file in this folder', function() {
      beforeEach(function() {
        this.deferred = defer();
        this.sandbox.stub(this.fileSystem, 'remove').returns(this.deferred.promise);
        this.sandbox.stub(this.$rootScope, '$broadcast');
        this.folder = createFolder();
        this.file = this.folder.createFile('beta.raml');
      });

      describe('by default', function() {
        beforeEach(function() {
          this.removedFilePromise = this.folder.removeFile(this.file);
        });

        it('removes the file from the file list', function() {
          this.folder.files.should.eql([]);
        });

        it('is not persisted', function() {
          this.file.persisted.should.be.false;
        });

        it('is not dirty', function() {
          this.file.dirty.should.be.false;
        });

        it('broadcasts an event', function() {
          this.$rootScope.$broadcast.should.have.been.calledWith('event:raml-editor-file-removed', this.file);
        });

        describe('on success', function(done) {
          beforeEach(function() {
            this.removedFilePromise.then(function(removedFile) {
              this.removedFile = removedFile;
            }.bind(this)).then(done);

            this.deferred.resolve();
            digest();
          });

          it('yields the file', function() {
            this.removedFile.should.eql(this.file);
          });

          it('freezes the file', function() {
            Object.isFrozen(this.file).should.be.true;
          });
        });
      });

      describe('when the file is persisted', function() {
        beforeEach(function() {
          this.file.persisted = true;
          this.removedFilePromise = this.folder.removeFile(this.file);
        });

        it('delegates to the file system', function() {
          this.fileSystem.remove.should.have.been.calledWith(this.file.path);
        });

        describe('on failure', function() {
          beforeEach(function(done) {
            this.removedFilePromise.then(function(removedFile) {
              this.removedFile = removedFile;
            }.bind(this)).then(done);

            this.deferred.reject('error!');
            digest();
          });

          it('does not restore the file', function() {
            this.folder.files.should.not.include(this.removedFile);
          });

          it('yields the error message', function() {
            this.removedFile.error.should.eql('error!');
          });
        });
      });

      describe('when the file is not persisted', function() {
        beforeEach(function() {
          this.file.persisted = false;
          this.folder.removeFile(this.file);
        });

        it('does not delegate to the file system', function() {
          this.fileSystem.remove.should.not.have.been.called;
        });
      });
    });

    describe('querying for an item by name', function() {
      beforeEach(function() {
        this.folder = createFolder();
        this.sandbox.stub(this.fileSystem, 'createFolder').returns(defer().promise);

        this.folder.createFolder('subfolder');
        this.subFolder = this.folder.folders[0];
        this.file = this.folder.createFile('file.raml');
      });

      it('returns the matching item', function() {
        this.folder.fileOrFolderNamed('file.raml').should.eql(this.file);
        this.folder.fileOrFolderNamed('subfolder').should.eql(this.subFolder);
      });
    });

    describe('calculating total file count', function() {
      beforeEach(function() {
        this.sandbox.stub(this.fileSystem, 'createFolder').returns(defer().promise);
        function createFile(folder) {
          folder.createFile('file.raml');
        }

        this.folder = createFolder();
        this.folder.createFile('file.raml');

        this.folder.createFolder('alpha');
        this.folder.createFolder('beta');
        this.folder.folders.forEach(createFile);

        this.folder.folders[0].createFolder('alpha');
        this.folder.folders[0].folders.forEach(createFile);
      });

      it('returns the number of files contained in this and all sub folders', function() {
        var paths = this.folder.containedFiles().map(function(file) { return file.path; });
        paths.length.should.eql(4);
        paths.should.include(path + 'file.raml');
        paths.should.include(path + 'alpha/file.raml');
        paths.should.include(path + 'beta/file.raml');
        paths.should.include(path + 'alpha/alpha/file.raml');
      });
    });

    describe('finding a file or folder by path', function() {
      beforeEach(function() {
        this.sandbox.stub(this.fileSystem, 'createFolder').returns(defer().promise);
        function createFile(folder) {
          folder.createFile('file.raml');
        }

        this.folder = createFolder();
        this.folder.createFile('file.raml');

        this.folder.createFolder('alpha');
        this.folder.createFolder('beta');
        this.folder.folders.forEach(createFile);

        this.folder.folders[0].createFolder('alpha');
        this.folder.folders[0].folders.forEach(createFile);
      });

      it('returns the file or folder at that path', function() {
        this.folder.fileOrFolderAtPath('file.raml').should.eql(this.folder.files[0]);
        this.folder.fileOrFolderAtPath('alpha/file.raml').should.eql(this.folder.folders[0].files[0]);
        this.folder.fileOrFolderAtPath('alpha/alpha/file.raml').should.eql(this.folder.folders[0].folders[0].files[0]);
        should.not.exist(this.folder.fileOrFolderAtPath('not/a/thing'));
      });
    });
  }

  describe('#root', function() {
    beforeEach(function() {
      this.folder = Folder.root(this.meta);
    });

    it('sets the path', function() {
      this.folder.path.should.eql('/');
    });

    it('sets the name', function() {
      this.folder.name.should.eql('/');
    });

    verifyFolderBehaviors('/', function(meta, content) {
      return Folder.root(meta, content);
    });
  });

  describe('#create', function() {
    beforeEach(function() {
      this.root = Folder.root();
      this.folder = Folder.create(this.root, '/folder/');
    });

    it('sets the path', function() {
      this.folder.path.should.eql('/folder');
    });

    it('sets the name', function() {
      this.folder.name.should.eql('folder');
    });

    it('exposes a convenience remove function', function() {
      this.sandbox.stub(this.root, 'removeFolder');
      this.folder.remove();
      this.root.removeFolder.should.have.been.calledWith(this.folder);
    });

    verifyFolderBehaviors('/folder/', function(meta, content) {
      var root = Folder.root(meta, content);
      return Folder.create(root, '/folder/', meta, content);
    });
  });
});
