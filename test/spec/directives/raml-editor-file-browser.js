describe('ramlEditorFileBrowser', function() {
  'use strict';
  beforeEach(module('ramlEditorApp'));

  function compileFileBrowser(scope) {
    var el = compileTemplate('<raml-editor-file-browser></raml-editor-file-browser>', scope);
    document.body.appendChild(el[0]);

    return el;
  }

  var defer;
  beforeEach(inject(function($q) {
    defer = function() {
      return $q.defer();
    };
  }));

  beforeEach(function(done) {
    var context = this;
    inject(function($rootScope, fileSystem) {
      context.sandbox = sinon.sandbox.create();
      context.scope = $rootScope.$new();
      fileSystem.root.then(function(root) {
        context.root = root;
        done();
      });
      context.scope.$digest();
    });
  });

  afterEach(inject(function(config) {
    this.scope.$destroy();
    this.sandbox.restore();
    config.clear();
    localStorage.clear();
  }));

  describe('when initialized', function() {
    describe('by default', function() {
      beforeEach(function() {
        this.root.createFile('alpha');
        this.root.createFile('beta');
        compileFileBrowser(this.scope);
      });

      it('selects the first file', function() {
        this.scope.fileBrowser.selectedFile.name.should.equal('alpha');
      });
    });

    describe('with a previous file selected', function() {
      beforeEach(inject(function(config) {
        this.root.createFile('alpha');
        this.root.createFile('beta');
        config.set('currentFile', this.root.files[1].path);

        compileFileBrowser(this.scope);
      }));

      it('selects the previously selected file', function() {
        this.scope.fileBrowser.selectedFile.name.should.equal('beta');
      });
    });

    describe('when there are no files', function() {
      beforeEach(function() {
        this.createFileStub = this.sandbox.spy(this.root, 'createFile');
        compileFileBrowser(this.scope);
      });

      it('creates an \'Untitled-1.raml\' file', function() {
        this.createFileStub.should.have.been.calledWith('Untitled-1.raml');
      });
    });
  });

  describe('clicking a file', function() {
    beforeEach(function() {
      this.root.createFile('alpha');
      this.root.createFile('beta');
      this.el = compileFileBrowser(this.scope);
      this.fileToClick = this.el[0].querySelectorAll('.file-item[role="file"]')[1];

      this.sandbox.spy(this.root.files[1], 'load');
    });

    describe('by default', function() {
      beforeEach(function() {
        angular.element(this.fileToClick).triggerHandler('click');
      });

      it('updates selectedFile to the file clicked', function() {
        this.scope.fileBrowser.selectedFile.name.should.equal('beta');
      });

      it('updates the currentFile stored in config', inject(function(config) {
        config.get('currentFile').should.equal('/beta');
      }));

      it('adds the "currentfile" class to the file clicked', function() {
        this.fileToClick.classList.contains('currentfile').should.be.true;
      });

      it('removes the "currentfile" class from all other files', function() {
        this.el[0].querySelectorAll('.currentfile').length.should.equal(1);
      });
    });

    describe('when the file is not loaded', function() {
      beforeEach(function() {
        this.root.files[1].contents = undefined;
        this.root.files[1].persisted = true;
      });
      it('loads the file content', function() {
        angular.element(this.fileToClick).triggerHandler('click');
        this.root.files[1].load.should.have.been.called;
      });
    });

    describe('when the file is loaded', function() {
      beforeEach(function() {
        this.root.files[1].contents = 'raml';
        angular.element(this.fileToClick).triggerHandler('click');
      });

      it('does not load the file content', function() {
        this.root.files[1].load.should.not.have.been.called;
      });
    });
  });

  describe('opening the context menu', function() {
    function contextMenuItemNamed(el, name) {
      var contextMenu = angular.element(el[0].querySelector('[role="context-menu"]'));

      return Array.prototype.slice.call(contextMenu.children()).filter(function(child) {
        return angular.element(child).text() === name;
      })[0];
    }

    describe('for a folder', function() {
      beforeEach(function() {
        this.root.createFile('file1');
        this.root.createFile('file2');
        this.el = compileFileBrowser(this.scope);
        this.iconToClick = this.el[0].querySelectorAll('.file-item[role="folder"] .icon')[1];
      });

      describe('by default', function() {
        beforeEach(function() {
          this.scope.fileBrowser.selectedFile.name.should.equal('file1');
          this.iconToClick.dispatchEvent(events.click());
        });

        it('does not update the selectedFile', function() {
          this.scope.fileBrowser.selectedFile.name.should.equal('file1');
        });

        it('adds the "geared" class to the file clicked', function() {
          this.iconToClick.parentElement.classList.contains('geared').should.be.true;
        });

        it('opens the context menu', function() {
          var rect = this.el[0].querySelector('[role="context-menu"]').getBoundingClientRect();
          rect.height.should.be.greaterThan(0);
        });
      });

      describe('creating a file', function() {
        beforeEach(function() {
          var context = this;
          inject(function(ramlEditorFilenamePrompt) {
            context.deferred = defer();
            context.promptSpy = context.sandbox.stub(window, 'prompt');
            context.createFileStub = context.sandbox.stub(context.root, 'createFile');
            context.filenamePromptStub = context.sandbox.stub(ramlEditorFilenamePrompt, 'fileName').returns(context.deferred.promise);
          });

          this.iconToClick.dispatchEvent(events.click());
          contextMenuItemNamed(this.el, 'New File').dispatchEvent(events.click());
        });

        it('opens the filenamePrompt', function() {
          this.filenamePromptStub.should.have.been.calledWith(this.scope.homeFolder);
        });

        describe('upon success', function() {
          beforeEach(function() {
            this.deferred.resolve('NewName.raml');
            this.scope.$digest();
          });

          it('creates a file in the current folder', function() {
            this.createFileStub.should.have.been.calledWith('NewName.raml');
          });
        });
      });

      describe('creating a folder', function() {
        beforeEach(function() {
          var context = this;
          inject(function(ramlEditorFilenamePrompt) {
            context.deferred = defer();
            context.promptSpy = context.sandbox.stub(window, 'prompt');
            context.createFolderStub = context.sandbox.stub(context.root, 'createFolder');
            context.filenamePromptStub = context.sandbox.stub(ramlEditorFilenamePrompt, 'folderName').returns(context.deferred.promise);
          });

          this.iconToClick.dispatchEvent(events.click());
          contextMenuItemNamed(this.el, 'New Folder').dispatchEvent(events.click());
        });

        it('opens the filename prompt', function() {
          this.filenamePromptStub.should.have.been.calledWith(this.scope.homeFolder);
        });

        describe('upon success', function() {
          beforeEach(function() {
            this.deferred.resolve('folder');
            this.scope.$digest();
          });

          it('creates a folder in the current folder', function() {
            this.createFolderStub.should.have.been.calledWith('folder');
          });
        });
      });

      describe('removing a folder', function() {
        describe('which is the root folder', function() {
          beforeEach(function() {
            var folder = this.el[0].querySelectorAll('.file-item[role="folder"]')[0];
            this.iconToClick = folder.querySelectorAll('.icon')[1];
            this.iconToClick.dispatchEvent(events.click());
          });

          it('actually cannot be removed', function() {
            should.not.exist(contextMenuItemNamed(this.el, 'Remove Folder'));
          });
        });

        describe('which is not root', function() {
          beforeEach(function() {
            this.deferred = defer();
            this.promptSpy = this.sandbox.stub(window, 'confirm');
            this.removeFolderStub = this.sandbox.stub(this.root, 'removeFolder');
          });

          beforeEach(function(done) {
            this.root.createFolder('subfolder').then(function(folder) {
              folder.createFile('file.raml');
            });

            this.scope.$digest();
            var context = this;
            setTimeout(function waitForFileBrowserToUpdate() {
              var subfolder = context.el[0].querySelectorAll('.file-item[role="folder"]')[1];

              context.iconToClick = subfolder.querySelectorAll('.icon')[1];
              context.iconToClick.dispatchEvent(events.click());
              done();
            });
          });

          describe('by default', function() {
            beforeEach(function() {
              contextMenuItemNamed(this.el, 'Remove Folder').dispatchEvent(events.click());
            });

            it('opens the filename prompt', function() {
              this.promptSpy.should.have.been.calledWith('Are you sure you want to delete "subfolder" and 1 contained file?');
            });
          });

          describe('upon confirmation', function() {
            beforeEach(function() {
              this.promptSpy.returns(true);
              contextMenuItemNamed(this.el, 'Remove Folder').dispatchEvent(events.click());
            });

            it('removes the folder', function() {
              this.removeFolderStub.should.have.been.called;
            });
          });

          describe('upon cancellation', function() {
            beforeEach(function() {
              this.promptSpy.returns(false);
              contextMenuItemNamed(this.el, 'Remove Folder').dispatchEvent(events.click());
            });

            it('aborts', function() {
              this.removeFolderStub.should.not.have.been.called;
            });
          });
        });
      });
    });

    describe('for a file', function() {
      beforeEach(function() {
        this.root.createFile('file1');
        this.root.createFile('file2');
        this.el = compileFileBrowser(this.scope);
        this.iconToClick = this.el[0].querySelectorAll('.file-item[role="file"] .icon')[0];

        this.file = this.root.files[0];
        this.sandbox.spy(this.file, 'load');
      });

      describe('by default', function() {
        beforeEach(function() {
          this.scope.fileBrowser.selectedFile.name.should.equal('file1');
          this.iconToClick.dispatchEvent(events.click());
        });

        it('does not update the selectedFile', function() {
          this.scope.fileBrowser.selectedFile.name.should.equal('file1');
        });

        it('adds the "geared" class to the file clicked', function() {
          this.iconToClick.parentElement.classList.contains('geared').should.be.true;
        });

        it('opens the context menu', function() {
          var rect = this.el[0].querySelector('[role="context-menu"]').getBoundingClientRect();
          rect.height.should.be.greaterThan(0);
        });
      });

      describe('saving a file', function() {
        beforeEach(function() {
          this.saveFileSpy = this.sandbox.spy(this.file, 'save');

          this.iconToClick.dispatchEvent(events.click());
          contextMenuItemNamed(this.el, 'Save').dispatchEvent(events.click());
        });

        it('delegates to the fileSystem', function() {
          this.saveFileSpy.should.have.been.called;
        });
      });

      describe('removing a file', function() {
        beforeEach(inject(function(ramlEditorRemoveFilePrompt) {
          this.openStub = this.sandbox.stub(ramlEditorRemoveFilePrompt, 'open');

          this.iconToClick.dispatchEvent(events.click());
          contextMenuItemNamed(this.el, 'Delete').dispatchEvent(events.click());
        }));

        it('delegates to the fileSystem', function() {
          this.openStub.should.have.been.calledWith(this.scope.homeFolder, this.file);
        });
      });

      describe('renaming', function() {
        beforeEach(function() {
          var context = this;
          inject(function(fileSystem, ramlEditorFilenamePrompt) {
            context.deferred = defer();
            context.promptSpy = context.sandbox.stub(window, 'prompt');
            context.renameFileStub = context.sandbox.stub(context.root, 'renameFile');
            context.filenamePromptStub = context.sandbox.stub(ramlEditorFilenamePrompt, 'fileName').returns(context.deferred.promise);
          });

          this.iconToClick.dispatchEvent(events.click());
          contextMenuItemNamed(this.el, 'Rename').dispatchEvent(events.click());
        });

        it('opens the filenamePrompt with the file\'s current name', function() {
          this.filenamePromptStub.should.have.been.calledWith(this.scope.homeFolder, this.file.name);
        });

        describe('upon success', function() {
          beforeEach(function() {
            this.deferred.resolve('NewName.raml');
            this.scope.$digest();
          });

          it('renames the file in the fileSystem', function() {
            this.renameFileStub.should.have.been.calledWith(this.file, 'NewName.raml');
          });

        });

        describe('upon failure', function() {
          beforeEach(function() {
            this.deferred.reject();
            this.scope.$digest();
          });

          it('does not rename the file', function() {
            this.renameFileStub.should.not.have.been.called;
          });
        });
      });
    });
  });

  describe('when a new file is created', function() {
    beforeEach(function() {
      this.root.createFile('file1');
      this.root.createFile('file2');
      compileFileBrowser(this.scope);

      var file = this.root.files[1];
      inject(function($rootScope) {
        $rootScope.$broadcast('event:raml-editor-file-created', file);
        $rootScope.$digest();
      });
    });

    it('selects the file', function() {
      this.scope.fileBrowser.selectedFile.name.should.equal('file2');
    });
  });

  describe('when a file is moved', function() {
    beforeEach(function() {
      this.root.createFile('file1');
      this.root.createFile('file2');
      compileFileBrowser(this.scope);

      var file = this.root.files[1];
      inject(function($rootScope) {
        $rootScope.$broadcast('event:raml-editor-file-moved', file);
        $rootScope.$digest();
      });
    });

    it('selects the file', function() {
      this.scope.fileBrowser.selectedFile.name.should.equal('file2');
    });
  });

  describe('removing a file', function() {
    beforeEach(function() {
      this.root.createFile('alpha.raml');
      compileFileBrowser(this.scope);
    });

    describe('when it is the last file', function() {
      beforeEach(inject(function($rootScope) {
        var removed = this.root.files.pop();
        this.broadcastStub = this.sandbox.spy($rootScope, '$broadcast');
        $rootScope.$broadcast('event:raml-editor-file-removed', removed);
        $rootScope.$digest();
      }));

      it('prompts the user to create a new file', function() {
        this.broadcastStub.should.have.been.calledWith('event:raml-editor-project-empty');
      });
    });

    describe('when it is the selected file', function() {
      beforeEach(inject(function($rootScope) {
        this.root.createFile('beta.raml');
        var removed = this.scope.fileBrowser.selectedFile = this.root.files.pop();

        $rootScope.$broadcast('event:raml-editor-file-removed', removed);
        $rootScope.$digest();
      }));

      it('selects the first file from the fileList', function() {
        this.scope.fileBrowser.selectedFile.name.should.equal('alpha.raml');
      });
    });
  });

  describe('saving a file', function() {
    beforeEach(function() {
      this.root.createFile('some.raml');
      this.sandbox.spy(this.root.files[0], 'save');

      compileFileBrowser(this.scope);
    });

    it('saves when meta-s is pressed', function() {
      var event = events.keydown(83, { metaKey: true});
      document.dispatchEvent(event);
      this.root.files[0].save.should.have.been.called;
    });

    it('saves when ctrl-s is pressed', function() {
      var event = events.keydown(83, { ctrlKey: true});
      document.dispatchEvent(event);
      this.root.files[0].save.should.have.been.called;
    });
  });

  describe('creating a new file', function() {
    beforeEach(inject(function(ramlEditorFilenamePrompt) {
      compileFileBrowser(this.scope);
      this.newSpy = this.sandbox.spy(ramlEditorFilenamePrompt, 'fileName');
    }));

    it('prompts when shift-option-n is pressed', function() {
      var event = events.keydown(78, { altKey: true, shiftKey: true });
      document.dispatchEvent(event);
      this.newSpy.should.have.been.called;
    });
  });

  describe('file list', function() {
    beforeEach(function() {
      this.root.createFile('bFile');
      this.root.createFile('aFile');
      this.root.files.forEach(function(file) { file.dirty = false; });

      this.el = compileFileBrowser(this.scope);
    });

    it('displays', function() {
      this.el.text().should.contain('aFile');
      this.el.text().should.contain('bFile');
    });

    it('lists alphabetically', function() {
      var match = this.el.text().match(/(\wFile)/mg);
      match.should.deep.equal(['aFile', 'bFile']);
    });

    describe('dirty tracking', function() {
      beforeEach(function() {
        this.changingFile = this.scope.fileBrowser.selectedFile;
        this.el[0].querySelectorAll('.dirty').length.should.eql(0);

        this.changingFile.contents = 'dirty content';
        this.scope.$digest();
      });

      it('indicates unsaved files', function() {
        var file = this.el[0].querySelectorAll('.file-item[role="file"]')[0];
        file.classList.contains('dirty').should.be.true;
      });

      it('indicates saved files', function() {
        var file = this.el[0].querySelectorAll('.file-item[role="file"]')[1];
        file.classList.contains('dirty').should.be.false;
      });

      it('marks the selected file dirty when its contents change', function() {
        this.changingFile.dirty.should.be.true;
      });
    });
  });
});
