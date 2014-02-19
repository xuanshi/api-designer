// This part is needed only if you want to provide your own Persistance Implementation
// Angular Module must match "ramlEditorApp"
angular.module('ramlEditorApp')
  .constant('DRPOBOX_APP_KEY', '4qdaw72j2huq4b0')
  .constant('DRPOBOX_SECRET_KEY', 'cr6qf0kulco8hei')
  .factory('dropboxClient', function (DRPOBOX_APP_KEY) {
    /**
     * Initialize Dropbox
     */
    var client = new Dropbox.Client({
      key: DRPOBOX_APP_KEY
    });

    return client;
  })
  .factory('DropboxFileSystem', function ($q, $timeout, config, eventService, dropboxClient) {
    function validatePath(path) {
      if (path.indexOf('/') !== 0) {
        return {
          valid: false,
          reason: 'Path should start with "/"'
        };
      }
      return {
        valid: true
      };
    }

    function extractNameFromPath(path) {
      var pathInfo = validatePath(path);

      if (!pathInfo.valid) {
        throw 'Invalid Path!';
      }

      // When the path is ended in '/'
      if (path.lastIndexOf('/') === path.length - 1) {
        path = path.slice(0, path.length - 1);
      }

      return path.slice(path.lastIndexOf('/') + 1);
    }


    var newFolderEntry = function (path) {
      return {
        path: path,
        name: extractNameFromPath(path),
        type: 'folder',
        children: []
      };
    };
    var newLoadFileEntry = function (entry, path) {
      entry.path = path;
      entry.name = extractNameFromPath(path);
      return entry;
    };
    var newSaveFileEntry = function (content) {
      return {
        content: content,
        type: 'file',
        meta: {
          'created': Math.round(new Date().getTime() / 1000.0)
        }
      };
    };
    var service = {};
    var delay = 1000;
    /**
     * List files found in a given path.
     */
    service.directory = function (path) {
      var deferred = $q.defer();

      var addChildrenEntries = function (entry, childrenStats) {
        for (var s in childrenStats) {
          if (childrenStats[s].isFolder) {
            var newEntry;
            entry.children.push(newEntry = newFolderEntry(childrenStats[s].path));
            dropboxClient.stat(newEntry.path, {
              readDir: true
            }, function (error, stat, grandChildrenStats) {
              if (error) {
                // ignore errors
                return;
              }
              addChildrenEntries(newEntry, grandChildrenStats);
            });
          } else {
            dropboxClient.readFile(childrenStats[s].path, function (error, data, stat) {
              if (error) {
                // ignore errors
                return;
              }
              // TODO check entry object structure
              var newEntry = newLoadFileEntry(JSON.parse(data), stat.path);
              entry.children.push(newEntry);
            });
          }
        }
      };

      dropboxClient.stat(path, {
        readDir: true
      }, function (error, stat, childrenStats) {
        if (error) {
          deferred.reject(error.responseText);
          return;
        }
        if (!stat.isFolder) {
          deferred.reject('path ' + path + ' is not a folder');
          return;
        }

        var rootEntry = newFolderEntry(path);
        addChildrenEntries(rootEntry, childrenStats);
        $timeout(function () {
          deferred.resolve(rootEntry);
        }, delay);
      });

      return deferred.promise;
    };

    /**
     * Load file
     */
    service.load = function (path) {  
      var deferred = $q.defer();

      dropboxClient.readFile(path, function (error, data, stat) {
        if (error) {
          deferred.reject(error.responseText);
          return;
        }
        deferred.resolve(JSON.parse(data).content, stat.path);
      });

      return deferred.promise;
    };

    /**
     * Remove file
     */
    service.remove = function (path, name) {  
      var deferred = $q.defer();
      dropboxClient.remove(path, function (error) {
        if (error) {
          deferred.reject(error.responseText);
          return;
        }
        deferred.resolve();
      });

      return deferred.promise;  
    };

    /**
     * Save file
     */
    service.save = function (path, content) {  
      var deferred = $q.defer();

      dropboxClient.writeFile(path, JSON.stringify(newSaveFileEntry(content)), function (error, data, stat) {
        if (error) {
          deferred.reject(error.responseText);
          return;
        }
        deferred.resolve();
      });

      return deferred.promise;
    };

    /**
     * Rename file
     */
    service.rename = function (source, destination) {
      var deferred = $q.defer();
      dropboxClient.move(source, destination, function (error) {
        if (error) {
          deferred.reject(error.responseText);
          return;
        }
        deferred.resolve();
      });

      return deferred.promise;
    };

    /**
     * Create folder
     */
    service.createFolder = function (path) {
      var deferred = $q.defer();

      dropboxClient.mkdir(path, function (error) {
        if (error) {
          deferred.reject(error.responseText);
          return;
        }
        deferred.resolve();
      });

      return deferred.promise;
    }

    return service;
  })
  .run(function (DropboxFileSystem, config, eventService, dropboxClient) {
    if (config.get('fsFactory') === 'DropboxFileSystem' && !dropboxClient.isAuthenticated()) {
      dropboxClient.authenticate({
        interactive: true
      }, function (error) {
        if (error) {
          eventService.broadcast('event:notification', {
            message: 'Authentication error: ' + error,
            expires: true
          });
          config.set('fsFactory', 'localStorageFilePersistence'); 
          return;
        }
      });

    }
  });