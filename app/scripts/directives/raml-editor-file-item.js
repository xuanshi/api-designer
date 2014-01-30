/* jshint newcap: false */
(function() {
  'use strict';
  angular.module('ramlEditorApp').directive('ramlEditorFileItem', function(ramlRepository, ramlEditorRemoveFilePrompt, ramlEditorFilenamePrompt) {
    function Actions(folder, file) {
      return [
        {
          label: 'Save',
          execute: function() {
            ramlRepository.saveFile(file);
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
              ramlRepository.renameFile(file, filename);
            });
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
