describe('ramlEditorContextMenu', function() {
  'use strict';

  var scope, el, sandbox, contextMenu, file;

  var createScope = inject(function createScope($rootScope) {
    scope = $rootScope.$new();
    scope.homeDirectory = { path: '/' };
    scope.registerContextMenu = function(cm) {
      contextMenu = cm;
    };
  });

  function compileContextMenu() {
    el = compileTemplate('<raml-editor-context-menu></raml-editor-context-menu>', scope);
    document.body.appendChild(el[0]);
  }

  angular.module('contextMenuTest', ['ramlEditorApp', 'testFs', 'utils']);
  beforeEach(module('contextMenuTest'));

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    createScope();
    compileContextMenu();
  });

  afterEach(function() {
    scope.$destroy();
    file = el = scope = contextMenu = undefined;
    sandbox.restore();
  });

  describe('when open', function() {
    var scrollDisableStub, scrollEnableStub;

    beforeEach(inject(function(scroll) {
      var event = {
        stopPropagation: angular.noop,
        target: {}
      };

      file = {
        name: 'filename.raml'
      };

      scrollDisableStub = sinon.stub(scroll, 'disable');
      scrollEnableStub = sinon.stub(scroll, 'enable');
      contextMenu.open(event, file);
      scope.$digest();
    }));

    it('disables scroll', function() {
      scrollDisableStub.should.have.been.called;
    });

    describe('closing', function() {
      it('closes when clicking on the page', function(done) {
        el[0].getBoundingClientRect().height.should.not.eql(0);
        document.body.dispatchEvent(events.click());
        done();
        el[0].getBoundingClientRect().height.should.eql(0);
      });

      it('closes on pressing escape', function(done) {
        var event = events.keydown(27);
        el[0].getBoundingClientRect().height.should.not.eql(0);
        el[0].dispatchEvent(event);
        done();
        el[0].getBoundingClientRect().height.should.eql(0);
      });

      it('enables scroll', function(done) {
        document.body.dispatchEvent(events.click());
        done();
        scrollEnableStub.should.have.been.called;
      });
    });
  });
});
