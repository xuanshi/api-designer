(function() {
  'use strict';

  angular.module('ramlEditorApp').directive('ramlEditorContextMenu', function($window, scroll) {
    function outOfWindow(el) {
      var rect = el.getBoundingClientRect();
      return !(rect.top >= 0 &&
               rect.left >= 0 &&
               rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
               rect.right <= (window.innerWidth || document.documentElement.clientWidth));
    }

    return {
      restrict: 'E',
      templateUrl: 'views/raml-editor-context-menu.tmpl.html',
      link: function(scope, element) {
        var onClose;

        function positionMenu(element, offsetTarget) {
          var left = offsetTarget.offsetLeft + 0.5 * offsetTarget.offsetWidth,
              top = offsetTarget.offsetTop + 0.5 * offsetTarget.offsetHeight;

          var menuContainer = angular.element(element[0].children[0]);
          menuContainer.css('left', left + 'px');
          menuContainer.css('top', top + 'px');

          setTimeout(function() {
            if (outOfWindow(menuContainer[0])) {
              menuContainer.css('top', top - menuContainer[0].offsetHeight + 'px');
            }
          }, 0);
        }

        function close() {
          scroll.enable();
          scope.$apply(function() {
            scope.opened = false;

            $window.removeEventListener('click', close);
            $window.removeEventListener('keydown', closeOnEscape);
          });

          if (onClose) {
            scope.$apply(onClose);
            onClose = undefined;
          }
        }

        function closeOnEscape(e) {
          if (e.which === 27) {
            e.preventDefault();
            close();
          }
        }

        var contextMenuController = {
          open: function(event, actions, closeCallback) {
            event.stopPropagation();
            scroll.disable();
            scope.actions = actions;

            // on close and stpp propagation
            if (onClose) {
              onClose();
            }
            onClose = closeCallback;

            positionMenu(element, event.target);
            $window.addEventListener('click', close);
            $window.addEventListener('keydown', closeOnEscape);

            scope.opened = true;
          }
        };

        scope.registerContextMenu(contextMenuController);
      },

      scope: true
    };
  });
})();
