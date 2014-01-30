(function() {
  'use strict';

  function nameGenerator(items, prefix, extension) {
    extension = extension || '';
    if (extension !== '' && extension.indexOf('.') !== 0) {
      extension = '.' + extension;
    }

    return function nextToken() {
      var currentMax = Math.max.apply(undefined, items.map(function(item) {
        var match = new RegExp(prefix + '(\\d)' + extension).exec(item.name);
        return match ? match[1] : 0;
      }).concat(0));

      return prefix + (currentMax + 1) + extension;
    };
  }

  angular.module('ramlEditorApp').factory('ramlEditorFilenamePrompt', function($window, $q) {
    function open(folder, nameGenerator, suggestedName) {
      var deferred = $q.defer();
      suggestedName = suggestedName || nameGenerator();
      var name = $window.prompt('Choose a name:', suggestedName);

      if (name) {
        if (folder.hasFileOrFolderNamed(name)) {
          $window.alert('That name is already taken.');
          deferred.reject();
        } else {
          deferred.resolve(name);
        }
      } else {
        deferred.reject();
      }

      return deferred.promise;
    }

    return {
      fileName: function(folder, suggestedFileName) {
        var generator = nameGenerator(folder.files, 'Untitled-', '.raml');
        return open(folder, generator, suggestedFileName);
      },

      folderName: function(folder) {
        var generator = nameGenerator(folder.folders, 'Untitled-Folder-');
        return open(folder, generator);
      }
    };
  });
})();
