(function() {
  'use strict';

  RAML.FileSystem.createFolderClass = function(File, $q, $rootScope, fileSystem, ramlSnippets) {
    var TRAILING_SLASH_DETECTOR = /\/$/, root;

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

    function removeFile(file, folder) {
      var index = folder.files.indexOf(file);
      if (index !== -1) {
        folder.files.splice(index, 1);
      }
    }

    function insertFile(file, folder) {
      folder.files.push(file);
      folder.files.sort(byName);
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

      insertFile(file, this);
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
      var persisted = file.persisted;
      file.persisted = file.dirty = false;
      removeFile(file, this);
      $rootScope.$broadcast('event:raml-editor-file-removed', file);

      function returnFile() {
        Object.freeze(file);
        return file;
      }

      var removed = persisted ? fileSystem.remove(file.path) : $q.when();
      return removed.then(returnFile, handleErrorFor(file));
    };

    RamlFolder.prototype.moveFile = function(file, path) {
      var sourceFolder = this, destinationFolder, rename;

      destinationFolder = sourceFolder.fileOrFolderAtPath(path);
      if (!destinationFolder) {
        throw new Error('Unknown folder: ' + path);
      }

      var newPath = fullPathFrom(destinationFolder.path, file.name),
          movedFile = File.create(destinationFolder, newPath, file.contents, file);

      removeFile(file, sourceFolder);
      insertFile(movedFile, destinationFolder);

      function returnFile() {
        return movedFile;
      }

      if (file.persisted) {
        rename = fileSystem.rename(file.path, movedFile.path);
      } else {
        rename = $q.when();
      }

      return rename.then(returnFile, handleErrorFor(file));
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
      var lookupFolder = this, segments, item;

      if (path.indexOf('/') === 0) {
        path = path.slice(1);
        lookupFolder = root;
      }

      if (path.length === 0) {
        return lookupFolder;
      }

      segments = path.split('/');

      item = lookupFolder.fileOrFolderNamed(segments[0]);
      if (!item || segments.length === 1) {
        return item;
      } else {
        segments.shift();
        return item.fileOrFolderAtPath(segments.join('/'));
      }
    };

    var Folder = {
      root: function(meta, contents) {
        root = new RamlFolder(meta, contents);
        root.path = '/';
        root.name = '/';

        return root;
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

    root = Folder.root();

    return Folder;
  };
})();
