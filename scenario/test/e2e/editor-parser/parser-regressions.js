'use strict';
var AssertsHelper = require('../../lib/asserts-helper.js').AssertsHelper;
var EditorHelper = require('../../lib/editor-helper.js').EditorHelper;
var ShelfHelper = require('../../lib/shelf-helper.js').ShelfHelper;
describe('parser ',function(){
  var designerAsserts= new AssertsHelper();
  var editor= new EditorHelper();
  var shelf = new ShelfHelper();

  describe('alias', function(){

    it('found undefined alias', function(){
      var definition = [
        '#%RAML 0.8 ',
        'title: My api',
        '/res1: &res1',
        '  description: this is res1 description',
        '  /res2: *res'
      ].join('\\n');
      editor.setValue(definition);
      designerAsserts.parserError('5','found undefined alias res');
    });

    xit('expected alphabetic or numeric character but found ', function(){ //https://www.pivotaltracker.com/story/show/63038252
      var definition = [
        '#%RAML 0.8 ',
        'title: My api',
        'version: v1',
        '/res1: ',
        '  description: this is res1 description',
        '  displayName: resource 1     ',
        '  get: &'
      ].join('\\n');
      editor.setValue(definition);
      designerAsserts.parserError('7','expected alphabetic or numeric character but found ');
    });
  });//alias

  var methods = shelf.elemResourceLevelMethods;

  methods.forEach(function(method){
    it(method+' resource - responses null - should not displayed parser error', function(){ //https://www.pivotaltracker.com/story/show/62857424
      var definition = [
        '#%RAML 0.8',
        '---',
        'title: GitHub API',
        'version: v3',
        'mediaType:  application/json',
        '/res:',
        '  '+method+':',
        '    responses: '
      ].join('\\n');
      editor.setValue(definition);
      expect(editor.IsParserErrorDisplayed()).toBe(false);
    });
  });

  methods.forEach(function(method){
    it(method+' resourceType - responses null - should not displayed parser error', function(){ //https://www.pivotaltracker.com/story/show/62857424
      var definition = [
        '#%RAML 0.8',
        '---',
        'title: GitHub API',
        'version: v3',
        'mediaType:  application/json',
        'resourceTypes:',
        '  - hola:',
        '      '+method+':',
        '        responses:',
        '/res:',
        '  type: hola'
      ].join('\\n');
      editor.setValue(definition);
      expect(editor.IsParserErrorDisplayed()).toBe(false);
    });
  });

  methods.forEach(function(method){
    it(method+' trait resource level  - responses null - should not displayed parser error', function(){ //https://www.pivotaltracker.com/story/show/62857424
      var definition = [
        '#%RAML 0.8',
        '---',
        'title: GitHub API',
        'version: v3',
        'mediaType:  application/json',
        'traits:',
        '  - chau:',
        '      responses:',
        '/res:',
        '  is: [chau]',
        '  '+method+':'
      ].join('\\n');
      editor.setValue(definition);
      expect(editor.IsParserErrorDisplayed()).toBe(false);
    });
  });

  methods.forEach(function(method){
    it(method+' trait method level  - responses null - should not displayed parser error', function(){ //https://www.pivotaltracker.com/story/show/62857424
      var definition = [
        '#%RAML 0.8',
        '---',
        'title: GitHub API',
        'version: v3',
        'mediaType:  application/json',
        'traits:',
        '  - chau:',
        '      responses:',
        '/res:',
        '  '+method+':',
        '    is: [chau]'
      ].join('\\n');
      editor.setValue(definition);
      expect(editor.IsParserErrorDisplayed()).toBe(false);
    });
  });



});// parser