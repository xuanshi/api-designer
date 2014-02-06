'use strict';

angular.module('ramlEditorApp')
  .constant('UPDATE_RESPONSIVENESS_INTERVAL', 800)
  .service('ramlParserFileReader', function ($q, $http, ramlParser, fileSystem, safeApplyWrapper) {
    function readLocFile(path) {
      return fileSystem.root.then(function success(root) {
        var file = root.fileOrFolderAtPath(path.slice(1)), contents = $q.when();
        if (file) {
          contents = file.load().then(function() {
            return file.contents;
          });
        }

        return contents;
      });
    }

    function readExtFile(path) {
      function returnContents(response) {
        return response.data;
      }

      function explainTheProblem(response) {
        var error = 'cannot fetch ' + path + ', check that the server is up and that CORS is enabled';
        if (response.status) {
          error += '(HTTP ' + response.status + ')';
        }

        throw error;
      }

      return $http.get(path).then(returnContents, explainTheProblem);
    }

    this.readFileAsync = safeApplyWrapper(null, function readFileAsync(file) {
      var deferredSrc = /^https?:\/\//.test(file) ? readExtFile(file) : readLocFile(file);
      var deferredDst = $q.defer();

      deferredSrc.then(
        deferredDst.resolve.bind(deferredDst),
        deferredDst.reject.bind(deferredDst)
      );

      return deferredDst.promise;
    });
  })
  .controller('ramlEditorMain', function (UPDATE_RESPONSIVENESS_INTERVAL, $scope, $rootScope, $timeout, $window,
    safeApply, safeApplyWrapper, debounce, throttle, ramlHint, ramlParser, ramlParserFileReader, eventService, codeMirror,
    codeMirrorErrors, config, $prompt, $confirm, $modal
  ) {
    var editor, currentFile, extractCurrentFileLabel = function(file) {
      var label = '';
      if (file) {
        label = file.path;
        if (file.dirty) {
          label = '* ' + label;
        }
      }

      return label;
    };

    $window.setTheme = function setTheme(theme) {
      config.set('theme', theme);
      $scope.theme = $rootScope.theme = theme;
      safeApply($scope);
    };

    $scope.$on('event:raml-editor-file-selected', function onFileSelected(event, file) {
      $scope.projectEmpty = false;
      codeMirror.configureEditor(editor, file.extension);

      currentFile = file;

      // Empty console so that we remove content from previous open RAML file
      eventService.broadcast('event:raml-parsed', {});

      editor.setValue(file.contents);
      $scope.fileParsable = $scope.getIsFileParsable(file);
    });

    $scope.$on('event:raml-editor-file-removed', function onFileSelected(event, file) {
      if (currentFile === file) {
        currentFile = undefined;
        editor.setValue('');
      }
    });

    $scope.$on('event:raml-editor-project-empty', function onFileSelected() {
      $scope.projectEmpty = true;
      $scope.fileParsable = false;
    });

    $scope.sourceUpdated = function sourceUpdated() {
      var source       = editor.getValue();
      var selectedFile = $scope.fileBrowser.selectedFile;
      if (!selectedFile) {
        return;
      }

      $scope.clearErrorMarks();
      selectedFile.contents = source;
      $scope.fileParsable   = $scope.getIsFileParsable(selectedFile);

      eventService.broadcast('event:raml-source-updated', source);
    };

    $scope.loadRaml = function loadRaml(definition, location) {
      return ramlParser.load(definition, location, {
        validate : true,
        transform: true,
        compose:   true,
        reader:    ramlParserFileReader
      });
    };

    $scope.clearErrorMarks = function clearErrorMarks() {
      codeMirrorErrors.clearAnnotations();
      $scope.hasErrors = false;
    };

    eventService.on('event:raml-source-updated', function onRamlSourceUpdated(event, source) {
      $scope.clearErrorMarks();

      if (!$scope.fileParsable || source.trim() === '') {
        $scope.hasErrors = false;
        return;
      }

      $scope.loadRaml(source, (($scope.fileBrowser || {}).selectedFile || {}).path).then(
        // success
        safeApplyWrapper($scope, function success(value) {
          eventService.broadcast('event:raml-parsed', value);
        }),

        // failure
        safeApplyWrapper($scope, function failure(error) {
          eventService.broadcast('event:raml-parser-error', error);
        })
      );
    });

    eventService.on('event:raml-parsed', safeApplyWrapper($scope, function onRamlParser(event, raml) {
      $scope.title     = raml.title;
      $scope.version   = raml.version;
      $scope.hasErrors = false;
    }));

    eventService.on('event:raml-parser-error', safeApplyWrapper($scope, function onRamlParserError(event, error) {
      var problemMark  = 'problem_mark';
      var line         = error[problemMark] ? error[problemMark].line   : 0;
      var column       = error[problemMark] ? error[problemMark].column : 0;
      $scope.hasErrors = true;

      codeMirrorErrors.displayAnnotations([{
        line:    line + 1,
        column:  column + 1,
        message: error.message
      }]);
    }));

    $scope.openHelp = function openHelp() {
      $modal.open({
        templateUrl: 'views/help.html'
      });
    };

    $scope.getIsFileParsable = function getIsFileParsable(file, contents) {
      // check for file extenstion
      if (file.name.slice(-5) !== '.raml') {
        return false;
      }

      // check for raml version tag as a very first line of the file
      contents = arguments.length > 1 ? contents : file.contents;
      if (contents.search(/^\s*#%RAML( \d*\.\d*)?\s*(\n|$)/) !== 0) {
        return false;
      }

      return true;
    };

    $scope.getIsShelfVisible = function getIsShelfVisible() {
      if (!$scope.fileParsable) {
        return false;
      }

      return true;
    };

    $scope.getIsConsoleVisible = function getIsConsoleVisible() {
      if (!$scope.fileParsable) {
        return false;
      }

      return true;
    };

    $scope.toggleShelf = function toggleShelf() {
      $scope.shelf.collapsed = !$scope.shelf.collapsed;
      config.set('shelf.collapsed', $scope.shelf.collapsed);
    };

    $scope.getSelectedFileAbsolutePath = function getSelectedFileAbsolutePath() {
      return extractCurrentFileLabel(currentFile);
    };

    eventService.on('event:toggle-theme', function onToggleTheme() {
      $window.setTheme(($scope.theme === 'dark') ? 'light' : 'dark');
    });

    (function bootstrap() {
      $scope.hasErrors       = false;
      $scope.theme           = $rootScope.theme = config.get('theme', 'dark');
      $scope.shelf           = {};
      $scope.shelf.collapsed = JSON.parse(config.get('shelf.collapsed', 'false'));
      $scope.editor          = editor = codeMirror.initEditor();

      editor.on('change', debounce(function onChange() {
        $scope.sourceUpdated();
      }, config.get('updateResponsivenessInterval', UPDATE_RESPONSIVENESS_INTERVAL)));

      // Warn before leaving the page
      $window.onbeforeunload = function () {
        var anyUnsavedChanges = $scope.homeDirectory.files.some(function(file) {
          return file.dirty;
        });

        if (anyUnsavedChanges) {
          return 'WARNING: You have unsaved changes. Those will be lost if you leave this page.';
        }
      };
    })();
  });
