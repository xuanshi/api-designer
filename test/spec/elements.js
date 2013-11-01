'use strict';

var mockConfig;
var elements;
var property1 = { name: 'theme', value: 'dark', defaultValue: 'light', persistent: true };
var property2 = { name: 'lastFile', value: 'api.raml', defaultValue: null, persistent: true };
var property3 = { name: 'expanded', value: null, defaultValue: false, persistent: false };
var property4 = { name: 'error', value: null, defaultValue: null, persistent: false };


describe('Configurable Elements Service', function () {

  beforeEach(function () {
    module('raml');

    module(function ($provide) {
      $provide.decorator('config', function () {
        return {
          get: sinon.stub(),
          set: sinon.stub(),
          save: sinon.stub()
        };
      });
    });

    /* jshint camelcase: false */
    inject(function (_config_, _elements_) {
      mockConfig = _config_;
      elements = _elements_;
    });
    /* jshint camelcase: true */
  });

  describe('Initialization', function () {
    it('should initialize an element with values from the configuration', function () {
      // Arrange
      var propertyConfig = [ property1, property2, property3, property4 ]; // property3 y 4 are non persistent
      mockConfig.get.withArgs(property1.name).returns('prop1 from config');
      mockConfig.get.withArgs(property2.name).returns('prop2 from config');

      // Act
      elements.addElement('editor', propertyConfig);

      // Assert
      elements.editor.should.be.ok;
      should.equal(elements.editor[property1.name], 'prop1 from config');
      should.equal(elements.editor[property2.name], 'prop2 from config');
      should.equal(elements.editor[property3.name], property3.defaultValue);
      should.equal(elements.editor[property4.name], property4.defaultValue);
      mockConfig.get.calledWith(property3.name).should.not.be.ok;
      mockConfig.get.calledWith(property4.name).should.not.be.ok;
    });
  });

  describe('Setting values', function () {
    it('should allow to set values for non persistant properties', function () {
      // Arrange
      var propertyConfig = [ { name: 'theme', persistent: false } ];
      elements.addElement('editor', propertyConfig);

      // Act
      elements.editor.set('theme', 'dark');

      // Assert
      elements.editor.theme.should.be.equal('dark');
      mockConfig.set.calledWith('theme').should.not.be.ok;
    });

    it('should save configuration when setting persistent properties', function () {
      // Arrange
      var propertyConfig = [ { name: 'theme', persistent: true } ];
      elements.addElement('editor', propertyConfig);

      // Act
      elements.editor.set('theme', 'dark');

      // Assert
      elements.editor.theme.should.be.equal('dark');
      mockConfig.set.calledWith('theme').should.be.ok;
    });

    it('should allow to toggle boolean values', function () {
      // Arrange
      var propertyConfig = [ { name: 'collapsed', persistent: false } ];
      elements.addElement('editor', propertyConfig);
      elements.editor.collapsed = true;

      // Act
      elements.editor.toggle('collapsed');

      // Assert
      elements.editor.collapsed.should.be.equal(false);
      mockConfig.set.calledWith('collapsed').should.not.be.ok;
    });

    it('should allow to toggle persistent values', function () {
      // Arrange
      var propertyConfig = [ { name: 'collapsed', persistent: true } ];
      elements.addElement('editor', propertyConfig);
      elements.editor.collapsed = true;

      // Act
      elements.editor.toggle('collapsed');

      // Assert
      elements.editor.collapsed.should.be.equal(false);
      mockConfig.set.calledWith('collapsed').should.be.ok;
    });

    it('should allow to increase values', function () {
      // Arrange
      var propertyConfig = [ { name: 'openFiles', persistent: false } ];
      elements.addElement('editor', propertyConfig);
      elements.editor.openFiles = 1;

      // Act
      elements.editor.increase('openFiles');

      // Assert
      elements.editor.openFiles.should.be.equal(2);
      mockConfig.set.calledWith('openFiles').should.not.be.ok;
    });

    it('should allow to decrease values', function () {
      // Arrange
      var propertyConfig = [ { name: 'openFiles', persistent: false } ];
      elements.addElement('editor', propertyConfig);
      elements.editor.openFiles = 1;

      // Act
      elements.editor.decrease('openFiles');

      // Assert
      elements.editor.openFiles.should.be.equal(0);
      mockConfig.set.calledWith('openFiles').should.not.be.ok;
    });
  });

});
