(function() {
  'use strict';

  var FILE_EXTENSION_EXTRACTOR = /.*\.(.*)$/;
  function byName(item1, item2) {
    return item1.name.localeCompare(item2.name);
  }

  angular.module('fs', ['ngCookies', 'raml', 'utils'])
    .factory('ramlRepository', function ($q, $rootScope, ramlSnippets, fileSystem) {
      var service = {};
      var defaultPath = '/';

      function notMetaFile(file) {
        return file.path.slice(-5) !== '.meta';
      }

      function RamlFolder(path, meta, contents) {
        if (!/\/$/.exec(path)) { path = path + '/'; }
        contents = contents || [];

        var strippedPath = path.substring(0, path.length - 1);
        this.path = path;
        this.name = strippedPath.slice(strippedPath.lastIndexOf('/') + 1);
        this.name = this.name || '/';
        this.meta = meta;

        var separated = { folder: [], file: [] };
        contents.forEach(function(entry) {
          separated[entry.type || 'file'].push(entry);
        });

        this.files = separated.file.filter(notMetaFile).map(function(file) {
          file.meta = file.meta || {};
          file.meta.dirty = false;
          file.meta.persisted = true;
          return new service.RamlFile(file.path, file.contents, file.meta);
        });

        this.folders = separated.folder.map(function(folder) {
          return new service.RamlFolder(folder.path, folder.meta, folder.children);
        });

        this.files.sort(byName);
        this.folders.sort(byName);
      }

      RamlFolder.prototype.createFolder = function (name) {
        var parentFolder = this;

        return service.createFolder(this.path + name).then(function(folder) {
          parentFolder.folders.push(folder);

          return folder;
        });
      };

      RamlFolder.prototype.createFile = function (name) {
        var file = service.createFile(this.path + name);
        this.files.push(file);

        return file;
      };

      RamlFolder.prototype.removeFile = function (file) {
        var index = this.files.indexOf(file);
        if (index !== -1) {
          this.files.splice(index, 1);
        }

        return service.removeFile(file).then(null, function() {
          this.files.push(file);
        }.bind(this));
      };

      RamlFolder.prototype.fileOrFolderNamed = function(name) {
        function named(item) {
          return item.name.toLowerCase() === name.toLowerCase();
        }

        return this.folders.filter(named)[0] || this.files.filter(named)[0];
      };

      RamlFolder.prototype.containedFiles = function(){
        return this.folders.reduce(function(files, folder) {
          return files.concat(folder.containedFiles());
        }, this.files);
      };

      function RamlFile (path, contents, options) {
        options = options || {};

        this.path = path;
        this.name = path.slice(path.lastIndexOf('/') + 1);
        var extensionMatch = FILE_EXTENSION_EXTRACTOR.exec(this.name);
        if (extensionMatch) {
          this.extension = extensionMatch[1];
        }

        this.contents = contents;
        this.persisted = options.persisted || false;
        this.dirty = options.dirty !== undefined ? options.dirty : !this.persisted;
      }

      service.RamlFolder = RamlFolder;
      service.RamlFile = RamlFile;

      function handleErrorFor(file) {
        return function markFileWithError(error) {
          file.error = error;
          throw error;
        };
      }

      service.getFolder = function getFolder(path) {
        path = path || defaultPath;
        return fileSystem.folder(path).then(function (folder) {
          return new service.RamlFolder(folder.path, folder.meta, folder.children);
        });
      };

      service.saveFile = function saveFile(file) {
        function modifyFile() {
          file.dirty = false;
          file.persisted = true;

          return file;
        }

        return fileSystem.save(file.path, file.contents).then(modifyFile, handleErrorFor(file));
      };

      service.renameFile = function renameFile(file, newName) {
        var newPath = file.path.replace(file.name, newName);
        var promise = file.persisted ? fileSystem.rename(file.path, newPath) : $q.when(file);

        function modifyFile() {
          file.name = newName;
          file.path = newPath;

          return file;
        }

        return promise.then(modifyFile, handleErrorFor(file));
      };

      service.loadFile = function loadFile(file) {
        function modifyFile(data) {
          file.dirty = false;
          file.persisted = true;
          file.contents = data;

          return file;
        }

        return fileSystem.load(file.path).then(modifyFile, handleErrorFor(file));
      };

      service.removeFile = function removeFile(file) {
        function modifyFile() {
          file.dirty = false;
          file.persisted = false;

          return Object.freeze(file);
        }

        $rootScope.$broadcast('event:raml-editor-file-removed', file);
        return fileSystem.remove(file.path).then(modifyFile, handleErrorFor(file));
      };

      service.createFile = function createFile(path) {
        var file = new service.RamlFile(path, ramlSnippets.getEmptyRaml());
        if (file.extension !== 'raml') {
          file.contents = '';
        }

        $rootScope.$broadcast('event:raml-editor-file-created', file);
        return file;
      };

      service.createFolder = function createFolder(path) {
        function makeRamlFolder() {
          return new service.RamlFolder(path);
        }

        return fileSystem.createFolder(path).then(makeRamlFolder);
      };

      service.saveMeta = function saveMeta(file, meta) {
        var metaFile = new RamlFile(file.path + '.meta', JSON.stringify(meta));
        return service.saveFile(metaFile);
      };

      service.loadMeta = function loadMeta(file) {
        var metaFile = new RamlFile(file.path + '.meta');
        return service.loadFile(metaFile).then(
          function success(file) {
            return JSON.parse(file.contents);
          },

          function failure() {
            return {};
          }
        );
      };

      return service;
    });
})();
