'use strict';

describe('RAML.FileSystem.File', function() {
  beforeEach(module('fs'));

  var digest, defer, File;
  beforeEach(inject(function($q, $rootScope) {
    digest = function() {
      $rootScope.$digest();
    };

    defer = function() {
      return $q.defer();
    };
  }));

  beforeEach(function() {
    this.sandbox = sinon.sandbox.create();
    this.fileSystem = new RAML.FileSystem();
    File = RAML.FileSystem.createFileClass(this.fileSystem);

    this.parent = {
      path: '/',
      removeFile: this.sandbox.spy()
    };
  });

  afterEach(function() {
    this.sandbox.restore();
  });

  describe('creating a file', function() {
    describe('by default', function() {
      beforeEach(function() {
        this.file = File.create(this.parent, '/file.raml', 'IVE GOT SOMETHING TO SAY');
      });

      it('is not persisted', function() {
        this.file.persisted.should.be.false;
      });

      it('is dirty', function() {
        this.file.dirty.should.be.true;
      });

      it('sets the  contents', function() {
        this.file.contents.should.eql('IVE GOT SOMETHING TO SAY');
      });

      it('sets a name based on the last path segment', function() {
        this.file.name.should.eql('file.raml');
      });

      it('sets an extension', function() {
        this.file.extension.should.eql('raml');
      });

      it('exposes a convenience method for removing the file', function() {
        this.file.remove();
        this.parent.removeFile.should.have.been.calledWith(this.file);
      });
    });

    describe('when the persisted option is provided', function() {
      beforeEach(function() {
        this.file = File.create(this.parent, '/file.raml', 'IVE GOT SOMETHING TO SAY', { persisted: true });
      });

      it('sets persisted', function() {
        this.file.persisted.should.be.true;
      });

      it('sets dirty to the inverse of persisted', function() {
        this.file.dirty.should.be.false;
      });
    });

    describe('when the dirty option is provided', function() {
      beforeEach(function() {
        this.file = File.create(this.parent, '/file.raml', 'IVE GOT SOMETHING TO SAY', { dirty: false });
      });

      it('sets dirty', function() {
        this.file.dirty.should.be.false;
      });
    });
  });

  describe('saving the file', function() {
    beforeEach(function() {
      this.deferred = defer();
      this.sandbox.stub(this.fileSystem, 'save').returns(this.deferred.promise);
      this.file = File.create(this.parent, '/file.raml', 'IVE GOT SOMETHING TO SAY', { dirty: false });

      this.fileSavePromise = this.file.save();
    });

    it('sets dirty to false', function() {
      this.file.dirty.should.be.false;
    });

    it('sets persisted to true', function() {
      this.file.persisted.should.be.true;
    });

    it('delegates to the file system', function() {
      this.fileSystem.save.should.have.been.calledWith(this.file.path, this.file.contents);
    });

    describe('on success', function() {
      beforeEach(function(done) {
        this.fileSavePromise.then(function(savedFile) {
          this.savedFile = savedFile;
        }.bind(this)).then(done);

        this.deferred.resolve();
        digest();
      });

      it('yields the file', function() {
        this.savedFile.should.eql(this.file);
      });
    });

    describe('on failure', function() {
      beforeEach(function(done) {
        this.fileSavePromise.then(function(savedFile) {
          this.savedFile = savedFile;
        }.bind(this)).then(done);

        this.deferred.reject('error!');
        digest();
      });

      it('sets dirty to true', function() {
        this.file.dirty.should.be.true;
      });

      it('sets persisted to false', function() {
        this.file.persisted.should.be.false;
      });

      it('sets the error message', function() {
        this.file.error.should.eql('error!');
      });

      it('yields the file', function() {
        this.savedFile.should.eql(this.file);
      });
    });
  });

  describe('loading the file', function() {
    beforeEach(function() {
      this.deferred = defer();
      this.sandbox.stub(this.fileSystem, 'load').returns(this.deferred.promise);
      this.file = File.create(this.parent, '/file.raml', null, { persisted: true });
      this.fileLoadPromise = this.file.load();
    });

    it('delegates to the file system', function() {
      this.fileSystem.load.should.have.been.calledWith(this.file.path);
    });

    it('sets dirty to false', function() {
      this.file.dirty.should.be.false;
    });

    it('sets persisted to true', function() {
      this.file.persisted.should.be.true;
    });

    describe('on success', function() {
      beforeEach(function(done) {
        this.fileLoadPromise.then(function(loadedFile) {
          this.loadedFile = loadedFile;
        }.bind(this)).then(done);

        this.deferred.resolve('IVE GOT SOMETHING TO SAY');
        digest();
      });

      it('yields the file', function() {
        this.loadedFile.contents.should.eql('IVE GOT SOMETHING TO SAY');
      });
    });
  });
});
