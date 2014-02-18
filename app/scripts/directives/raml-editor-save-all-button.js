(function() {
  'use strict';

  function ramlEditorSaveAllButton($rootScope, fileSystem) {
    return {
      restrict: 'E',
      template: '<span role="save-all-button" ng-click="saveAll()">Save All</span>',
      link: function(scope) {
        scope.saveAll = function() {
          fileSystem.root.then(function(rootFolder) {
            rootFolder.saveAll();
          }).then(function() {
            $rootScope.$broadcast('event:notification', {
              message: 'All files saved.',
              expires: true
            });
          });
        };
      }
    };
  }

  angular.module('ramlEditorApp').directive('ramlEditorSaveAllButton', ramlEditorSaveAllButton);
})();
