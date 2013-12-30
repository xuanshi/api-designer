'use strict';

angular.module('ramlEditorApp')
  .controller('ramlEditorMockingService', function ($window, $confirm, $scope, mockingService) {
    var editor = $scope.editor;

    $scope.addBaseUri = function addBaseUri() {
      var baseUriLine = 'baseUri: ' + $scope.mock.baseUri;
      var lineNumber  = void(0);
      var line        = void(0);

      if (editor.getValue().trim().length === 0) {
        editor.setLine(0, baseUriLine);
        return;
      }

      for (lineNumber = editor.lineCount() - 1; lineNumber >= 0; lineNumber--) {
        line = editor.getLine(lineNumber).trim();

        if (line.indexOf('baseUri: ') === 0) {
          if (line === baseUriLine) {
            return;
          }

          line = '#' + line;
          break;
        }

        if (line.indexOf('title: ') === 0) {
          break;
        }

        if (line.indexOf('---') === 0) {
          break;
        }

        if (line.indexOf('#%RAML 0.8') === 0) {
          break;
        }
      }

      editor.setLine(lineNumber, line + '\n' + baseUriLine);
    };

    $scope.removeBaseUri = function removeBaseUri() {
      var baseUriLine = 'baseUri: ' + $scope.mock.baseUri;
      var lineNumber  = void(0);
      var line        = void(0);

      // trying to find mocked baseUri
      // and remove it
      for (lineNumber = 0; lineNumber < editor.lineCount(); lineNumber++) {
        line = editor.getLine(lineNumber).trim();

        if (line === baseUriLine) {
          editor.removeLine(lineNumber);
          break;
        }
      }

      // trying to find previous commented out baseUri
      // and uncomment it
      for (lineNumber = Math.min(lineNumber, editor.lineCount() - 1); lineNumber >= 0; lineNumber--) {
        line = editor.getLine(lineNumber).trim();

        if (line.indexOf('#') === 0 && line.slice(1).trim().indexOf('baseUri: ') === 0) {
          editor.setLine(lineNumber, line.slice(1).trim());
          break;
        }
      }
    };

    $scope.enableMockingService = function enableMockingService() {
      var mock;
      return $scope.file.loadMetadata()
        .then(function success(metadata) {
          if (metadata.mock) {
            mock = metadata.mock;
            return mock;
          }

          return mockingService.createMock({raml: editor.getValue()})
            .then(function success($mock) {
              return $scope.file.saveMetadataKey('mock', (mock = $mock));
            })
          ;
        })
        .then(function success() {
          $scope.mock = mock;
        })
        .then(function success() {
          $scope.addBaseUri();
        })
      ;
    };

    $scope.disableMockingService = function disableMockingService() {
      var mock;
      return $scope.file.loadMetadata()
        .then(function success(metadata) {
          return mockingService.deleteMock((mock = metadata.mock));
        })
        .then(function success() {
          return $scope.file.saveMetadataKey('mock', null);
        })
        .then(function success() {
          $scope.removeBaseUri();
          $scope.mock = null;
        })
      ;
    };

    $scope.toggleMockingService = function toggleMockingService() {
      var promise;
      var loading;

      if ($scope.mock) {
        promise = $scope.disableMockingService($scope.file);
        loading = 'Disabling Mocking Service...';
      } else {
        promise = $scope.enableMockingService($scope.file);
        loading = 'Enabling Mocking Service...';
      }

      if (promise) {
        $scope.loading = loading;
        promise.finally(function onFinally() {
          $scope.loading = false;
        });
      }
    };

    $scope.$on('fileCreated', function fileCreated() {
      $scope.mock = null;
    });

    $scope.$on('fileLoaded', function fileLoaded() {
      $scope.mock    = null;
      $scope.loading = 'Loading Mocking Service...';

      $scope.file.loadMetadata()
        .then(function success(metadata) {
          if (metadata.mock) {
            return mockingService.getMock(metadata.mock);
          }
        })
        .then(function success(mock) {
          if (!mock) {
            return;
          }

          if ($scope.file.contents === mock.raml) {
            return mock;
          }

          mock.raml = $scope.file.contents;

          return mockingService.updateMock(mock)
            .then(function success() {
              return mock;
            })
          ;
        })
        .then(function success(mock) {
          $scope.mock    = mock;
          $scope.loading = false;
        })
        .finally(function onFinally() {
          $scope.loading = false;
        })
      ;
    });

    $scope.$on('fileParsed', function fileParsed() {
      if ($scope.mock && $scope.mock.raml !== editor.getValue()) {
        $scope.mock.raml = editor.getValue();
        $scope.loading   = 'Updating Mocking Service...';

        mockingService.updateMock($scope.mock)
          .then(function success() {
            return $scope.file.saveMetadataKey('mock', $scope.mock);
          })
          .finally(function onFinally() {
            $scope.loading = false;
          })
        ;
      }
    });
  })
;
