describe('ramlEditorFileBrowser', function() {
  'use strict';

  var scope, el, sandbox, ramlRepository;

  function createMockFile(name, options) {
    options = options || {};

    return {
      name: name,
      path: '/' + name,
      dirty: !!options.dirty,
      persisted: options.persisted || true,
      contents: options.contents
    };
  }

  function compileFileBrowser() {
    el = compileTemplate('<raml-editor-file-browser></raml-editor-file-browser>', scope);
    document.body.appendChild(el[0]);
  }

  function verifyNewFilePrompt(newFilePromptStub, done) {
    function verify() {
      try {
        newFilePromptStub.should.have.been.called;
        done();
      } catch(e) {
        setTimeout(verify, 10);
      }
    }

    setTimeout(verify, 10);
  }

  angular.module('fileBrowserTest', ['ramlEditorApp', 'testFs']);
  beforeEach(module('fileBrowserTest'));

  beforeEach(inject(function($rootScope, $injector) {
    sandbox = sinon.sandbox.create();
    scope = $rootScope.$new();
    ramlRepository = $injector.get('ramlRepository');
  }));

  afterEach(inject(function(config) {
    scope.$destroy();
    el = scope = ramlRepository = undefined;
    sandbox.restore();
    config.clear();
  }));

  describe('when initialized', function() {
    describe('by default', function() {
      it('selects the first file', function() {
        ramlRepository.files = [createMockFile('firstFile'), createMockFile('lastFile')];
        compileFileBrowser();
        scope.fileBrowser.selectedFile.name.should.equal('firstFile');
      });
    });

    describe('with a previous file selected', function() {
      beforeEach(inject(function(config) {
        ramlRepository.files = [createMockFile('lastFile'), createMockFile('firstFile')];
        var fileToOpen = ramlRepository.files[0];

        config.set('currentFile', JSON.stringify({ name: fileToOpen.name, path: fileToOpen.path }));
        compileFileBrowser();
      }));

      it('selects the previously selected file', function() {
        scope.fileBrowser.selectedFile.name.should.equal('lastFile');
      });
    });

    describe('when there are no files', function() {
      var openStub;

      beforeEach(inject(function(ramlEditorFilenamePrompt) {
        openStub = sinon.spy(ramlEditorFilenamePrompt, 'fileName');
      }));

      it('prompts you to name a new file', function(done) {
        compileFileBrowser();
        verifyNewFilePrompt(openStub, done);
      });
    });
  });

  describe('clicking a file', function() {
    var fileToClick;

    beforeEach(function() {
      ramlRepository.files = [createMockFile('file1'), createMockFile('file2')];
      compileFileBrowser();
      fileToClick = el[0].querySelectorAll('.file-item[role="file"]')[1];

      sandbox.spy(ramlRepository, 'loadFile');
    });

    describe('by default', function() {
      beforeEach(function() {
        angular.element(fileToClick).triggerHandler('click');
      });

      it('updates selectedFile to the file clicked', function() {
        scope.fileBrowser.selectedFile.name.should.equal('file2');
      });

      it('updates the currentFile stored in config', inject(function(config) {
        JSON.parse(config.get('currentFile')).name.should.equal('file2');
        JSON.parse(config.get('currentFile')).path.should.equal('/file2');
      }));

      it('adds the "currentfile" class to the file clicked', function() {
        fileToClick.classList.contains('currentfile').should.be.true;
      });

      it('removes the "currentfile" class from all other files', function() {
        el[0].querySelectorAll('.currentfile').length.should.equal(1);
      });
    });

    describe('when the file is not loaded', function() {
      it('loads the file content', function() {
        angular.element(fileToClick).triggerHandler('click');
        ramlRepository.loadFile.should.have.been.called;
      });
    });

    describe('when the file is loaded', function() {
      beforeEach(function() {
        ramlRepository.files[1].contents = 'raml';
        angular.element(fileToClick).triggerHandler('click');
      });

      it('does not load the file content', function() {
        ramlRepository.loadFile.should.not.have.been.called;
      });
    });
  });

  describe('opening the context menu', function() {
    var iconToClick;

    function contextMenuItemNamed(name) {
      var contextMenu = angular.element(el[0].querySelector('[role="context-menu"]'));

      return Array.prototype.slice.call(contextMenu.children()).filter(function(child) {
        return angular.element(child).text() === name;
      })[0];
    }

    describe('for a directory', function() {
      beforeEach(function() {
        ramlRepository.files = [createMockFile('file1'), createMockFile('file2')];
        compileFileBrowser();
        iconToClick = el[0].querySelectorAll('.file-item[role="directory"] .icon')[1];
      });

      describe('by default', function() {
        beforeEach(function() {
          scope.fileBrowser.selectedFile.name.should.equal('file1');
          iconToClick.dispatchEvent(events.click());
        });

        it('does not update the selectedFile', function() {
          scope.fileBrowser.selectedFile.name.should.equal('file1');
        });

        it('adds the "geared" class to the file clicked', function() {
          iconToClick.parentElement.classList.contains('geared').should.be.true;
        });

        it('opens the context menu', function() {
          var rect = el[0].querySelector('[role="context-menu"]').getBoundingClientRect();
          rect.height.should.be.greaterThan(0);
        });
      });

      describe('creating a file', function() {
        var createItem, createFileStub, promptSpy, filenamePromptStub;

        beforeEach(function() {
          iconToClick.dispatchEvent(events.click());
          inject(function(ramlRepository, ramlEditorFilenamePrompt) {
            createFileStub = sandbox.stub(ramlRepository.directories[0], 'createFile');
            filenamePromptStub = sandbox.stub(ramlEditorFilenamePrompt, 'fileName');
          });
          promptSpy = sandbox.stub(window, 'prompt');

          createItem = contextMenuItemNamed('New File');
        });

        it('opens the filenamePrompt', function() {
          filenamePromptStub.returns(promise.stub());
          createItem.dispatchEvent(events.click());

          filenamePromptStub.should.have.been.calledWith(scope.homeDirectory);
        });

        describe('upon success', function() {
          beforeEach(function() {
            filenamePromptStub.returns(promise.resolved('NewName.raml'));
            createItem.dispatchEvent(events.click());
          });

          it('creates a file in the current directory', function() {
            createFileStub.should.have.been.calledWith('NewName.raml');
          });
        });
      });
    });

    describe('for a file', function() {
      var file;

      beforeEach(function() {
        ramlRepository.files = [createMockFile('file1'), createMockFile('file2')];
        compileFileBrowser();
        iconToClick = el[0].querySelectorAll('.file-item[role="file"] .icon')[1];
        file = ramlRepository.files[0];

        sandbox.spy(ramlRepository, 'loadFile');
      });

      describe('by default', function() {
        beforeEach(function() {
          scope.fileBrowser.selectedFile.name.should.equal('file1');
          iconToClick.dispatchEvent(events.click());
        });

        it('does not update the selectedFile', function() {
          scope.fileBrowser.selectedFile.name.should.equal('file1');
        });

        it('adds the "geared" class to the file clicked', function() {
          iconToClick.parentElement.classList.contains('geared').should.be.true;
        });

        it('opens the context menu', function() {
          var rect = el[0].querySelector('[role="context-menu"]').getBoundingClientRect();
          rect.height.should.be.greaterThan(0);
        });
      });

      describe('saving a file', function() {
        var saveFileSpy;

        beforeEach(inject(function(ramlRepository) {
          iconToClick.dispatchEvent(events.click());
          saveFileSpy = sinon.spy(ramlRepository, 'saveFile');
          var saveItem = contextMenuItemNamed('Save');

          saveItem.dispatchEvent(events.click());
        }));

        it('delegates to the ramlRepository', function() {
          saveFileSpy.should.have.been.calledWith(file);
        });
      });

      describe('removing a file', function() {
        var openStub;

        beforeEach(inject(function(ramlEditorRemoveFilePrompt) {
          iconToClick.dispatchEvent(events.click());
          openStub = sinon.stub(ramlEditorRemoveFilePrompt, 'open');
          var removeItem = contextMenuItemNamed('Delete');

          removeItem.dispatchEvent(events.click());
        }));

        it('delegates to the ramlRepository', function() {
          openStub.should.have.been.calledWith(scope.homeDirectory, file);
        });
      });

      describe('renaming', function() {
        var renameItem, renameFileStub, promptSpy, filenamePromptStub;

        beforeEach(function() {
          iconToClick.dispatchEvent(events.click());
          inject(function(ramlRepository, ramlEditorFilenamePrompt) {
            renameFileStub = sandbox.stub(ramlRepository, 'renameFile');
            filenamePromptStub = sandbox.stub(ramlEditorFilenamePrompt, 'fileName');
          });
          promptSpy = sandbox.stub(window, 'prompt');

          renameItem = contextMenuItemNamed('Rename');
        });

        it('opens the filenamePrompt with the file\'s current name', function() {
          filenamePromptStub.returns(promise.stub());
          renameItem.dispatchEvent(events.click());

          filenamePromptStub.should.have.been.calledWith(scope.homeDirectory, file.name);
        });

        describe('upon success', function() {
          beforeEach(function() {
            filenamePromptStub.returns(promise.resolved('NewName.raml'));
            renameItem.dispatchEvent(events.click());
          });

          it('renames the file in the ramlRepository', function() {
            renameFileStub.should.have.been.calledWith(file, 'NewName.raml');
          });

        });

        describe('upon failure', function() {
          beforeEach(function() {
            filenamePromptStub.returns(promise.rejected());
            renameItem.dispatchEvent(events.click());
          });

          it('does not rename the file', function() {
            renameFileStub.should.not.have.been.called;
          });
        });
      });
    });
  });

  describe('when a new file is created', function() {
    beforeEach(inject(function($rootScope) {
      compileFileBrowser();
      $rootScope.$broadcast('event:raml-editor-file-created', createMockFile('filenameOfTheNewFile'));
      scope.$digest();
    }));

    it('selects the file', function() {
      scope.fileBrowser.selectedFile.name.should.equal('filenameOfTheNewFile');
    });
  });

  describe('removing a file', function() {
    beforeEach(inject(function(ramlRepository) {
      ramlRepository.files.push(createMockFile('some.raml'));
      compileFileBrowser();
    }));

    describe('when it is the last file', function() {
      var openStub;

      beforeEach(inject(function($rootScope, ramlRepository, ramlEditorFilenamePrompt) {
        var removed = ramlRepository.files.pop();
        openStub = sinon.spy(ramlEditorFilenamePrompt, 'fileName');

        $rootScope.$broadcast('event:raml-editor-file-removed', removed);
        scope.$digest();
      }));

      it('prompts the user to create a new file', function(done) {
        verifyNewFilePrompt(openStub, done);
      });
    });

    describe('when it is the selected file', function() {
      beforeEach(inject(function($rootScope) {
        var removed = scope.fileBrowser.selectedFile = createMockFile('old.raml');

        $rootScope.$broadcast('event:raml-editor-file-removed', removed);
        scope.$digest();
      }));

      it('selects the first file from the fileList', function() {
        scope.fileBrowser.selectedFile.name.should.equal('some.raml');
      });
    });
  });

  describe('saving a file', function() {
    var saveSpy;

    beforeEach(function() {
      ramlRepository.files = [createMockFile('file1'), createMockFile('file2')];
      compileFileBrowser();
      var fileToSave = el[0].querySelectorAll('.file-item[role="file"]')[1];
      angular.element(fileToSave).triggerHandler('click');
      saveSpy = sandbox.spy(ramlRepository, 'saveFile');
    });

    it('saves when meta-s is pressed', function() {
      var event = events.keydown(83, { metaKey: true});
      document.dispatchEvent(event);
      saveSpy.should.have.been.calledWith(ramlRepository.files[1]);
    });

    it('saves when ctrl-s is pressed', function() {
      var event = events.keydown(83, { ctrlKey: true});
      document.dispatchEvent(event);
      saveSpy.should.have.been.calledWith(ramlRepository.files[1]);
    });
  });

  describe('file list', function() {
    it('displays', function() {
      ramlRepository.files = [createMockFile('file1'), createMockFile('file2')];
      compileFileBrowser();

      scope.homeDirectory.files.length.should.equal(2);
      scope.homeDirectory.files[0].name.should.equal('file1');
      scope.homeDirectory.files[1].name.should.equal('file2');

      el.text().should.contain('file1');
      el.text().should.contain('file2');
    });

    describe('sorting', function() {
      beforeEach(function() {
        ramlRepository.files = [
          createMockFile('xFile'),
          createMockFile('yFile'),
          createMockFile('aFile'),
          createMockFile('bFile'),
          createMockFile('zFile')
        ];
        compileFileBrowser();
      });

      it('lists alphabetically', function() {
        var match = el.text().match(/(\wFile)/mg);
        match.should.deep.equal(['aFile', 'bFile', 'xFile', 'yFile', 'zFile']);
      });
    });

    describe('dirty tracking', function() {
      it('indicates unsaved files', function() {
        ramlRepository.files = [ createMockFile('dirty', { dirty : true }) ];
        compileFileBrowser();
        var file = el[0].querySelector('.file-item[role="file"]');
        file.classList.contains('dirty').should.be.true;
      });

      it('indicates saved files', function() {
        ramlRepository.files = [ createMockFile('saved') ];
        compileFileBrowser();
        var file = el[0].querySelector('.file-item');

        file.classList.contains('dirty').should.be.false;
      });

      it('marks the selected file dirty when its contents change', function() {
        var file = createMockFile('clean');
        ramlRepository.files = [file];
        compileFileBrowser();

        scope.fileBrowser.selectFile(file);
        scope.$digest();

        file.dirty.should.be.false;

        file.contents = 'dirty content';
        scope.$digest();

        file.dirty.should.be.true;
      });
    });
  });
});
