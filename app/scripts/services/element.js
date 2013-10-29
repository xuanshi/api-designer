'use strict';

angular.module('raml')
  .factory('elements', function (config) {
    var service = {};

    function Element (configKey, properties) {
      this.configKey = configKey;
      this.properties = properties || [];
      this.init();
    }

    Element.protoype = {
      init: function () {
        var self = this;
        this.properties.forEach(function (property) {
          if (property.persistent) {
            self[property.name] = config.get(property.name, property.defaultValue);
          }
        });
      },
      propertyKey: function (name) {
        return this.configKey + '.' + name;
      },
      getPropertyConfig: function (name) {
        var found = this.properties.filter(function (property) {
            return property.name === name;
          });
        return found.length ? found[0] : null;
      },
      set: function (property, value) {
        var propConfig = this.getPropertyConfig(property);
        this[property] = value;
        if (propConfig.persistent) {
          config.set(property, this[property]);
        }
      },
      get: function (property, defaultValue) {
        var propConfig = this.getPropertyConfig(property);
        if (propConfig.persistent) {
          this[property] = config.get(property, defaultValue || propConfig.defaultValue);
        }
        return this[property];
      },
      toggle: function (property) {
        this.set(property, !this[property]);
        return this[property];
      },
      increase: function (property, value) {
        value = value || 1;
        this.set(property, this[property] + value);
        return this[property];
      },
      decrease: function (property, value) {
        value = value || 1;
        this.set(property, this[property] - value);
        return this[property];
      }
    };

    service.addElement = function (name, properties) {
      service[name] = new Element(name, properties);
      return service[name];
    };

    return service;
  });
