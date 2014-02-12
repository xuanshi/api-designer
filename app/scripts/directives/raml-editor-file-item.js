/* jshint newcap: false */
(function() {
  'use strict';
  angular.module('ramlEditorApp').directive('ramlEditorFileItem', function(fileSystem, ramlEditorRemoveFilePrompt, ramlEditorFilenamePrompt, $window) {
    function Actions(folder, file) {
      return [
        {
          label: 'Save',
          execute: function() {
            file.save();
          }
        },
        {
          label: 'Delete',
          execute: function() {
            ramlEditorRemoveFilePrompt.open(folder, file);
          }
        },
        {
          label: 'Rename',
          execute: function() {
            ramlEditorFilenamePrompt.fileName(folder, file.name).then(function(filename) {
              folder.renameFile(file, filename);
            });
          }
        },
        {
          label: 'Move',
          execute: function() {
            var newPath = $window.prompt('Choose a destination folder path:');
            try {
              folder.moveFile(file, newPath);
            } catch (e) {
              $window.alert(e.message);
            }
          }
        }
      ];
    }

    return {
      restrict: 'A',
      templateUrl: 'views/raml-editor-file-item.tmpl.html',
      require: '^ramlEditorFileBrowser',
      link: function($scope, $element, $attrs, controller) {
        var contextMenuOpen = false;

        $scope.showContextMenu = function($event) {
          contextMenuOpen = true;

          var actions = Actions($scope.folder, $scope.file);
          controller.openContextMenu($event, actions, function() {
            contextMenuOpen = false;
          });
        };

        $scope.contextMenuOpen = function() {
          return contextMenuOpen;
        };
      },
      scope: true
    };
  });
})();
