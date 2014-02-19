(function() {
  'use strict';

  function ramlEditorSaveAllButton($rootScope, fileSystem) {
    return {
      restrict: 'E',
      template: '<div class="save-submenu"><raml-editor-context-menu></raml-editor-context-menu><i class="icon icon-caret-right" ng-click="openSaveMenu($event)"></i></div>',
      link: function(scope) {
        var contextMenu, actions;

        function saveAll() {
          fileSystem.root.then(function(rootFolder) {
            rootFolder.saveAll();
          }).then(function() {
            $rootScope.$broadcast('event:notification', {
              message: 'All files saved.',
              expires: true
            });
          });
        }

        actions = [
          {
            label: 'Save All',
            execute: saveAll
          }
        ];

        scope.openSaveMenu = function($event) {
          contextMenu.open($event, actions);
        };

        scope.registerContextMenu = function(cm) {
          contextMenu = cm;
        };
      }
    };
  }

  angular.module('ramlEditorApp').directive('ramlEditorSaveAllButton', ramlEditorSaveAllButton);
})();
