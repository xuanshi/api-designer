'use strict';

angular.module('fs')
  .constant('LOCAL_PERSISTENCE_KEY','mockFilePersistence')
  .factory('mockFileSystem', function ($q, $timeout, LOCAL_PERSISTENCE_KEY) {
    var service = {};
    var files   = [];
    var delay   = 500;

    if (localStorage[LOCAL_PERSISTENCE_KEY]) {
      try {
        files = JSON.parse(localStorage[LOCAL_PERSISTENCE_KEY]);
      } catch (e) {
        files = [];
      }
    }

    function delayOperation(operation) {
      $timeout(operation, delay);
    }

    function getFile(path, name) {
      for (var i = 0; i < files.length; i++) {
        if (files[i].path === path && files[i].name === name) {
          return files[i];
        }
      }
    }

    service.directory = function (path) {
      var deferred = $q.defer();
      var entries  = files
        .filter(function (f) {
          return f.path === path;
        })
        .map(function (f) {
          return f.name;
        })
      ;

      delayOperation(function () {
        deferred.resolve(entries);
      });

      return deferred.promise;
    };

    service.save = function (path, name, content) {
      var deferred = $q.defer();
      var entries  = files
        .filter(function (f) {
          return f.path === path && f.name === name;
        })
      ;

      delayOperation(function () {
        var entry = entries[0];
        if (entry) {
          entry.content = content;
        } else {
          files.push({
            path: path,
            name: name,
            content: content
          });
        }

        localStorage[LOCAL_PERSISTENCE_KEY] = JSON.stringify(files);
        deferred.resolve();
      });

      return deferred.promise;
    };

    service.load = function (path, name) {
      var deferred = $q.defer();
      var entries  = files
        .filter(function (f) {
          return (f.path === path && f.name === name) || ('/' + f.name === path + '/' + name) || (f.name === path + '/' + name);
        })
        .map(function (f) {
          return f.content;
        })
      ;

      delayOperation(function () {
        if (entries.length) {
          deferred.resolve(entries[0] || '');
        } else {
          deferred.reject('file with path="' + path + '" and name="' + name + '" does not exist');
        }
      });

      return deferred.promise;
    };

    service.remove = function (path, name) {
      var deferred = $q.defer();
      var entries  = files
        .filter(function (f) {
          return f.path === path && f.name === name;
        })
      ;

      delayOperation(function () {
        if (entries.length) {
          files.splice(files.indexOf(entries[0]), 1);
          localStorage[LOCAL_PERSISTENCE_KEY] = JSON.stringify(files);

          deferred.resolve();
        } else {
          deferred.reject('file with path="' + path + '" and name="' + name + '" does not exist');
        }
      });

      return deferred.promise;
    };

    service.saveMetadata = function saveMetadata(path, name, metadata) {
      var deferred = $q.defer();
      var file     = getFile(path, name);

      delayOperation(function () {
        if (file) {
          file.metadata = metadata;
          localStorage[LOCAL_PERSISTENCE_KEY] = JSON.stringify(files);

          deferred.resolve();
        } else {
          deferred.reject('file with path="' + path + '" and name="' + name + '" does not exist');
        }
      });

      return deferred.promise;
    };

    service.loadMetadata = function loadMetadata(path, name) {
      var deferred = $q.defer();
      var file     = getFile(path, name);

      delayOperation(function () {
        if (file) {
          deferred.resolve(file.metadata || {});
        } else {
          deferred.reject('file with path="' + path + '" and name="' + name + '" does not exist');
        }
      });

      return deferred.promise;
    };

    service.saveMetadataKey = function saveMetadataKey(path, name, key, value) {
      return service.loadMetadata(path, name).then(function success(metadata) {
        metadata[key] = value;
        return service.saveMetadata(path, name, metadata);
      });
    };

    return service;
  });
