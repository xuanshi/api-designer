(function() {
  'use strict';
  function handleErrorFor(item) {
    return function markItemWithError(error) {
      item.error = error;
      return item;
    };
  }

  RAML.FileSystem.createFileClass = function(storage) {
    var FILE_EXTENSION_EXTRACTOR = /.*\.(.*)$/;
    function RamlFile(path, contents, options) {
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

    RamlFile.prototype.save = function() {
      var file = this;
      file.dirty = false;
      file.persisted = true;

      function returnFile() {
        return file;
      }

      function revertFile(msg) {
        file.dirty = true;
        file.persisted = false;

        return handleErrorFor(file)(msg);
      }

      return storage.save(file.path, file.contents).then(returnFile, revertFile);
    };

    RamlFile.prototype.load = function() {
      var file = this;

      function returnFile(contents) {
        file.contents = contents;
        return file;
      }

      return storage.load(file.path).then(returnFile, handleErrorFor(file));
    };

    return {
      create: function(parent, path, contents, options) {
        var file = new RamlFile(path, contents, options);
        file.remove = function() {
          return parent.removeFile(this);
        };

        return file;
      }
    };
  };
})();
