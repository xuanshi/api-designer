/* jshint newcap: false */
(function() {
  'use strict';
  angular.module('ramlEditorApp').directive('ramlEditorDirectoryItem', function(ramlEditorFilenamePrompt) {
    function Actions(directory) {
      return [
        {
          label: 'New File',
          execute: function() {
            ramlEditorFilenamePrompt.fileName(directory).then(function(filename) {
              directory.createFile(filename);
            });
          }
        }
      ];
    }

    return {
      restrict: 'A',
      templateUrl: 'views/raml-editor-directory-item.tmpl.html',
      require: '^ramlEditorFileBrowser',
      link: function($scope, $element, $attrs, controller) {
        var contextMenuOpen = false;

        $scope.showContextMenu = function($event) {
          contextMenuOpen = true;

          var actions = Actions($scope.directory);
          controller.openContextMenu($event, actions, function() {
            contextMenuOpen = false;
          });
        };

        $scope.contextMenuOpen = function() {
          return contextMenuOpen;
        };
      },

      scope: {
        directory: '=',
        fileBrowser: '='
      }
    };
  });
})();
