(function() {
  'use strict';

  window.promise = {
    resolved: function(value) {
      return {
        then: function(success) {
          return promise.resolved(success(value));
        }
      };
    },
    rejected: function(error) {
      return {
        then: function(success, failure) {
          if (typeof failure === 'function') {
            return promise.rejected(failure(error));
          }
        }
      };
    },
    stub: function() {
      return {
        then: function() {}
      };
    }
  };
})();
