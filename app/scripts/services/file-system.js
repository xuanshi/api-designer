(function() {
  'use strict';

  angular.module('fs', ['ngCookies', 'raml', 'utils'])
    .factory('fileSystem', function ($injector, config, $q, $rootScope, ramlSnippets) {
      var storageFactory    = config.get('storageFactory');
      var hasStorageFactory = storageFactory && $injector.has(storageFactory);

      if (!hasStorageFactory) {
        config.set('storageFactory', (storageFactory = 'localStorageFileSystem'));
      }

      var storage = $injector.get(storageFactory),
          File = RAML.FileSystem.createFileClass(storage),
          Folder = RAML.FileSystem.createFolderClass(File, $q, $rootScope, storage, ramlSnippets),
          deferred = $q.defer();

      storage.folder('/').then(function (folder) {
        deferred.resolve(Folder.root(folder.meta, folder.children));
      });

      return {
        root: deferred.promise,
      };
    });
})();
