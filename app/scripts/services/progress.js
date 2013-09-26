'use strict';

angular.module('raml')
  .factory('enableProgress', function (config) {
    return config.get('progress');
  })
  .factory('progress', function (enableProgress, $rootScope, $timeout) {

    if (!enableProgress) {
      return function () {};
    }

    $rootScope.progressValue = 0;

    var oldTimeout;
    function to(x, y) {

      if (!y) {
        y = 50;
      }

      if (oldTimeout) {
        $timeout.cancel(oldTimeout);
      }

      $rootScope.progressValue = Number($rootScope.progressValue) + 5;

      if ( $rootScope.progressValue  >= x ) {
        return;
      } else {
        oldTimeout = $timeout(function () {
          to(x, y);
        }, y, true);
      }

    }
    
    return to;

  });
