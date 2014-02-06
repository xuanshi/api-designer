'use strict';

describe('Local Storage File System', function() {
  var localStorageFileSystem, LOCAL_PERSISTENCE_KEY, digest;
  var noop = function() {};

  beforeEach(module('fs'));
  beforeEach(inject(function($injector, $rootScope) {
    LOCAL_PERSISTENCE_KEY = $injector.get('LOCAL_PERSISTENCE_KEY');
    localStorageFileSystem = $injector.get('localStorageFileSystem');
    digest = function() { $rootScope.$digest(); };
  }));

  describe('when empty', function() {
    beforeEach(function() {
      localStorage.clear();
    });

    describe('list', function() {
      it('should return root with no entries', function(done) {
        localStorageFileSystem.folder('/')
          .then(function(folder) {
            folder.should.not.be.null;
            folder.children.should.have.length(0);
            done();
          });
        digest();
      });
    });

    describe('load', function() {
      it('should be rejected', function(done) {
        localStorageFileSystem.load('/file')
          .then(noop, function(error) {
            error.should.be.equal('file with path="/file" does not exist');
            done();
          });
        digest();
      });
    });

    describe('remove', function() {
      it('should succeed', function(done) {
        localStorageFileSystem.remove('/file').then(done);
        digest();
      });
    });
  });

  describe('when trying to save a file', function() {
    var name = 'created-at-' + Date.now();
    var folder = '/';
    var path = folder + name;
    var content = 'content';

    describe('save', function() {
      it('should store file successfully', function(done) {
        localStorageFileSystem.save(path, content).then(done);
        digest();
      });
    });

    describe('list', function() {
      it('should list recently saved file among the entries', function(done) {
        localStorageFileSystem.save(path, content).then(function() {
          localStorageFileSystem.folder(folder).then(function(folder) {
            folder.should.not.be.null;
            folder.children.should.have.length(1);
            hasPath(folder.children, path).should.be.ok;
            done();
          });
        });
        digest();
      });
    });

    describe('load', function() {
      it('should return recently saved file', function(done) {
        localStorageFileSystem.load(path).then(function(loadedContent) {
          loadedContent.should.be.equal(content);
          done();
        });
        digest();
      });
    });

    describe('remove', function() {
      it('should remove recently saved file', function(done) {
        localStorageFileSystem.remove(path).then(function() {
          localStorageFileSystem.folder(folder).then(function(folder) {
            folder.should.not.be.null;
            folder.children.should.have.length(0);
            hasPath(folder.children, path).should.not.be.ok;
            done();
          });
        });
        digest();
      });
    });

    describe('rename', function(){
      it('should allow renaming of recently saved files', function(done){
        var destination = folder + 'renamed-at-' + Date.now();

        localStorageFileSystem.save(path, content).then(function() {
          localStorageFileSystem.rename(path, destination).then(function(){
            localStorageFileSystem.folder(folder).then(function(folder){
              folder.should.not.be.null;
              folder.children.should.have.length(1);
              hasPath(folder.children, destination).should.be.ok;
              hasPath(folder.children, path).should.not.be.ok;
              done();
            });
          });
        });
        digest();
      });
    });
  });


  describe('when using folders', function() {
    beforeEach(function() {
      localStorage.clear();

      localStorage.setItem(LOCAL_PERSISTENCE_KEY + './', '{ "path": "/", "name": "", "type": "folder" }');
      localStorage.setItem(LOCAL_PERSISTENCE_KEY + './example.raml', '{ "path": "/example.raml", "name": "example.raml", "type": "file" }');
      localStorage.setItem(LOCAL_PERSISTENCE_KEY + './emptyFolder', '{ "path": "/emptyFolder", "name": "emptyFolder", "type": "folder" }');
      localStorage.setItem(LOCAL_PERSISTENCE_KEY + './folder', '{ "path": "/folder", "name": "folder", "type": "folder" }');
      localStorage.setItem(LOCAL_PERSISTENCE_KEY + './folder/example.raml', '{ "path": "/folder/example.raml", "name": "example.raml", "type": "file"}');
      localStorage.setItem(LOCAL_PERSISTENCE_KEY + './folder/subFolderA', '{ "path": "/folder/subFolderA", "name": "subFolderA", "type": "folder" }');
      localStorage.setItem(LOCAL_PERSISTENCE_KEY + './folder/subFolderA/example.raml', '{ "path": "/folder/subFolderA/example.raml", "name": "example.raml", "type": "file"}');
      localStorage.setItem(LOCAL_PERSISTENCE_KEY + './folder/subFolderB', '{ "path": "/folder/subFolderB", "name": "subFolderB", "type": "folder" }');
    });

    describe('list', function() {
      it('should list files and folders for root folder', function(done) {
        localStorageFileSystem.folder('/').then(function(folder) {
          folder.should.not.be.null;
          folder.children.should.have.length(3);
          done();
        });
        digest();
      });

      it('should list files and folders for sub folders', function(done) {
        localStorageFileSystem.folder('/folder').then(function(folder) {
          folder.should.not.be.null;
          folder.children.length.should.equal(3);
          hasPath(folder.children, '/folder/example.raml').should.be.ok;
          hasPath(folder.children, '/folder/subFolderA').should.be.ok;
          done();
        });
        digest();
      });
    });

    describe('create folder', function() {
      it('should prevent creation of duplicated folders', function() {
        var error = sinon.stub();
        localStorageFileSystem.createFolder('/folder').then(noop, error);
        digest();
        error.should.have.been.calledOnce;
      });

      it('should create folders at root level', function(done) {
        localStorageFileSystem.createFolder('/newFolder').then(function() {
          localStorageFileSystem.folder('/').then(function(folder) {
            folder.should.not.be.null;
            folder.children.should.have.length(4);
            hasPath(folder.children, '/newFolder').should.be.ok;
            done();
          });
        });
        digest();
      });

      it('should prevent users from creating folders on any random path', function() {
        var error = sinon.stub();
        localStorageFileSystem.createFolder('/newFolder/newSubFolder').then(noop, error);
        digest();
        error.called.should.be.ok;
      });

      it('should support nested folders', function(done) {
        localStorageFileSystem.createFolder('/folder/newSubFolder').then(function() {
          localStorageFileSystem.folder('/folder', true).then(function(folder) {
            folder.should.not.be.null;
            folder.children.length.should.equal(4);
            hasPath(folder.children, '/folder/newSubFolder').should.be.ok;
            done();
          });
        });
        digest();
      });

      it('should prevent users from creating folders that are named as existing files', function() {
        var error = sinon.stub();
        localStorageFileSystem.createFolder('/folder/example.raml').then(noop, error);
        digest();
        error.called.should.be.ok;
      });
    });

    describe('save', function() {
      it('should fail to save files with the same name as a folder', function() {
        var error = sinon.stub();
        localStorageFileSystem.save('/folder', '').then(noop, error);
        digest();
        error.called.should.be.ok;
      });

      it('should work to save files inside a folder', function(done) {
        localStorageFileSystem.save('/folder/exampleA.raml', '').then(done);
        digest();
      });

      it('should throw an error if folder is not created before saving file', function() {
        var error = sinon.stub();
        localStorageFileSystem.save('/randomFolder/exampleA.raml', '').then(noop, error);
        digest();
        error.called.should.be.ok;
      });
    });

    describe('load', function() {
      it('should not allow to load a folder', function() {
        var error = sinon.stub();
        localStorageFileSystem.load('/folder').then(noop, error);
        digest();
        error.called.should.be.ok;
      });
    });

    describe('remove', function() {
      beforeEach(function(done) {
        localStorageFileSystem.remove('/folder').then(done);
        digest();
      });

      it('removes all sub folders and their contents', function() {
        should.not.exist(localStorage.getItem(LOCAL_PERSISTENCE_KEY + './folder/subfolderA'));
        should.not.exist(localStorage.getItem(LOCAL_PERSISTENCE_KEY + './folder/subfolderA/example.raml'));
        should.not.exist(localStorage.getItem(LOCAL_PERSISTENCE_KEY + './folder/subfolderB'));
      });

      it('removes all contained files', function() {
        should.not.exist(localStorage.getItem(LOCAL_PERSISTENCE_KEY));
      });

      it('removes the folder', function() {
        should.not.exist(localStorage.getItem(LOCAL_PERSISTENCE_KEY + './folder'));
      });
    });

    describe('rename', function() {
      it('should move a file to a different folder', function(done){
        var error = sinon.spy();

        localStorageFileSystem.rename('/example.raml', '/emptyFolder/example.raml').then(function(){
          localStorageFileSystem.folder('/').then(function(folder){
            folder.should.not.be.null;
            folder.children.should.have.length(2);
            hasPath(folder.children, '/example.raml').should.not.be.ok;

            localStorageFileSystem.folder('/emptyFolder').then(function(folder){
              folder.should.not.be.null;
              folder.children.should.have.length(1);
              hasPath(folder.children, '/emptyFolder/example.raml').should.be.ok;
              done();
            }, error);
          }, error);
        }, error);
        digest();
        error.called.should.not.be.ok;
      });

      it('should move a complete folder tree', function(done){
        var error = sinon.spy();

        localStorageFileSystem.rename('/folder', '/renamedFolder').then(function(){
          localStorageFileSystem.folder('/folder').then(function(folder){
            expect(folder).to.be.null;

            localStorageFileSystem.folder('/renamedFolder').then(function(folder){
              folder.should.not.be.null;
              folder.children.should.have.length(3);

              localStorageFileSystem.folder('/renamedFolder/subFolderA').then(function(folder){
                folder.should.not.be.null;
                folder.children.should.have.length(1);
                done();
              }, error);
            },error);
          }, error);
        }, error);
        digest();
        error.called.should.not.be.ok;
      });

      it('should not rename a file when there is a folder with the same name', function(){
        var error = sinon.spy();

        localStorageFileSystem.rename('/example.raml', '/folder').then(noop, error);
        digest();
        error.called.should.be.ok;
      });

      it('should not rename a folder when there is a file with the same name', function(){
        var error = sinon.spy();

        localStorageFileSystem.rename('/folder', '/example.raml').then(noop, error);
        digest();
        error.called.should.be.ok;
      });

      it('should not move files into unexisting paths', function(){
        var error = sinon.spy();

        localStorageFileSystem.rename('/example.raml', '/somethingRandom/example.raml').then(noop, error);
        digest();
        error.called.should.be.ok;
      });

      it('should not move folders into unexisting paths', function(){
        var error = sinon.spy();

        localStorageFileSystem.rename('/folder', '/somethingRandom/folder').then(noop, error);
        digest();
        error.called.should.be.ok;
      });
    });
  });

  function hasPath(entries, path) {
    for(var i = 0; i < entries.length; i++) {
      if(entries[i].path === path) {
        return true;
      }
    }
    return false;
  }

});
