(function() {
  'use strict';

  RAML.FileSystem.createFolderClass = function(File, $q, $rootScope, fileSystem, ramlSnippets) {
    var TRAILING_SLASH_DETECTOR = /\/$/;

    function sanitizePath(path) {
      if (TRAILING_SLASH_DETECTOR.exec(path)) {
        path = path.substring(0, path.length - 1);
      }

      return path || '/';
    }

    function separateContents(contents) {
      contents = contents || [];

      var separated = { folder: [], file: [] };
      contents.forEach(function(entry) {
        separated[entry.type || 'file'].push(entry);
      });

      return separated;
    }

    function fullPathFrom(path, name) {
      return (path === '/') ? path + name : path + '/' + name;
    }

    function byName(item1, item2) {
      return item1.name.localeCompare(item2.name);
    }

    function handleErrorFor(item) {
      return function markItemWithError(error) {
        item.error = error;
        return item;
      };
    }

    function RamlFolder(meta, contents) {
      this.meta = meta;

      var parent = this, separated = separateContents(contents);
      this.files = separated.file.map(function(file) {
        file.meta = file.meta || {};
        file.meta.dirty = false;
        file.meta.persisted = true;
        return new File.create(parent, file.path, file.contents, file.meta);
      });

      this.folders = separated.folder.map(function(folder) {
        return new Folder.create(parent, folder.path, folder.meta, folder.children);
      });

      this.files.sort(byName);
      this.folders.sort(byName);
    }

    RamlFolder.prototype.createFolder = function(name) {
      var parentFolder = this,
          newPath = fullPathFrom(this.path, name),
          folder = Folder.create(parentFolder, newPath);

      parentFolder.folders.push(folder);
      parentFolder.folders.sort(byName);

      function returnFolder() {
        return folder;
      }

      return fileSystem.createFolder(newPath).then(returnFolder, handleErrorFor(folder));
    };

    RamlFolder.prototype.removeFolder = function(folder) {
      var parentFolder = this, index = parentFolder.folders.indexOf(folder);
      if (index !== -1) {
        parentFolder.folders.splice(index, 1);
      }

      function returnFolder() {
        Object.freeze(folder);
        return folder;
      }

      return fileSystem.remove(folder.path).then(returnFolder, handleErrorFor(folder));
    };

    RamlFolder.prototype.createFile = function(name) {
      var newPath = fullPathFrom(this.path, name),
          file = File.create(this, newPath, ramlSnippets.getEmptyRaml());

      if (file.extension !== 'raml') {
        file.contents = '';
      }

      this.files.push(file);
      this.files.sort(byName);
      $rootScope.$broadcast('event:raml-editor-file-created', file);

      return file;
    };

    RamlFolder.prototype.renameFile = function(file, newName) {
      var newPath = fullPathFrom(this.path, newName),
          renamed = file.persisted ? fileSystem.rename(file.path, newPath) : $q.when();

      file.path = newPath;
      file.name = newName;

      function returnFile() {
        return file;
      }

      return renamed.then(returnFile, handleErrorFor(file));
    };

    RamlFolder.prototype.removeFile = function(file) {
      var index = this.files.indexOf(file), persisted = file.persisted;
      if (index !== -1) {
        this.files.splice(index, 1);
      }
      file.persisted = file.dirty = false;
      $rootScope.$broadcast('event:raml-editor-file-removed', file);

      function returnFile() {
        Object.freeze(file);
        return file;
      }

      var removed = persisted ? fileSystem.remove(file.path) : $q.when();
      return removed.then(returnFile, handleErrorFor(file));
    };

    RamlFolder.prototype.containedFiles = function() {
      return this.folders.reduce(function(files, folder) {
        return files.concat(folder.containedFiles());
      }, this.files);
    };

    RamlFolder.prototype.fileOrFolderNamed = function(name) {
      function named(item) {
        return item.name.toLowerCase() === name.toLowerCase();
      }

      return this.folders.filter(named)[0] || this.files.filter(named)[0];
    };

    RamlFolder.prototype.fileOrFolderAtPath = function(path) {
      var segments = path.split('/');

      var item = this.fileOrFolderNamed(segments[0]);
      if (!item || segments.length === 1) {
        return item;
      } else {
        segments.shift();
        return item.fileOrFolderAtPath(segments.join('/'));
      }
    };

    var Folder = {
      root: function(meta, contents) {
        var folder = new RamlFolder(meta, contents);
        folder.path = '/';
        folder.name = '/';

        return folder;
      },

      create: function(parent, path, meta, contents) {
        var folder = new RamlFolder(meta, contents);
        folder.path = sanitizePath(path);
        folder.name = folder.path.slice(folder.path.lastIndexOf('/') + 1);
        folder.remove = function() {
          return parent.removeFolder(this);
        };

        return folder;
      },
    };

    return Folder;
  };
})();
