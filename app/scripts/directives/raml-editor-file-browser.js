(function() {
  'use strict';

  angular.module('ramlEditorApp').directive('ramlEditorFileBrowser', function($rootScope, $q, $window, ramlEditorFilenamePrompt, fileSystem, config, eventService) {
    var controller = function($scope) {
      var unwatchSelectedFile = angular.noop, contextMenu;
      var saveListener = function(e) {
        if (e.which === 83 && (e.metaKey || e.ctrlKey) && !(e.shiftKey || e.altKey)) {
          e.preventDefault();
          $scope.$apply(function() {
            $scope.fileBrowser.saveFile($scope.fileBrowser.selectedFile);
          });
        }
      };

      var newListener = function(e) {
        if (e.which === 78 && (e.altKey && e.shiftKey)) {
          e.preventDefault();
          $scope.$apply(function() {
            ramlEditorFilenamePrompt.fileName($scope.homeFolder).then(function(name) {
              $scope.homeFolder.createFile(name);
            });
          });
        }
      };

      $scope.fileBrowser = this;

      fileSystem.root.then(function(root) {
        $scope.homeFolder = root;

        if (root.containedFiles().length > 0) {
          var lastFile = config.get('currentFile', '');

          var fileToOpen = root.containedFiles().filter(function(file) {
            return file.path === lastFile;
          })[0];

          fileToOpen = fileToOpen || root.files[0];

          $scope.fileBrowser.selectFile(fileToOpen);
        } else {
          $scope.homeFolder.createFile('Untitled-1.raml');
        }
      });

      $scope.$on('event:raml-editor-file-created', function(event, file) {
        $scope.fileBrowser.selectFile(file);
      });

      $scope.$on('event:raml-editor-file-removed', function(event, file) {
        if (file !== $scope.fileBrowser.selectedFile) {
          return;
        }

        if ($scope.homeFolder.containedFiles().length > 0) {
          $scope.fileBrowser.selectFile($scope.homeFolder.files[0]);
        } else {
          unwatchSelectedFile();
          $scope.fileBrowser.selectedFile = undefined;
          $rootScope.$broadcast('event:raml-editor-project-empty');
        }
      });

      $scope.registerContextMenu = function(cm) {
        contextMenu = cm;
      };

      $window.addEventListener('keydown', saveListener);
      $window.addEventListener('keydown', newListener);

      $scope.$on('$destroy', function() {
        $window.removeEventListener('keydown', saveListener);
        $window.removeEventListener('keydown', newListener);
      });

      this.selectFile = function(file) {
        if ($scope.fileBrowser.selectedFile === file) {
          return;
        }

        config.set('currentFile', file.path);
        unwatchSelectedFile();

        var isLoaded = !file.persisted || angular.isString(file.contents);
        var afterLoading = isLoaded ? $q.when(file) : file.load();

        afterLoading.then(function(file) {
          $scope.fileBrowser.selectedFile = file;
          $scope.$emit('event:raml-editor-file-selected', file);
          unwatchSelectedFile = $scope.$watch('fileBrowser.selectedFile.contents', function(newContents, oldContents) {
            if (newContents !== oldContents) {
              file.dirty = true;
            }
          });
        });
      };

      this.saveFile = function(file) {
        file.save().then(function success() {
          eventService.broadcast('event:notification', {
            message: 'File saved.',
            expires: true
          });
        });
      };

      this.openContextMenu = function(event, actions, onClose) {
        contextMenu.open(event, actions, onClose);
      };
    };

    return {
      restrict: 'E',
      templateUrl: 'views/raml-editor-file-browser.tmpl.html',
      controller: controller
    };
  });
})();
