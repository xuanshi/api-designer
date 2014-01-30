'use strict';

describe('ramlRepository.RamlFolder', function() {
  beforeEach(module('fs'));

  var digest = inject(function($rootScope) {
    $rootScope.$digest();
  });

  beforeEach(inject(function(ramlRepository) {
    this.sandbox = sinon.sandbox.create();
    this.ramlRepository = ramlRepository;
  }));

  afterEach(function() {
    this.sandbox.restore();
    localStorage.clear();
  });

  describe('upon creation', function() {
    beforeEach(function() {
      this.meta = { created: 1391031180 };
    });

    describe('by default', function() {
      beforeEach(function() {
        this.folder = new this.ramlRepository.RamlFolder('/folder/', this.meta);
      });

      it('sets the path', function() {
        this.folder.path.should.eql('/folder/');
      });

      it('sets the name', function() {
        this.folder.name.should.eql('folder');
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

    describe('when the provided path is \'/\'', function() {
      beforeEach(function() {
        this.folder = new this.ramlRepository.RamlFolder('/', this.meta);
      });

      it('sets the name to \'/\'', function() {
        this.folder.name.should.eql('/');
      });
    });

    describe('when the provided path does not end with a slash', function() {
      beforeEach(function() {
        this.folder = new this.ramlRepository.RamlFolder('/folder', this.meta);
      });

      it('ensures the path ends in a slash', function() {
        this.folder.path.should.eql('/folder/');
      });
    });

    describe('with contents', function() {
      beforeEach(function() {
        this.sandbox.spy(this.ramlRepository, 'RamlFolder');
        this.sandbox.spy(this.ramlRepository, 'RamlFile');

        this.contents = [
          { path: '/folder/beta.raml', contents: 'my contents', type: 'file', meta: { created: 0 } },
          { path: '/folder/alpha.raml', contents: '', type: 'file', meta: { created: 1 } },
          { path: '/folder/subbeta/', type: 'folder', meta: { created: 2 } },
          { path: '/folder/subalpha/', type: 'folder', meta: { created: 3 } }
        ];

        this.folder = new this.ramlRepository.RamlFolder('/folder', this.meta, this.contents);
      });

      it('separates folders', function() {
        this.folder.folders.length.should.eql(2);
        this.ramlRepository.RamlFolder.should.have.been.calledWith('/folder/subbeta/', { created: 2 });
        this.ramlRepository.RamlFolder.should.have.been.calledWith('/folder/subalpha/', { created: 3 });
      });

      it('sorts folders', function() {
        var folderNames = this.folder.folders.map(function(folder) { return folder.name; });
        folderNames.should.eql(['subalpha', 'subbeta']);
      });

      it('separates files', function() {
        this.folder.files.length.should.eq(2);
        this.ramlRepository.RamlFile.should.have.been.calledWith('/folder/alpha.raml', '', { created: 1, dirty: false, persisted: true });
        this.ramlRepository.RamlFile.should.have.been.calledWith('/folder/beta.raml', 'my contents', { created: 0, dirty: false, persisted: true });
      });

      it('sorts files', function() {
        var fileNames = this.folder.files.map(function(file) { return file.name; });
        fileNames.should.eql(['alpha.raml', 'beta.raml']);
      });
    });
  });

  describe('creating a sub folder', function() {
    beforeEach(function(done) {
      this.ramlRepository.getFolder().then(function(folder) {
        this.folder = folder;
        this.createFolderPromise = this.folder.createFolder('subFolder');
        done();
      }.bind(this));

      digest();
    });

    describe('when the filesystem finishes', function() {
      it('includes the new folder in the sub folder list', function(done) {
        var folder = this.folder;
        this.createFolderPromise.then(function() {
          var names = folder.folders.map(function(folder) { return folder.name; });
          names.should.eql(['subFolder']);
          done();
        });

        digest();
      });
    });
  });

  describe('creating a file in this folder', function() {
    beforeEach(function(done) {
      this.sandbox.spy(this.ramlRepository, 'createFile');

      this.ramlRepository.getFolder().then(function(folder) {
        this.folder = folder;
        this.file = this.folder.createFile('file.raml');
        done();
      }.bind(this));

      digest();
    });

    it('delegates to the raml repository', function() {
      this.ramlRepository.createFile.should.have.been.calledWith('/file.raml');
    });

    it('includes the new file in the folders file list', function() {
      var names = this.folder.files.map(function(file) { return file.name; });
      names.should.eql(['file.raml']);
    });
  });

  describe('removing a file in this folder', function() {
    describe('when the file is persisted', function() {
      beforeEach(function(done) {
        this.sandbox.spy(this.ramlRepository, 'removeFile');

        this.ramlRepository.getFolder().then(function(folder) {
          this.folder = folder;
          this.file = this.folder.createFile('file.raml');
          this.ramlRepository.saveFile(this.file).then(function() {
            this.removeFilePromise = this.folder.removeFile(this.file);
            done();
          }.bind(this));
        }.bind(this));

        digest();
      });

      it('delegates to the raml repository', function() {
        this.ramlRepository.removeFile.should.have.been.calledWith(this.file);
      });

      describe('when the filesystem finishes', function() {
        it('removes the file from the file list', function(done) {
          var folder = this.folder;
          this.removeFilePromise.then(function() {
            folder.files.should.eql([]);
            done();
          });

          digest();
        });
      });
    });

    describe('when the file is not persisted', function() {
      beforeEach(function(done) {
        this.ramlRepository.getFolder().then(function(folder) {
          this.folder = folder;
          var file = this.folder.createFile('file.raml');
          this.removeFilePromise = this.folder.removeFile(file);
          done();
        }.bind(this));

        digest();
      });

      describe('when the filesystem finishes', function() {
        it('removes the file from the file list', function(done) {
          var folder = this.folder;
          this.removeFilePromise.then(function() {
            folder.files.should.eql([]);
            done();
          });

          digest();
        });
      });
    });
  });

  describe('querying for an item by name', function() {
    beforeEach(function(done) {
      this.ramlRepository.getFolder().then(function(folder) {
        this.folder = folder;
        this.file = this.folder.createFile('file.raml');
        this.folder.createFolder('subFolder').then(function() {
          this.subFolder = this.folder.folders[0];
          done();
        }.bind(this));
      }.bind(this));

      digest();
    });

    it('returns the matching item', function() {
      this.folder.fileOrFolderNamed('file.raml').should.eql(this.file);
      this.folder.fileOrFolderNamed('subFolder').should.eql(this.subFolder);
    });
  });

  describe('calculating total file count', function() {
    beforeEach(function(done) {
      this.ramlRepository.getFolder().then(function(folder) {
        this.folder = folder;

        folder.createFile('file.raml');
        folder.createFolder('subFolder1').then(function(subFolder) {
          subFolder.createFile('file.raml');

          folder.createFolder('subFolder2').then(function(subFolder) {
            subFolder.createFile('file.raml');

            subFolder.createFolder('subFolder1').then(function(subFolder) {
              subFolder.createFile('file.raml');

              done();
            });
          });
        });
      }.bind(this));

      digest();
    });

    it('returns the number of files contained in this and all sub folders', function() {
      var paths = this.folder.containedFiles().map(function(file) { return file.path; });
      paths.length.should.eql(4);
      paths.should.include('/file.raml');
      paths.should.include('/subFolder1/file.raml');
      paths.should.include('/subFolder2/file.raml');
      paths.should.include('/subFolder2/subFolder1/file.raml');
    });
  });
});
