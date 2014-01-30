'use strict';

describe('ramlRepository.RamlFile', function() {
  beforeEach(module('fs'));

  beforeEach(inject(function(ramlRepository) {
    this.RamlFile = ramlRepository.RamlFile;
  }));

  describe('by default', function() {
    beforeEach(function() {
      this.file = new this.RamlFile('/path/to/file.raml', 'IVE GOT SOMETHING TO SAY');
    });

    it('is not persisted', function() {
      this.file.persisted.should.be.false;
    });

    it('is dirty', function() {
      this.file.dirty.should.be.true;
    });

    it('sets the  contents', function() {
      this.file.contents.should.eql('IVE GOT SOMETHING TO SAY');
    });

    it('sets a name based on the last path segment', function() {
      this.file.name.should.eql('file.raml');
    });

    it('sets an extension', function() {
      this.file.extension.should.eql('raml');
    });
  });

  describe('when the persisted option is provided', function() {
    beforeEach(function() {
      this.file = new this.RamlFile('/path/to/file.raml', 'IVE GOT SOMETHING TO SAY', { persisted: true });
    });

    it('sets persisted', function() {
      this.file.persisted.should.be.true;
    });

    it('sets dirty to the inverse of persisted', function() {
      this.file.dirty.should.be.false;
    });
  });

  describe('when the dirty option is provided', function() {
    beforeEach(function() {
      this.file = new this.RamlFile('/path/to/file.raml', 'IVE GOT SOMETHING TO SAY', { dirty: false });
    });

    it('sets dirty', function() {
      this.file.dirty.should.be.false;
    });
  });
});
