(function() {
  'use strict';

  angular.module('ramlEditorApp').directive('ramlEditorContextMenu', function(ramlRepository) {

    function ContextMenu(file) {
      var saveAction = {
        label: "Save",
        execute: function() {
          ramlRepository.saveFile(file)
        }
      };

      return [saveAction];
    }

    function link(scope) {
      scope.actions = ContextMenu(scope.file);
    }

    return {
      restrict: 'E',
      template: '<ul ng-show="active"><li ng-repeat="action in actions" ng-click="action.execute()">{{ action.label }}</li></ul>',
      link: link,
      scope: {
        file: '=',
        active: '='
      }
    };
  });
})();
