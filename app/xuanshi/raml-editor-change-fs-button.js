(function () {
  'use strict';

  function ramlEditorChangeFsButton($rootScope, $injector, config, dropboxClient) {
    var template = config.get('fsFactory') === 'DropboxFileSystem' ? '<span role="change-button" ng-click="useLocalStorage()">Switch to Local Storage</span>' :
      '<span role="change-button" ng-click="useDropbox()">Switch to Dropbox</span>';
    return {
      restrict: 'E',
      template: template,
      link: function (scope) {
        scope.useDropbox = function () {
          config.set('fsFactory', 'DropboxFileSystem'); 
          window.location.reload();
        };
        scope.useLocalStorage = function () {
          dropboxClient.signOut();
          config.set('fsFactory', 'localStorageFilePersistence'); 
          window.location.reload();
        };
      }
    };
  }

  angular.module('ramlEditorApp').directive('ramlEditorChangeFsButton', ramlEditorChangeFsButton);
})();