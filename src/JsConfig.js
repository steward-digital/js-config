/*global console*/

var JsConfig = (function () {
  "use strict";
  function loop(arr, callback) {
    var key, returnVal;
    for (key in arr) {
      if (arr.hasOwnProperty(key)) {
        returnVal = callback(arr[key], key);
        if (returnVal === false) {
          return;
        }
      }
    }
  }

  function clone(original) {
    var newObj = {};
    if (typeof original !== 'object' || original === undefined) {
      return original;
    }
    loop(original, function (val, key) {
      newObj[key] = val;
    });
    return newObj;
  }

  function eachPart(pathAsString, object, callback) {
    var currentObj = object, arr = pathAsString.split('.');
    loop(arr, function (name, pos) {
      var returnValue = callback(currentObj, name, arr.length - pos - 1 === 0);
      currentObj = currentObj[name];
      return returnValue;
    });
  }

  function JsConfig(initialConfig) {
    if (!this || this.constructor !== JsConfig) {
      throw new Error('JsConfig is an object not a function, you must use `new JsConfig();`');
    }
    var defaults = {}, data = initialConfig === undefined ? {} : clone(initialConfig);

    function addToValueObject(key, value, object) {
      eachPart(key, object, function (parent, name, isEnd) {
        parent[name] = isEnd ? clone(value) : (parent[name] || {});
      });
    }

    function lookupKeyInData(key, obj) {
      var answer;
      eachPart(key, obj, function (parent, name, isEnd) {
        if (isEnd) {
          answer = parent[name];
        } else if (parent[name] === undefined) {
          return false;
        }
      });
      return answer;
    }

    this.set = function (key, value) {
      addToValueObject(key, value, data);
    };

    this.setDefault = function (key, value) {
      addToValueObject(key, value, defaults);
    };

    this.get = function (key) {
      var answer = lookupKeyInData(key, data);
      if (answer === undefined) {
        answer = lookupKeyInData(key, defaults);
      }
      return clone(answer);
    };

    this.assertExists = function () {
      var missingKeys = [], self = this, i, key;
      for (i = 0; i < arguments.length; i += 1) {
        key = arguments[i];
        if (self.get(key) === undefined) {
          missingKeys.push(key);
        }
      }
      if (missingKeys.length > 0) {
        throw new Error([
          'JsConfig: missing key',
          (missingKeys.length > 1 ? 's' : ''),
          ': "',
          missingKeys.join('", "'),
          '"'].join(''));
      }
    };

    this.getAll = function () {
      var output = clone(defaults);

      function updateWithOverrides(data, output) {
        loop(data, function (value, key) {
          if (typeof value !== 'object') {
            output[key] = value;
          } else {
            output[key] = output[key] || {};
            updateWithOverrides(data[key], output[key]);
          }
        });
      }

      updateWithOverrides(data, output);
      return output;
    };

    this.remove = function (key) {
      if (data.hasOwnProperty(key)) {
        delete data[key];
      }
    };

    this.readFromObject = function (obj, items) {
      var self = this;
      function deepLoop(parent, combinedName) {
        loop(parent, function (value, key) {
          var name = combinedName ? combinedName + '.' : '';
          name += key;
          if (typeof value === 'object') {
            deepLoop(value, name);
          } else {
            if (obj.hasOwnProperty(value)) {
              self.set(name, obj[value]);
            }
          }
        });
      }

      deepLoop(items || {});
    };
  }

  JsConfig.readFromObject = function () {
    var output = new JsConfig();
    output.readFromObject.apply(output, arguments);
    return output;
  };

  return JsConfig;
}());

if (typeof module === 'object') {
  module.exports = JsConfig;
}
