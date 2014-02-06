/* jshint newcap: false */
(function() {
  'use strict';
  angular.module('ramlEditorApp').directive('ramlEditorFolderItem', function($compile, $window, ramlEditorFilenamePrompt) {
    function Actions(folder) {
      var actions = [];
      actions.push({
        label: 'New Folder',
        execute: function() {
          ramlEditorFilenamePrompt.folderName(folder).then(function(filename) {
            folder.createFolder(filename);
          });
        }
      });

      if (folder.remove) {
        actions.push({
          label: 'Remove Folder',
          execute: function() {
            var containedFileCount = folder.containedFiles().length,
                message = 'Are you sure you want to delete "' + folder.name + '"';

            if (containedFileCount > 0) {
              message = message + ' and ' + containedFileCount + ' contained file';
              if (containedFileCount > 1) {
                message = message + 's';
              }
            }

            var confirmed = $window.confirm(message + '?');
            if (confirmed) {
              folder.remove();
            }
          }
        });
      }

      actions.push({
        label: 'New File',
        execute: function() {
          ramlEditorFilenamePrompt.fileName(folder).then(function(filename) {
            folder.createFile(filename);
          });
        }
      });

      return actions;
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
