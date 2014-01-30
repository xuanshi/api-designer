/* jshint newcap: false */
(function() {
  'use strict';
  angular.module('ramlEditorApp').directive('ramlEditorFolderItem', function($compile, ramlEditorFilenamePrompt) {
    function Actions(folder) {
      return [
        {
          label: 'New Folder',
          execute: function() {
            ramlEditorFilenamePrompt.folderName(folder).then(function(filename) {
              folder.createFolder(filename);
            });
          }
        },

        {
          label: 'New File',
          execute: function() {
            ramlEditorFilenamePrompt.fileName(folder).then(function(filename) {
              folder.createFile(filename);
            });
          }
        }
      ];
    }

    return {
      restrict: 'A',
      terminal: true,
      scope: {
        folder: '='
      },
      require: '^ramlEditorFileBrowser',
      compile: function(element) {
        function initializeScope(scope) {
          var contextMenuOpen = false;

          scope.showContextMenu = function($event) {
            contextMenuOpen = true;

            var actions = Actions(scope.folder);
            scope.fileBrowser.openContextMenu($event, actions, function() {
              contextMenuOpen = false;
            });
          };

          scope.contextMenuOpen = function() {
            return contextMenuOpen;
          };
        }

        var $template = element.clone().contents();
        element.html('');

        var linkChildFn = $compile($template, function(scope, cloneAttachFn) {
          initializeScope(scope);
          return linkChildFn(scope, cloneAttachFn);
        });

        return function($scope, $element, $attr, controller) {
          $scope.fileBrowser = controller;
          initializeScope($scope);

          linkChildFn($scope, function(contents) {
            $element.append(contents);
          });
        };
      }
    };
  });
})();
