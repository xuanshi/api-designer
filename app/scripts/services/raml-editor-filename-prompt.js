(function() {
  'use strict';

  function nameGenerator(prefix, extension) {
    extension = extension || '';
    if (extension !== '' && extension.indexOf('.') !== 0) {
      extension = '.' + extension;
    }

    return function nextToken(items) {
      var currentMax = Math.max.apply(undefined, items.map(function(item) {
        var match = new RegExp(prefix + '(\\d)' + extension).exec(item.name);
        return match ? match[1] : 0;
      }).concat(0));

      return prefix + (currentMax + 1) + extension;
    };
  }

  var fileNameGenerator = nameGenerator('Untitled-', '.raml');
  var directoryNameGenerator = nameGenerator('Untitled-Folder-');

  angular.module('ramlEditorApp').factory('ramlEditorFilenamePrompt', function($window, $q) {
    function open(items, nameGenerator, suggestedName) {
      var deferred = $q.defer();
      suggestedName = suggestedName || nameGenerator(items);
      var name = $window.prompt('Choose a name:', suggestedName);

      if (name) {
        var nameAlreadyTaken = items.some(function(item) {
          return item.name.toLowerCase() === name.toLowerCase();
        });

        if (nameAlreadyTaken) {
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
      fileName: function(directory, suggestedFileName) {
        return open(directory.files, fileNameGenerator, suggestedFileName);
      },

      directoryName: function(directory) {
        return open(directory.directories, directoryNameGenerator);
      }
    };
  });
})();
