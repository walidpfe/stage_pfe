/*  Prototype JavaScript framework, version 1.7
 *  (c) 2005-2010 Sam Stephenson
 *
 *  Prototype is freely distributable under the terms of an MIT-style license.
 *  For details, see the Prototype web site: http://www.prototypejs.org/
 *
 *--------------------------------------------------------------------------*/

var Prototype = {

  Version: '1.7',

  Browser: (function(){
    var ua = navigator.userAgent;
    var isOpera = Object.prototype.toString.call(window.opera) == '[object Opera]';
    return {
      IE:             !!window.attachEvent && !isOpera,
      Opera:          isOpera,
      WebKit:         ua.indexOf('AppleWebKit/') > -1,
      Gecko:          ua.indexOf('Gecko') > -1 && ua.indexOf('KHTML') === -1,
      MobileSafari:   /Apple.*Mobile/.test(ua)
    }
  })(),

  BrowserFeatures: {
    XPath: !!document.evaluate,

    SelectorsAPI: !!document.querySelector,

    ElementExtensions: (function() {
      var constructor = window.Element || window.HTMLElement;
      return !!(constructor && constructor.prototype);
    })(),
    SpecificElementExtensions: (function() {
      if (typeof window.HTMLDivElement !== 'undefined')
        return true;

      var div = document.createElement('div'),
          form = document.createElement('form'),
          isSupported = false;

      if (div['__proto__'] && (div['__proto__'] !== form['__proto__'])) {
        isSupported = true;
      }

      div = form = null;

      return isSupported;
    })()
  },

  ScriptFragment: '<script[^>]*>([\\S\\s]*?)<\/script>',
  JSONFilter: /^\/\*-secure-([\s\S]*)\*\/\s*$/,

  emptyFunction: function() { },

  K: function(x) { return x }
};

if (Prototype.Browser.MobileSafari)
  Prototype.BrowserFeatures.SpecificElementExtensions = false;


var Abstract = { };


var Try = {
  these: function() {
    var returnValue;

    for (var i = 0, length = arguments.length; i < length; i++) {
      var lambda = arguments[i];
      try {
        returnValue = lambda();
        break;
      } catch (e) { }
    }

    return returnValue;
  }
};

/* Based on Alex Arnell's inheritance implementation. */

var Class = (function() {

  var IS_DONTENUM_BUGGY = (function(){
    for (var p in { toString: 1 }) {
      if (p === 'toString') return false;
    }
    return true;
  })();

  function subclass() {};
  function create() {
    var parent = null, properties = $A(arguments);
    if (Object.isFunction(properties[0]))
      parent = properties.shift();

    function klass() {
      this.initialize.apply(this, arguments);
    }

    Object.extend(klass, Class.Methods);
    klass.superclass = parent;
    klass.subclasses = [];

    if (parent) {
      subclass.prototype = parent.prototype;
      klass.prototype = new subclass;
      parent.subclasses.push(klass);
    }

    for (var i = 0, length = properties.length; i < length; i++)
      klass.addMethods(properties[i]);

    if (!klass.prototype.initialize)
      klass.prototype.initialize = Prototype.emptyFunction;

    klass.prototype.constructor = klass;
    return klass;
  }

  function addMethods(source) {
    var ancestor   = this.superclass && this.superclass.prototype,
        properties = Object.keys(source);

    if (IS_DONTENUM_BUGGY) {
      if (source.toString != Object.prototype.toString)
        properties.push("toString");
      if (source.valueOf != Object.prototype.valueOf)
        properties.push("valueOf");
    }

    for (var i = 0, length = properties.length; i < length; i++) {
      var property = properties[i], value = source[property];
      if (ancestor && Object.isFunction(value) &&
          value.argumentNames()[0] == "$super") {
        var method = value;
        value = (function(m) {
          return function() { return ancestor[m].apply(this, arguments); };
        })(property).wrap(method);

        value.valueOf = method.valueOf.bind(method);
        value.toString = method.toString.bind(method);
      }
      this.prototype[property] = value;
    }

    return this;
  }

  return {
    create: create,
    Methods: {
      addMethods: addMethods
    }
  };
})();
(function() {

  var _toString = Object.prototype.toString,
      NULL_TYPE = 'Null',
      UNDEFINED_TYPE = 'Undefined',
      BOOLEAN_TYPE = 'Boolean',
      NUMBER_TYPE = 'Number',
      STRING_TYPE = 'String',
      OBJECT_TYPE = 'Object',
      FUNCTION_CLASS = '[object Function]',
      BOOLEAN_CLASS = '[object Boolean]',
      NUMBER_CLASS = '[object Number]',
      STRING_CLASS = '[object String]',
      ARRAY_CLASS = '[object Array]',
      DATE_CLASS = '[object Date]',
      NATIVE_JSON_STRINGIFY_SUPPORT = window.JSON &&
        typeof JSON.stringify === 'function' &&
        JSON.stringify(0) === '0' &&
        typeof JSON.stringify(Prototype.K) === 'undefined';

  function Type(o) {
    switch(o) {
      case null: return NULL_TYPE;
      case (void 0): return UNDEFINED_TYPE;
    }
    var type = typeof o;
    switch(type) {
      case 'boolean': return BOOLEAN_TYPE;
      case 'number':  return NUMBER_TYPE;
      case 'string':  return STRING_TYPE;
    }
    return OBJECT_TYPE;
  }

  function extend(destination, source) {
    for (var property in source)
      destination[property] = source[property];
    return destination;
  }

  function inspect(object) {
    try {
      if (isUndefined(object)) return 'undefined';
      if (object === null) return 'null';
      return object.inspect ? object.inspect() : String(object);
    } catch (e) {
      if (e instanceof RangeError) return '...';
      throw e;
    }
  }

  function toJSON(value) {
    return Str('', { '': value }, []);
  }

  function Str(key, holder, stack) {
    var value = holder[key],
        type = typeof value;

    if (Type(value) === OBJECT_TYPE && typeof value.toJSON === 'function') {
      value = value.toJSON(key);
    }

    var _class = _toString.call(value);

    switch (_class) {
      case NUMBER_CLASS:
      case BOOLEAN_CLASS:
      case STRING_CLASS:
        value = value.valueOf();
    }

    switch (value) {
      case null: return 'null';
      case true: return 'true';
      case false: return 'false';
    }

    type = typeof value;
    switch (type) {
      case 'string':
        return value.inspect(true);
      case 'number':
        return isFinite(value) ? String(value) : 'null';
      case 'object':

        for (var i = 0, length = stack.length; i < length; i++) {
          if (stack[i] === value) { throw new TypeError(); }
        }
        stack.push(value);

        var partial = [];
        if (_class === ARRAY_CLASS) {
          for (var i = 0, length = value.length; i < length; i++) {
            var str = Str(i, value, stack);
            partial.push(typeof str === 'undefined' ? 'null' : str);
          }
          partial = '[' + partial.join(',') + ']';
        } else {
          var keys = Object.keys(value);
          for (var i = 0, length = keys.length; i < length; i++) {
            var key = keys[i], str = Str(key, value, stack);
            if (typeof str !== "undefined") {
               partial.push(key.inspect(true)+ ':' + str);
             }
          }
          partial = '{' + partial.join(',') + '}';
        }
        stack.pop();
        return partial;
    }
  }

  function stringify(object) {
    return JSON.stringify(object);
  }

  function toQueryString(object) {
    return $H(object).toQueryString();
  }

  function toHTML(object) {
    return object && object.toHTML ? object.toHTML() : String.interpret(object);
  }

  function keys(object) {
    if (Type(object) !== OBJECT_TYPE) { throw new TypeError(); }
    var results = [];
    for (var property in object) {
      if (object.hasOwnProperty(property)) {
        results.push(property);
      }
    }
    return results;
  }

  function values(object) {
    var results = [];
    for (var property in object)
      results.push(object[property]);
    return results;
  }

  function clone(object) {
    return extend({ }, object);
  }

  function isElement(object) {
    return !!(object && object.nodeType == 1);
  }

  function isArray(object) {
    return _toString.call(object) === ARRAY_CLASS;
  }

  var hasNativeIsArray = (typeof Array.isArray == 'function')
    && Array.isArray([]) && !Array.isArray({});

  if (hasNativeIsArray) {
    isArray = Array.isArray;
  }

  function isHash(object) {
    return object instanceof Hash;
  }

  function isFunction(object) {
    return _toString.call(object) === FUNCTION_CLASS;
  }

  function isString(object) {
    return _toString.call(object) === STRING_CLASS;
  }

  function isNumber(object) {
    return _toString.call(object) === NUMBER_CLASS;
  }

  function isDate(object) {
    return _toString.call(object) === DATE_CLASS;
  }

  function isUndefined(object) {
    return typeof object === "undefined";
  }

  extend(Object, {
    extend:        extend,
    inspect:       inspect,
    toJSON:        NATIVE_JSON_STRINGIFY_SUPPORT ? stringify : toJSON,
    toQueryString: toQueryString,
    toHTML:        toHTML,
    keys:          Object.keys || keys,
    values:        values,
    clone:         clone,
    isElement:     isElement,
    isArray:       isArray,
    isHash:        isHash,
    isFunction:    isFunction,
    isString:      isString,
    isNumber:      isNumber,
    isDate:        isDate,
    isUndefined:   isUndefined
  });
})();
Object.extend(Function.prototype, (function() {
  var slice = Array.prototype.slice;

  function update(array, args) {
    var arrayLength = array.length, length = args.length;
    while (length--) array[arrayLength + length] = args[length];
    return array;
  }

  function merge(array, args) {
    array = slice.call(array, 0);
    return update(array, args);
  }

  function argumentNames() {
    var names = this.toString().match(/^[\s\(]*function[^(]*\(([^)]*)\)/)[1]
      .replace(/\/\/.*?[\r\n]|\/\*(?:.|[\r\n])*?\*\//g, '')
      .replace(/\s+/g, '').split(',');
    return names.length == 1 && !names[0] ? [] : names;
  }

  function bind(context) {
    if (arguments.length < 2 && Object.isUndefined(arguments[0])) return this;
    var __method = this, args = slice.call(arguments, 1);
    return function() {
      var a = merge(args, arguments);
      return __method.apply(context, a);
    }
  }

  function bindAsEventListener(context) {
    var __method = this, args = slice.call(arguments, 1);
    return function(event) {
      var a = update([event || window.event], args);
      return __method.apply(context, a);
    }
  }

  function curry() {
    if (!arguments.length) return this;
    var __method = this, args = slice.call(arguments, 0);
    return function() {
      var a = merge(args, arguments);
      return __method.apply(this, a);
    }
  }

  function delay(timeout) {
    var __method = this, args = slice.call(arguments, 1);
    timeout = timeout * 1000;
    return window.setTimeout(function() {
      return __method.apply(__method, args);
    }, timeout);
  }

  function defer() {
    var args = update([0.01], arguments);
    return this.delay.apply(this, args);
  }

  function wrap(wrapper) {
    var __method = this;
    return function() {
      var a = update([__method.bind(this)], arguments);
      return wrapper.apply(this, a);
    }
  }

  function methodize() {
    if (this._methodized) return this._methodized;
    var __method = this;
    return this._methodized = function() {
      var a = update([this], arguments);
      return __method.apply(null, a);
    };
  }

  return {
    argumentNames:       argumentNames,
    bind:                bind,
    bindAsEventListener: bindAsEventListener,
    curry:               curry,
    delay:               delay,
    defer:               defer,
    wrap:                wrap,
    methodize:           methodize
  }
})());



(function(proto) {


  function toISOString() {
    return this.getUTCFullYear() + '-' +
      (this.getUTCMonth() + 1).toPaddedString(2) + '-' +
      this.getUTCDate().toPaddedString(2) + 'T' +
      this.getUTCHours().toPaddedString(2) + ':' +
      this.getUTCMinutes().toPaddedString(2) + ':' +
      this.getUTCSeconds().toPaddedString(2) + 'Z';
  }


  function toJSON() {
    return this.toISOString();
  }

  if (!proto.toISOString) proto.toISOString = toISOString;
  if (!proto.toJSON) proto.toJSON = toJSON;

})(Date.prototype);


RegExp.prototype.match = RegExp.prototype.test;

RegExp.escape = function(str) {
  return String(str).replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1');
};
var PeriodicalExecuter = Class.create({
  initialize: function(callback, frequency) {
    this.callback = callback;
    this.frequency = frequency;
    this.currentlyExecuting = false;

    this.registerCallback();
  },

  registerCallback: function() {
    this.timer = setInterval(this.onTimerEvent.bind(this), this.frequency * 1000);
  },

  execute: function() {
    this.callback(this);
  },

  stop: function() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  },

  onTimerEvent: function() {
    if (!this.currentlyExecuting) {
      try {
        this.currentlyExecuting = true;
        this.execute();
        this.currentlyExecuting = false;
      } catch(e) {
        this.currentlyExecuting = false;
        throw e;
      }
    }
  }
});
Object.extend(String, {
  interpret: function(value) {
    return value == null ? '' : String(value);
  },
  specialChar: {
    '\b': '\\b',
    '\t': '\\t',
    '\n': '\\n',
    '\f': '\\f',
    '\r': '\\r',
    '\\': '\\\\'
  }
});

Object.extend(String.prototype, (function() {
  var NATIVE_JSON_PARSE_SUPPORT = window.JSON &&
    typeof JSON.parse === 'function' &&
    JSON.parse('{"test": true}').test;

  function prepareReplacement(replacement) {
    if (Object.isFunction(replacement)) return replacement;
    var template = new Template(replacement);
    return function(match) { return template.evaluate(match) };
  }

  function gsub(pattern, replacement) {
    var result = '', source = this, match;
    replacement = prepareReplacement(replacement);

    if (Object.isString(pattern))
      pattern = RegExp.escape(pattern);

    if (!(pattern.length || pattern.source)) {
      replacement = replacement('');
      return replacement + source.split('').join(replacement) + replacement;
    }

    while (source.length > 0) {
      if (match = source.match(pattern)) {
        result += source.slice(0, match.index);
        result += String.interpret(replacement(match));
        source  = source.slice(match.index + match[0].length);
      } else {
        result += source, source = '';
      }
    }
    return result;
  }

  function sub(pattern, replacement, count) {
    replacement = prepareReplacement(replacement);
    count = Object.isUndefined(count) ? 1 : count;

    return this.gsub(pattern, function(match) {
      if (--count < 0) return match[0];
      return replacement(match);
    });
  }

  function scan(pattern, iterator) {
    this.gsub(pattern, iterator);
    return String(this);
  }

  function truncate(length, truncation) {
    length = length || 30;
    truncation = Object.isUndefined(truncation) ? '...' : truncation;
    return this.length > length ?
      this.slice(0, length - truncation.length) + truncation : String(this);
  }

  function strip() {
    return this.replace(/^\s+/, '').replace(/\s+$/, '');
  }

  function stripTags() {
    return this.replace(/<\w+(\s+("[^"]*"|'[^']*'|[^>])+)?>|<\/\w+>/gi, '');
  }

  function stripScripts() {
    return this.replace(new RegExp(Prototype.ScriptFragment, 'img'), '');
  }

  function extractScripts() {
    var matchAll = new RegExp(Prototype.ScriptFragment, 'img'),
        matchOne = new RegExp(Prototype.ScriptFragment, 'im');
    return (this.match(matchAll) || []).map(function(scriptTag) {
      return (scriptTag.match(matchOne) || ['', ''])[1];
    });
  }

  function evalScripts() {
    return this.extractScripts().map(function(script) { return eval(script) });
  }

  function escapeHTML() {
    return this.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function unescapeHTML() {
    return this.stripTags().replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
  }


  function toQueryParams(separator) {
    var match = this.strip().match(/([^?#]*)(#.*)?$/);
    if (!match) return { };

    return match[1].split(separator || '&').inject({ }, function(hash, pair) {
      if ((pair = pair.split('='))[0]) {
        var key = decodeURIComponent(pair.shift()),
            value = pair.length > 1 ? pair.join('=') : pair[0];

        if (value != undefined) value = decodeURIComponent(value);

        if (key in hash) {
          if (!Object.isArray(hash[key])) hash[key] = [hash[key]];
          hash[key].push(value);
        }
        else hash[key] = value;
      }
      return hash;
    });
  }

  function toArray() {
    return this.split('');
  }

  function succ() {
    return this.slice(0, this.length - 1) +
      String.fromCharCode(this.charCodeAt(this.length - 1) + 1);
  }

  function times(count) {
    return count < 1 ? '' : new Array(count + 1).join(this);
  }

  function camelize() {
    return this.replace(/-+(.)?/g, function(match, chr) {
      return chr ? chr.toUpperCase() : '';
    });
  }

  function capitalize() {
    return this.charAt(0).toUpperCase() + this.substring(1).toLowerCase();
  }

  function underscore() {
    return this.replace(/::/g, '/')
               .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
               .replace(/([a-z\d])([A-Z])/g, '$1_$2')
               .replace(/-/g, '_')
               .toLowerCase();
  }

  function dasherize() {
    return this.replace(/_/g, '-');
  }

  function inspect(useDoubleQuotes) {
    var escapedString = this.replace(/[\x00-\x1f\\]/g, function(character) {
      if (character in String.specialChar) {
        return String.specialChar[character];
      }
      return '\\u00' + character.charCodeAt().toPaddedString(2, 16);
    });
    if (useDoubleQuotes) return '"' + escapedString.replace(/"/g, '\\"') + '"';
    return "'" + escapedString.replace(/'/g, '\\\'') + "'";
  }

  function unfilterJSON(filter) {
    return this.replace(filter || Prototype.JSONFilter, '$1');
  }

  function isJSON() {
    var str = this;
    if (str.blank()) return false;
    str = str.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@');
    str = str.replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']');
    str = str.replace(/(?:^|:|,)(?:\s*\[)+/g, '');
    return (/^[\],:{}\s]*$/).test(str);
  }

  function evalJSON(sanitize) {
    var json = this.unfilterJSON(),
        cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
    if (cx.test(json)) {
      json = json.replace(cx, function (a) {
        return '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
      });
    }
    try {
      if (!sanitize || json.isJSON()) return eval('(' + json + ')');
    } catch (e) { }
    throw new SyntaxError('Badly formed JSON string: ' + this.inspect());
  }

  function parseJSON() {
    var json = this.unfilterJSON();
    return JSON.parse(json);
  }

  function include(pattern) {
    return this.indexOf(pattern) > -1;
  }

  function startsWith(pattern) {
    return this.lastIndexOf(pattern, 0) === 0;
  }

  function endsWith(pattern) {
    var d = this.length - pattern.length;
    return d >= 0 && this.indexOf(pattern, d) === d;
  }

  function empty() {
    return this == '';
  }

  function blank() {
    return /^\s*$/.test(this);
  }

  function interpolate(object, pattern) {
    return new Template(this, pattern).evaluate(object);
  }

  return {
    gsub:           gsub,
    sub:            sub,
    scan:           scan,
    truncate:       truncate,
    strip:          String.prototype.trim || strip,
    stripTags:      stripTags,
    stripScripts:   stripScripts,
    extractScripts: extractScripts,
    evalScripts:    evalScripts,
    escapeHTML:     escapeHTML,
    unescapeHTML:   unescapeHTML,
    toQueryParams:  toQueryParams,
    parseQuery:     toQueryParams,
    toArray:        toArray,
    succ:           succ,
    times:          times,
    camelize:       camelize,
    capitalize:     capitalize,
    underscore:     underscore,
    dasherize:      dasherize,
    inspect:        inspect,
    unfilterJSON:   unfilterJSON,
    isJSON:         isJSON,
    evalJSON:       NATIVE_JSON_PARSE_SUPPORT ? parseJSON : evalJSON,
    include:        include,
    startsWith:     startsWith,
    endsWith:       endsWith,
    empty:          empty,
    blank:          blank,
    interpolate:    interpolate
  };
})());

var Template = Class.create({
  initialize: function(template, pattern) {
    this.template = template.toString();
    this.pattern = pattern || Template.Pattern;
  },

  evaluate: function(object) {
    if (object && Object.isFunction(object.toTemplateReplacements))
      object = object.toTemplateReplacements();

    return this.template.gsub(this.pattern, function(match) {
      if (object == null) return (match[1] + '');

      var before = match[1] || '';
      if (before == '\\') return match[2];

      var ctx = object, expr = match[3],
          pattern = /^([^.[]+|\[((?:.*?[^\\])?)\])(\.|\[|$)/;

      match = pattern.exec(expr);
      if (match == null) return before;

      while (match != null) {
        var comp = match[1].startsWith('[') ? match[2].replace(/\\\\]/g, ']') : match[1];
        ctx = ctx[comp];
        if (null == ctx || '' == match[3]) break;
        expr = expr.substring('[' == match[3] ? match[1].length : match[0].length);
        match = pattern.exec(expr);
      }

      return before + String.interpret(ctx);
    });
  }
});
Template.Pattern = /(^|.|\r|\n)(#\{(.*?)\})/;

var $break = { };

var Enumerable = (function() {
  function each(iterator, context) {
    var index = 0;
    try {
      this._each(function(value) {
        iterator.call(context, value, index++);
      });
    } catch (e) {
      if (e != $break) throw e;
    }
    return this;
  }

  function eachSlice(number, iterator, context) {
    var index = -number, slices = [], array = this.toArray();
    if (number < 1) return array;
    while ((index += number) < array.length)
      slices.push(array.slice(index, index+number));
    return slices.collect(iterator, context);
  }

  function all(iterator, context) {
    iterator = iterator || Prototype.K;
    var result = true;
    this.each(function(value, index) {
      result = result && !!iterator.call(context, value, index);
      if (!result) throw $break;
    });
    return result;
  }

  function any(iterator, context) {
    iterator = iterator || Prototype.K;
    var result = false;
    this.each(function(value, index) {
      if (result = !!iterator.call(context, value, index))
        throw $break;
    });
    return result;
  }

  function collect(iterator, context) {
    iterator = iterator || Prototype.K;
    var results = [];
    this.each(function(value, index) {
      results.push(iterator.call(context, value, index));
    });
    return results;
  }

  function detect(iterator, context) {
    var result;
    this.each(function(value, index) {
      if (iterator.call(context, value, index)) {
        result = value;
        throw $break;
      }
    });
    return result;
  }

  function findAll(iterator, context) {
    var results = [];
    this.each(function(value, index) {
      if (iterator.call(context, value, index))
        results.push(value);
    });
    return results;
  }

  function grep(filter, iterator, context) {
    iterator = iterator || Prototype.K;
    var results = [];

    if (Object.isString(filter))
      filter = new RegExp(RegExp.escape(filter));

    this.each(function(value, index) {
      if (filter.match(value))
        results.push(iterator.call(context, value, index));
    });
    return results;
  }

  function include(object) {
    if (Object.isFunction(this.indexOf))
      if (this.indexOf(object) != -1) return true;

    var found = false;
    this.each(function(value) {
      if (value == object) {
        found = true;
        throw $break;
      }
    });
    return found;
  }

  function inGroupsOf(number, fillWith) {
    fillWith = Object.isUndefined(fillWith) ? null : fillWith;
    return this.eachSlice(number, function(slice) {
      while(slice.length < number) slice.push(fillWith);
      return slice;
    });
  }

  function inject(memo, iterator, context) {
    this.each(function(value, index) {
      memo = iterator.call(context, memo, value, index);
    });
    return memo;
  }

  function invoke(method) {
    var args = $A(arguments).slice(1);
    return this.map(function(value) {
      return value[method].apply(value, args);
    });
  }

  function max(iterator, context) {
    iterator = iterator || Prototype.K;
    var result;
    this.each(function(value, index) {
      value = iterator.call(context, value, index);
      if (result == null || value >= result)
        result = value;
    });
    return result;
  }

  function min(iterator, context) {
    iterator = iterator || Prototype.K;
    var result;
    this.each(function(value, index) {
      value = iterator.call(context, value, index);
      if (result == null || value < result)
        result = value;
    });
    return result;
  }

  function partition(iterator, context) {
    iterator = iterator || Prototype.K;
    var trues = [], falses = [];
    this.each(function(value, index) {
      (iterator.call(context, value, index) ?
        trues : falses).push(value);
    });
    return [trues, falses];
  }

  function pluck(property) {
    var results = [];
    this.each(function(value) {
      results.push(value[property]);
    });
    return results;
  }

  function reject(iterator, context) {
    var results = [];
    this.each(function(value, index) {
      if (!iterator.call(context, value, index))
        results.push(value);
    });
    return results;
  }

  function sortBy(iterator, context) {
    return this.map(function(value, index) {
      return {
        value: value,
        criteria: iterator.call(context, value, index)
      };
    }).sort(function(left, right) {
      var a = left.criteria, b = right.criteria;
      return a < b ? -1 : a > b ? 1 : 0;
    }).pluck('value');
  }

  function toArray() {
    return this.map();
  }

  function zip() {
    var iterator = Prototype.K, args = $A(arguments);
    if (Object.isFunction(args.last()))
      iterator = args.pop();

    var collections = [this].concat(args).map($A);
    return this.map(function(value, index) {
      return iterator(collections.pluck(index));
    });
  }

  function size() {
    return this.toArray().length;
  }

  function inspect() {
    return '#<Enumerable:' + this.toArray().inspect() + '>';
  }









  return {
    each:       each,
    eachSlice:  eachSlice,
    all:        all,
    every:      all,
    any:        any,
    some:       any,
    collect:    collect,
    map:        collect,
    detect:     detect,
    findAll:    findAll,
    select:     findAll,
    filter:     findAll,
    grep:       grep,
    include:    include,
    member:     include,
    inGroupsOf: inGroupsOf,
    inject:     inject,
    invoke:     invoke,
    max:        max,
    min:        min,
    partition:  partition,
    pluck:      pluck,
    reject:     reject,
    sortBy:     sortBy,
    toArray:    toArray,
    entries:    toArray,
    zip:        zip,
    size:       size,
    inspect:    inspect,
    find:       detect
  };
})();

function $A(iterable) {
  if (!iterable) return [];
  if ('toArray' in Object(iterable)) return iterable.toArray();
  var length = iterable.length || 0, results = new Array(length);
  while (length--) results[length] = iterable[length];
  return results;
}


function $w(string) {
  if (!Object.isString(string)) return [];
  string = string.strip();
  return string ? string.split(/\s+/) : [];
}

Array.from = $A;


(function() {
  var arrayProto = Array.prototype,
      slice = arrayProto.slice,
      _each = arrayProto.forEach; // use native browser JS 1.6 implementation if available

  function each(iterator, context) {
    for (var i = 0, length = this.length >>> 0; i < length; i++) {
      if (i in this) iterator.call(context, this[i], i, this);
    }
  }
  if (!_each) _each = each;

  function clear() {
    this.length = 0;
    return this;
  }

  function first() {
    return this[0];
  }

  function last() {
    return this[this.length - 1];
  }

  function compact() {
    return this.select(function(value) {
      return value != null;
    });
  }

  function flatten() {
    return this.inject([], function(array, value) {
      if (Object.isArray(value))
        return array.concat(value.flatten());
      array.push(value);
      return array;
    });
  }

  function without() {
    var values = slice.call(arguments, 0);
    return this.select(function(value) {
      return !values.include(value);
    });
  }

  function reverse(inline) {
    return (inline === false ? this.toArray() : this)._reverse();
  }

  function uniq(sorted) {
    return this.inject([], function(array, value, index) {
      if (0 == index || (sorted ? array.last() != value : !array.include(value)))
        array.push(value);
      return array;
    });
  }

  function intersect(array) {
    return this.uniq().findAll(function(item) {
      return array.detect(function(value) { return item === value });
    });
  }


  function clone() {
    return slice.call(this, 0);
  }

  function size() {
    return this.length;
  }

  function inspect() {
    return '[' + this.map(Object.inspect).join(', ') + ']';
  }

  function indexOf(item, i) {
    i || (i = 0);
    var length = this.length;
    if (i < 0) i = length + i;
    for (; i < length; i++)
      if (this[i] === item) return i;
    return -1;
  }

  function lastIndexOf(item, i) {
    i = isNaN(i) ? this.length : (i < 0 ? this.length + i : i) + 1;
    var n = this.slice(0, i).reverse().indexOf(item);
    return (n < 0) ? n : i - n - 1;
  }

  function concat() {
    var array = slice.call(this, 0), item;
    for (var i = 0, length = arguments.length; i < length; i++) {
      item = arguments[i];
      if (Object.isArray(item) && !('callee' in item)) {
        for (var j = 0, arrayLength = item.length; j < arrayLength; j++)
          array.push(item[j]);
      } else {
        array.push(item);
      }
    }
    return array;
  }

  Object.extend(arrayProto, Enumerable);

  if (!arrayProto._reverse)
    arrayProto._reverse = arrayProto.reverse;

  Object.extend(arrayProto, {
    _each:     _each,
    clear:     clear,
    first:     first,
    last:      last,
    compact:   compact,
    flatten:   flatten,
    without:   without,
    reverse:   reverse,
    uniq:      uniq,
    intersect: intersect,
    clone:     clone,
    toArray:   clone,
    size:      size,
    inspect:   inspect
  });

  var CONCAT_ARGUMENTS_BUGGY = (function() {
    return [].concat(arguments)[0][0] !== 1;
  })(1,2)

  if (CONCAT_ARGUMENTS_BUGGY) arrayProto.concat = concat;

  if (!arrayProto.indexOf) arrayProto.indexOf = indexOf;
  if (!arrayProto.lastIndexOf) arrayProto.lastIndexOf = lastIndexOf;
})();
function $H(object) {
  return new Hash(object);
};

var Hash = Class.create(Enumerable, (function() {
  function initialize(object) {
    this._object = Object.isHash(object) ? object.toObject() : Object.clone(object);
  }


  function _each(iterator) {
    for (var key in this._object) {
      var value = this._object[key], pair = [key, value];
      pair.key = key;
      pair.value = value;
      iterator(pair);
    }
  }

  function set(key, value) {
    return this._object[key] = value;
  }

  function get(key) {
    if (this._object[key] !== Object.prototype[key])
      return this._object[key];
  }

  function unset(key) {
    var value = this._object[key];
    delete this._object[key];
    return value;
  }

  function toObject() {
    return Object.clone(this._object);
  }



  function keys() {
    return this.pluck('key');
  }

  function values() {
    return this.pluck('value');
  }

  function index(value) {
    var match = this.detect(function(pair) {
      return pair.value === value;
    });
    return match && match.key;
  }

  function merge(object) {
    return this.clone().update(object);
  }

  function update(object) {
    return new Hash(object).inject(this, function(result, pair) {
      result.set(pair.key, pair.value);
      return result;
    });
  }

  function toQueryPair(key, value) {
    if (Object.isUndefined(value)) return key;
    return key + '=' + encodeURIComponent(String.interpret(value));
  }

  function toQueryString() {
    return this.inject([], function(results, pair) {
      var key = encodeURIComponent(pair.key), values = pair.value;

      if (values && typeof values == 'object') {
        if (Object.isArray(values)) {
          var queryValues = [];
          for (var i = 0, len = values.length, value; i < len; i++) {
            value = values[i];
            queryValues.push(toQueryPair(key, value));
          }
          return results.concat(queryValues);
        }
      } else results.push(toQueryPair(key, values));
      return results;
    }).join('&');
  }

  function inspect() {
    return '#<Hash:{' + this.map(function(pair) {
      return pair.map(Object.inspect).join(': ');
    }).join(', ') + '}>';
  }

  function clone() {
    return new Hash(this);
  }

  return {
    initialize:             initialize,
    _each:                  _each,
    set:                    set,
    get:                    get,
    unset:                  unset,
    toObject:               toObject,
    toTemplateReplacements: toObject,
    keys:                   keys,
    values:                 values,
    index:                  index,
    merge:                  merge,
    update:                 update,
    toQueryString:          toQueryString,
    inspect:                inspect,
    toJSON:                 toObject,
    clone:                  clone
  };
})());

Hash.from = $H;
Object.extend(Number.prototype, (function() {
  function toColorPart() {
    return this.toPaddedString(2, 16);
  }

  function succ() {
    return this + 1;
  }

  function times(iterator, context) {
    $R(0, this, true).each(iterator, context);
    return this;
  }

  function toPaddedString(length, radix) {
    var string = this.toString(radix || 10);
    return '0'.times(length - string.length) + string;
  }

  function abs() {
    return Math.abs(this);
  }

  function round() {
    return Math.round(this);
  }

  function ceil() {
    return Math.ceil(this);
  }

  function floor() {
    return Math.floor(this);
  }

  return {
    toColorPart:    toColorPart,
    succ:           succ,
    times:          times,
    toPaddedString: toPaddedString,
    abs:            abs,
    round:          round,
    ceil:           ceil,
    floor:          floor
  };
})());

function $R(start, end, exclusive) {
  return new ObjectRange(start, end, exclusive);
}

var ObjectRange = Class.create(Enumerable, (function() {
  function initialize(start, end, exclusive) {
    this.start = start;
    this.end = end;
    this.exclusive = exclusive;
  }

  function _each(iterator) {
    var value = this.start;
    while (this.include(value)) {
      iterator(value);
      value = value.succ();
    }
  }

  function include(value) {
    if (value < this.start)
      return false;
    if (this.exclusive)
      return value < this.end;
    return value <= this.end;
  }

  return {
    initialize: initialize,
    _each:      _each,
    include:    include
  };
})());



var Ajax = {
  getTransport: function() {
    return Try.these(
      function() {return new XMLHttpRequest()},
      function() {return new ActiveXObject('Msxml2.XMLHTTP')},
      function() {return new ActiveXObject('Microsoft.XMLHTTP')}
    ) || false;
  },

  activeRequestCount: 0
};

Ajax.Responders = {
  responders: [],

  _each: function(iterator) {
    this.responders._each(iterator);
  },

  register: function(responder) {
    if (!this.include(responder))
      this.responders.push(responder);
  },

  unregister: function(responder) {
    this.responders = this.responders.without(responder);
  },

  dispatch: function(callback, request, transport, json) {
    this.each(function(responder) {
      if (Object.isFunction(responder[callback])) {
        try {
          responder[callback].apply(responder, [request, transport, json]);
        } catch (e) { }
      }
    });
  }
};

Object.extend(Ajax.Responders, Enumerable);

Ajax.Responders.register({
  onCreate:   function() { Ajax.activeRequestCount++ },
  onComplete: function() { Ajax.activeRequestCount-- }
});
Ajax.Base = Class.create({
  initialize: function(options) {
    this.options = {
      method:       'post',
      asynchronous: true,
      contentType:  'application/x-www-form-urlencoded',
      encoding:     'UTF-8',
      parameters:   '',
      evalJSON:     true,
      evalJS:       true
    };
    Object.extend(this.options, options || { });

    this.options.method = this.options.method.toLowerCase();

    if (Object.isHash(this.options.parameters))
      this.options.parameters = this.options.parameters.toObject();
  }
});
Ajax.Request = Class.create(Ajax.Base, {
  _complete: false,

  initialize: function($super, url, options) {
    $super(options);
    this.transport = Ajax.getTransport();
    this.request(url);
  },

  request: function(url) {
    this.url = url;
    this.method = this.options.method;
    var params = Object.isString(this.options.parameters) ?
          this.options.parameters :
          Object.toQueryString(this.options.parameters);

    if (!['get', 'post'].include(this.method)) {
      params += (params ? '&' : '') + "_method=" + this.method;
      this.method = 'post';
    }

    if (params && this.method === 'get') {
      this.url += (this.url.include('?') ? '&' : '?') + params;
    }

    this.parameters = params.toQueryParams();

    try {
      var response = new Ajax.Response(this);
      if (this.options.onCreate) this.options.onCreate(response);
      Ajax.Responders.dispatch('onCreate', this, response);

      this.transport.open(this.method.toUpperCase(), this.url,
        this.options.asynchronous);

      if (this.options.asynchronous) this.respondToReadyState.bind(this).defer(1);

      this.transport.onreadystatechange = this.onStateChange.bind(this);
      this.setRequestHeaders();

      this.body = this.method == 'post' ? (this.options.postBody || params) : null;
      this.transport.send(this.body);

      /* Force Firefox to handle ready state 4 for synchronous requests */
      if (!this.options.asynchronous && this.transport.overrideMimeType)
        this.onStateChange();

    }
    catch (e) {
      this.dispatchException(e);
    }
  },

  onStateChange: function() {
    var readyState = this.transport.readyState;
    if (readyState > 1 && !((readyState == 4) && this._complete))
      this.respondToReadyState(this.transport.readyState);
  },

  setRequestHeaders: function() {
    var headers = {
      'X-Requested-With': 'XMLHttpRequest',
      'X-Prototype-Version': Prototype.Version,
      'Accept': 'text/javascript, text/html, application/xml, text/xml, */*'
    };

    if (this.method == 'post') {
      headers['Content-type'] = this.options.contentType +
        (this.options.encoding ? '; charset=' + this.options.encoding : '');

      /* Force "Connection: close" for older Mozilla browsers to work
       * around a bug where XMLHttpRequest sends an incorrect
       * Content-length header. See Mozilla Bugzilla #246651.
       */
      if (this.transport.overrideMimeType &&
          (navigator.userAgent.match(/Gecko\/(\d{4})/) || [0,2005])[1] < 2005)
            headers['Connection'] = 'close';
    }

    if (typeof this.options.requestHeaders == 'object') {
      var extras = this.options.requestHeaders;

      if (Object.isFunction(extras.push))
        for (var i = 0, length = extras.length; i < length; i += 2)
          headers[extras[i]] = extras[i+1];
      else
        $H(extras).each(function(pair) { headers[pair.key] = pair.value });
    }

    for (var name in headers)
      this.transport.setRequestHeader(name, headers[name]);
  },

  success: function() {
    var status = this.getStatus();
    return !status || (status >= 200 && status < 300) || status == 304;
  },

  getStatus: function() {
    try {
      if (this.transport.status === 1223) return 204;
      return this.transport.status || 0;
    } catch (e) { return 0 }
  },

  respondToReadyState: function(readyState) {
    var state = Ajax.Request.Events[readyState], response = new Ajax.Response(this);

    if (state == 'Complete') {
      try {
        this._complete = true;
        (this.options['on' + response.status]
         || this.options['on' + (this.success() ? 'Success' : 'Failure')]
         || Prototype.emptyFunction)(response, response.headerJSON);
      } catch (e) {
        this.dispatchException(e);
      }

      var contentType = response.getHeader('Content-type');
      if (this.options.evalJS == 'force'
          || (this.options.evalJS && this.isSameOrigin() && contentType
          && contentType.match(/^\s*(text|application)\/(x-)?(java|ecma)script(;.*)?\s*$/i)))
        this.evalResponse();
    }

    try {
      (this.options['on' + state] || Prototype.emptyFunction)(response, response.headerJSON);
      Ajax.Responders.dispatch('on' + state, this, response, response.headerJSON);
    } catch (e) {
      this.dispatchException(e);
    }

    if (state == 'Complete') {
      this.transport.onreadystatechange = Prototype.emptyFunction;
    }
  },

  isSameOrigin: function() {
    var m = this.url.match(/^\s*https?:\/\/[^\/]*/);
    return !m || (m[0] == '#{protocol}//#{domain}#{port}'.interpolate({
      protocol: location.protocol,
      domain: document.domain,
      port: location.port ? ':' + location.port : ''
    }));
  },

  getHeader: function(name) {
    try {
      return this.transport.getResponseHeader(name) || null;
    } catch (e) { return null; }
  },

  evalResponse: function() {
    try {
      return eval((this.transport.responseText || '').unfilterJSON());
    } catch (e) {
      this.dispatchException(e);
    }
  },

  dispatchException: function(exception) {
    (this.options.onException || Prototype.emptyFunction)(this, exception);
    Ajax.Responders.dispatch('onException', this, exception);
  }
});

Ajax.Request.Events =
  ['Uninitialized', 'Loading', 'Loaded', 'Interactive', 'Complete'];








Ajax.Response = Class.create({
  initialize: function(request){
    this.request = request;
    var transport  = this.transport  = request.transport,
        readyState = this.readyState = transport.readyState;

    if ((readyState > 2 && !Prototype.Browser.IE) || readyState == 4) {
      this.status       = this.getStatus();
      this.statusText   = this.getStatusText();
      this.responseText = String.interpret(transport.responseText);
      this.headerJSON   = this._getHeaderJSON();
    }

    if (readyState == 4) {
      var xml = transport.responseXML;
      this.responseXML  = Object.isUndefined(xml) ? null : xml;
      this.responseJSON = this._getResponseJSON();
    }
  },

  status:      0,

  statusText: '',

  getStatus: Ajax.Request.prototype.getStatus,

  getStatusText: function() {
    try {
      return this.transport.statusText || '';
    } catch (e) { return '' }
  },

  getHeader: Ajax.Request.prototype.getHeader,

  getAllHeaders: function() {
    try {
      return this.getAllResponseHeaders();
    } catch (e) { return null }
  },

  getResponseHeader: function(name) {
    return this.transport.getResponseHeader(name);
  },

  getAllResponseHeaders: function() {
    return this.transport.getAllResponseHeaders();
  },

  _getHeaderJSON: function() {
    var json = this.getHeader('X-JSON');
    if (!json) return null;
    json = decodeURIComponent(escape(json));
    try {
      return json.evalJSON(this.request.options.sanitizeJSON ||
        !this.request.isSameOrigin());
    } catch (e) {
      this.request.dispatchException(e);
    }
  },

  _getResponseJSON: function() {
    var options = this.request.options;
    if (!options.evalJSON || (options.evalJSON != 'force' &&
      !(this.getHeader('Content-type') || '').include('application/json')) ||
        this.responseText.blank())
          return null;
    try {
      return this.responseText.evalJSON(options.sanitizeJSON ||
        !this.request.isSameOrigin());
    } catch (e) {
      this.request.dispatchException(e);
    }
  }
});

Ajax.Updater = Class.create(Ajax.Request, {
  initialize: function($super, container, url, options) {
    this.container = {
      success: (container.success || container),
      failure: (container.failure || (container.success ? null : container))
    };

    options = Object.clone(options);
    var onComplete = options.onComplete;
    options.onComplete = (function(response, json) {
      this.updateContent(response.responseText);
      if (Object.isFunction(onComplete)) onComplete(response, json);
    }).bind(this);

    $super(url, options);
  },

  updateContent: function(responseText) {
    var receiver = this.container[this.success() ? 'success' : 'failure'],
        options = this.options;

    if (!options.evalScripts) responseText = responseText.stripScripts();

    if (receiver = $(receiver)) {
      if (options.insertion) {
        if (Object.isString(options.insertion)) {
          var insertion = { }; insertion[options.insertion] = responseText;
          receiver.insert(insertion);
        }
        else options.insertion(receiver, responseText);
      }
      else receiver.update(responseText);
    }
  }
});

Ajax.PeriodicalUpdater = Class.create(Ajax.Base, {
  initialize: function($super, container, url, options) {
    $super(options);
    this.onComplete = this.options.onComplete;

    this.frequency = (this.options.frequency || 2);
    this.decay = (this.options.decay || 1);

    this.updater = { };
    this.container = container;
    this.url = url;

    this.start();
  },

  start: function() {
    this.options.onComplete = this.updateComplete.bind(this);
    this.onTimerEvent();
  },

  stop: function() {
    this.updater.options.onComplete = undefined;
    clearTimeout(this.timer);
    (this.onComplete || Prototype.emptyFunction).apply(this, arguments);
  },

  updateComplete: function(response) {
    if (this.options.decay) {
      this.decay = (response.responseText == this.lastText ?
        this.decay * this.options.decay : 1);

      this.lastText = response.responseText;
    }
    this.timer = this.onTimerEvent.bind(this).delay(this.decay * this.frequency);
  },

  onTimerEvent: function() {
    this.updater = new Ajax.Updater(this.container, this.url, this.options);
  }
});


function $(element) {
  if (arguments.length > 1) {
    for (var i = 0, elements = [], length = arguments.length; i < length; i++)
      elements.push($(arguments[i]));
    return elements;
  }
  if (Object.isString(element))
    element = document.getElementById(element);
  return Element.extend(element);
}

if (Prototype.BrowserFeatures.XPath) {
  document._getElementsByXPath = function(expression, parentElement) {
    var results = [];
    var query = document.evaluate(expression, $(parentElement) || document,
      null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (var i = 0, length = query.snapshotLength; i < length; i++)
      results.push(Element.extend(query.snapshotItem(i)));
    return results;
  };
}

/*--------------------------------------------------------------------------*/

if (!Node) var Node = { };

if (!Node.ELEMENT_NODE) {
  Object.extend(Node, {
    ELEMENT_NODE: 1,
    ATTRIBUTE_NODE: 2,
    TEXT_NODE: 3,
    CDATA_SECTION_NODE: 4,
    ENTITY_REFERENCE_NODE: 5,
    ENTITY_NODE: 6,
    PROCESSING_INSTRUCTION_NODE: 7,
    COMMENT_NODE: 8,
    DOCUMENT_NODE: 9,
    DOCUMENT_TYPE_NODE: 10,
    DOCUMENT_FRAGMENT_NODE: 11,
    NOTATION_NODE: 12
  });
}



(function(global) {
  function shouldUseCache(tagName, attributes) {
    if (tagName === 'select') return false;
    if ('type' in attributes) return false;
    return true;
  }

  var HAS_EXTENDED_CREATE_ELEMENT_SYNTAX = (function(){
    try {
      var el = document.createElement('<input name="x">');
      return el.tagName.toLowerCase() === 'input' && el.name === 'x';
    }
    catch(err) {
      return false;
    }
  })();

  var element = global.Element;

  global.Element = function(tagName, attributes) {
    attributes = attributes || { };
    tagName = tagName.toLowerCase();
    var cache = Element.cache;

    if (HAS_EXTENDED_CREATE_ELEMENT_SYNTAX && attributes.name) {
      tagName = '<' + tagName + ' name="' + attributes.name + '">';
      delete attributes.name;
      return Element.writeAttribute(document.createElement(tagName), attributes);
    }

    if (!cache[tagName]) cache[tagName] = Element.extend(document.createElement(tagName));

    var node = shouldUseCache(tagName, attributes) ?
     cache[tagName].cloneNode(false) : document.createElement(tagName);

    return Element.writeAttribute(node, attributes);
  };

  Object.extend(global.Element, element || { });
  if (element) global.Element.prototype = element.prototype;

})(this);

Element.idCounter = 1;
Element.cache = { };

Element._purgeElement = function(element) {
  var uid = element._prototypeUID;
  if (uid) {
    Element.stopObserving(element);
    element._prototypeUID = void 0;
    delete Element.Storage[uid];
  }
}

Element.Methods = {
  visible: function(element) {
    return $(element).style.display != 'none';
  },

  toggle: function(element) {
    element = $(element);
    Element[Element.visible(element) ? 'hide' : 'show'](element);
    return element;
  },

  hide: function(element) {
    element = $(element);
    element.style.display = 'none';
    return element;
  },

  show: function(element) {
    element = $(element);
    element.style.display = '';
    return element;
  },

  remove: function(element) {
    element = $(element);
    element.parentNode.removeChild(element);
    return element;
  },

  update: (function(){

    var SELECT_ELEMENT_INNERHTML_BUGGY = (function(){
      var el = document.createElement("select"),
          isBuggy = true;
      el.innerHTML = "<option value=\"test\">test</option>";
      if (el.options && el.options[0]) {
        isBuggy = el.options[0].nodeName.toUpperCase() !== "OPTION";
      }
      el = null;
      return isBuggy;
    })();

    var TABLE_ELEMENT_INNERHTML_BUGGY = (function(){
      try {
        var el = document.createElement("table");
        if (el && el.tBodies) {
          el.innerHTML = "<tbody><tr><td>test</td></tr></tbody>";
          var isBuggy = typeof el.tBodies[0] == "undefined";
          el = null;
          return isBuggy;
        }
      } catch (e) {
        return true;
      }
    })();

    var LINK_ELEMENT_INNERHTML_BUGGY = (function() {
      try {
        var el = document.createElement('div');
        el.innerHTML = "<link>";
        var isBuggy = (el.childNodes.length === 0);
        el = null;
        return isBuggy;
      } catch(e) {
        return true;
      }
    })();

    var ANY_INNERHTML_BUGGY = SELECT_ELEMENT_INNERHTML_BUGGY ||
     TABLE_ELEMENT_INNERHTML_BUGGY || LINK_ELEMENT_INNERHTML_BUGGY;

    var SCRIPT_ELEMENT_REJECTS_TEXTNODE_APPENDING = (function () {
      var s = document.createElement("script"),
          isBuggy = false;
      try {
        s.appendChild(document.createTextNode(""));
        isBuggy = !s.firstChild ||
          s.firstChild && s.firstChild.nodeType !== 3;
      } catch (e) {
        isBuggy = true;
      }
      s = null;
      return isBuggy;
    })();


    function update(element, content) {
      element = $(element);
      var purgeElement = Element._purgeElement;

      var descendants = element.getElementsByTagName('*'),
       i = descendants.length;
      while (i--) purgeElement(descendants[i]);

      if (content && content.toElement)
        content = content.toElement();

      if (Object.isElement(content))
        return element.update().insert(content);

      content = Object.toHTML(content);

      var tagName = element.tagName.toUpperCase();

      if (tagName === 'SCRIPT' && SCRIPT_ELEMENT_REJECTS_TEXTNODE_APPENDING) {
        element.text = content;
        return element;
      }

      if (ANY_INNERHTML_BUGGY) {
        if (tagName in Element._insertionTranslations.tags) {
          while (element.firstChild) {
            element.removeChild(element.firstChild);
          }
          Element._getContentFromAnonymousElement(tagName, content.stripScripts())
            .each(function(node) {
              element.appendChild(node)
            });
        } else if (LINK_ELEMENT_INNERHTML_BUGGY && Object.isString(content) && content.indexOf('<link') > -1) {
          while (element.firstChild) {
            element.removeChild(element.firstChild);
          }
          var nodes = Element._getContentFromAnonymousElement(tagName, content.stripScripts(), true);
          nodes.each(function(node) { element.appendChild(node) });
        }
        else {
          element.innerHTML = content.stripScripts();
        }
      }
      else {
        element.innerHTML = content.stripScripts();
      }

      content.evalScripts.bind(content).defer();
      return element;
    }

    return update;
  })(),

  replace: function(element, content) {
    element = $(element);
    if (content && content.toElement) content = content.toElement();
    else if (!Object.isElement(content)) {
      content = Object.toHTML(content);
      var range = element.ownerDocument.createRange();
      range.selectNode(element);
      content.evalScripts.bind(content).defer();
      content = range.createContextualFragment(content.stripScripts());
    }
    element.parentNode.replaceChild(content, element);
    return element;
  },

  insert: function(element, insertions) {
    element = $(element);

    if (Object.isString(insertions) || Object.isNumber(insertions) ||
        Object.isElement(insertions) || (insertions && (insertions.toElement || insertions.toHTML)))
          insertions = {bottom:insertions};

    var content, insert, tagName, childNodes;

    for (var position in insertions) {
      content  = insertions[position];
      position = position.toLowerCase();
      insert = Element._insertionTranslations[position];

      if (content && content.toElement) content = content.toElement();
      if (Object.isElement(content)) {
        insert(element, content);
        continue;
      }

      content = Object.toHTML(content);

      tagName = ((position == 'before' || position == 'after')
        ? element.parentNode : element).tagName.toUpperCase();

      childNodes = Element._getContentFromAnonymousElement(tagName, content.stripScripts());

      if (position == 'top' || position == 'after') childNodes.reverse();
      childNodes.each(insert.curry(element));

      content.evalScripts.bind(content).defer();
    }

    return element;
  },

  wrap: function(element, wrapper, attributes) {
    element = $(element);
    if (Object.isElement(wrapper))
      $(wrapper).writeAttribute(attributes || { });
    else if (Object.isString(wrapper)) wrapper = new Element(wrapper, attributes);
    else wrapper = new Element('div', wrapper);
    if (element.parentNode)
      element.parentNode.replaceChild(wrapper, element);
    wrapper.appendChild(element);
    return wrapper;
  },

  inspect: function(element) {
    element = $(element);
    var result = '<' + element.tagName.toLowerCase();
    $H({'id': 'id', 'className': 'class'}).each(function(pair) {
      var property = pair.first(),
          attribute = pair.last(),
          value = (element[property] || '').toString();
      if (value) result += ' ' + attribute + '=' + value.inspect(true);
    });
    return result + '>';
  },

  recursivelyCollect: function(element, property, maximumLength) {
    element = $(element);
    maximumLength = maximumLength || -1;
    var elements = [];

    while (element = element[property]) {
      if (element.nodeType == 1)
        elements.push(Element.extend(element));
      if (elements.length == maximumLength)
        break;
    }

    return elements;
  },

  ancestors: function(element) {
    return Element.recursivelyCollect(element, 'parentNode');
  },

  descendants: function(element) {
    return Element.select(element, "*");
  },

  firstDescendant: function(element) {
    element = $(element).firstChild;
    while (element && element.nodeType != 1) element = element.nextSibling;
    return $(element);
  },

  immediateDescendants: function(element) {
    var results = [], child = $(element).firstChild;
    while (child) {
      if (child.nodeType === 1) {
        results.push(Element.extend(child));
      }
      child = child.nextSibling;
    }
    return results;
  },

  previousSiblings: function(element, maximumLength) {
    return Element.recursivelyCollect(element, 'previousSibling');
  },

  nextSiblings: function(element) {
    return Element.recursivelyCollect(element, 'nextSibling');
  },

  siblings: function(element) {
    element = $(element);
    return Element.previousSiblings(element).reverse()
      .concat(Element.nextSiblings(element));
  },

  match: function(element, selector) {
    element = $(element);
    if (Object.isString(selector))
      return Prototype.Selector.match(element, selector);
    return selector.match(element);
  },

  up: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return $(element.parentNode);
    var ancestors = Element.ancestors(element);
    return Object.isNumber(expression) ? ancestors[expression] :
      Prototype.Selector.find(ancestors, expression, index);
  },

  down: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return Element.firstDescendant(element);
    return Object.isNumber(expression) ? Element.descendants(element)[expression] :
      Element.select(element, expression)[index || 0];
  },

  previous: function(element, expression, index) {
    element = $(element);
    if (Object.isNumber(expression)) index = expression, expression = false;
    if (!Object.isNumber(index)) index = 0;

    if (expression) {
      return Prototype.Selector.find(element.previousSiblings(), expression, index);
    } else {
      return element.recursivelyCollect("previousSibling", index + 1)[index];
    }
  },

  next: function(element, expression, index) {
    element = $(element);
    if (Object.isNumber(expression)) index = expression, expression = false;
    if (!Object.isNumber(index)) index = 0;

    if (expression) {
      return Prototype.Selector.find(element.nextSiblings(), expression, index);
    } else {
      var maximumLength = Object.isNumber(index) ? index + 1 : 1;
      return element.recursivelyCollect("nextSibling", index + 1)[index];
    }
  },


  select: function(element) {
    element = $(element);
    var expressions = Array.prototype.slice.call(arguments, 1).join(', ');
    return Prototype.Selector.select(expressions, element);
  },

  adjacent: function(element) {
    element = $(element);
    var expressions = Array.prototype.slice.call(arguments, 1).join(', ');
    return Prototype.Selector.select(expressions, element.parentNode).without(element);
  },

  identify: function(element) {
    element = $(element);
    var id = Element.readAttribute(element, 'id');
    if (id) return id;
    do { id = 'anonymous_element_' + Element.idCounter++ } while ($(id));
    Element.writeAttribute(element, 'id', id);
    return id;
  },

  readAttribute: function(element, name) {
    element = $(element);
    if (Prototype.Browser.IE) {
      var t = Element._attributeTranslations.read;
      if (t.values[name]) return t.values[name](element, name);
      if (t.names[name]) name = t.names[name];
      if (name.include(':')) {
        return (!element.attributes || !element.attributes[name]) ? null :
         element.attributes[name].value;
      }
    }
    return element.getAttribute(name);
  },

  writeAttribute: function(element, name, value) {
    element = $(element);
    var attributes = { }, t = Element._attributeTranslations.write;

    if (typeof name == 'object') attributes = name;
    else attributes[name] = Object.isUndefined(value) ? true : value;

    for (var attr in attributes) {
      name = t.names[attr] || attr;
      value = attributes[attr];
      if (t.values[attr]) name = t.values[attr](element, value);
      if (value === false || value === null)
        element.removeAttribute(name);
      else if (value === true)
        element.setAttribute(name, name);
      else element.setAttribute(name, value);
    }
    return element;
  },

  getHeight: function(element) {
    return Element.getDimensions(element).height;
  },

  getWidth: function(element) {
    return Element.getDimensions(element).width;
  },

  classNames: function(element) {
    return new Element.ClassNames(element);
  },

  hasClassName: function(element, className) {
    if (!(element = $(element))) return;
    var elementClassName = element.className;
    return (elementClassName.length > 0 && (elementClassName == className ||
      new RegExp("(^|\\s)" + className + "(\\s|$)").test(elementClassName)));
  },

  addClassName: function(element, className) {
    if (!(element = $(element))) return;
    if (!Element.hasClassName(element, className))
      element.className += (element.className ? ' ' : '') + className;
    return element;
  },

  removeClassName: function(element, className) {
    if (!(element = $(element))) return;
    element.className = element.className.replace(
      new RegExp("(^|\\s+)" + className + "(\\s+|$)"), ' ').strip();
    return element;
  },

  toggleClassName: function(element, className) {
    if (!(element = $(element))) return;
    return Element[Element.hasClassName(element, className) ?
      'removeClassName' : 'addClassName'](element, className);
  },

  cleanWhitespace: function(element) {
    element = $(element);
    var node = element.firstChild;
    while (node) {
      var nextNode = node.nextSibling;
      if (node.nodeType == 3 && !/\S/.test(node.nodeValue))
        element.removeChild(node);
      node = nextNode;
    }
    return element;
  },

  empty: function(element) {
    return $(element).innerHTML.blank();
  },

  descendantOf: function(element, ancestor) {
    element = $(element), ancestor = $(ancestor);

    if (element.compareDocumentPosition)
      return (element.compareDocumentPosition(ancestor) & 8) === 8;

    if (ancestor.contains)
      return ancestor.contains(element) && ancestor !== element;

    while (element = element.parentNode)
      if (element == ancestor) return true;

    return false;
  },

  scrollTo: function(element) {
    element = $(element);
    var pos = Element.cumulativeOffset(element);
    window.scrollTo(pos[0], pos[1]);
    return element;
  },

  getStyle: function(element, style) {
    element = $(element);
    style = style == 'float' ? 'cssFloat' : style.camelize();
    var value = element.style[style];
    if (!value || value == 'auto') {
      var css = document.defaultView.getComputedStyle(element, null);
      value = css ? css[style] : null;
    }
    if (style == 'opacity') return value ? parseFloat(value) : 1.0;
    return value == 'auto' ? null : value;
  },

  getOpacity: function(element) {
    return $(element).getStyle('opacity');
  },

  setStyle: function(element, styles) {
    element = $(element);
    var elementStyle = element.style, match;
    if (Object.isString(styles)) {
      element.style.cssText += ';' + styles;
      return styles.include('opacity') ?
        element.setOpacity(styles.match(/opacity:\s*(\d?\.?\d*)/)[1]) : element;
    }
    for (var property in styles)
      if (property == 'opacity') element.setOpacity(styles[property]);
      else
        elementStyle[(property == 'float' || property == 'cssFloat') ?
          (Object.isUndefined(elementStyle.styleFloat) ? 'cssFloat' : 'styleFloat') :
            property] = styles[property];

    return element;
  },

  setOpacity: function(element, value) {
    element = $(element);
    element.style.opacity = (value == 1 || value === '') ? '' :
      (value < 0.00001) ? 0 : value;
    return element;
  },

  makePositioned: function(element) {
    element = $(element);
    var pos = Element.getStyle(element, 'position');
    if (pos == 'static' || !pos) {
      element._madePositioned = true;
      element.style.position = 'relative';
      if (Prototype.Browser.Opera) {
        element.style.top = 0;
        element.style.left = 0;
      }
    }
    return element;
  },

  undoPositioned: function(element) {
    element = $(element);
    if (element._madePositioned) {
      element._madePositioned = undefined;
      element.style.position =
        element.style.top =
        element.style.left =
        element.style.bottom =
        element.style.right = '';
    }
    return element;
  },

  makeClipping: function(element) {
    element = $(element);
    if (element._overflow) return element;
    element._overflow = Element.getStyle(element, 'overflow') || 'auto';
    if (element._overflow !== 'hidden')
      element.style.overflow = 'hidden';
    return element;
  },

  undoClipping: function(element) {
    element = $(element);
    if (!element._overflow) return element;
    element.style.overflow = element._overflow == 'auto' ? '' : element._overflow;
    element._overflow = null;
    return element;
  },

  clonePosition: function(element, source) {
    var options = Object.extend({
      setLeft:    true,
      setTop:     true,
      setWidth:   true,
      setHeight:  true,
      offsetTop:  0,
      offsetLeft: 0
    }, arguments[2] || { });

    source = $(source);
    var p = Element.viewportOffset(source), delta = [0, 0], parent = null;

    element = $(element);

    if (Element.getStyle(element, 'position') == 'absolute') {
      parent = Element.getOffsetParent(element);
      delta = Element.viewportOffset(parent);
    }

    if (parent == document.body) {
      delta[0] -= document.body.offsetLeft;
      delta[1] -= document.body.offsetTop;
    }

    if (options.setLeft)   element.style.left  = (p[0] - delta[0] + options.offsetLeft) + 'px';
    if (options.setTop)    element.style.top   = (p[1] - delta[1] + options.offsetTop) + 'px';
    if (options.setWidth)  element.style.width = source.offsetWidth + 'px';
    if (options.setHeight) element.style.height = source.offsetHeight + 'px';
    return element;
  }
};

Object.extend(Element.Methods, {
  getElementsBySelector: Element.Methods.select,

  childElements: Element.Methods.immediateDescendants
});

Element._attributeTranslations = {
  write: {
    names: {
      className: 'class',
      htmlFor:   'for'
    },
    values: { }
  }
};

if (Prototype.Browser.Opera) {
  Element.Methods.getStyle = Element.Methods.getStyle.wrap(
    function(proceed, element, style) {
      switch (style) {
        case 'height': case 'width':
          if (!Element.visible(element)) return null;

          var dim = parseInt(proceed(element, style), 10);

          if (dim !== element['offset' + style.capitalize()])
            return dim + 'px';

          var properties;
          if (style === 'height') {
            properties = ['border-top-width', 'padding-top',
             'padding-bottom', 'border-bottom-width'];
          }
          else {
            properties = ['border-left-width', 'padding-left',
             'padding-right', 'border-right-width'];
          }
          return properties.inject(dim, function(memo, property) {
            var val = proceed(element, property);
            return val === null ? memo : memo - parseInt(val, 10);
          }) + 'px';
        default: return proceed(element, style);
      }
    }
  );

  Element.Methods.readAttribute = Element.Methods.readAttribute.wrap(
    function(proceed, element, attribute) {
      if (attribute === 'title') return element.title;
      return proceed(element, attribute);
    }
  );
}

else if (Prototype.Browser.IE) {
  Element.Methods.getStyle = function(element, style) {
    element = $(element);
    style = (style == 'float' || style == 'cssFloat') ? 'styleFloat' : style.camelize();
    var value = element.style[style];
    if (!value && element.currentStyle) value = element.currentStyle[style];

    if (style == 'opacity') {
      if (value = (element.getStyle('filter') || '').match(/alpha\(opacity=(.*)\)/))
        if (value[1]) return parseFloat(value[1]) / 100;
      return 1.0;
    }

    if (value == 'auto') {
      if ((style == 'width' || style == 'height') && (element.getStyle('display') != 'none'))
        return element['offset' + style.capitalize()] + 'px';
      return null;
    }
    return value;
  };

  Element.Methods.setOpacity = function(element, value) {
    function stripAlpha(filter){
      return filter.replace(/alpha\([^\)]*\)/gi,'');
    }
    element = $(element);
    var currentStyle = element.currentStyle;
    if ((currentStyle && !currentStyle.hasLayout) ||
      (!currentStyle && element.style.zoom == 'normal'))
        element.style.zoom = 1;

    var filter = element.getStyle('filter'), style = element.style;
    if (value == 1 || value === '') {
      (filter = stripAlpha(filter)) ?
        style.filter = filter : style.removeAttribute('filter');
      return element;
    } else if (value < 0.00001) value = 0;
    style.filter = stripAlpha(filter) +
      'alpha(opacity=' + (value * 100) + ')';
    return element;
  };

  Element._attributeTranslations = (function(){

    var classProp = 'className',
        forProp = 'for',
        el = document.createElement('div');

    el.setAttribute(classProp, 'x');

    if (el.className !== 'x') {
      el.setAttribute('class', 'x');
      if (el.className === 'x') {
        classProp = 'class';
      }
    }
    el = null;

    el = document.createElement('label');
    el.setAttribute(forProp, 'x');
    if (el.htmlFor !== 'x') {
      el.setAttribute('htmlFor', 'x');
      if (el.htmlFor === 'x') {
        forProp = 'htmlFor';
      }
    }
    el = null;

    return {
      read: {
        names: {
          'class':      classProp,
          'className':  classProp,
          'for':        forProp,
          'htmlFor':    forProp
        },
        values: {
          _getAttr: function(element, attribute) {
            return element.getAttribute(attribute);
          },
          _getAttr2: function(element, attribute) {
            return element.getAttribute(attribute, 2);
          },
          _getAttrNode: function(element, attribute) {
            var node = element.getAttributeNode(attribute);
            return node ? node.value : "";
          },
          _getEv: (function(){

            var el = document.createElement('div'), f;
            el.onclick = Prototype.emptyFunction;
            var value = el.getAttribute('onclick');

            if (String(value).indexOf('{') > -1) {
              f = function(element, attribute) {
                attribute = element.getAttribute(attribute);
                if (!attribute) return null;
                attribute = attribute.toString();
                attribute = attribute.split('{')[1];
                attribute = attribute.split('}')[0];
                return attribute.strip();
              };
            }
            else if (value === '') {
              f = function(element, attribute) {
                attribute = element.getAttribute(attribute);
                if (!attribute) return null;
                return attribute.strip();
              };
            }
            el = null;
            return f;
          })(),
          _flag: function(element, attribute) {
            return $(element).hasAttribute(attribute) ? attribute : null;
          },
          style: function(element) {
            return element.style.cssText.toLowerCase();
          },
          title: function(element) {
            return element.title;
          }
        }
      }
    }
  })();

  Element._attributeTranslations.write = {
    names: Object.extend({
      cellpadding: 'cellPadding',
      cellspacing: 'cellSpacing'
    }, Element._attributeTranslations.read.names),
    values: {
      checked: function(element, value) {
        element.checked = !!value;
      },

      style: function(element, value) {
        element.style.cssText = value ? value : '';
      }
    }
  };

  Element._attributeTranslations.has = {};

  $w('colSpan rowSpan vAlign dateTime accessKey tabIndex ' +
      'encType maxLength readOnly longDesc frameBorder').each(function(attr) {
    Element._attributeTranslations.write.names[attr.toLowerCase()] = attr;
    Element._attributeTranslations.has[attr.toLowerCase()] = attr;
  });

  (function(v) {
    Object.extend(v, {
      href:        v._getAttr2,
      src:         v._getAttr2,
      type:        v._getAttr,
      action:      v._getAttrNode,
      disabled:    v._flag,
      checked:     v._flag,
      readonly:    v._flag,
      multiple:    v._flag,
      onload:      v._getEv,
      onunload:    v._getEv,
      onclick:     v._getEv,
      ondblclick:  v._getEv,
      onmousedown: v._getEv,
      onmouseup:   v._getEv,
      onmouseover: v._getEv,
      onmousemove: v._getEv,
      onmouseout:  v._getEv,
      onfocus:     v._getEv,
      onblur:      v._getEv,
      onkeypress:  v._getEv,
      onkeydown:   v._getEv,
      onkeyup:     v._getEv,
      onsubmit:    v._getEv,
      onreset:     v._getEv,
      onselect:    v._getEv,
      onchange:    v._getEv
    });
  })(Element._attributeTranslations.read.values);

  if (Prototype.BrowserFeatures.ElementExtensions) {
    (function() {
      function _descendants(element) {
        var nodes = element.getElementsByTagName('*'), results = [];
        for (var i = 0, node; node = nodes[i]; i++)
          if (node.tagName !== "!") // Filter out comment nodes.
            results.push(node);
        return results;
      }

      Element.Methods.down = function(element, expression, index) {
        element = $(element);
        if (arguments.length == 1) return element.firstDescendant();
        return Object.isNumber(expression) ? _descendants(element)[expression] :
          Element.select(element, expression)[index || 0];
      }
    })();
  }

}

else if (Prototype.Browser.Gecko && /rv:1\.8\.0/.test(navigator.userAgent)) {
  Element.Methods.setOpacity = function(element, value) {
    element = $(element);
    element.style.opacity = (value == 1) ? 0.999999 :
      (value === '') ? '' : (value < 0.00001) ? 0 : value;
    return element;
  };
}

else if (Prototype.Browser.WebKit) {
  Element.Methods.setOpacity = function(element, value) {
    element = $(element);
    element.style.opacity = (value == 1 || value === '') ? '' :
      (value < 0.00001) ? 0 : value;

    if (value == 1)
      if (element.tagName.toUpperCase() == 'IMG' && element.width) {
        element.width++; element.width--;
      } else try {
        var n = document.createTextNode(' ');
        element.appendChild(n);
        element.removeChild(n);
      } catch (e) { }

    return element;
  };
}

if ('outerHTML' in document.documentElement) {
  Element.Methods.replace = function(element, content) {
    element = $(element);

    if (content && content.toElement) content = content.toElement();
    if (Object.isElement(content)) {
      element.parentNode.replaceChild(content, element);
      return element;
    }

    content = Object.toHTML(content);
    var parent = element.parentNode, tagName = parent.tagName.toUpperCase();

    if (Element._insertionTranslations.tags[tagName]) {
      var nextSibling = element.next(),
          fragments = Element._getContentFromAnonymousElement(tagName, content.stripScripts());
      parent.removeChild(element);
      if (nextSibling)
        fragments.each(function(node) { parent.insertBefore(node, nextSibling) });
      else
        fragments.each(function(node) { parent.appendChild(node) });
    }
    else element.outerHTML = content.stripScripts();

    content.evalScripts.bind(content).defer();
    return element;
  };
}

Element._returnOffset = function(l, t) {
  var result = [l, t];
  result.left = l;
  result.top = t;
  return result;
};

Element._getContentFromAnonymousElement = function(tagName, html, force) {
  var div = new Element('div'),
      t = Element._insertionTranslations.tags[tagName];

  var workaround = false;
  if (t) workaround = true;
  else if (force) {
    workaround = true;
    t = ['', '', 0];
  }

  if (workaround) {
    div.innerHTML = '&nbsp;' + t[0] + html + t[1];
    div.removeChild(div.firstChild);
    for (var i = t[2]; i--; ) {
      div = div.firstChild;
    }
  }
  else {
    div.innerHTML = html;
  }
  return $A(div.childNodes);
};

Element._insertionTranslations = {
  before: function(element, node) {
    element.parentNode.insertBefore(node, element);
  },
  top: function(element, node) {
    element.insertBefore(node, element.firstChild);
  },
  bottom: function(element, node) {
    element.appendChild(node);
  },
  after: function(element, node) {
    element.parentNode.insertBefore(node, element.nextSibling);
  },
  tags: {
    TABLE:  ['<table>',                '</table>',                   1],
    TBODY:  ['<table><tbody>',         '</tbody></table>',           2],
    TR:     ['<table><tbody><tr>',     '</tr></tbody></table>',      3],
    TD:     ['<table><tbody><tr><td>', '</td></tr></tbody></table>', 4],
    SELECT: ['<select>',               '</select>',                  1]
  }
};

(function() {
  var tags = Element._insertionTranslations.tags;
  Object.extend(tags, {
    THEAD: tags.TBODY,
    TFOOT: tags.TBODY,
    TH:    tags.TD
  });
})();

Element.Methods.Simulated = {
  hasAttribute: function(element, attribute) {
    attribute = Element._attributeTranslations.has[attribute] || attribute;
    var node = $(element).getAttributeNode(attribute);
    return !!(node && node.specified);
  }
};

Element.Methods.ByTag = { };

Object.extend(Element, Element.Methods);

(function(div) {

  if (!Prototype.BrowserFeatures.ElementExtensions && div['__proto__']) {
    window.HTMLElement = { };
    window.HTMLElement.prototype = div['__proto__'];
    Prototype.BrowserFeatures.ElementExtensions = true;
  }

  div = null;

})(document.createElement('div'));

Element.extend = (function() {

  function checkDeficiency(tagName) {
    if (typeof window.Element != 'undefined') {
      var proto = window.Element.prototype;
      if (proto) {
        var id = '_' + (Math.random()+'').slice(2),
            el = document.createElement(tagName);
        proto[id] = 'x';
        var isBuggy = (el[id] !== 'x');
        delete proto[id];
        el = null;
        return isBuggy;
      }
    }
    return false;
  }

  function extendElementWith(element, methods) {
    for (var property in methods) {
      var value = methods[property];
      if (Object.isFunction(value) && !(property in element))
        element[property] = value.methodize();
    }
  }

  var HTMLOBJECTELEMENT_PROTOTYPE_BUGGY = checkDeficiency('object');

  if (Prototype.BrowserFeatures.SpecificElementExtensions) {
    if (HTMLOBJECTELEMENT_PROTOTYPE_BUGGY) {
      return function(element) {
        if (element && typeof element._extendedByPrototype == 'undefined') {
          var t = element.tagName;
          if (t && (/^(?:object|applet|embed)$/i.test(t))) {
            extendElementWith(element, Element.Methods);
            extendElementWith(element, Element.Methods.Simulated);
            extendElementWith(element, Element.Methods.ByTag[t.toUpperCase()]);
          }
        }
        return element;
      }
    }
    return Prototype.K;
  }

  var Methods = { }, ByTag = Element.Methods.ByTag;

  var extend = Object.extend(function(element) {
    if (!element || typeof element._extendedByPrototype != 'undefined' ||
        element.nodeType != 1 || element == window) return element;

    var methods = Object.clone(Methods),
        tagName = element.tagName.toUpperCase();

    if (ByTag[tagName]) Object.extend(methods, ByTag[tagName]);

    extendElementWith(element, methods);

    element._extendedByPrototype = Prototype.emptyFunction;
    return element;

  }, {
    refresh: function() {
      if (!Prototype.BrowserFeatures.ElementExtensions) {
        Object.extend(Methods, Element.Methods);
        Object.extend(Methods, Element.Methods.Simulated);
      }
    }
  });

  extend.refresh();
  return extend;
})();

if (document.documentElement.hasAttribute) {
  Element.hasAttribute = function(element, attribute) {
    return element.hasAttribute(attribute);
  };
}
else {
  Element.hasAttribute = Element.Methods.Simulated.hasAttribute;
}

Element.addMethods = function(methods) {
  var F = Prototype.BrowserFeatures, T = Element.Methods.ByTag;

  if (!methods) {
    Object.extend(Form, Form.Methods);
    Object.extend(Form.Element, Form.Element.Methods);
    Object.extend(Element.Methods.ByTag, {
      "FORM":     Object.clone(Form.Methods),
      "INPUT":    Object.clone(Form.Element.Methods),
      "SELECT":   Object.clone(Form.Element.Methods),
      "TEXTAREA": Object.clone(Form.Element.Methods),
      "BUTTON":   Object.clone(Form.Element.Methods)
    });
  }

  if (arguments.length == 2) {
    var tagName = methods;
    methods = arguments[1];
  }

  if (!tagName) Object.extend(Element.Methods, methods || { });
  else {
    if (Object.isArray(tagName)) tagName.each(extend);
    else extend(tagName);
  }

  function extend(tagName) {
    tagName = tagName.toUpperCase();
    if (!Element.Methods.ByTag[tagName])
      Element.Methods.ByTag[tagName] = { };
    Object.extend(Element.Methods.ByTag[tagName], methods);
  }

  function copy(methods, destination, onlyIfAbsent) {
    onlyIfAbsent = onlyIfAbsent || false;
    for (var property in methods) {
      var value = methods[property];
      if (!Object.isFunction(value)) continue;
      if (!onlyIfAbsent || !(property in destination))
        destination[property] = value.methodize();
    }
  }

  function findDOMClass(tagName) {
    var klass;
    var trans = {
      "OPTGROUP": "OptGroup", "TEXTAREA": "TextArea", "P": "Paragraph",
      "FIELDSET": "FieldSet", "UL": "UList", "OL": "OList", "DL": "DList",
      "DIR": "Directory", "H1": "Heading", "H2": "Heading", "H3": "Heading",
      "H4": "Heading", "H5": "Heading", "H6": "Heading", "Q": "Quote",
      "INS": "Mod", "DEL": "Mod", "A": "Anchor", "IMG": "Image", "CAPTION":
      "TableCaption", "COL": "TableCol", "COLGROUP": "TableCol", "THEAD":
      "TableSection", "TFOOT": "TableSection", "TBODY": "TableSection", "TR":
      "TableRow", "TH": "TableCell", "TD": "TableCell", "FRAMESET":
      "FrameSet", "IFRAME": "IFrame"
    };
    if (trans[tagName]) klass = 'HTML' + trans[tagName] + 'Element';
    if (window[klass]) return window[klass];
    klass = 'HTML' + tagName + 'Element';
    if (window[klass]) return window[klass];
    klass = 'HTML' + tagName.capitalize() + 'Element';
    if (window[klass]) return window[klass];

    var element = document.createElement(tagName),
        proto = element['__proto__'] || element.constructor.prototype;

    element = null;
    return proto;
  }

  var elementPrototype = window.HTMLElement ? HTMLElement.prototype :
   Element.prototype;

  if (F.ElementExtensions) {
    copy(Element.Methods, elementPrototype);
    copy(Element.Methods.Simulated, elementPrototype, true);
  }

  if (F.SpecificElementExtensions) {
    for (var tag in Element.Methods.ByTag) {
      var klass = findDOMClass(tag);
      if (Object.isUndefined(klass)) continue;
      copy(T[tag], klass.prototype);
    }
  }

  Object.extend(Element, Element.Methods);
  delete Element.ByTag;

  if (Element.extend.refresh) Element.extend.refresh();
  Element.cache = { };
};


document.viewport = {

  getDimensions: function() {
    return { width: this.getWidth(), height: this.getHeight() };
  },

  getScrollOffsets: function() {
    return Element._returnOffset(
      window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft,
      window.pageYOffset || document.documentElement.scrollTop  || document.body.scrollTop);
  }
};

(function(viewport) {
  var B = Prototype.Browser, doc = document, element, property = {};

  function getRootElement() {
    if (B.WebKit && !doc.evaluate)
      return document;

    if (B.Opera && window.parseFloat(window.opera.version()) < 9.5)
      return document.body;

    return document.documentElement;
  }

  function define(D) {
    if (!element) element = getRootElement();

    property[D] = 'client' + D;

    viewport['get' + D] = function() { return element[property[D]] };
    return viewport['get' + D]();
  }

  viewport.getWidth  = define.curry('Width');

  viewport.getHeight = define.curry('Height');
})(document.viewport);


Element.Storage = {
  UID: 1
};

Element.addMethods({
  getStorage: function(element) {
    if (!(element = $(element))) return;

    var uid;
    if (element === window) {
      uid = 0;
    } else {
      if (typeof element._prototypeUID === "undefined")
        element._prototypeUID = Element.Storage.UID++;
      uid = element._prototypeUID;
    }

    if (!Element.Storage[uid])
      Element.Storage[uid] = $H();

    return Element.Storage[uid];
  },

  store: function(element, key, value) {
    if (!(element = $(element))) return;

    if (arguments.length === 2) {
      Element.getStorage(element).update(key);
    } else {
      Element.getStorage(element).set(key, value);
    }

    return element;
  },

  retrieve: function(element, key, defaultValue) {
    if (!(element = $(element))) return;
    var hash = Element.getStorage(element), value = hash.get(key);

    if (Object.isUndefined(value)) {
      hash.set(key, defaultValue);
      value = defaultValue;
    }

    return value;
  },

  clone: function(element, deep) {
    if (!(element = $(element))) return;
    var clone = element.cloneNode(deep);
    clone._prototypeUID = void 0;
    if (deep) {
      var descendants = Element.select(clone, '*'),
          i = descendants.length;
      while (i--) {
        descendants[i]._prototypeUID = void 0;
      }
    }
    return Element.extend(clone);
  },

  purge: function(element) {
    if (!(element = $(element))) return;
    var purgeElement = Element._purgeElement;

    purgeElement(element);

    var descendants = element.getElementsByTagName('*'),
     i = descendants.length;

    while (i--) purgeElement(descendants[i]);

    return null;
  }
});

(function() {

  function toDecimal(pctString) {
    var match = pctString.match(/^(\d+)%?$/i);
    if (!match) return null;
    return (Number(match[1]) / 100);
  }

  function getPixelValue(value, property, context) {
    var element = null;
    if (Object.isElement(value)) {
      element = value;
      value = element.getStyle(property);
    }

    if (value === null) {
      return null;
    }

    if ((/^(?:-)?\d+(\.\d+)?(px)?$/i).test(value)) {
      return window.parseFloat(value);
    }

    var isPercentage = value.include('%'), isViewport = (context === document.viewport);

    if (/\d/.test(value) && element && element.runtimeStyle && !(isPercentage && isViewport)) {
      var style = element.style.left, rStyle = element.runtimeStyle.left;
      element.runtimeStyle.left = element.currentStyle.left;
      element.style.left = value || 0;
      value = element.style.pixelLeft;
      element.style.left = style;
      element.runtimeStyle.left = rStyle;

      return value;
    }

    if (element && isPercentage) {
      context = context || element.parentNode;
      var decimal = toDecimal(value);
      var whole = null;
      var position = element.getStyle('position');

      var isHorizontal = property.include('left') || property.include('right') ||
       property.include('width');

      var isVertical =  property.include('top') || property.include('bottom') ||
        property.include('height');

      if (context === document.viewport) {
        if (isHorizontal) {
          whole = document.viewport.getWidth();
        } else if (isVertical) {
          whole = document.viewport.getHeight();
        }
      } else {
        if (isHorizontal) {
          whole = $(context).measure('width');
        } else if (isVertical) {
          whole = $(context).measure('height');
        }
      }

      return (whole === null) ? 0 : whole * decimal;
    }

    return 0;
  }

  function toCSSPixels(number) {
    if (Object.isString(number) && number.endsWith('px')) {
      return number;
    }
    return number + 'px';
  }

  function isDisplayed(element) {
    var originalElement = element;
    while (element && element.parentNode) {
      var display = element.getStyle('display');
      if (display === 'none') {
        return false;
      }
      element = $(element.parentNode);
    }
    return true;
  }

  var hasLayout = Prototype.K;
  if ('currentStyle' in document.documentElement) {
    hasLayout = function(element) {
      if (!element.currentStyle.hasLayout) {
        element.style.zoom = 1;
      }
      return element;
    };
  }

  function cssNameFor(key) {
    if (key.include('border')) key = key + '-width';
    return key.camelize();
  }

  Element.Layout = Class.create(Hash, {
    initialize: function($super, element, preCompute) {
      $super();
      this.element = $(element);

      Element.Layout.PROPERTIES.each( function(property) {
        this._set(property, null);
      }, this);

      if (preCompute) {
        this._preComputing = true;
        this._begin();
        Element.Layout.PROPERTIES.each( this._compute, this );
        this._end();
        this._preComputing = false;
      }
    },

    _set: function(property, value) {
      return Hash.prototype.set.call(this, property, value);
    },

    set: function(property, value) {
      throw "Properties of Element.Layout are read-only.";
    },

    get: function($super, property) {
      var value = $super(property);
      return value === null ? this._compute(property) : value;
    },

    _begin: function() {
      if (this._prepared) return;

      var element = this.element;
      if (isDisplayed(element)) {
        this._prepared = true;
        return;
      }

      var originalStyles = {
        position:   element.style.position   || '',
        width:      element.style.width      || '',
        visibility: element.style.visibility || '',
        display:    element.style.display    || ''
      };

      element.store('prototype_original_styles', originalStyles);

      var position = element.getStyle('position'),
       width = element.getStyle('width');

      if (width === "0px" || width === null) {
        element.style.display = 'block';
        width = element.getStyle('width');
      }

      var context = (position === 'fixed') ? document.viewport :
       element.parentNode;

      element.setStyle({
        position:   'absolute',
        visibility: 'hidden',
        display:    'block'
      });

      var positionedWidth = element.getStyle('width');

      var newWidth;
      if (width && (positionedWidth === width)) {
        newWidth = getPixelValue(element, 'width', context);
      } else if (position === 'absolute' || position === 'fixed') {
        newWidth = getPixelValue(element, 'width', context);
      } else {
        var parent = element.parentNode, pLayout = $(parent).getLayout();

        newWidth = pLayout.get('width') -
         this.get('margin-left') -
         this.get('border-left') -
         this.get('padding-left') -
         this.get('padding-right') -
         this.get('border-right') -
         this.get('margin-right');
      }

      element.setStyle({ width: newWidth + 'px' });

      this._prepared = true;
    },

    _end: function() {
      var element = this.element;
      var originalStyles = element.retrieve('prototype_original_styles');
      element.store('prototype_original_styles', null);
      element.setStyle(originalStyles);
      this._prepared = false;
    },

    _compute: function(property) {
      var COMPUTATIONS = Element.Layout.COMPUTATIONS;
      if (!(property in COMPUTATIONS)) {
        throw "Property not found.";
      }

      return this._set(property, COMPUTATIONS[property].call(this, this.element));
    },

    toObject: function() {
      var args = $A(arguments);
      var keys = (args.length === 0) ? Element.Layout.PROPERTIES :
       args.join(' ').split(' ');
      var obj = {};
      keys.each( function(key) {
        if (!Element.Layout.PROPERTIES.include(key)) return;
        var value = this.get(key);
        if (value != null) obj[key] = value;
      }, this);
      return obj;
    },

    toHash: function() {
      var obj = this.toObject.apply(this, arguments);
      return new Hash(obj);
    },

    toCSS: function() {
      var args = $A(arguments);
      var keys = (args.length === 0) ? Element.Layout.PROPERTIES :
       args.join(' ').split(' ');
      var css = {};

      keys.each( function(key) {
        if (!Element.Layout.PROPERTIES.include(key)) return;
        if (Element.Layout.COMPOSITE_PROPERTIES.include(key)) return;

        var value = this.get(key);
        if (value != null) css[cssNameFor(key)] = value + 'px';
      }, this);
      return css;
    },

    inspect: function() {
      return "#<Element.Layout>";
    }
  });

  Object.extend(Element.Layout, {
    PROPERTIES: $w('height width top left right bottom border-left border-right border-top border-bottom padding-left padding-right padding-top padding-bottom margin-top margin-bottom margin-left margin-right padding-box-width padding-box-height border-box-width border-box-height margin-box-width margin-box-height'),

    COMPOSITE_PROPERTIES: $w('padding-box-width padding-box-height margin-box-width margin-box-height border-box-width border-box-height'),

    COMPUTATIONS: {
      'height': function(element) {
        if (!this._preComputing) this._begin();

        var bHeight = this.get('border-box-height');
        if (bHeight <= 0) {
          if (!this._preComputing) this._end();
          return 0;
        }

        var bTop = this.get('border-top'),
         bBottom = this.get('border-bottom');

        var pTop = this.get('padding-top'),
         pBottom = this.get('padding-bottom');

        if (!this._preComputing) this._end();

        return bHeight - bTop - bBottom - pTop - pBottom;
      },

      'width': function(element) {
        if (!this._preComputing) this._begin();

        var bWidth = this.get('border-box-width');
        if (bWidth <= 0) {
          if (!this._preComputing) this._end();
          return 0;
        }

        var bLeft = this.get('border-left'),
         bRight = this.get('border-right');

        var pLeft = this.get('padding-left'),
         pRight = this.get('padding-right');

        if (!this._preComputing) this._end();

        return bWidth - bLeft - bRight - pLeft - pRight;
      },

      'padding-box-height': function(element) {
        var height = this.get('height'),
         pTop = this.get('padding-top'),
         pBottom = this.get('padding-bottom');

        return height + pTop + pBottom;
      },

      'padding-box-width': function(element) {
        var width = this.get('width'),
         pLeft = this.get('padding-left'),
         pRight = this.get('padding-right');

        return width + pLeft + pRight;
      },

      'border-box-height': function(element) {
        if (!this._preComputing) this._begin();
        var height = element.offsetHeight;
        if (!this._preComputing) this._end();
        return height;
      },

      'border-box-width': function(element) {
        if (!this._preComputing) this._begin();
        var width = element.offsetWidth;
        if (!this._preComputing) this._end();
        return width;
      },

      'margin-box-height': function(element) {
        var bHeight = this.get('border-box-height'),
         mTop = this.get('margin-top'),
         mBottom = this.get('margin-bottom');

        if (bHeight <= 0) return 0;

        return bHeight + mTop + mBottom;
      },

      'margin-box-width': function(element) {
        var bWidth = this.get('border-box-width'),
         mLeft = this.get('margin-left'),
         mRight = this.get('margin-right');

        if (bWidth <= 0) return 0;

        return bWidth + mLeft + mRight;
      },

      'top': function(element) {
        var offset = element.positionedOffset();
        return offset.top;
      },

      'bottom': function(element) {
        var offset = element.positionedOffset(),
         parent = element.getOffsetParent(),
         pHeight = parent.measure('height');

        var mHeight = this.get('border-box-height');

        return pHeight - mHeight - offset.top;
      },

      'left': function(element) {
        var offset = element.positionedOffset();
        return offset.left;
      },

      'right': function(element) {
        var offset = element.positionedOffset(),
         parent = element.getOffsetParent(),
         pWidth = parent.measure('width');

        var mWidth = this.get('border-box-width');

        return pWidth - mWidth - offset.left;
      },

      'padding-top': function(element) {
        return getPixelValue(element, 'paddingTop');
      },

      'padding-bottom': function(element) {
        return getPixelValue(element, 'paddingBottom');
      },

      'padding-left': function(element) {
        return getPixelValue(element, 'paddingLeft');
      },

      'padding-right': function(element) {
        return getPixelValue(element, 'paddingRight');
      },

      'border-top': function(element) {
        return getPixelValue(element, 'borderTopWidth');
      },

      'border-bottom': function(element) {
        return getPixelValue(element, 'borderBottomWidth');
      },

      'border-left': function(element) {
        return getPixelValue(element, 'borderLeftWidth');
      },

      'border-right': function(element) {
        return getPixelValue(element, 'borderRightWidth');
      },

      'margin-top': function(element) {
        return getPixelValue(element, 'marginTop');
      },

      'margin-bottom': function(element) {
        return getPixelValue(element, 'marginBottom');
      },

      'margin-left': function(element) {
        return getPixelValue(element, 'marginLeft');
      },

      'margin-right': function(element) {
        return getPixelValue(element, 'marginRight');
      }
    }
  });

  if ('getBoundingClientRect' in document.documentElement) {
    Object.extend(Element.Layout.COMPUTATIONS, {
      'right': function(element) {
        var parent = hasLayout(element.getOffsetParent());
        var rect = element.getBoundingClientRect(),
         pRect = parent.getBoundingClientRect();

        return (pRect.right - rect.right).round();
      },

      'bottom': function(element) {
        var parent = hasLayout(element.getOffsetParent());
        var rect = element.getBoundingClientRect(),
         pRect = parent.getBoundingClientRect();

        return (pRect.bottom - rect.bottom).round();
      }
    });
  }

  Element.Offset = Class.create({
    initialize: function(left, top) {
      this.left = left.round();
      this.top  = top.round();

      this[0] = this.left;
      this[1] = this.top;
    },

    relativeTo: function(offset) {
      return new Element.Offset(
        this.left - offset.left,
        this.top  - offset.top
      );
    },

    inspect: function() {
      return "#<Element.Offset left: #{left} top: #{top}>".interpolate(this);
    },

    toString: function() {
      return "[#{left}, #{top}]".interpolate(this);
    },

    toArray: function() {
      return [this.left, this.top];
    }
  });

  function getLayout(element, preCompute) {
    return new Element.Layout(element, preCompute);
  }

  function measure(element, property) {
    return $(element).getLayout().get(property);
  }

  function getDimensions(element) {
    element = $(element);
    var display = Element.getStyle(element, 'display');

    if (display && display !== 'none') {
      return { width: element.offsetWidth, height: element.offsetHeight };
    }

    var style = element.style;
    var originalStyles = {
      visibility: style.visibility,
      position:   style.position,
      display:    style.display
    };

    var newStyles = {
      visibility: 'hidden',
      display:    'block'
    };

    if (originalStyles.position !== 'fixed')
      newStyles.position = 'absolute';

    Element.setStyle(element, newStyles);

    var dimensions = {
      width:  element.offsetWidth,
      height: element.offsetHeight
    };

    Element.setStyle(element, originalStyles);

    return dimensions;
  }

  function getOffsetParent(element) {
    element = $(element);

    if (isDocument(element) || isDetached(element) || isBody(element) || isHtml(element))
      return $(document.body);

    var isInline = (Element.getStyle(element, 'display') === 'inline');
    if (!isInline && element.offsetParent) return $(element.offsetParent);

    while ((element = element.parentNode) && element !== document.body) {
      if (Element.getStyle(element, 'position') !== 'static') {
        return isHtml(element) ? $(document.body) : $(element);
      }
    }

    return $(document.body);
  }


  function cumulativeOffset(element) {
    element = $(element);
    var valueT = 0, valueL = 0;
    if (element.parentNode) {
      do {
        valueT += element.offsetTop  || 0;
        valueL += element.offsetLeft || 0;
        element = element.offsetParent;
      } while (element);
    }
    return new Element.Offset(valueL, valueT);
  }

  function positionedOffset(element) {
    element = $(element);

    var layout = element.getLayout();

    var valueT = 0, valueL = 0;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      element = element.offsetParent;
      if (element) {
        if (isBody(element)) break;
        var p = Element.getStyle(element, 'position');
        if (p !== 'static') break;
      }
    } while (element);

    valueL -= layout.get('margin-top');
    valueT -= layout.get('margin-left');

    return new Element.Offset(valueL, valueT);
  }

  function cumulativeScrollOffset(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.scrollTop  || 0;
      valueL += element.scrollLeft || 0;
      element = element.parentNode;
    } while (element);
    return new Element.Offset(valueL, valueT);
  }

  function viewportOffset(forElement) {
    element = $(element);
    var valueT = 0, valueL = 0, docBody = document.body;

    var element = forElement;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      if (element.offsetParent == docBody &&
        Element.getStyle(element, 'position') == 'absolute') break;
    } while (element = element.offsetParent);

    element = forElement;
    do {
      if (element != docBody) {
        valueT -= element.scrollTop  || 0;
        valueL -= element.scrollLeft || 0;
      }
    } while (element = element.parentNode);
    return new Element.Offset(valueL, valueT);
  }

  function absolutize(element) {
    element = $(element);

    if (Element.getStyle(element, 'position') === 'absolute') {
      return element;
    }

    var offsetParent = getOffsetParent(element);
    var eOffset = element.viewportOffset(),
     pOffset = offsetParent.viewportOffset();

    var offset = eOffset.relativeTo(pOffset);
    var layout = element.getLayout();

    element.store('prototype_absolutize_original_styles', {
      left:   element.getStyle('left'),
      top:    element.getStyle('top'),
      width:  element.getStyle('width'),
      height: element.getStyle('height')
    });

    element.setStyle({
      position: 'absolute',
      top:    offset.top + 'px',
      left:   offset.left + 'px',
      width:  layout.get('width') + 'px',
      height: layout.get('height') + 'px'
    });

    return element;
  }

  function relativize(element) {
    element = $(element);
    if (Element.getStyle(element, 'position') === 'relative') {
      return element;
    }

    var originalStyles =
     element.retrieve('prototype_absolutize_original_styles');

    if (originalStyles) element.setStyle(originalStyles);
    return element;
  }

  if (Prototype.Browser.IE) {
    getOffsetParent = getOffsetParent.wrap(
      function(proceed, element) {
        element = $(element);

        if (isDocument(element) || isDetached(element) || isBody(element) || isHtml(element))
          return $(document.body);

        var position = element.getStyle('position');
        if (position !== 'static') return proceed(element);

        element.setStyle({ position: 'relative' });
        var value = proceed(element);
        element.setStyle({ position: position });
        return value;
      }
    );

    positionedOffset = positionedOffset.wrap(function(proceed, element) {
      element = $(element);
      if (!element.parentNode) return new Element.Offset(0, 0);
      var position = element.getStyle('position');
      if (position !== 'static') return proceed(element);

      var offsetParent = element.getOffsetParent();
      if (offsetParent && offsetParent.getStyle('position') === 'fixed')
        hasLayout(offsetParent);

      element.setStyle({ position: 'relative' });
      var value = proceed(element);
      element.setStyle({ position: position });
      return value;
    });
  } else if (Prototype.Browser.Webkit) {
    cumulativeOffset = function(element) {
      element = $(element);
      var valueT = 0, valueL = 0;
      do {
        valueT += element.offsetTop  || 0;
        valueL += element.offsetLeft || 0;
        if (element.offsetParent == document.body)
          if (Element.getStyle(element, 'position') == 'absolute') break;

        element = element.offsetParent;
      } while (element);

      return new Element.Offset(valueL, valueT);
    };
  }


  Element.addMethods({
    getLayout:              getLayout,
    measure:                measure,
    getDimensions:          getDimensions,
    getOffsetParent:        getOffsetParent,
    cumulativeOffset:       cumulativeOffset,
    positionedOffset:       positionedOffset,
    cumulativeScrollOffset: cumulativeScrollOffset,
    viewportOffset:         viewportOffset,
    absolutize:             absolutize,
    relativize:             relativize
  });

  function isBody(element) {
    return element.nodeName.toUpperCase() === 'BODY';
  }

  function isHtml(element) {
    return element.nodeName.toUpperCase() === 'HTML';
  }

  function isDocument(element) {
    return element.nodeType === Node.DOCUMENT_NODE;
  }

  function isDetached(element) {
    return element !== document.body &&
     !Element.descendantOf(element, document.body);
  }

  if ('getBoundingClientRect' in document.documentElement) {
    Element.addMethods({
      viewportOffset: function(element) {
        element = $(element);
        if (isDetached(element)) return new Element.Offset(0, 0);

        var rect = element.getBoundingClientRect(),
         docEl = document.documentElement;
        return new Element.Offset(rect.left - docEl.clientLeft,
         rect.top - docEl.clientTop);
      }
    });
  }
})();
window.$$ = function() {
  var expression = $A(arguments).join(', ');
  return Prototype.Selector.select(expression, document);
};

Prototype.Selector = (function() {

  function select() {
    throw new Error('Method "Prototype.Selector.select" must be defined.');
  }

  function match() {
    throw new Error('Method "Prototype.Selector.match" must be defined.');
  }

  function find(elements, expression, index) {
    index = index || 0;
    var match = Prototype.Selector.match, length = elements.length, matchIndex = 0, i;

    for (i = 0; i < length; i++) {
      if (match(elements[i], expression) && index == matchIndex++) {
        return Element.extend(elements[i]);
      }
    }
  }

  function extendElements(elements) {
    for (var i = 0, length = elements.length; i < length; i++) {
      Element.extend(elements[i]);
    }
    return elements;
  }


  var K = Prototype.K;

  return {
    select: select,
    match: match,
    find: find,
    extendElements: (Element.extend === K) ? K : extendElements,
    extendElement: Element.extend
  };
})();
Prototype._original_property = window.Sizzle;
/*!
 * Sizzle CSS Selector Engine - v1.0
 *  Copyright 2009, The Dojo Foundation
 *  Released under the MIT, BSD, and GPL Licenses.
 *  More information: http://sizzlejs.com/
 */
(function(){

var chunker = /((?:\((?:\([^()]+\)|[^()]+)+\)|\[(?:\[[^[\]]*\]|['"][^'"]*['"]|[^[\]'"]+)+\]|\\.|[^ >+~,(\[\\]+)+|[>+~])(\s*,\s*)?((?:.|\r|\n)*)/g,
	done = 0,
	toString = Object.prototype.toString,
	hasDuplicate = false,
	baseHasDuplicate = true;

[0, 0].sort(function(){
	baseHasDuplicate = false;
	return 0;
});

var Sizzle = function(selector, context, results, seed) {
	results = results || [];
	var origContext = context = context || document;

	if ( context.nodeType !== 1 && context.nodeType !== 9 ) {
		return [];
	}

	if ( !selector || typeof selector !== "string" ) {
		return results;
	}

	var parts = [], m, set, checkSet, check, mode, extra, prune = true, contextXML = isXML(context),
		soFar = selector;

	while ( (chunker.exec(""), m = chunker.exec(soFar)) !== null ) {
		soFar = m[3];

		parts.push( m[1] );

		if ( m[2] ) {
			extra = m[3];
			break;
		}
	}

	if ( parts.length > 1 && origPOS.exec( selector ) ) {
		if ( parts.length === 2 && Expr.relative[ parts[0] ] ) {
			set = posProcess( parts[0] + parts[1], context );
		} else {
			set = Expr.relative[ parts[0] ] ?
				[ context ] :
				Sizzle( parts.shift(), context );

			while ( parts.length ) {
				selector = parts.shift();

				if ( Expr.relative[ selector ] )
					selector += parts.shift();

				set = posProcess( selector, set );
			}
		}
	} else {
		if ( !seed && parts.length > 1 && context.nodeType === 9 && !contextXML &&
				Expr.match.ID.test(parts[0]) && !Expr.match.ID.test(parts[parts.length - 1]) ) {
			var ret = Sizzle.find( parts.shift(), context, contextXML );
			context = ret.expr ? Sizzle.filter( ret.expr, ret.set )[0] : ret.set[0];
		}

		if ( context ) {
			var ret = seed ?
				{ expr: parts.pop(), set: makeArray(seed) } :
				Sizzle.find( parts.pop(), parts.length === 1 && (parts[0] === "~" || parts[0] === "+") && context.parentNode ? context.parentNode : context, contextXML );
			set = ret.expr ? Sizzle.filter( ret.expr, ret.set ) : ret.set;

			if ( parts.length > 0 ) {
				checkSet = makeArray(set);
			} else {
				prune = false;
			}

			while ( parts.length ) {
				var cur = parts.pop(), pop = cur;

				if ( !Expr.relative[ cur ] ) {
					cur = "";
				} else {
					pop = parts.pop();
				}

				if ( pop == null ) {
					pop = context;
				}

				Expr.relative[ cur ]( checkSet, pop, contextXML );
			}
		} else {
			checkSet = parts = [];
		}
	}

	if ( !checkSet ) {
		checkSet = set;
	}

	if ( !checkSet ) {
		throw "Syntax error, unrecognized expression: " + (cur || selector);
	}

	if ( toString.call(checkSet) === "[object Array]" ) {
		if ( !prune ) {
			results.push.apply( results, checkSet );
		} else if ( context && context.nodeType === 1 ) {
			for ( var i = 0; checkSet[i] != null; i++ ) {
				if ( checkSet[i] && (checkSet[i] === true || checkSet[i].nodeType === 1 && contains(context, checkSet[i])) ) {
					results.push( set[i] );
				}
			}
		} else {
			for ( var i = 0; checkSet[i] != null; i++ ) {
				if ( checkSet[i] && checkSet[i].nodeType === 1 ) {
					results.push( set[i] );
				}
			}
		}
	} else {
		makeArray( checkSet, results );
	}

	if ( extra ) {
		Sizzle( extra, origContext, results, seed );
		Sizzle.uniqueSort( results );
	}

	return results;
};

Sizzle.uniqueSort = function(results){
	if ( sortOrder ) {
		hasDuplicate = baseHasDuplicate;
		results.sort(sortOrder);

		if ( hasDuplicate ) {
			for ( var i = 1; i < results.length; i++ ) {
				if ( results[i] === results[i-1] ) {
					results.splice(i--, 1);
				}
			}
		}
	}

	return results;
};

Sizzle.matches = function(expr, set){
	return Sizzle(expr, null, null, set);
};

Sizzle.find = function(expr, context, isXML){
	var set, match;

	if ( !expr ) {
		return [];
	}

	for ( var i = 0, l = Expr.order.length; i < l; i++ ) {
		var type = Expr.order[i], match;

		if ( (match = Expr.leftMatch[ type ].exec( expr )) ) {
			var left = match[1];
			match.splice(1,1);

			if ( left.substr( left.length - 1 ) !== "\\" ) {
				match[1] = (match[1] || "").replace(/\\/g, "");
				set = Expr.find[ type ]( match, context, isXML );
				if ( set != null ) {
					expr = expr.replace( Expr.match[ type ], "" );
					break;
				}
			}
		}
	}

	if ( !set ) {
		set = context.getElementsByTagName("*");
	}

	return {set: set, expr: expr};
};

Sizzle.filter = function(expr, set, inplace, not){
	var old = expr, result = [], curLoop = set, match, anyFound,
		isXMLFilter = set && set[0] && isXML(set[0]);

	while ( expr && set.length ) {
		for ( var type in Expr.filter ) {
			if ( (match = Expr.match[ type ].exec( expr )) != null ) {
				var filter = Expr.filter[ type ], found, item;
				anyFound = false;

				if ( curLoop == result ) {
					result = [];
				}

				if ( Expr.preFilter[ type ] ) {
					match = Expr.preFilter[ type ]( match, curLoop, inplace, result, not, isXMLFilter );

					if ( !match ) {
						anyFound = found = true;
					} else if ( match === true ) {
						continue;
					}
				}

				if ( match ) {
					for ( var i = 0; (item = curLoop[i]) != null; i++ ) {
						if ( item ) {
							found = filter( item, match, i, curLoop );
							var pass = not ^ !!found;

							if ( inplace && found != null ) {
								if ( pass ) {
									anyFound = true;
								} else {
									curLoop[i] = false;
								}
							} else if ( pass ) {
								result.push( item );
								anyFound = true;
							}
						}
					}
				}

				if ( found !== undefined ) {
					if ( !inplace ) {
						curLoop = result;
					}

					expr = expr.replace( Expr.match[ type ], "" );

					if ( !anyFound ) {
						return [];
					}

					break;
				}
			}
		}

		if ( expr == old ) {
			if ( anyFound == null ) {
				throw "Syntax error, unrecognized expression: " + expr;
			} else {
				break;
			}
		}

		old = expr;
	}

	return curLoop;
};

var Expr = Sizzle.selectors = {
	order: [ "ID", "NAME", "TAG" ],
	match: {
		ID: /#((?:[\w\u00c0-\uFFFF-]|\\.)+)/,
		CLASS: /\.((?:[\w\u00c0-\uFFFF-]|\\.)+)/,
		NAME: /\[name=['"]*((?:[\w\u00c0-\uFFFF-]|\\.)+)['"]*\]/,
		ATTR: /\[\s*((?:[\w\u00c0-\uFFFF-]|\\.)+)\s*(?:(\S?=)\s*(['"]*)(.*?)\3|)\s*\]/,
		TAG: /^((?:[\w\u00c0-\uFFFF\*-]|\\.)+)/,
		CHILD: /:(only|nth|last|first)-child(?:\((even|odd|[\dn+-]*)\))?/,
		POS: /:(nth|eq|gt|lt|first|last|even|odd)(?:\((\d*)\))?(?=[^-]|$)/,
		PSEUDO: /:((?:[\w\u00c0-\uFFFF-]|\\.)+)(?:\((['"]*)((?:\([^\)]+\)|[^\2\(\)]*)+)\2\))?/
	},
	leftMatch: {},
	attrMap: {
		"class": "className",
		"for": "htmlFor"
	},
	attrHandle: {
		href: function(elem){
			return elem.getAttribute("href");
		}
	},
	relative: {
		"+": function(checkSet, part, isXML){
			var isPartStr = typeof part === "string",
				isTag = isPartStr && !/\W/.test(part),
				isPartStrNotTag = isPartStr && !isTag;

			if ( isTag && !isXML ) {
				part = part.toUpperCase();
			}

			for ( var i = 0, l = checkSet.length, elem; i < l; i++ ) {
				if ( (elem = checkSet[i]) ) {
					while ( (elem = elem.previousSibling) && elem.nodeType !== 1 ) {}

					checkSet[i] = isPartStrNotTag || elem && elem.nodeName === part ?
						elem || false :
						elem === part;
				}
			}

			if ( isPartStrNotTag ) {
				Sizzle.filter( part, checkSet, true );
			}
		},
		">": function(checkSet, part, isXML){
			var isPartStr = typeof part === "string";

			if ( isPartStr && !/\W/.test(part) ) {
				part = isXML ? part : part.toUpperCase();

				for ( var i = 0, l = checkSet.length; i < l; i++ ) {
					var elem = checkSet[i];
					if ( elem ) {
						var parent = elem.parentNode;
						checkSet[i] = parent.nodeName === part ? parent : false;
					}
				}
			} else {
				for ( var i = 0, l = checkSet.length; i < l; i++ ) {
					var elem = checkSet[i];
					if ( elem ) {
						checkSet[i] = isPartStr ?
							elem.parentNode :
							elem.parentNode === part;
					}
				}

				if ( isPartStr ) {
					Sizzle.filter( part, checkSet, true );
				}
			}
		},
		"": function(checkSet, part, isXML){
			var doneName = done++, checkFn = dirCheck;

			if ( !/\W/.test(part) ) {
				var nodeCheck = part = isXML ? part : part.toUpperCase();
				checkFn = dirNodeCheck;
			}

			checkFn("parentNode", part, doneName, checkSet, nodeCheck, isXML);
		},
		"~": function(checkSet, part, isXML){
			var doneName = done++, checkFn = dirCheck;

			if ( typeof part === "string" && !/\W/.test(part) ) {
				var nodeCheck = part = isXML ? part : part.toUpperCase();
				checkFn = dirNodeCheck;
			}

			checkFn("previousSibling", part, doneName, checkSet, nodeCheck, isXML);
		}
	},
	find: {
		ID: function(match, context, isXML){
			if ( typeof context.getElementById !== "undefined" && !isXML ) {
				var m = context.getElementById(match[1]);
				return m ? [m] : [];
			}
		},
		NAME: function(match, context, isXML){
			if ( typeof context.getElementsByName !== "undefined" ) {
				var ret = [], results = context.getElementsByName(match[1]);

				for ( var i = 0, l = results.length; i < l; i++ ) {
					if ( results[i].getAttribute("name") === match[1] ) {
						ret.push( results[i] );
					}
				}

				return ret.length === 0 ? null : ret;
			}
		},
		TAG: function(match, context){
			return context.getElementsByTagName(match[1]);
		}
	},
	preFilter: {
		CLASS: function(match, curLoop, inplace, result, not, isXML){
			match = " " + match[1].replace(/\\/g, "") + " ";

			if ( isXML ) {
				return match;
			}

			for ( var i = 0, elem; (elem = curLoop[i]) != null; i++ ) {
				if ( elem ) {
					if ( not ^ (elem.className && (" " + elem.className + " ").indexOf(match) >= 0) ) {
						if ( !inplace )
							result.push( elem );
					} else if ( inplace ) {
						curLoop[i] = false;
					}
				}
			}

			return false;
		},
		ID: function(match){
			return match[1].replace(/\\/g, "");
		},
		TAG: function(match, curLoop){
			for ( var i = 0; curLoop[i] === false; i++ ){}
			return curLoop[i] && isXML(curLoop[i]) ? match[1] : match[1].toUpperCase();
		},
		CHILD: function(match){
			if ( match[1] == "nth" ) {
				var test = /(-?)(\d*)n((?:\+|-)?\d*)/.exec(
					match[2] == "even" && "2n" || match[2] == "odd" && "2n+1" ||
					!/\D/.test( match[2] ) && "0n+" + match[2] || match[2]);

				match[2] = (test[1] + (test[2] || 1)) - 0;
				match[3] = test[3] - 0;
			}

			match[0] = done++;

			return match;
		},
		ATTR: function(match, curLoop, inplace, result, not, isXML){
			var name = match[1].replace(/\\/g, "");

			if ( !isXML && Expr.attrMap[name] ) {
				match[1] = Expr.attrMap[name];
			}

			if ( match[2] === "~=" ) {
				match[4] = " " + match[4] + " ";
			}

			return match;
		},
		PSEUDO: function(match, curLoop, inplace, result, not){
			if ( match[1] === "not" ) {
				if ( ( chunker.exec(match[3]) || "" ).length > 1 || /^\w/.test(match[3]) ) {
					match[3] = Sizzle(match[3], null, null, curLoop);
				} else {
					var ret = Sizzle.filter(match[3], curLoop, inplace, true ^ not);
					if ( !inplace ) {
						result.push.apply( result, ret );
					}
					return false;
				}
			} else if ( Expr.match.POS.test( match[0] ) || Expr.match.CHILD.test( match[0] ) ) {
				return true;
			}

			return match;
		},
		POS: function(match){
			match.unshift( true );
			return match;
		}
	},
	filters: {
		enabled: function(elem){
			return elem.disabled === false && elem.type !== "hidden";
		},
		disabled: function(elem){
			return elem.disabled === true;
		},
		checked: function(elem){
			return elem.checked === true;
		},
		selected: function(elem){
			elem.parentNode.selectedIndex;
			return elem.selected === true;
		},
		parent: function(elem){
			return !!elem.firstChild;
		},
		empty: function(elem){
			return !elem.firstChild;
		},
		has: function(elem, i, match){
			return !!Sizzle( match[3], elem ).length;
		},
		header: function(elem){
			return /h\d/i.test( elem.nodeName );
		},
		text: function(elem){
			return "text" === elem.type;
		},
		radio: function(elem){
			return "radio" === elem.type;
		},
		checkbox: function(elem){
			return "checkbox" === elem.type;
		},
		file: function(elem){
			return "file" === elem.type;
		},
		password: function(elem){
			return "password" === elem.type;
		},
		submit: function(elem){
			return "submit" === elem.type;
		},
		image: function(elem){
			return "image" === elem.type;
		},
		reset: function(elem){
			return "reset" === elem.type;
		},
		button: function(elem){
			return "button" === elem.type || elem.nodeName.toUpperCase() === "BUTTON";
		},
		input: function(elem){
			return /input|select|textarea|button/i.test(elem.nodeName);
		}
	},
	setFilters: {
		first: function(elem, i){
			return i === 0;
		},
		last: function(elem, i, match, array){
			return i === array.length - 1;
		},
		even: function(elem, i){
			return i % 2 === 0;
		},
		odd: function(elem, i){
			return i % 2 === 1;
		},
		lt: function(elem, i, match){
			return i < match[3] - 0;
		},
		gt: function(elem, i, match){
			return i > match[3] - 0;
		},
		nth: function(elem, i, match){
			return match[3] - 0 == i;
		},
		eq: function(elem, i, match){
			return match[3] - 0 == i;
		}
	},
	filter: {
		PSEUDO: function(elem, match, i, array){
			var name = match[1], filter = Expr.filters[ name ];

			if ( filter ) {
				return filter( elem, i, match, array );
			} else if ( name === "contains" ) {
				return (elem.textContent || elem.innerText || "").indexOf(match[3]) >= 0;
			} else if ( name === "not" ) {
				var not = match[3];

				for ( var i = 0, l = not.length; i < l; i++ ) {
					if ( not[i] === elem ) {
						return false;
					}
				}

				return true;
			}
		},
		CHILD: function(elem, match){
			var type = match[1], node = elem;
			switch (type) {
				case 'only':
				case 'first':
					while ( (node = node.previousSibling) )  {
						if ( node.nodeType === 1 ) return false;
					}
					if ( type == 'first') return true;
					node = elem;
				case 'last':
					while ( (node = node.nextSibling) )  {
						if ( node.nodeType === 1 ) return false;
					}
					return true;
				case 'nth':
					var first = match[2], last = match[3];

					if ( first == 1 && last == 0 ) {
						return true;
					}

					var doneName = match[0],
						parent = elem.parentNode;

					if ( parent && (parent.sizcache !== doneName || !elem.nodeIndex) ) {
						var count = 0;
						for ( node = parent.firstChild; node; node = node.nextSibling ) {
							if ( node.nodeType === 1 ) {
								node.nodeIndex = ++count;
							}
						}
						parent.sizcache = doneName;
					}

					var diff = elem.nodeIndex - last;
					if ( first == 0 ) {
						return diff == 0;
					} else {
						return ( diff % first == 0 && diff / first >= 0 );
					}
			}
		},
		ID: function(elem, match){
			return elem.nodeType === 1 && elem.getAttribute("id") === match;
		},
		TAG: function(elem, match){
			return (match === "*" && elem.nodeType === 1) || elem.nodeName === match;
		},
		CLASS: function(elem, match){
			return (" " + (elem.className || elem.getAttribute("class")) + " ")
				.indexOf( match ) > -1;
		},
		ATTR: function(elem, match){
			var name = match[1],
				result = Expr.attrHandle[ name ] ?
					Expr.attrHandle[ name ]( elem ) :
					elem[ name ] != null ?
						elem[ name ] :
						elem.getAttribute( name ),
				value = result + "",
				type = match[2],
				check = match[4];

			return result == null ?
				type === "!=" :
				type === "=" ?
				value === check :
				type === "*=" ?
				value.indexOf(check) >= 0 :
				type === "~=" ?
				(" " + value + " ").indexOf(check) >= 0 :
				!check ?
				value && result !== false :
				type === "!=" ?
				value != check :
				type === "^=" ?
				value.indexOf(check) === 0 :
				type === "$=" ?
				value.substr(value.length - check.length) === check :
				type === "|=" ?
				value === check || value.substr(0, check.length + 1) === check + "-" :
				false;
		},
		POS: function(elem, match, i, array){
			var name = match[2], filter = Expr.setFilters[ name ];

			if ( filter ) {
				return filter( elem, i, match, array );
			}
		}
	}
};

var origPOS = Expr.match.POS;

for ( var type in Expr.match ) {
	Expr.match[ type ] = new RegExp( Expr.match[ type ].source + /(?![^\[]*\])(?![^\(]*\))/.source );
	Expr.leftMatch[ type ] = new RegExp( /(^(?:.|\r|\n)*?)/.source + Expr.match[ type ].source );
}

var makeArray = function(array, results) {
	array = Array.prototype.slice.call( array, 0 );

	if ( results ) {
		results.push.apply( results, array );
		return results;
	}

	return array;
};

try {
	Array.prototype.slice.call( document.documentElement.childNodes, 0 );

} catch(e){
	makeArray = function(array, results) {
		var ret = results || [];

		if ( toString.call(array) === "[object Array]" ) {
			Array.prototype.push.apply( ret, array );
		} else {
			if ( typeof array.length === "number" ) {
				for ( var i = 0, l = array.length; i < l; i++ ) {
					ret.push( array[i] );
				}
			} else {
				for ( var i = 0; array[i]; i++ ) {
					ret.push( array[i] );
				}
			}
		}

		return ret;
	};
}

var sortOrder;

if ( document.documentElement.compareDocumentPosition ) {
	sortOrder = function( a, b ) {
		if ( !a.compareDocumentPosition || !b.compareDocumentPosition ) {
			if ( a == b ) {
				hasDuplicate = true;
			}
			return 0;
		}

		var ret = a.compareDocumentPosition(b) & 4 ? -1 : a === b ? 0 : 1;
		if ( ret === 0 ) {
			hasDuplicate = true;
		}
		return ret;
	};
} else if ( "sourceIndex" in document.documentElement ) {
	sortOrder = function( a, b ) {
		if ( !a.sourceIndex || !b.sourceIndex ) {
			if ( a == b ) {
				hasDuplicate = true;
			}
			return 0;
		}

		var ret = a.sourceIndex - b.sourceIndex;
		if ( ret === 0 ) {
			hasDuplicate = true;
		}
		return ret;
	};
} else if ( document.createRange ) {
	sortOrder = function( a, b ) {
		if ( !a.ownerDocument || !b.ownerDocument ) {
			if ( a == b ) {
				hasDuplicate = true;
			}
			return 0;
		}

		var aRange = a.ownerDocument.createRange(), bRange = b.ownerDocument.createRange();
		aRange.setStart(a, 0);
		aRange.setEnd(a, 0);
		bRange.setStart(b, 0);
		bRange.setEnd(b, 0);
		var ret = aRange.compareBoundaryPoints(Range.START_TO_END, bRange);
		if ( ret === 0 ) {
			hasDuplicate = true;
		}
		return ret;
	};
}

(function(){
	var form = document.createElement("div"),
		id = "script" + (new Date).getTime();
	form.innerHTML = "<a name='" + id + "'/>";

	var root = document.documentElement;
	root.insertBefore( form, root.firstChild );

	if ( !!document.getElementById( id ) ) {
		Expr.find.ID = function(match, context, isXML){
			if ( typeof context.getElementById !== "undefined" && !isXML ) {
				var m = context.getElementById(match[1]);
				return m ? m.id === match[1] || typeof m.getAttributeNode !== "undefined" && m.getAttributeNode("id").nodeValue === match[1] ? [m] : undefined : [];
			}
		};

		Expr.filter.ID = function(elem, match){
			var node = typeof elem.getAttributeNode !== "undefined" && elem.getAttributeNode("id");
			return elem.nodeType === 1 && node && node.nodeValue === match;
		};
	}

	root.removeChild( form );
	root = form = null; // release memory in IE
})();

(function(){

	var div = document.createElement("div");
	div.appendChild( document.createComment("") );

	if ( div.getElementsByTagName("*").length > 0 ) {
		Expr.find.TAG = function(match, context){
			var results = context.getElementsByTagName(match[1]);

			if ( match[1] === "*" ) {
				var tmp = [];

				for ( var i = 0; results[i]; i++ ) {
					if ( results[i].nodeType === 1 ) {
						tmp.push( results[i] );
					}
				}

				results = tmp;
			}

			return results;
		};
	}

	div.innerHTML = "<a href='#'></a>";
	if ( div.firstChild && typeof div.firstChild.getAttribute !== "undefined" &&
			div.firstChild.getAttribute("href") !== "#" ) {
		Expr.attrHandle.href = function(elem){
			return elem.getAttribute("href", 2);
		};
	}

	div = null; // release memory in IE
})();

if ( document.querySelectorAll ) (function(){
	var oldSizzle = Sizzle, div = document.createElement("div");
	div.innerHTML = "<p class='TEST'></p>";

	if ( div.querySelectorAll && div.querySelectorAll(".TEST").length === 0 ) {
		return;
	}

	Sizzle = function(query, context, extra, seed){
		context = context || document;

		if ( !seed && context.nodeType === 9 && !isXML(context) ) {
			try {
				return makeArray( context.querySelectorAll(query), extra );
			} catch(e){}
		}

		return oldSizzle(query, context, extra, seed);
	};

	for ( var prop in oldSizzle ) {
		Sizzle[ prop ] = oldSizzle[ prop ];
	}

	div = null; // release memory in IE
})();

if ( document.getElementsByClassName && document.documentElement.getElementsByClassName ) (function(){
	var div = document.createElement("div");
	div.innerHTML = "<div class='test e'></div><div class='test'></div>";

	if ( div.getElementsByClassName("e").length === 0 )
		return;

	div.lastChild.className = "e";

	if ( div.getElementsByClassName("e").length === 1 )
		return;

	Expr.order.splice(1, 0, "CLASS");
	Expr.find.CLASS = function(match, context, isXML) {
		if ( typeof context.getElementsByClassName !== "undefined" && !isXML ) {
			return context.getElementsByClassName(match[1]);
		}
	};

	div = null; // release memory in IE
})();

function dirNodeCheck( dir, cur, doneName, checkSet, nodeCheck, isXML ) {
	var sibDir = dir == "previousSibling" && !isXML;
	for ( var i = 0, l = checkSet.length; i < l; i++ ) {
		var elem = checkSet[i];
		if ( elem ) {
			if ( sibDir && elem.nodeType === 1 ){
				elem.sizcache = doneName;
				elem.sizset = i;
			}
			elem = elem[dir];
			var match = false;

			while ( elem ) {
				if ( elem.sizcache === doneName ) {
					match = checkSet[elem.sizset];
					break;
				}

				if ( elem.nodeType === 1 && !isXML ){
					elem.sizcache = doneName;
					elem.sizset = i;
				}

				if ( elem.nodeName === cur ) {
					match = elem;
					break;
				}

				elem = elem[dir];
			}

			checkSet[i] = match;
		}
	}
}

function dirCheck( dir, cur, doneName, checkSet, nodeCheck, isXML ) {
	var sibDir = dir == "previousSibling" && !isXML;
	for ( var i = 0, l = checkSet.length; i < l; i++ ) {
		var elem = checkSet[i];
		if ( elem ) {
			if ( sibDir && elem.nodeType === 1 ) {
				elem.sizcache = doneName;
				elem.sizset = i;
			}
			elem = elem[dir];
			var match = false;

			while ( elem ) {
				if ( elem.sizcache === doneName ) {
					match = checkSet[elem.sizset];
					break;
				}

				if ( elem.nodeType === 1 ) {
					if ( !isXML ) {
						elem.sizcache = doneName;
						elem.sizset = i;
					}
					if ( typeof cur !== "string" ) {
						if ( elem === cur ) {
							match = true;
							break;
						}

					} else if ( Sizzle.filter( cur, [elem] ).length > 0 ) {
						match = elem;
						break;
					}
				}

				elem = elem[dir];
			}

			checkSet[i] = match;
		}
	}
}

var contains = document.compareDocumentPosition ?  function(a, b){
	return a.compareDocumentPosition(b) & 16;
} : function(a, b){
	return a !== b && (a.contains ? a.contains(b) : true);
};

var isXML = function(elem){
	return elem.nodeType === 9 && elem.documentElement.nodeName !== "HTML" ||
		!!elem.ownerDocument && elem.ownerDocument.documentElement.nodeName !== "HTML";
};

var posProcess = function(selector, context){
	var tmpSet = [], later = "", match,
		root = context.nodeType ? [context] : context;

	while ( (match = Expr.match.PSEUDO.exec( selector )) ) {
		later += match[0];
		selector = selector.replace( Expr.match.PSEUDO, "" );
	}

	selector = Expr.relative[selector] ? selector + "*" : selector;

	for ( var i = 0, l = root.length; i < l; i++ ) {
		Sizzle( selector, root[i], tmpSet );
	}

	return Sizzle.filter( later, tmpSet );
};


window.Sizzle = Sizzle;

})();

;(function(engine) {
  var extendElements = Prototype.Selector.extendElements;

  function select(selector, scope) {
    return extendElements(engine(selector, scope || document));
  }

  function match(element, selector) {
    return engine.matches(selector, [element]).length == 1;
  }

  Prototype.Selector.engine = engine;
  Prototype.Selector.select = select;
  Prototype.Selector.match = match;
})(Sizzle);

window.Sizzle = Prototype._original_property;
delete Prototype._original_property;

var Form = {
  reset: function(form) {
    form = $(form);
    form.reset();
    return form;
  },

  serializeElements: function(elements, options) {
    if (typeof options != 'object') options = { hash: !!options };
    else if (Object.isUndefined(options.hash)) options.hash = true;
    var key, value, submitted = false, submit = options.submit, accumulator, initial;

    if (options.hash) {
      initial = {};
      accumulator = function(result, key, value) {
        if (key in result) {
          if (!Object.isArray(result[key])) result[key] = [result[key]];
          result[key].push(value);
        } else result[key] = value;
        return result;
      };
    } else {
      initial = '';
      accumulator = function(result, key, value) {
        return result + (result ? '&' : '') + encodeURIComponent(key) + '=' + encodeURIComponent(value);
      }
    }

    return elements.inject(initial, function(result, element) {
      if (!element.disabled && element.name) {
        key = element.name; value = $(element).getValue();
        if (value != null && element.type != 'file' && (element.type != 'submit' || (!submitted &&
            submit !== false && (!submit || key == submit) && (submitted = true)))) {
          result = accumulator(result, key, value);
        }
      }
      return result;
    });
  }
};

Form.Methods = {
  serialize: function(form, options) {
    return Form.serializeElements(Form.getElements(form), options);
  },

  getElements: function(form) {
    var elements = $(form).getElementsByTagName('*'),
        element,
        arr = [ ],
        serializers = Form.Element.Serializers;
    for (var i = 0; element = elements[i]; i++) {
      arr.push(element);
    }
    return arr.inject([], function(elements, child) {
      if (serializers[child.tagName.toLowerCase()])
        elements.push(Element.extend(child));
      return elements;
    })
  },

  getInputs: function(form, typeName, name) {
    form = $(form);
    var inputs = form.getElementsByTagName('input');

    if (!typeName && !name) return $A(inputs).map(Element.extend);

    for (var i = 0, matchingInputs = [], length = inputs.length; i < length; i++) {
      var input = inputs[i];
      if ((typeName && input.type != typeName) || (name && input.name != name))
        continue;
      matchingInputs.push(Element.extend(input));
    }

    return matchingInputs;
  },

  disable: function(form) {
    form = $(form);
    Form.getElements(form).invoke('disable');
    return form;
  },

  enable: function(form) {
    form = $(form);
    Form.getElements(form).invoke('enable');
    return form;
  },

  findFirstElement: function(form) {
    var elements = $(form).getElements().findAll(function(element) {
      return 'hidden' != element.type && !element.disabled;
    });
    var firstByIndex = elements.findAll(function(element) {
      return element.hasAttribute('tabIndex') && element.tabIndex >= 0;
    }).sortBy(function(element) { return element.tabIndex }).first();

    return firstByIndex ? firstByIndex : elements.find(function(element) {
      return /^(?:input|select|textarea)$/i.test(element.tagName);
    });
  },

  focusFirstElement: function(form) {
    form = $(form);
    var element = form.findFirstElement();
    if (element) element.activate();
    return form;
  },

  request: function(form, options) {
    form = $(form), options = Object.clone(options || { });

    var params = options.parameters, action = form.readAttribute('action') || '';
    if (action.blank()) action = window.location.href;
    options.parameters = form.serialize(true);

    if (params) {
      if (Object.isString(params)) params = params.toQueryParams();
      Object.extend(options.parameters, params);
    }

    if (form.hasAttribute('method') && !options.method)
      options.method = form.method;

    return new Ajax.Request(action, options);
  }
};

/*--------------------------------------------------------------------------*/


Form.Element = {
  focus: function(element) {
    $(element).focus();
    return element;
  },

  select: function(element) {
    $(element).select();
    return element;
  }
};

Form.Element.Methods = {

  serialize: function(element) {
    element = $(element);
    if (!element.disabled && element.name) {
      var value = element.getValue();
      if (value != undefined) {
        var pair = { };
        pair[element.name] = value;
        return Object.toQueryString(pair);
      }
    }
    return '';
  },

  getValue: function(element) {
    element = $(element);
    var method = element.tagName.toLowerCase();
    return Form.Element.Serializers[method](element);
  },

  setValue: function(element, value) {
    element = $(element);
    var method = element.tagName.toLowerCase();
    Form.Element.Serializers[method](element, value);
    return element;
  },

  clear: function(element) {
    $(element).value = '';
    return element;
  },

  present: function(element) {
    return $(element).value != '';
  },

  activate: function(element) {
    element = $(element);
    try {
      element.focus();
      if (element.select && (element.tagName.toLowerCase() != 'input' ||
          !(/^(?:button|reset|submit)$/i.test(element.type))))
        element.select();
    } catch (e) { }
    return element;
  },

  disable: function(element) {
    element = $(element);
    element.disabled = true;
    return element;
  },

  enable: function(element) {
    element = $(element);
    element.disabled = false;
    return element;
  }
};

/*--------------------------------------------------------------------------*/

var Field = Form.Element;

var $F = Form.Element.Methods.getValue;

/*--------------------------------------------------------------------------*/

Form.Element.Serializers = (function() {
  function input(element, value) {
    switch (element.type.toLowerCase()) {
      case 'checkbox':
      case 'radio':
        return inputSelector(element, value);
      default:
        return valueSelector(element, value);
    }
  }

  function inputSelector(element, value) {
    if (Object.isUndefined(value))
      return element.checked ? element.value : null;
    else element.checked = !!value;
  }

  function valueSelector(element, value) {
    if (Object.isUndefined(value)) return element.value;
    else element.value = value;
  }

  function select(element, value) {
    if (Object.isUndefined(value))
      return (element.type === 'select-one' ? selectOne : selectMany)(element);

    var opt, currentValue, single = !Object.isArray(value);
    for (var i = 0, length = element.length; i < length; i++) {
      opt = element.options[i];
      currentValue = this.optionValue(opt);
      if (single) {
        if (currentValue == value) {
          opt.selected = true;
          return;
        }
      }
      else opt.selected = value.include(currentValue);
    }
  }

  function selectOne(element) {
    var index = element.selectedIndex;
    return index >= 0 ? optionValue(element.options[index]) : null;
  }

  function selectMany(element) {
    var values, length = element.length;
    if (!length) return null;

    for (var i = 0, values = []; i < length; i++) {
      var opt = element.options[i];
      if (opt.selected) values.push(optionValue(opt));
    }
    return values;
  }

  function optionValue(opt) {
    return Element.hasAttribute(opt, 'value') ? opt.value : opt.text;
  }

  return {
    input:         input,
    inputSelector: inputSelector,
    textarea:      valueSelector,
    select:        select,
    selectOne:     selectOne,
    selectMany:    selectMany,
    optionValue:   optionValue,
    button:        valueSelector
  };
})();

/*--------------------------------------------------------------------------*/


Abstract.TimedObserver = Class.create(PeriodicalExecuter, {
  initialize: function($super, element, frequency, callback) {
    $super(callback, frequency);
    this.element   = $(element);
    this.lastValue = this.getValue();
  },

  execute: function() {
    var value = this.getValue();
    if (Object.isString(this.lastValue) && Object.isString(value) ?
        this.lastValue != value : String(this.lastValue) != String(value)) {
      this.callback(this.element, value);
      this.lastValue = value;
    }
  }
});

Form.Element.Observer = Class.create(Abstract.TimedObserver, {
  getValue: function() {
    return Form.Element.getValue(this.element);
  }
});

Form.Observer = Class.create(Abstract.TimedObserver, {
  getValue: function() {
    return Form.serialize(this.element);
  }
});

/*--------------------------------------------------------------------------*/

Abstract.EventObserver = Class.create({
  initialize: function(element, callback) {
    this.element  = $(element);
    this.callback = callback;

    this.lastValue = this.getValue();
    if (this.element.tagName.toLowerCase() == 'form')
      this.registerFormCallbacks();
    else
      this.registerCallback(this.element);
  },

  onElementEvent: function() {
    var value = this.getValue();
    if (this.lastValue != value) {
      this.callback(this.element, value);
      this.lastValue = value;
    }
  },

  registerFormCallbacks: function() {
    Form.getElements(this.element).each(this.registerCallback, this);
  },

  registerCallback: function(element) {
    if (element.type) {
      switch (element.type.toLowerCase()) {
        case 'checkbox':
        case 'radio':
          Event.observe(element, 'click', this.onElementEvent.bind(this));
          break;
        default:
          Event.observe(element, 'change', this.onElementEvent.bind(this));
          break;
      }
    }
  }
});

Form.Element.EventObserver = Class.create(Abstract.EventObserver, {
  getValue: function() {
    return Form.Element.getValue(this.element);
  }
});

Form.EventObserver = Class.create(Abstract.EventObserver, {
  getValue: function() {
    return Form.serialize(this.element);
  }
});
(function() {

  var Event = {
    KEY_BACKSPACE: 8,
    KEY_TAB:       9,
    KEY_RETURN:   13,
    KEY_ESC:      27,
    KEY_LEFT:     37,
    KEY_UP:       38,
    KEY_RIGHT:    39,
    KEY_DOWN:     40,
    KEY_DELETE:   46,
    KEY_HOME:     36,
    KEY_END:      35,
    KEY_PAGEUP:   33,
    KEY_PAGEDOWN: 34,
    KEY_INSERT:   45,

    cache: {}
  };

  var docEl = document.documentElement;
  var MOUSEENTER_MOUSELEAVE_EVENTS_SUPPORTED = 'onmouseenter' in docEl
    && 'onmouseleave' in docEl;



  var isIELegacyEvent = function(event) { return false; };

  if (window.attachEvent) {
    if (window.addEventListener) {
      isIELegacyEvent = function(event) {
        return !(event instanceof window.Event);
      };
    } else {
      isIELegacyEvent = function(event) { return true; };
    }
  }

  var _isButton;

  function _isButtonForDOMEvents(event, code) {
    return event.which ? (event.which === code + 1) : (event.button === code);
  }

  var legacyButtonMap = { 0: 1, 1: 4, 2: 2 };
  function _isButtonForLegacyEvents(event, code) {
    return event.button === legacyButtonMap[code];
  }

  function _isButtonForWebKit(event, code) {
    switch (code) {
      case 0: return event.which == 1 && !event.metaKey;
      case 1: return event.which == 2 || (event.which == 1 && event.metaKey);
      case 2: return event.which == 3;
      default: return false;
    }
  }

  if (window.attachEvent) {
    if (!window.addEventListener) {
      _isButton = _isButtonForLegacyEvents;
    } else {
      _isButton = function(event, code) {
        return isIELegacyEvent(event) ? _isButtonForLegacyEvents(event, code) :
         _isButtonForDOMEvents(event, code);
      }
    }
  } else if (Prototype.Browser.WebKit) {
    _isButton = _isButtonForWebKit;
  } else {
    _isButton = _isButtonForDOMEvents;
  }

  function isLeftClick(event)   { return _isButton(event, 0) }

  function isMiddleClick(event) { return _isButton(event, 1) }

  function isRightClick(event)  { return _isButton(event, 2) }

  function element(event) {
    event = Event.extend(event);

    var node = event.target, type = event.type,
     currentTarget = event.currentTarget;

    if (currentTarget && currentTarget.tagName) {
      if (type === 'load' || type === 'error' ||
        (type === 'click' && currentTarget.tagName.toLowerCase() === 'input'
          && currentTarget.type === 'radio'))
            node = currentTarget;
    }

    if (node.nodeType == Node.TEXT_NODE)
      node = node.parentNode;

    return Element.extend(node);
  }

  function findElement(event, expression) {
    var element = Event.element(event);

    if (!expression) return element;
    while (element) {
      if (Object.isElement(element) && Prototype.Selector.match(element, expression)) {
        return Element.extend(element);
      }
      element = element.parentNode;
    }
  }

  function pointer(event) {
    return { x: pointerX(event), y: pointerY(event) };
  }

  function pointerX(event) {
    var docElement = document.documentElement,
     body = document.body || { scrollLeft: 0 };

    return event.pageX || (event.clientX +
      (docElement.scrollLeft || body.scrollLeft) -
      (docElement.clientLeft || 0));
  }

  function pointerY(event) {
    var docElement = document.documentElement,
     body = document.body || { scrollTop: 0 };

    return  event.pageY || (event.clientY +
       (docElement.scrollTop || body.scrollTop) -
       (docElement.clientTop || 0));
  }


  function stop(event) {
    Event.extend(event);
    event.preventDefault();
    event.stopPropagation();

    event.stopped = true;
  }


  Event.Methods = {
    isLeftClick:   isLeftClick,
    isMiddleClick: isMiddleClick,
    isRightClick:  isRightClick,

    element:     element,
    findElement: findElement,

    pointer:  pointer,
    pointerX: pointerX,
    pointerY: pointerY,

    stop: stop
  };

  var methods = Object.keys(Event.Methods).inject({ }, function(m, name) {
    m[name] = Event.Methods[name].methodize();
    return m;
  });

  if (window.attachEvent) {
    function _relatedTarget(event) {
      var element;
      switch (event.type) {
        case 'mouseover':
        case 'mouseenter':
          element = event.fromElement;
          break;
        case 'mouseout':
        case 'mouseleave':
          element = event.toElement;
          break;
        default:
          return null;
      }
      return Element.extend(element);
    }

    var additionalMethods = {
      stopPropagation: function() { this.cancelBubble = true },
      preventDefault:  function() { this.returnValue = false },
      inspect: function() { return '[object Event]' }
    };

    Event.extend = function(event, element) {
      if (!event) return false;

      if (!isIELegacyEvent(event)) return event;

      if (event._extendedByPrototype) return event;
      event._extendedByPrototype = Prototype.emptyFunction;

      var pointer = Event.pointer(event);

      Object.extend(event, {
        target: event.srcElement || element,
        relatedTarget: _relatedTarget(event),
        pageX:  pointer.x,
        pageY:  pointer.y
      });

      Object.extend(event, methods);
      Object.extend(event, additionalMethods);

      return event;
    };
  } else {
    Event.extend = Prototype.K;
  }

  if (window.addEventListener) {
    Event.prototype = window.Event.prototype || document.createEvent('HTMLEvents').__proto__;
    Object.extend(Event.prototype, methods);
  }

  function _createResponder(element, eventName, handler) {
    var registry = Element.retrieve(element, 'prototype_event_registry');

    if (Object.isUndefined(registry)) {
      CACHE.push(element);
      registry = Element.retrieve(element, 'prototype_event_registry', $H());
    }

    var respondersForEvent = registry.get(eventName);
    if (Object.isUndefined(respondersForEvent)) {
      respondersForEvent = [];
      registry.set(eventName, respondersForEvent);
    }

    if (respondersForEvent.pluck('handler').include(handler)) return false;

    var responder;
    if (eventName.include(":")) {
      responder = function(event) {
        if (Object.isUndefined(event.eventName))
          return false;

        if (event.eventName !== eventName)
          return false;

        Event.extend(event, element);
        handler.call(element, event);
      };
    } else {
      if (!MOUSEENTER_MOUSELEAVE_EVENTS_SUPPORTED &&
       (eventName === "mouseenter" || eventName === "mouseleave")) {
        if (eventName === "mouseenter" || eventName === "mouseleave") {
          responder = function(event) {
            Event.extend(event, element);

            var parent = event.relatedTarget;
            while (parent && parent !== element) {
              try { parent = parent.parentNode; }
              catch(e) { parent = element; }
            }

            if (parent === element) return;

            handler.call(element, event);
          };
        }
      } else {
        responder = function(event) {
          Event.extend(event, element);
          handler.call(element, event);
        };
      }
    }

    responder.handler = handler;
    respondersForEvent.push(responder);
    return responder;
  }

  function _destroyCache() {
    for (var i = 0, length = CACHE.length; i < length; i++) {
      Event.stopObserving(CACHE[i]);
      CACHE[i] = null;
    }
  }

  var CACHE = [];

  if (Prototype.Browser.IE)
    window.attachEvent('onunload', _destroyCache);

  if (Prototype.Browser.WebKit)
    window.addEventListener('unload', Prototype.emptyFunction, false);


  var _getDOMEventName = Prototype.K,
      translations = { mouseenter: "mouseover", mouseleave: "mouseout" };

  if (!MOUSEENTER_MOUSELEAVE_EVENTS_SUPPORTED) {
    _getDOMEventName = function(eventName) {
      return (translations[eventName] || eventName);
    };
  }

  function observe(element, eventName, handler) {
    element = $(element);

    var responder = _createResponder(element, eventName, handler);

    if (!responder) return element;

    if (eventName.include(':')) {
      if (element.addEventListener)
        element.addEventListener("dataavailable", responder, false);
      else {
        element.attachEvent("ondataavailable", responder);
        element.attachEvent("onlosecapture", responder);
      }
    } else {
      var actualEventName = _getDOMEventName(eventName);

      if (element.addEventListener)
        element.addEventListener(actualEventName, responder, false);
      else
        element.attachEvent("on" + actualEventName, responder);
    }

    return element;
  }

  function stopObserving(element, eventName, handler) {
    element = $(element);

    var registry = Element.retrieve(element, 'prototype_event_registry');
    if (!registry) return element;

    if (!eventName) {
      registry.each( function(pair) {
        var eventName = pair.key;
        stopObserving(element, eventName);
      });
      return element;
    }

    var responders = registry.get(eventName);
    if (!responders) return element;

    if (!handler) {
      responders.each(function(r) {
        stopObserving(element, eventName, r.handler);
      });
      return element;
    }

    var i = responders.length, responder;
    while (i--) {
      if (responders[i].handler === handler) {
        responder = responders[i];
        break;
      }
    }
    if (!responder) return element;

    if (eventName.include(':')) {
      if (element.removeEventListener)
        element.removeEventListener("dataavailable", responder, false);
      else {
        element.detachEvent("ondataavailable", responder);
        element.detachEvent("onlosecapture", responder);
      }
    } else {
      var actualEventName = _getDOMEventName(eventName);
      if (element.removeEventListener)
        element.removeEventListener(actualEventName, responder, false);
      else
        element.detachEvent('on' + actualEventName, responder);
    }

    registry.set(eventName, responders.without(responder));

    return element;
  }

  function fire(element, eventName, memo, bubble) {
    element = $(element);

    if (Object.isUndefined(bubble))
      bubble = true;

    if (element == document && document.createEvent && !element.dispatchEvent)
      element = document.documentElement;

    var event;
    if (document.createEvent) {
      event = document.createEvent('HTMLEvents');
      event.initEvent('dataavailable', bubble, true);
    } else {
      event = document.createEventObject();
      event.eventType = bubble ? 'ondataavailable' : 'onlosecapture';
    }

    event.eventName = eventName;
    event.memo = memo || { };

    if (document.createEvent)
      element.dispatchEvent(event);
    else
      element.fireEvent(event.eventType, event);

    return Event.extend(event);
  }

  Event.Handler = Class.create({
    initialize: function(element, eventName, selector, callback) {
      this.element   = $(element);
      this.eventName = eventName;
      this.selector  = selector;
      this.callback  = callback;
      this.handler   = this.handleEvent.bind(this);
    },

    start: function() {
      Event.observe(this.element, this.eventName, this.handler);
      return this;
    },

    stop: function() {
      Event.stopObserving(this.element, this.eventName, this.handler);
      return this;
    },

    handleEvent: function(event) {
      var element = Event.findElement(event, this.selector);
      if (element) this.callback.call(this.element, event, element);
    }
  });

  function on(element, eventName, selector, callback) {
    element = $(element);
    if (Object.isFunction(selector) && Object.isUndefined(callback)) {
      callback = selector, selector = null;
    }

    return new Event.Handler(element, eventName, selector, callback).start();
  }

  Object.extend(Event, Event.Methods);

  Object.extend(Event, {
    fire:          fire,
    observe:       observe,
    stopObserving: stopObserving,
    on:            on
  });

  Element.addMethods({
    fire:          fire,

    observe:       observe,

    stopObserving: stopObserving,

    on:            on
  });

  Object.extend(document, {
    fire:          fire.methodize(),

    observe:       observe.methodize(),

    stopObserving: stopObserving.methodize(),

    on:            on.methodize(),

    loaded:        false
  });

  if (window.Event) Object.extend(window.Event, Event);
  else window.Event = Event;
})();

(function() {
  /* Support for the DOMContentLoaded event is based on work by Dan Webb,
     Matthias Miller, Dean Edwards, John Resig, and Diego Perini. */

  var timer;

  function fireContentLoadedEvent() {
    if (document.loaded) return;
    if (timer) window.clearTimeout(timer);
    document.loaded = true;
    document.fire('dom:loaded');
  }

  function checkReadyState() {
    if (document.readyState === 'complete') {
      document.stopObserving('readystatechange', checkReadyState);
      fireContentLoadedEvent();
    }
  }

  function pollDoScroll() {
    try { document.documentElement.doScroll('left'); }
    catch(e) {
      timer = pollDoScroll.defer();
      return;
    }
    fireContentLoadedEvent();
  }

  if (document.addEventListener) {
    document.addEventListener('DOMContentLoaded', fireContentLoadedEvent, false);
  } else {
    document.observe('readystatechange', checkReadyState);
    if (window == top)
      timer = pollDoScroll.defer();
  }

  Event.observe(window, 'load', fireContentLoadedEvent);
})();

Element.addMethods();

/*------------------------------- DEPRECATED -------------------------------*/

Hash.toQueryString = Object.toQueryString;

var Toggle = { display: Element.toggle };

Element.Methods.childOf = Element.Methods.descendantOf;

var Insertion = {
  Before: function(element, content) {
    return Element.insert(element, {before:content});
  },

  Top: function(element, content) {
    return Element.insert(element, {top:content});
  },

  Bottom: function(element, content) {
    return Element.insert(element, {bottom:content});
  },

  After: function(element, content) {
    return Element.insert(element, {after:content});
  }
};

var $continue = new Error('"throw $continue" is deprecated, use "return" instead');

var Position = {
  includeScrollOffsets: false,

  prepare: function() {
    this.deltaX =  window.pageXOffset
                || document.documentElement.scrollLeft
                || document.body.scrollLeft
                || 0;
    this.deltaY =  window.pageYOffset
                || document.documentElement.scrollTop
                || document.body.scrollTop
                || 0;
  },

  within: function(element, x, y) {
    if (this.includeScrollOffsets)
      return this.withinIncludingScrolloffsets(element, x, y);
    this.xcomp = x;
    this.ycomp = y;
    this.offset = Element.cumulativeOffset(element);

    return (y >= this.offset[1] &&
            y <  this.offset[1] + element.offsetHeight &&
            x >= this.offset[0] &&
            x <  this.offset[0] + element.offsetWidth);
  },

  withinIncludingScrolloffsets: function(element, x, y) {
    var offsetcache = Element.cumulativeScrollOffset(element);

    this.xcomp = x + offsetcache[0] - this.deltaX;
    this.ycomp = y + offsetcache[1] - this.deltaY;
    this.offset = Element.cumulativeOffset(element);

    return (this.ycomp >= this.offset[1] &&
            this.ycomp <  this.offset[1] + element.offsetHeight &&
            this.xcomp >= this.offset[0] &&
            this.xcomp <  this.offset[0] + element.offsetWidth);
  },

  overlap: function(mode, element) {
    if (!mode) return 0;
    if (mode == 'vertical')
      return ((this.offset[1] + element.offsetHeight) - this.ycomp) /
        element.offsetHeight;
    if (mode == 'horizontal')
      return ((this.offset[0] + element.offsetWidth) - this.xcomp) /
        element.offsetWidth;
  },


  cumulativeOffset: Element.Methods.cumulativeOffset,

  positionedOffset: Element.Methods.positionedOffset,

  absolutize: function(element) {
    Position.prepare();
    return Element.absolutize(element);
  },

  relativize: function(element) {
    Position.prepare();
    return Element.relativize(element);
  },

  realOffset: Element.Methods.cumulativeScrollOffset,

  offsetParent: Element.Methods.getOffsetParent,

  page: Element.Methods.viewportOffset,

  clone: function(source, target, options) {
    options = options || { };
    return Element.clonePosition(target, source, options);
  }
};

/*--------------------------------------------------------------------------*/

if (!document.getElementsByClassName) document.getElementsByClassName = function(instanceMethods){
  function iter(name) {
    return name.blank() ? null : "[contains(concat(' ', @class, ' '), ' " + name + " ')]";
  }

  instanceMethods.getElementsByClassName = Prototype.BrowserFeatures.XPath ?
  function(element, className) {
    className = className.toString().strip();
    var cond = /\s/.test(className) ? $w(className).map(iter).join('') : iter(className);
    return cond ? document._getElementsByXPath('.//*' + cond, element) : [];
  } : function(element, className) {
    className = className.toString().strip();
    var elements = [], classNames = (/\s/.test(className) ? $w(className) : null);
    if (!classNames && !className) return elements;

    var nodes = $(element).getElementsByTagName('*');
    className = ' ' + className + ' ';

    for (var i = 0, child, cn; child = nodes[i]; i++) {
      if (child.className && (cn = ' ' + child.className + ' ') && (cn.include(className) ||
          (classNames && classNames.all(function(name) {
            return !name.toString().blank() && cn.include(' ' + name + ' ');
          }))))
        elements.push(Element.extend(child));
    }
    return elements;
  };

  return function(className, parentElement) {
    return $(parentElement || document.body).getElementsByClassName(className);
  };
}(Element.Methods);

/*--------------------------------------------------------------------------*/

Element.ClassNames = Class.create();
Element.ClassNames.prototype = {
  initialize: function(element) {
    this.element = $(element);
  },

  _each: function(iterator) {
    this.element.className.split(/\s+/).select(function(name) {
      return name.length > 0;
    })._each(iterator);
  },

  set: function(className) {
    this.element.className = className;
  },

  add: function(classNameToAdd) {
    if (this.include(classNameToAdd)) return;
    this.set($A(this).concat(classNameToAdd).join(' '));
  },

  remove: function(classNameToRemove) {
    if (!this.include(classNameToRemove)) return;
    this.set($A(this).without(classNameToRemove).join(' '));
  },

  toString: function() {
    return $A(this).join(' ');
  }
};

Object.extend(Element.ClassNames.prototype, Enumerable);

/*--------------------------------------------------------------------------*/

(function() {
  window.Selector = Class.create({
    initialize: function(expression) {
      this.expression = expression.strip();
    },

    findElements: function(rootElement) {
      return Prototype.Selector.select(this.expression, rootElement);
    },

    match: function(element) {
      return Prototype.Selector.match(element, this.expression);
    },

    toString: function() {
      return this.expression;
    },

    inspect: function() {
      return "#<Selector: " + this.expression + ">";
    }
  });

  Object.extend(Selector, {
    matchElements: function(elements, expression) {
      var match = Prototype.Selector.match,
          results = [];

      for (var i = 0, length = elements.length; i < length; i++) {
        var element = elements[i];
        if (match(element, expression)) {
          results.push(Element.extend(element));
        }
      }
      return results;
    },

    findElement: function(elements, expression, index) {
      index = index || 0;
      var matchIndex = 0, element;
      for (var i = 0, length = elements.length; i < length; i++) {
        element = elements[i];
        if (Prototype.Selector.match(element, expression) && index === matchIndex++) {
          return Element.extend(element);
        }
      }
    },

    findChildElements: function(element, expressions) {
      var selector = expressions.toArray().join(', ');
      return Prototype.Selector.select(selector, element || document);
    }
  });
})();

String.prototype.parseColor = function() {
  var color = '#';
  if (this.slice(0,4) == 'rgb(') {
    var cols = this.slice(4,this.length-1).split(',');
    var i=0; do { color += parseInt(cols[i]).toColorPart() } while (++i<3);
  } else {
    if (this.slice(0,1) == '#') {
      if (this.length==4) for(var i=1;i<4;i++) color += (this.charAt(i) + this.charAt(i)).toLowerCase();
      if (this.length==7) color = this.toLowerCase();
    }
  }
  return (color.length==7 ? color : (arguments[0] || this));
};

/*--------------------------------------------------------------------------*/

Element.collectTextNodes = function(element) {
  return $A($(element).childNodes).collect( function(node) {
    return (node.nodeType==3 ? node.nodeValue :
      (node.hasChildNodes() ? Element.collectTextNodes(node) : ''));
  }).flatten().join('');
};

Element.collectTextNodesIgnoreClass = function(element, className) {
  return $A($(element).childNodes).collect( function(node) {
    return (node.nodeType==3 ? node.nodeValue :
      ((node.hasChildNodes() && !Element.hasClassName(node,className)) ?
        Element.collectTextNodesIgnoreClass(node, className) : ''));
  }).flatten().join('');
};

Element.setContentZoom = function(element, percent) {
  element = $(element);
  element.setStyle({fontSize: (percent/100) + 'em'});
  if (Prototype.Browser.WebKit) window.scrollBy(0,0);
  return element;
};

Element.getInlineOpacity = function(element){
  return $(element).style.opacity || '';
};

Element.forceRerendering = function(element) {
  try {
    element = $(element);
    var n = document.createTextNode(' ');
    element.appendChild(n);
    element.removeChild(n);
  } catch(e) { }
};

/*--------------------------------------------------------------------------*/

var Effect = {
  _elementDoesNotExistError: {
    name: 'ElementDoesNotExistError',
    message: 'The specified DOM element does not exist, but is required for this effect to operate'
  },
  Transitions: {
    linear: Prototype.K,
    sinoidal: function(pos) {
      return (-Math.cos(pos*Math.PI)/2) + .5;
    },
    reverse: function(pos) {
      return 1-pos;
    },
    flicker: function(pos) {
      var pos = ((-Math.cos(pos*Math.PI)/4) + .75) + Math.random()/4;
      return pos > 1 ? 1 : pos;
    },
    wobble: function(pos) {
      return (-Math.cos(pos*Math.PI*(9*pos))/2) + .5;
    },
    pulse: function(pos, pulses) {
      return (-Math.cos((pos*((pulses||5)-.5)*2)*Math.PI)/2) + .5;
    },
    spring: function(pos) {
      return 1 - (Math.cos(pos * 4.5 * Math.PI) * Math.exp(-pos * 6));
    },
    none: function(pos) {
      return 0;
    },
    full: function(pos) {
      return 1;
    }
  },
  DefaultOptions: {
    duration:   1.0,   // seconds
    fps:        100,   // 100= assume 66fps max.
    sync:       false, // true for combining
    from:       0.0,
    to:         1.0,
    delay:      0.0,
    queue:      'parallel'
  },
  tagifyText: function(element) {
    var tagifyStyle = 'position:relative';
    if (Prototype.Browser.IE) tagifyStyle += ';zoom:1';

    element = $(element);
    $A(element.childNodes).each( function(child) {
      if (child.nodeType==3) {
        child.nodeValue.toArray().each( function(character) {
          element.insertBefore(
            new Element('span', {style: tagifyStyle}).update(
              character == ' ' ? String.fromCharCode(160) : character),
              child);
        });
        Element.remove(child);
      }
    });
  },
  multiple: function(element, effect) {
    var elements;
    if (((typeof element == 'object') ||
        Object.isFunction(element)) &&
       (element.length))
      elements = element;
    else
      elements = $(element).childNodes;

    var options = Object.extend({
      speed: 0.1,
      delay: 0.0
    }, arguments[2] || { });
    var masterDelay = options.delay;

    $A(elements).each( function(element, index) {
      new effect(element, Object.extend(options, { delay: index * options.speed + masterDelay }));
    });
  },
  PAIRS: {
    'slide':  ['SlideDown','SlideUp'],
    'blind':  ['BlindDown','BlindUp'],
    'appear': ['Appear','Fade']
  },
  toggle: function(element, effect) {
    element = $(element);
    effect = (effect || 'appear').toLowerCase();
    var options = Object.extend({
      queue: { position:'end', scope:(element.id || 'global'), limit: 1 }
    }, arguments[2] || { });
    Effect[element.visible() ?
      Effect.PAIRS[effect][1] : Effect.PAIRS[effect][0]](element, options);
  }
};

Effect.DefaultOptions.transition = Effect.Transitions.sinoidal;

/* ------------- core effects ------------- */

Effect.ScopedQueue = Class.create(Enumerable, {
  initialize: function() {
    this.effects  = [];
    this.interval = null;
  },
  _each: function(iterator) {
    this.effects._each(iterator);
  },
  add: function(effect) {
    var timestamp = new Date().getTime();

    var position = Object.isString(effect.options.queue) ?
      effect.options.queue : effect.options.queue.position;

    switch(position) {
      case 'front':
        this.effects.findAll(function(e){ return e.state=='idle' }).each( function(e) {
            e.startOn  += effect.finishOn;
            e.finishOn += effect.finishOn;
          });
        break;
      case 'with-last':
        timestamp = this.effects.pluck('startOn').max() || timestamp;
        break;
      case 'end':
        timestamp = this.effects.pluck('finishOn').max() || timestamp;
        break;
    }

    effect.startOn  += timestamp;
    effect.finishOn += timestamp;

    if (!effect.options.queue.limit || (this.effects.length < effect.options.queue.limit))
      this.effects.push(effect);

    if (!this.interval)
      this.interval = setInterval(this.loop.bind(this), 15);
  },
  remove: function(effect) {
    this.effects = this.effects.reject(function(e) { return e==effect });
    if (this.effects.length == 0) {
      clearInterval(this.interval);
      this.interval = null;
    }
  },
  loop: function() {
    var timePos = new Date().getTime();
    for(var i=0, len=this.effects.length;i<len;i++)
      this.effects[i] && this.effects[i].loop(timePos);
  }
});

Effect.Queues = {
  instances: $H(),
  get: function(queueName) {
    if (!Object.isString(queueName)) return queueName;

    return this.instances.get(queueName) ||
      this.instances.set(queueName, new Effect.ScopedQueue());
  }
};
Effect.Queue = Effect.Queues.get('global');

Effect.Base = Class.create({
  position: null,
  start: function(options) {
    if (options && options.transition === false) options.transition = Effect.Transitions.linear;
    this.options      = Object.extend(Object.extend({ },Effect.DefaultOptions), options || { });
    this.currentFrame = 0;
    this.state        = 'idle';
    this.startOn      = this.options.delay*1000;
    this.finishOn     = this.startOn+(this.options.duration*1000);
    this.fromToDelta  = this.options.to-this.options.from;
    this.totalTime    = this.finishOn-this.startOn;
    this.totalFrames  = this.options.fps*this.options.duration;

    this.render = (function() {
      function dispatch(effect, eventName) {
        if (effect.options[eventName + 'Internal'])
          effect.options[eventName + 'Internal'](effect);
        if (effect.options[eventName])
          effect.options[eventName](effect);
      }

      return function(pos) {
        if (this.state === "idle") {
          this.state = "running";
          dispatch(this, 'beforeSetup');
          if (this.setup) this.setup();
          dispatch(this, 'afterSetup');
        }
        if (this.state === "running") {
          pos = (this.options.transition(pos) * this.fromToDelta) + this.options.from;
          this.position = pos;
          dispatch(this, 'beforeUpdate');
          if (this.update) this.update(pos);
          dispatch(this, 'afterUpdate');
        }
      };
    })();

    this.event('beforeStart');
    if (!this.options.sync)
      Effect.Queues.get(Object.isString(this.options.queue) ?
        'global' : this.options.queue.scope).add(this);
  },
  loop: function(timePos) {
    if (timePos >= this.startOn) {
      if (timePos >= this.finishOn) {
        this.render(1.0);
        this.cancel();
        this.event('beforeFinish');
        if (this.finish) this.finish();
        this.event('afterFinish');
        return;
      }
      var pos   = (timePos - this.startOn) / this.totalTime,
          frame = (pos * this.totalFrames).round();
      if (frame > this.currentFrame) {
        this.render(pos);
        this.currentFrame = frame;
      }
    }
  },
  cancel: function() {
    if (!this.options.sync)
      Effect.Queues.get(Object.isString(this.options.queue) ?
        'global' : this.options.queue.scope).remove(this);
    this.state = 'finished';
  },
  event: function(eventName) {
    if (this.options[eventName + 'Internal']) this.options[eventName + 'Internal'](this);
    if (this.options[eventName]) this.options[eventName](this);
  },
  inspect: function() {
    var data = $H();
    for(property in this)
      if (!Object.isFunction(this[property])) data.set(property, this[property]);
    return '#<Effect:' + data.inspect() + ',options:' + $H(this.options).inspect() + '>';
  }
});

Effect.Parallel = Class.create(Effect.Base, {
  initialize: function(effects) {
    this.effects = effects || [];
    this.start(arguments[1]);
  },
  update: function(position) {
    this.effects.invoke('render', position);
  },
  finish: function(position) {
    this.effects.each( function(effect) {
      effect.render(1.0);
      effect.cancel();
      effect.event('beforeFinish');
      if (effect.finish) effect.finish(position);
      effect.event('afterFinish');
    });
  }
});

Effect.Tween = Class.create(Effect.Base, {
  initialize: function(object, from, to) {
    object = Object.isString(object) ? $(object) : object;
    var args = $A(arguments), method = args.last(),
      options = args.length == 5 ? args[3] : null;
    this.method = Object.isFunction(method) ? method.bind(object) :
      Object.isFunction(object[method]) ? object[method].bind(object) :
      function(value) { object[method] = value };
    this.start(Object.extend({ from: from, to: to }, options || { }));
  },
  update: function(position) {
    this.method(position);
  }
});

Effect.Event = Class.create(Effect.Base, {
  initialize: function() {
    this.start(Object.extend({ duration: 0 }, arguments[0] || { }));
  },
  update: Prototype.emptyFunction
});

Effect.Opacity = Class.create(Effect.Base, {
  initialize: function(element) {
    this.element = $(element);
    if (!this.element) throw(Effect._elementDoesNotExistError);
    if (Prototype.Browser.IE && (!this.element.currentStyle.hasLayout))
      this.element.setStyle({zoom: 1});
    var options = Object.extend({
      from: this.element.getOpacity() || 0.0,
      to:   1.0
    }, arguments[1] || { });
    this.start(options);
  },
  update: function(position) {
    this.element.setOpacity(position);
  }
});

Effect.Move = Class.create(Effect.Base, {
  initialize: function(element) {
    this.element = $(element);
    if (!this.element) throw(Effect._elementDoesNotExistError);
    var options = Object.extend({
      x:    0,
      y:    0,
      mode: 'relative'
    }, arguments[1] || { });
    this.start(options);
  },
  setup: function() {
    this.element.makePositioned();
    this.originalLeft = parseFloat(this.element.getStyle('left') || '0');
    this.originalTop  = parseFloat(this.element.getStyle('top')  || '0');
    if (this.options.mode == 'absolute') {
      this.options.x = this.options.x - this.originalLeft;
      this.options.y = this.options.y - this.originalTop;
    }
  },
  update: function(position) {
    this.element.setStyle({
      left: (this.options.x  * position + this.originalLeft).round() + 'px',
      top:  (this.options.y  * position + this.originalTop).round()  + 'px'
    });
  }
});

Effect.MoveBy = function(element, toTop, toLeft) {
  return new Effect.Move(element,
    Object.extend({ x: toLeft, y: toTop }, arguments[3] || { }));
};

Effect.Scale = Class.create(Effect.Base, {
  initialize: function(element, percent) {
    this.element = $(element);
    if (!this.element) throw(Effect._elementDoesNotExistError);
    var options = Object.extend({
      scaleX: true,
      scaleY: true,
      scaleContent: true,
      scaleFromCenter: false,
      scaleMode: 'box',        // 'box' or 'contents' or { } with provided values
      scaleFrom: 100.0,
      scaleTo:   percent
    }, arguments[2] || { });
    this.start(options);
  },
  setup: function() {
    this.restoreAfterFinish = this.options.restoreAfterFinish || false;
    this.elementPositioning = this.element.getStyle('position');

    this.originalStyle = { };
    ['top','left','width','height','fontSize'].each( function(k) {
      this.originalStyle[k] = this.element.style[k];
    }.bind(this));

    this.originalTop  = this.element.offsetTop;
    this.originalLeft = this.element.offsetLeft;

    var fontSize = this.element.getStyle('font-size') || '100%';
    ['em','px','%','pt'].each( function(fontSizeType) {
      if (fontSize.indexOf(fontSizeType)>0) {
        this.fontSize     = parseFloat(fontSize);
        this.fontSizeType = fontSizeType;
      }
    }.bind(this));

    this.factor = (this.options.scaleTo - this.options.scaleFrom)/100;

    this.dims = null;
    if (this.options.scaleMode=='box')
      this.dims = [this.element.offsetHeight, this.element.offsetWidth];
    if (/^content/.test(this.options.scaleMode))
      this.dims = [this.element.scrollHeight, this.element.scrollWidth];
    if (!this.dims)
      this.dims = [this.options.scaleMode.originalHeight,
                   this.options.scaleMode.originalWidth];
  },
  update: function(position) {
    var currentScale = (this.options.scaleFrom/100.0) + (this.factor * position);
    if (this.options.scaleContent && this.fontSize)
      this.element.setStyle({fontSize: this.fontSize * currentScale + this.fontSizeType });
    this.setDimensions(this.dims[0] * currentScale, this.dims[1] * currentScale);
  },
  finish: function(position) {
    if (this.restoreAfterFinish) this.element.setStyle(this.originalStyle);
  },
  setDimensions: function(height, width) {
    var d = { };
    if (this.options.scaleX) d.width = width.round() + 'px';
    if (this.options.scaleY) d.height = height.round() + 'px';
    if (this.options.scaleFromCenter) {
      var topd  = (height - this.dims[0])/2;
      var leftd = (width  - this.dims[1])/2;
      if (this.elementPositioning == 'absolute') {
        if (this.options.scaleY) d.top = this.originalTop-topd + 'px';
        if (this.options.scaleX) d.left = this.originalLeft-leftd + 'px';
      } else {
        if (this.options.scaleY) d.top = -topd + 'px';
        if (this.options.scaleX) d.left = -leftd + 'px';
      }
    }
    this.element.setStyle(d);
  }
});

Effect.Highlight = Class.create(Effect.Base, {
  initialize: function(element) {
    this.element = $(element);
    if (!this.element) throw(Effect._elementDoesNotExistError);
    var options = Object.extend({ startcolor: '#ffff99' }, arguments[1] || { });
    this.start(options);
  },
  setup: function() {
    if (this.element.getStyle('display')=='none') { this.cancel(); return; }
    this.oldStyle = { };
    if (!this.options.keepBackgroundImage) {
      this.oldStyle.backgroundImage = this.element.getStyle('background-image');
      this.element.setStyle({backgroundImage: 'none'});
    }
    if (!this.options.endcolor)
      this.options.endcolor = this.element.getStyle('background-color').parseColor('#ffffff');
    if (!this.options.restorecolor)
      this.options.restorecolor = this.element.getStyle('background-color');
    this._base  = $R(0,2).map(function(i){ return parseInt(this.options.startcolor.slice(i*2+1,i*2+3),16) }.bind(this));
    this._delta = $R(0,2).map(function(i){ return parseInt(this.options.endcolor.slice(i*2+1,i*2+3),16)-this._base[i] }.bind(this));
  },
  update: function(position) {
    this.element.setStyle({backgroundColor: $R(0,2).inject('#',function(m,v,i){
      return m+((this._base[i]+(this._delta[i]*position)).round().toColorPart()); }.bind(this)) });
  },
  finish: function() {
    this.element.setStyle(Object.extend(this.oldStyle, {
      backgroundColor: this.options.restorecolor
    }));
  }
});

Effect.ScrollTo = function(element) {
  var options = arguments[1] || { },
  scrollOffsets = document.viewport.getScrollOffsets(),
  elementOffsets = $(element).cumulativeOffset();

  if (options.offset) elementOffsets[1] += options.offset;

  return new Effect.Tween(null,
    scrollOffsets.top,
    elementOffsets[1],
    options,
    function(p){ scrollTo(scrollOffsets.left, p.round()); }
  );
};

/* ------------- combination effects ------------- */

Effect.Fade = function(element) {
  element = $(element);
  var oldOpacity = element.getInlineOpacity();
  var options = Object.extend({
    from: element.getOpacity() || 1.0,
    to:   0.0,
    afterFinishInternal: function(effect) {
      if (effect.options.to!=0) return;
      effect.element.hide().setStyle({opacity: oldOpacity});
    }
  }, arguments[1] || { });
  return new Effect.Opacity(element,options);
};

Effect.Appear = function(element) {
  element = $(element);
  var options = Object.extend({
  from: (element.getStyle('display') == 'none' ? 0.0 : element.getOpacity() || 0.0),
  to:   1.0,
  afterFinishInternal: function(effect) {
    effect.element.forceRerendering();
  },
  beforeSetup: function(effect) {
    effect.element.setOpacity(effect.options.from).show();
  }}, arguments[1] || { });
  return new Effect.Opacity(element,options);
};

Effect.Puff = function(element) {
  element = $(element);
  var oldStyle = {
    opacity: element.getInlineOpacity(),
    position: element.getStyle('position'),
    top:  element.style.top,
    left: element.style.left,
    width: element.style.width,
    height: element.style.height
  };
  return new Effect.Parallel(
   [ new Effect.Scale(element, 200,
      { sync: true, scaleFromCenter: true, scaleContent: true, restoreAfterFinish: true }),
     new Effect.Opacity(element, { sync: true, to: 0.0 } ) ],
     Object.extend({ duration: 1.0,
      beforeSetupInternal: function(effect) {
        Position.absolutize(effect.effects[0].element);
      },
      afterFinishInternal: function(effect) {
         effect.effects[0].element.hide().setStyle(oldStyle); }
     }, arguments[1] || { })
   );
};

Effect.BlindUp = function(element) {
  element = $(element);
  element.makeClipping();
  return new Effect.Scale(element, 0,
    Object.extend({ scaleContent: false,
      scaleX: false,
      restoreAfterFinish: true,
      afterFinishInternal: function(effect) {
        effect.element.hide().undoClipping();
      }
    }, arguments[1] || { })
  );
};

Effect.BlindDown = function(element) {
  element = $(element);
  var elementDimensions = element.getDimensions();
  return new Effect.Scale(element, 100, Object.extend({
    scaleContent: false,
    scaleX: false,
    scaleFrom: 0,
    scaleMode: {originalHeight: elementDimensions.height, originalWidth: elementDimensions.width},
    restoreAfterFinish: true,
    afterSetup: function(effect) {
      effect.element.makeClipping().setStyle({height: '0px'}).show();
    },
    afterFinishInternal: function(effect) {
      effect.element.undoClipping();
    }
  }, arguments[1] || { }));
};

Effect.SwitchOff = function(element) {
  element = $(element);
  var oldOpacity = element.getInlineOpacity();
  return new Effect.Appear(element, Object.extend({
    duration: 0.4,
    from: 0,
    transition: Effect.Transitions.flicker,
    afterFinishInternal: function(effect) {
      new Effect.Scale(effect.element, 1, {
        duration: 0.3, scaleFromCenter: true,
        scaleX: false, scaleContent: false, restoreAfterFinish: true,
        beforeSetup: function(effect) {
          effect.element.makePositioned().makeClipping();
        },
        afterFinishInternal: function(effect) {
          effect.element.hide().undoClipping().undoPositioned().setStyle({opacity: oldOpacity});
        }
      });
    }
  }, arguments[1] || { }));
};

Effect.DropOut = function(element) {
  element = $(element);
  var oldStyle = {
    top: element.getStyle('top'),
    left: element.getStyle('left'),
    opacity: element.getInlineOpacity() };
  return new Effect.Parallel(
    [ new Effect.Move(element, {x: 0, y: 100, sync: true }),
      new Effect.Opacity(element, { sync: true, to: 0.0 }) ],
    Object.extend(
      { duration: 0.5,
        beforeSetup: function(effect) {
          effect.effects[0].element.makePositioned();
        },
        afterFinishInternal: function(effect) {
          effect.effects[0].element.hide().undoPositioned().setStyle(oldStyle);
        }
      }, arguments[1] || { }));
};

Effect.Shake = function(element) {
  element = $(element);
  var options = Object.extend({
    distance: 20,
    duration: 0.5
  }, arguments[1] || {});
  var distance = parseFloat(options.distance);
  var split = parseFloat(options.duration) / 10.0;
  var oldStyle = {
    top: element.getStyle('top'),
    left: element.getStyle('left') };
    return new Effect.Move(element,
      { x:  distance, y: 0, duration: split, afterFinishInternal: function(effect) {
    new Effect.Move(effect.element,
      { x: -distance*2, y: 0, duration: split*2,  afterFinishInternal: function(effect) {
    new Effect.Move(effect.element,
      { x:  distance*2, y: 0, duration: split*2,  afterFinishInternal: function(effect) {
    new Effect.Move(effect.element,
      { x: -distance*2, y: 0, duration: split*2,  afterFinishInternal: function(effect) {
    new Effect.Move(effect.element,
      { x:  distance*2, y: 0, duration: split*2,  afterFinishInternal: function(effect) {
    new Effect.Move(effect.element,
      { x: -distance, y: 0, duration: split, afterFinishInternal: function(effect) {
        effect.element.undoPositioned().setStyle(oldStyle);
  }}); }}); }}); }}); }}); }});
};

Effect.SlideDown = function(element) {
  element = $(element).cleanWhitespace();
  var oldInnerBottom = element.down().getStyle('bottom');
  var elementDimensions = element.getDimensions();
  return new Effect.Scale(element, 100, Object.extend({
    scaleContent: false,
    scaleX: false,
    scaleFrom: window.opera ? 0 : 1,
    scaleMode: {originalHeight: elementDimensions.height, originalWidth: elementDimensions.width},
    restoreAfterFinish: true,
    afterSetup: function(effect) {
      effect.element.makePositioned();
      effect.element.down().makePositioned();
      if (window.opera) effect.element.setStyle({top: ''});
      effect.element.makeClipping().setStyle({height: '0px'}).show();
    },
    afterUpdateInternal: function(effect) {
      effect.element.down().setStyle({bottom:
        (effect.dims[0] - effect.element.clientHeight) + 'px' });
    },
    afterFinishInternal: function(effect) {
      effect.element.undoClipping().undoPositioned();
      effect.element.down().undoPositioned().setStyle({bottom: oldInnerBottom}); }
    }, arguments[1] || { })
  );
};

Effect.SlideUp = function(element) {
  element = $(element).cleanWhitespace();
  var oldInnerBottom = element.down().getStyle('bottom');
  var elementDimensions = element.getDimensions();
  return new Effect.Scale(element, window.opera ? 0 : 1,
   Object.extend({ scaleContent: false,
    scaleX: false,
    scaleMode: 'box',
    scaleFrom: 100,
    scaleMode: {originalHeight: elementDimensions.height, originalWidth: elementDimensions.width},
    restoreAfterFinish: true,
    afterSetup: function(effect) {
      effect.element.makePositioned();
      effect.element.down().makePositioned();
      if (window.opera) effect.element.setStyle({top: ''});
      effect.element.makeClipping().show();
    },
    afterUpdateInternal: function(effect) {
      effect.element.down().setStyle({bottom:
        (effect.dims[0] - effect.element.clientHeight) + 'px' });
    },
    afterFinishInternal: function(effect) {
      effect.element.hide().undoClipping().undoPositioned();
      effect.element.down().undoPositioned().setStyle({bottom: oldInnerBottom});
    }
   }, arguments[1] || { })
  );
};

Effect.Squish = function(element) {
  return new Effect.Scale(element, window.opera ? 1 : 0, {
    restoreAfterFinish: true,
    beforeSetup: function(effect) {
      effect.element.makeClipping();
    },
    afterFinishInternal: function(effect) {
      effect.element.hide().undoClipping();
    }
  });
};

Effect.Grow = function(element) {
  element = $(element);
  var options = Object.extend({
    direction: 'center',
    moveTransition: Effect.Transitions.sinoidal,
    scaleTransition: Effect.Transitions.sinoidal,
    opacityTransition: Effect.Transitions.full
  }, arguments[1] || { });
  var oldStyle = {
    top: element.style.top,
    left: element.style.left,
    height: element.style.height,
    width: element.style.width,
    opacity: element.getInlineOpacity() };

  var dims = element.getDimensions();
  var initialMoveX, initialMoveY;
  var moveX, moveY;

  switch (options.direction) {
    case 'top-left':
      initialMoveX = initialMoveY = moveX = moveY = 0;
      break;
    case 'top-right':
      initialMoveX = dims.width;
      initialMoveY = moveY = 0;
      moveX = -dims.width;
      break;
    case 'bottom-left':
      initialMoveX = moveX = 0;
      initialMoveY = dims.height;
      moveY = -dims.height;
      break;
    case 'bottom-right':
      initialMoveX = dims.width;
      initialMoveY = dims.height;
      moveX = -dims.width;
      moveY = -dims.height;
      break;
    case 'center':
      initialMoveX = dims.width / 2;
      initialMoveY = dims.height / 2;
      moveX = -dims.width / 2;
      moveY = -dims.height / 2;
      break;
  }

  return new Effect.Move(element, {
    x: initialMoveX,
    y: initialMoveY,
    duration: 0.01,
    beforeSetup: function(effect) {
      effect.element.hide().makeClipping().makePositioned();
    },
    afterFinishInternal: function(effect) {
      new Effect.Parallel(
        [ new Effect.Opacity(effect.element, { sync: true, to: 1.0, from: 0.0, transition: options.opacityTransition }),
          new Effect.Move(effect.element, { x: moveX, y: moveY, sync: true, transition: options.moveTransition }),
          new Effect.Scale(effect.element, 100, {
            scaleMode: { originalHeight: dims.height, originalWidth: dims.width },
            sync: true, scaleFrom: window.opera ? 1 : 0, transition: options.scaleTransition, restoreAfterFinish: true})
        ], Object.extend({
             beforeSetup: function(effect) {
               effect.effects[0].element.setStyle({height: '0px'}).show();
             },
             afterFinishInternal: function(effect) {
               effect.effects[0].element.undoClipping().undoPositioned().setStyle(oldStyle);
             }
           }, options)
      );
    }
  });
};

Effect.Shrink = function(element) {
  element = $(element);
  var options = Object.extend({
    direction: 'center',
    moveTransition: Effect.Transitions.sinoidal,
    scaleTransition: Effect.Transitions.sinoidal,
    opacityTransition: Effect.Transitions.none
  }, arguments[1] || { });
  var oldStyle = {
    top: element.style.top,
    left: element.style.left,
    height: element.style.height,
    width: element.style.width,
    opacity: element.getInlineOpacity() };

  var dims = element.getDimensions();
  var moveX, moveY;

  switch (options.direction) {
    case 'top-left':
      moveX = moveY = 0;
      break;
    case 'top-right':
      moveX = dims.width;
      moveY = 0;
      break;
    case 'bottom-left':
      moveX = 0;
      moveY = dims.height;
      break;
    case 'bottom-right':
      moveX = dims.width;
      moveY = dims.height;
      break;
    case 'center':
      moveX = dims.width / 2;
      moveY = dims.height / 2;
      break;
  }

  return new Effect.Parallel(
    [ new Effect.Opacity(element, { sync: true, to: 0.0, from: 1.0, transition: options.opacityTransition }),
      new Effect.Scale(element, window.opera ? 1 : 0, { sync: true, transition: options.scaleTransition, restoreAfterFinish: true}),
      new Effect.Move(element, { x: moveX, y: moveY, sync: true, transition: options.moveTransition })
    ], Object.extend({
         beforeStartInternal: function(effect) {
           effect.effects[0].element.makePositioned().makeClipping();
         },
         afterFinishInternal: function(effect) {
           effect.effects[0].element.hide().undoClipping().undoPositioned().setStyle(oldStyle); }
       }, options)
  );
};

Effect.Pulsate = function(element) {
  element = $(element);
  var options    = arguments[1] || { },
    oldOpacity = element.getInlineOpacity(),
    transition = options.transition || Effect.Transitions.linear,
    reverser   = function(pos){
      return 1 - transition((-Math.cos((pos*(options.pulses||5)*2)*Math.PI)/2) + .5);
    };

  return new Effect.Opacity(element,
    Object.extend(Object.extend({  duration: 2.0, from: 0,
      afterFinishInternal: function(effect) { effect.element.setStyle({opacity: oldOpacity}); }
    }, options), {transition: reverser}));
};

Effect.Fold = function(element) {
  element = $(element);
  var oldStyle = {
    top: element.style.top,
    left: element.style.left,
    width: element.style.width,
    height: element.style.height };
  element.makeClipping();
  return new Effect.Scale(element, 5, Object.extend({
    scaleContent: false,
    scaleX: false,
    afterFinishInternal: function(effect) {
    new Effect.Scale(element, 1, {
      scaleContent: false,
      scaleY: false,
      afterFinishInternal: function(effect) {
        effect.element.hide().undoClipping().setStyle(oldStyle);
      } });
  }}, arguments[1] || { }));
};

Effect.Morph = Class.create(Effect.Base, {
  initialize: function(element) {
    this.element = $(element);
    if (!this.element) throw(Effect._elementDoesNotExistError);
    var options = Object.extend({
      style: { }
    }, arguments[1] || { });

    if (!Object.isString(options.style)) this.style = $H(options.style);
    else {
      if (options.style.include(':'))
        this.style = options.style.parseStyle();
      else {
        this.element.addClassName(options.style);
        this.style = $H(this.element.getStyles());
        this.element.removeClassName(options.style);
        var css = this.element.getStyles();
        this.style = this.style.reject(function(style) {
          return style.value == css[style.key];
        });
        options.afterFinishInternal = function(effect) {
          effect.element.addClassName(effect.options.style);
          effect.transforms.each(function(transform) {
            effect.element.style[transform.style] = '';
          });
        };
      }
    }
    this.start(options);
  },

  setup: function(){
    function parseColor(color){
      if (!color || ['rgba(0, 0, 0, 0)','transparent'].include(color)) color = '#ffffff';
      color = color.parseColor();
      return $R(0,2).map(function(i){
        return parseInt( color.slice(i*2+1,i*2+3), 16 );
      });
    }
    this.transforms = this.style.map(function(pair){
      var property = pair[0], value = pair[1], unit = null;

      if (value.parseColor('#zzzzzz') != '#zzzzzz') {
        value = value.parseColor();
        unit  = 'color';
      } else if (property == 'opacity') {
        value = parseFloat(value);
        if (Prototype.Browser.IE && (!this.element.currentStyle.hasLayout))
          this.element.setStyle({zoom: 1});
      } else if (Element.CSS_LENGTH.test(value)) {
          var components = value.match(/^([\+\-]?[0-9\.]+)(.*)$/);
          value = parseFloat(components[1]);
          unit = (components.length == 3) ? components[2] : null;
      }

      var originalValue = this.element.getStyle(property);
      return {
        style: property.camelize(),
        originalValue: unit=='color' ? parseColor(originalValue) : parseFloat(originalValue || 0),
        targetValue: unit=='color' ? parseColor(value) : value,
        unit: unit
      };
    }.bind(this)).reject(function(transform){
      return (
        (transform.originalValue == transform.targetValue) ||
        (
          transform.unit != 'color' &&
          (isNaN(transform.originalValue) || isNaN(transform.targetValue))
        )
      );
    });
  },
  update: function(position) {
    var style = { }, transform, i = this.transforms.length;
    while(i--)
      style[(transform = this.transforms[i]).style] =
        transform.unit=='color' ? '#'+
          (Math.round(transform.originalValue[0]+
            (transform.targetValue[0]-transform.originalValue[0])*position)).toColorPart() +
          (Math.round(transform.originalValue[1]+
            (transform.targetValue[1]-transform.originalValue[1])*position)).toColorPart() +
          (Math.round(transform.originalValue[2]+
            (transform.targetValue[2]-transform.originalValue[2])*position)).toColorPart() :
        (transform.originalValue +
          (transform.targetValue - transform.originalValue) * position).toFixed(3) +
            (transform.unit === null ? '' : transform.unit);
    this.element.setStyle(style, true);
  }
});

Effect.Transform = Class.create({
  initialize: function(tracks){
    this.tracks  = [];
    this.options = arguments[1] || { };
    this.addTracks(tracks);
  },
  addTracks: function(tracks){
    tracks.each(function(track){
      track = $H(track);
      var data = track.values().first();
      this.tracks.push($H({
        ids:     track.keys().first(),
        effect:  Effect.Morph,
        options: { style: data }
      }));
    }.bind(this));
    return this;
  },
  play: function(){
    return new Effect.Parallel(
      this.tracks.map(function(track){
        var ids = track.get('ids'), effect = track.get('effect'), options = track.get('options');
        var elements = [$(ids) || $$(ids)].flatten();
        return elements.map(function(e){ return new effect(e, Object.extend({ sync:true }, options)) });
      }).flatten(),
      this.options
    );
  }
});

Element.CSS_PROPERTIES = $w(
  'backgroundColor backgroundPosition borderBottomColor borderBottomStyle ' +
  'borderBottomWidth borderLeftColor borderLeftStyle borderLeftWidth ' +
  'borderRightColor borderRightStyle borderRightWidth borderSpacing ' +
  'borderTopColor borderTopStyle borderTopWidth bottom clip color ' +
  'fontSize fontWeight height left letterSpacing lineHeight ' +
  'marginBottom marginLeft marginRight marginTop markerOffset maxHeight '+
  'maxWidth minHeight minWidth opacity outlineColor outlineOffset ' +
  'outlineWidth paddingBottom paddingLeft paddingRight paddingTop ' +
  'right textIndent top width wordSpacing zIndex');

Element.CSS_LENGTH = /^(([\+\-]?[0-9\.]+)(em|ex|px|in|cm|mm|pt|pc|\%))|0$/;

String.__parseStyleElement = document.createElement('div');
String.prototype.parseStyle = function(){
  var style, styleRules = $H();
  if (Prototype.Browser.WebKit)
    style = new Element('div',{style:this}).style;
  else {
    String.__parseStyleElement.innerHTML = '<div style="' + this + '"></div>';
    style = String.__parseStyleElement.childNodes[0].style;
  }

  Element.CSS_PROPERTIES.each(function(property){
    if (style[property]) styleRules.set(property, style[property]);
  });

  if (Prototype.Browser.IE && this.include('opacity'))
    styleRules.set('opacity', this.match(/opacity:\s*((?:0|1)?(?:\.\d*)?)/)[1]);

  return styleRules;
};

if (document.defaultView && document.defaultView.getComputedStyle) {
  Element.getStyles = function(element) {
    var css = document.defaultView.getComputedStyle($(element), null);
    return Element.CSS_PROPERTIES.inject({ }, function(styles, property) {
      styles[property] = css[property];
      return styles;
    });
  };
} else {
  Element.getStyles = function(element) {
    element = $(element);
    var css = element.currentStyle, styles;
    styles = Element.CSS_PROPERTIES.inject({ }, function(results, property) {
      results[property] = css[property];
      return results;
    });
    if (!styles.opacity) styles.opacity = element.getOpacity();
    return styles;
  };
}

Effect.Methods = {
  morph: function(element, style) {
    element = $(element);
    new Effect.Morph(element, Object.extend({ style: style }, arguments[2] || { }));
    return element;
  },
  visualEffect: function(element, effect, options) {
    element = $(element);
    var s = effect.dasherize().camelize(), klass = s.charAt(0).toUpperCase() + s.substring(1);
    new Effect[klass](element, options);
    return element;
  },
  highlight: function(element, options) {
    element = $(element);
    new Effect.Highlight(element, options);
    return element;
  }
};

$w('fade appear grow shrink fold blindUp blindDown slideUp slideDown '+
  'pulsate shake puff squish switchOff dropOut').each(
  function(effect) {
    Effect.Methods[effect] = function(element, options){
      element = $(element);
      Effect[effect.charAt(0).toUpperCase() + effect.substring(1)](element, options);
      return element;
    };
  }
);

$w('getInlineOpacity forceRerendering setContentZoom collectTextNodes collectTextNodesIgnoreClass getStyles').each(
  function(f) { Effect.Methods[f] = Element[f]; }
);

Element.addMethods(Effect.Methods);


if(typeof Effect == 'undefined')
  throw("controls.js requires including script.aculo.us' effects.js library");

var Autocompleter = { };
Autocompleter.Base = Class.create({
  baseInitialize: function(element, update, options) {
    element          = $(element);
    this.element     = element;
    this.update      = $(update);
    this.hasFocus    = false;
    this.changed     = false;
    this.active      = false;
    this.index       = 0;
    this.entryCount  = 0;
    this.oldElementValue = this.element.value;

    if(this.setOptions)
      this.setOptions(options);
    else
      this.options = options || { };

    this.options.paramName    = this.options.paramName || this.element.name;
    this.options.tokens       = this.options.tokens || [];
    this.options.frequency    = this.options.frequency || 0.4;
    this.options.minChars     = this.options.minChars || 1;
    this.options.onShow       = this.options.onShow ||
      function(element, update){
        if(!update.style.position || update.style.position=='absolute') {
          update.style.position = 'absolute';
          Position.clone(element, update, {
            setHeight: false,
            offsetTop: element.offsetHeight
          });
        }
        Effect.Appear(update,{duration:0.15});
      };
    this.options.onHide = this.options.onHide ||
      function(element, update){ new Effect.Fade(update,{duration:0.15}) };

    if(typeof(this.options.tokens) == 'string')
      this.options.tokens = new Array(this.options.tokens);
    if (!this.options.tokens.include('\n'))
      this.options.tokens.push('\n');

    this.observer = null;

    this.element.setAttribute('autocomplete','off');

    Element.hide(this.update);

    Event.observe(this.element, 'blur', this.onBlur.bindAsEventListener(this));
    Event.observe(this.element, 'keydown', this.onKeyPress.bindAsEventListener(this));
  },

  show: function() {
    if(Element.getStyle(this.update, 'display')=='none') this.options.onShow(this.element, this.update);
    if(!this.iefix &&
      (Prototype.Browser.IE) &&
      (Element.getStyle(this.update, 'position')=='absolute')) {
      new Insertion.After(this.update,
       '<iframe id="' + this.update.id + '_iefix" '+
       'style="display:none;position:absolute;filter:progid:DXImageTransform.Microsoft.Alpha(opacity=0);" ' +
       'src="javascript:false;" frameborder="0" scrolling="no"></iframe>');
      this.iefix = $(this.update.id+'_iefix');
    }
    if(this.iefix) setTimeout(this.fixIEOverlapping.bind(this), 50);
  },

  fixIEOverlapping: function() {
    Position.clone(this.update, this.iefix, {setTop:(!this.update.style.height)});
    this.iefix.style.zIndex = 1;
    this.update.style.zIndex = 2;
    Element.show(this.iefix);
  },

  hide: function() {
    this.stopIndicator();
    if(Element.getStyle(this.update, 'display')!='none') this.options.onHide(this.element, this.update);
    if(this.iefix) Element.hide(this.iefix);
  },

  startIndicator: function() {
    if(this.options.indicator) Element.show(this.options.indicator);
  },

  stopIndicator: function() {
    if(this.options.indicator) Element.hide(this.options.indicator);
  },

  onKeyPress: function(event) {
    if(this.active)
      switch(event.keyCode) {
       case Event.KEY_TAB:
       case Event.KEY_RETURN:
         this.selectEntry();
         Event.stop(event);
       case Event.KEY_ESC:
         this.hide();
         this.active = false;
         Event.stop(event);
         return;
       case Event.KEY_LEFT:
       case Event.KEY_RIGHT:
         return;
       case Event.KEY_UP:
         this.markPrevious();
         this.render();
         Event.stop(event);
         return;
       case Event.KEY_DOWN:
         this.markNext();
         this.render();
         Event.stop(event);
         return;
      }
     else
       if(event.keyCode==Event.KEY_TAB || event.keyCode==Event.KEY_RETURN ||
         (Prototype.Browser.WebKit > 0 && event.keyCode == 0)) return;

    this.changed = true;
    this.hasFocus = true;

    if(this.observer) clearTimeout(this.observer);
      this.observer =
        setTimeout(this.onObserverEvent.bind(this), this.options.frequency*1000);
  },

  activate: function() {
    this.changed = false;
    this.hasFocus = true;
    this.getUpdatedChoices();
  },

  onHover: function(event) {
    var element = Event.findElement(event, 'LI');
    if(this.index != element.autocompleteIndex)
    {
        this.index = element.autocompleteIndex;
        this.render();
    }
    Event.stop(event);
  },

  onClick: function(event) {
    var element = Event.findElement(event, 'LI');
    this.index = element.autocompleteIndex;
    this.selectEntry();
    this.hide();
  },

  onBlur: function(event) {
    setTimeout(this.hide.bind(this), 250);
    this.hasFocus = false;
    this.active = false;
  },

  render: function() {
    if(this.entryCount > 0) {
      for (var i = 0; i < this.entryCount; i++)
        this.index==i ?
          Element.addClassName(this.getEntry(i),"selected") :
          Element.removeClassName(this.getEntry(i),"selected");
      if(this.hasFocus) {
        this.show();
        this.active = true;
      }
    } else {
      this.active = false;
      this.hide();
    }
  },

  markPrevious: function() {
    if(this.index > 0) this.index--;
      else this.index = this.entryCount-1;
    this.getEntry(this.index).scrollIntoView(true);
  },

  markNext: function() {
    if(this.index < this.entryCount-1) this.index++;
      else this.index = 0;
    this.getEntry(this.index).scrollIntoView(false);
  },

  getEntry: function(index) {
    return this.update.firstChild.childNodes[index];
  },

  getCurrentEntry: function() {
    return this.getEntry(this.index);
  },

  selectEntry: function() {
    this.active = false;
    this.updateElement(this.getCurrentEntry());
  },

  updateElement: function(selectedElement) {
    if (this.options.updateElement) {
      this.options.updateElement(selectedElement);
      return;
    }
    var value = '';
    if (this.options.select) {
      var nodes = $(selectedElement).select('.' + this.options.select) || [];
      if(nodes.length>0) value = Element.collectTextNodes(nodes[0], this.options.select);
    } else
      value = Element.collectTextNodesIgnoreClass(selectedElement, 'informal');

    var bounds = this.getTokenBounds();
    if (bounds[0] != -1) {
      var newValue = this.element.value.substr(0, bounds[0]);
      var whitespace = this.element.value.substr(bounds[0]).match(/^\s+/);
      if (whitespace)
        newValue += whitespace[0];
      this.element.value = newValue + value + this.element.value.substr(bounds[1]);
    } else {
      this.element.value = value;
    }
    this.oldElementValue = this.element.value;
    this.element.focus();

    if (this.options.afterUpdateElement)
      this.options.afterUpdateElement(this.element, selectedElement);
  },

  updateChoices: function(choices) {
    if(!this.changed && this.hasFocus) {
      this.update.innerHTML = choices;
      Element.cleanWhitespace(this.update);
      Element.cleanWhitespace(this.update.down());

      if(this.update.firstChild && this.update.down().childNodes) {
        this.entryCount =
          this.update.down().childNodes.length;
        for (var i = 0; i < this.entryCount; i++) {
          var entry = this.getEntry(i);
          entry.autocompleteIndex = i;
          this.addObservers(entry);
        }
      } else {
        this.entryCount = 0;
      }

      this.stopIndicator();
      this.index = 0;

      if(this.entryCount==1 && this.options.autoSelect) {
        this.selectEntry();
        this.hide();
      } else {
        this.render();
      }
    }
  },

  addObservers: function(element) {
    Event.observe(element, "mouseover", this.onHover.bindAsEventListener(this));
    Event.observe(element, "click", this.onClick.bindAsEventListener(this));
  },

  onObserverEvent: function() {
    this.changed = false;
    this.tokenBounds = null;
    if(this.getToken().length>=this.options.minChars) {
      this.getUpdatedChoices();
    } else {
      this.active = false;
      this.hide();
    }
    this.oldElementValue = this.element.value;
  },

  getToken: function() {
    var bounds = this.getTokenBounds();
    return this.element.value.substring(bounds[0], bounds[1]).strip();
  },

  getTokenBounds: function() {
    if (null != this.tokenBounds) return this.tokenBounds;
    var value = this.element.value;
    if (value.strip().empty()) return [-1, 0];
    var diff = arguments.callee.getFirstDifferencePos(value, this.oldElementValue);
    var offset = (diff == this.oldElementValue.length ? 1 : 0);
    var prevTokenPos = -1, nextTokenPos = value.length;
    var tp;
    for (var index = 0, l = this.options.tokens.length; index < l; ++index) {
      tp = value.lastIndexOf(this.options.tokens[index], diff + offset - 1);
      if (tp > prevTokenPos) prevTokenPos = tp;
      tp = value.indexOf(this.options.tokens[index], diff + offset);
      if (-1 != tp && tp < nextTokenPos) nextTokenPos = tp;
    }
    return (this.tokenBounds = [prevTokenPos + 1, nextTokenPos]);
  }
});

Autocompleter.Base.prototype.getTokenBounds.getFirstDifferencePos = function(newS, oldS) {
  var boundary = Math.min(newS.length, oldS.length);
  for (var index = 0; index < boundary; ++index)
    if (newS[index] != oldS[index])
      return index;
  return boundary;
};

Ajax.Autocompleter = Class.create(Autocompleter.Base, {
  initialize: function(element, update, url, options) {
    this.baseInitialize(element, update, options);
    this.options.asynchronous  = true;
    this.options.onComplete    = this.onComplete.bind(this);
    this.options.defaultParams = this.options.parameters || null;
    this.url                   = url;
  },

  getUpdatedChoices: function() {
    this.startIndicator();

    var entry = encodeURIComponent(this.options.paramName) + '=' +
      encodeURIComponent(this.getToken());

    this.options.parameters = this.options.callback ?
      this.options.callback(this.element, entry) : entry;

    if(this.options.defaultParams)
      this.options.parameters += '&' + this.options.defaultParams;

    new Ajax.Request(this.url, this.options);
  },

  onComplete: function(request) {
    this.updateChoices(request.responseText);
  }
});


Autocompleter.Local = Class.create(Autocompleter.Base, {
  initialize: function(element, update, array, options) {
    this.baseInitialize(element, update, options);
    this.options.array = array;
  },

  getUpdatedChoices: function() {
    this.updateChoices(this.options.selector(this));
  },

  setOptions: function(options) {
    this.options = Object.extend({
      choices: 10,
      partialSearch: true,
      partialChars: 2,
      ignoreCase: true,
      fullSearch: false,
      selector: function(instance) {
        var ret       = []; // Beginning matches
        var partial   = []; // Inside matches
        var entry     = instance.getToken();
        var count     = 0;

        for (var i = 0; i < instance.options.array.length &&
          ret.length < instance.options.choices ; i++) {

          var elem = instance.options.array[i];
          var foundPos = instance.options.ignoreCase ?
            elem.toLowerCase().indexOf(entry.toLowerCase()) :
            elem.indexOf(entry);

          while (foundPos != -1) {
            if (foundPos == 0 && elem.length != entry.length) {
              ret.push("<li><strong>" + elem.substr(0, entry.length) + "</strong>" +
                elem.substr(entry.length) + "</li>");
              break;
            } else if (entry.length >= instance.options.partialChars &&
              instance.options.partialSearch && foundPos != -1) {
              if (instance.options.fullSearch || /\s/.test(elem.substr(foundPos-1,1))) {
                partial.push("<li>" + elem.substr(0, foundPos) + "<strong>" +
                  elem.substr(foundPos, entry.length) + "</strong>" + elem.substr(
                  foundPos + entry.length) + "</li>");
                break;
              }
            }

            foundPos = instance.options.ignoreCase ?
              elem.toLowerCase().indexOf(entry.toLowerCase(), foundPos + 1) :
              elem.indexOf(entry, foundPos + 1);

          }
        }
        if (partial.length)
          ret = ret.concat(partial.slice(0, instance.options.choices - ret.length));
        return "<ul>" + ret.join('') + "</ul>";
      }
    }, options || { });
  }
});


Field.scrollFreeActivate = function(field) {
  setTimeout(function() {
    Field.activate(field);
  }, 1);
};

Ajax.InPlaceEditor = Class.create({
  initialize: function(element, url, options) {
    this.url = url;
    this.element = element = $(element);
    this.prepareOptions();
    this._controls = { };
    arguments.callee.dealWithDeprecatedOptions(options); // DEPRECATION LAYER!!!
    Object.extend(this.options, options || { });
    if (!this.options.formId && this.element.id) {
      this.options.formId = this.element.id + '-inplaceeditor';
      if ($(this.options.formId))
        this.options.formId = '';
    }
    if (this.options.externalControl)
      this.options.externalControl = $(this.options.externalControl);
    if (!this.options.externalControl)
      this.options.externalControlOnly = false;
    this._originalBackground = this.element.getStyle('background-color') || 'transparent';
    this.element.title = this.options.clickToEditText;
    this._boundCancelHandler = this.handleFormCancellation.bind(this);
    this._boundComplete = (this.options.onComplete || Prototype.emptyFunction).bind(this);
    this._boundFailureHandler = this.handleAJAXFailure.bind(this);
    this._boundSubmitHandler = this.handleFormSubmission.bind(this);
    this._boundWrapperHandler = this.wrapUp.bind(this);
    this.registerListeners();
  },
  checkForEscapeOrReturn: function(e) {
    if (!this._editing || e.ctrlKey || e.altKey || e.shiftKey) return;
    if (Event.KEY_ESC == e.keyCode)
      this.handleFormCancellation(e);
    else if (Event.KEY_RETURN == e.keyCode)
      this.handleFormSubmission(e);
  },
  createControl: function(mode, handler, extraClasses) {
    var control = this.options[mode + 'Control'];
    var text = this.options[mode + 'Text'];
    if ('button' == control) {
      var btn = document.createElement('input');
      btn.type = 'submit';
      btn.value = text;
      btn.className = 'editor_' + mode + '_button';
      if ('cancel' == mode)
        btn.onclick = this._boundCancelHandler;
      this._form.appendChild(btn);
      this._controls[mode] = btn;
    } else if ('link' == control) {
      var link = document.createElement('a');
      link.href = '#';
      link.appendChild(document.createTextNode(text));
      link.onclick = 'cancel' == mode ? this._boundCancelHandler : this._boundSubmitHandler;
      link.className = 'editor_' + mode + '_link';
      if (extraClasses)
        link.className += ' ' + extraClasses;
      this._form.appendChild(link);
      this._controls[mode] = link;
    }
  },
  createEditField: function() {
    var text = (this.options.loadTextURL ? this.options.loadingText : this.getText());
    var fld;
    if (1 >= this.options.rows && !/\r|\n/.test(this.getText())) {
      fld = document.createElement('input');
      fld.type = 'text';
      var size = this.options.size || this.options.cols || 0;
      if (0 < size) fld.size = size;
    } else {
      fld = document.createElement('textarea');
      fld.rows = (1 >= this.options.rows ? this.options.autoRows : this.options.rows);
      fld.cols = this.options.cols || 40;
    }
    fld.name = this.options.paramName;
    fld.value = text; // No HTML breaks conversion anymore
    fld.className = 'editor_field';
    if (this.options.submitOnBlur)
      fld.onblur = this._boundSubmitHandler;
    this._controls.editor = fld;
    if (this.options.loadTextURL)
      this.loadExternalText();
    this._form.appendChild(this._controls.editor);
  },
  createForm: function() {
    var ipe = this;
    function addText(mode, condition) {
      var text = ipe.options['text' + mode + 'Controls'];
      if (!text || condition === false) return;
      ipe._form.appendChild(document.createTextNode(text));
    };
    this._form = $(document.createElement('form'));
    this._form.id = this.options.formId;
    this._form.addClassName(this.options.formClassName);
    this._form.onsubmit = this._boundSubmitHandler;
    this.createEditField();
    if ('textarea' == this._controls.editor.tagName.toLowerCase())
      this._form.appendChild(document.createElement('br'));
    if (this.options.onFormCustomization)
      this.options.onFormCustomization(this, this._form);
    addText('Before', this.options.okControl || this.options.cancelControl);
    this.createControl('ok', this._boundSubmitHandler);
    addText('Between', this.options.okControl && this.options.cancelControl);
    this.createControl('cancel', this._boundCancelHandler, 'editor_cancel');
    addText('After', this.options.okControl || this.options.cancelControl);
  },
  destroy: function() {
    if (this._oldInnerHTML)
      this.element.innerHTML = this._oldInnerHTML;
    this.leaveEditMode();
    this.unregisterListeners();
  },
  enterEditMode: function(e) {
    if (this._saving || this._editing) return;
    this._editing = true;
    this.triggerCallback('onEnterEditMode');
    if (this.options.externalControl)
      this.options.externalControl.hide();
    this.element.hide();
    this.createForm();
    this.element.parentNode.insertBefore(this._form, this.element);
    if (!this.options.loadTextURL)
      this.postProcessEditField();
    if (e) Event.stop(e);
  },
  enterHover: function(e) {
    if (this.options.hoverClassName)
      this.element.addClassName(this.options.hoverClassName);
    if (this._saving) return;
    this.triggerCallback('onEnterHover');
  },
  getText: function() {
    return this.element.innerHTML.unescapeHTML();
  },
  handleAJAXFailure: function(transport) {
    this.triggerCallback('onFailure', transport);
    if (this._oldInnerHTML) {
      this.element.innerHTML = this._oldInnerHTML;
      this._oldInnerHTML = null;
    }
  },
  handleFormCancellation: function(e) {
    this.wrapUp();
    if (e) Event.stop(e);
  },
  handleFormSubmission: function(e) {
    var form = this._form;
    var value = $F(this._controls.editor);
    this.prepareSubmission();
    var params = this.options.callback(form, value) || '';
    if (Object.isString(params))
      params = params.toQueryParams();
    params.editorId = this.element.id;
    if (this.options.htmlResponse) {
      var options = Object.extend({ evalScripts: true }, this.options.ajaxOptions);
      Object.extend(options, {
        parameters: params,
        onComplete: this._boundWrapperHandler,
        onFailure: this._boundFailureHandler
      });
      new Ajax.Updater({ success: this.element }, this.url, options);
    } else {
      var options = Object.extend({ method: 'get' }, this.options.ajaxOptions);
      Object.extend(options, {
        parameters: params,
        onComplete: this._boundWrapperHandler,
        onFailure: this._boundFailureHandler
      });
      new Ajax.Request(this.url, options);
    }
    if (e) Event.stop(e);
  },
  leaveEditMode: function() {
    this.element.removeClassName(this.options.savingClassName);
    this.removeForm();
    this.leaveHover();
    this.element.style.backgroundColor = this._originalBackground;
    this.element.show();
    if (this.options.externalControl)
      this.options.externalControl.show();
    this._saving = false;
    this._editing = false;
    this._oldInnerHTML = null;
    this.triggerCallback('onLeaveEditMode');
  },
  leaveHover: function(e) {
    if (this.options.hoverClassName)
      this.element.removeClassName(this.options.hoverClassName);
    if (this._saving) return;
    this.triggerCallback('onLeaveHover');
  },
  loadExternalText: function() {
    this._form.addClassName(this.options.loadingClassName);
    this._controls.editor.disabled = true;
    var options = Object.extend({ method: 'get' }, this.options.ajaxOptions);
    Object.extend(options, {
      parameters: 'editorId=' + encodeURIComponent(this.element.id),
      onComplete: Prototype.emptyFunction,
      onSuccess: function(transport) {
        this._form.removeClassName(this.options.loadingClassName);
        var text = transport.responseText;
        if (this.options.stripLoadedTextTags)
          text = text.stripTags();
        this._controls.editor.value = text;
        this._controls.editor.disabled = false;
        this.postProcessEditField();
      }.bind(this),
      onFailure: this._boundFailureHandler
    });
    new Ajax.Request(this.options.loadTextURL, options);
  },
  postProcessEditField: function() {
    var fpc = this.options.fieldPostCreation;
    if (fpc)
      $(this._controls.editor)['focus' == fpc ? 'focus' : 'activate']();
  },
  prepareOptions: function() {
    this.options = Object.clone(Ajax.InPlaceEditor.DefaultOptions);
    Object.extend(this.options, Ajax.InPlaceEditor.DefaultCallbacks);
    [this._extraDefaultOptions].flatten().compact().each(function(defs) {
      Object.extend(this.options, defs);
    }.bind(this));
  },
  prepareSubmission: function() {
    this._saving = true;
    this.removeForm();
    this.leaveHover();
    this.showSaving();
  },
  registerListeners: function() {
    this._listeners = { };
    var listener;
    $H(Ajax.InPlaceEditor.Listeners).each(function(pair) {
      listener = this[pair.value].bind(this);
      this._listeners[pair.key] = listener;
      if (!this.options.externalControlOnly)
        this.element.observe(pair.key, listener);
      if (this.options.externalControl)
        this.options.externalControl.observe(pair.key, listener);
    }.bind(this));
  },
  removeForm: function() {
    if (!this._form) return;
    this._form.remove();
    this._form = null;
    this._controls = { };
  },
  showSaving: function() {
    this._oldInnerHTML = this.element.innerHTML;
    this.element.innerHTML = this.options.savingText;
    this.element.addClassName(this.options.savingClassName);
    this.element.style.backgroundColor = this._originalBackground;
    this.element.show();
  },
  triggerCallback: function(cbName, arg) {
    if ('function' == typeof this.options[cbName]) {
      this.options[cbName](this, arg);
    }
  },
  unregisterListeners: function() {
    $H(this._listeners).each(function(pair) {
      if (!this.options.externalControlOnly)
        this.element.stopObserving(pair.key, pair.value);
      if (this.options.externalControl)
        this.options.externalControl.stopObserving(pair.key, pair.value);
    }.bind(this));
  },
  wrapUp: function(transport) {
    this.leaveEditMode();
    this._boundComplete(transport, this.element);
  }
});

Object.extend(Ajax.InPlaceEditor.prototype, {
  dispose: Ajax.InPlaceEditor.prototype.destroy
});

Ajax.InPlaceCollectionEditor = Class.create(Ajax.InPlaceEditor, {
  initialize: function($super, element, url, options) {
    this._extraDefaultOptions = Ajax.InPlaceCollectionEditor.DefaultOptions;
    $super(element, url, options);
  },

  createEditField: function() {
    var list = document.createElement('select');
    list.name = this.options.paramName;
    list.size = 1;
    this._controls.editor = list;
    this._collection = this.options.collection || [];
    if (this.options.loadCollectionURL)
      this.loadCollection();
    else
      this.checkForExternalText();
    this._form.appendChild(this._controls.editor);
  },

  loadCollection: function() {
    this._form.addClassName(this.options.loadingClassName);
    this.showLoadingText(this.options.loadingCollectionText);
    var options = Object.extend({ method: 'get' }, this.options.ajaxOptions);
    Object.extend(options, {
      parameters: 'editorId=' + encodeURIComponent(this.element.id),
      onComplete: Prototype.emptyFunction,
      onSuccess: function(transport) {
        var js = transport.responseText.strip();
        if (!/^\[.*\]$/.test(js)) // TODO: improve sanity check
          throw('Server returned an invalid collection representation.');
        this._collection = eval(js);
        this.checkForExternalText();
      }.bind(this),
      onFailure: this.onFailure
    });
    new Ajax.Request(this.options.loadCollectionURL, options);
  },

  showLoadingText: function(text) {
    this._controls.editor.disabled = true;
    var tempOption = this._controls.editor.firstChild;
    if (!tempOption) {
      tempOption = document.createElement('option');
      tempOption.value = '';
      this._controls.editor.appendChild(tempOption);
      tempOption.selected = true;
    }
    tempOption.update((text || '').stripScripts().stripTags());
  },

  checkForExternalText: function() {
    this._text = this.getText();
    if (this.options.loadTextURL)
      this.loadExternalText();
    else
      this.buildOptionList();
  },

  loadExternalText: function() {
    this.showLoadingText(this.options.loadingText);
    var options = Object.extend({ method: 'get' }, this.options.ajaxOptions);
    Object.extend(options, {
      parameters: 'editorId=' + encodeURIComponent(this.element.id),
      onComplete: Prototype.emptyFunction,
      onSuccess: function(transport) {
        this._text = transport.responseText.strip();
        this.buildOptionList();
      }.bind(this),
      onFailure: this.onFailure
    });
    new Ajax.Request(this.options.loadTextURL, options);
  },

  buildOptionList: function() {
    this._form.removeClassName(this.options.loadingClassName);
    this._collection = this._collection.map(function(entry) {
      return 2 === entry.length ? entry : [entry, entry].flatten();
    });
    var marker = ('value' in this.options) ? this.options.value : this._text;
    var textFound = this._collection.any(function(entry) {
      return entry[0] == marker;
    }.bind(this));
    this._controls.editor.update('');
    var option;
    this._collection.each(function(entry, index) {
      option = document.createElement('option');
      option.value = entry[0];
      option.selected = textFound ? entry[0] == marker : 0 == index;
      option.appendChild(document.createTextNode(entry[1]));
      this._controls.editor.appendChild(option);
    }.bind(this));
    this._controls.editor.disabled = false;
    Field.scrollFreeActivate(this._controls.editor);
  }
});


Ajax.InPlaceEditor.prototype.initialize.dealWithDeprecatedOptions = function(options) {
  if (!options) return;
  function fallback(name, expr) {
    if (name in options || expr === undefined) return;
    options[name] = expr;
  };
  fallback('cancelControl', (options.cancelLink ? 'link' : (options.cancelButton ? 'button' :
    options.cancelLink == options.cancelButton == false ? false : undefined)));
  fallback('okControl', (options.okLink ? 'link' : (options.okButton ? 'button' :
    options.okLink == options.okButton == false ? false : undefined)));
  fallback('highlightColor', options.highlightcolor);
  fallback('highlightEndColor', options.highlightendcolor);
};

Object.extend(Ajax.InPlaceEditor, {
  DefaultOptions: {
    ajaxOptions: { },
    autoRows: 3,                                // Use when multi-line w/ rows == 1
    cancelControl: 'link',                      // 'link'|'button'|false
    cancelText: 'cancel',
    clickToEditText: 'Click to edit',
    externalControl: null,                      // id|elt
    externalControlOnly: false,
    fieldPostCreation: 'activate',              // 'activate'|'focus'|false
    formClassName: 'inplaceeditor-form',
    formId: null,                               // id|elt
    highlightColor: '#ffff99',
    highlightEndColor: '#ffffff',
    hoverClassName: '',
    htmlResponse: true,
    loadingClassName: 'inplaceeditor-loading',
    loadingText: 'Loading...',
    okControl: 'button',                        // 'link'|'button'|false
    okText: 'ok',
    paramName: 'value',
    rows: 1,                                    // If 1 and multi-line, uses autoRows
    savingClassName: 'inplaceeditor-saving',
    savingText: 'Saving...',
    size: 0,
    stripLoadedTextTags: false,
    submitOnBlur: false,
    textAfterControls: '',
    textBeforeControls: '',
    textBetweenControls: ''
  },
  DefaultCallbacks: {
    callback: function(form) {
      return Form.serialize(form);
    },
    onComplete: function(transport, element) {
      new Effect.Highlight(element, {
        startcolor: this.options.highlightColor, keepBackgroundImage: true });
    },
    onEnterEditMode: null,
    onEnterHover: function(ipe) {
      ipe.element.style.backgroundColor = ipe.options.highlightColor;
      if (ipe._effect)
        ipe._effect.cancel();
    },
    onFailure: function(transport, ipe) {
      alert('Error communication with the server: ' + transport.responseText.stripTags());
    },
    onFormCustomization: null, // Takes the IPE and its generated form, after editor, before controls.
    onLeaveEditMode: null,
    onLeaveHover: function(ipe) {
      ipe._effect = new Effect.Highlight(ipe.element, {
        startcolor: ipe.options.highlightColor, endcolor: ipe.options.highlightEndColor,
        restorecolor: ipe._originalBackground, keepBackgroundImage: true
      });
    }
  },
  Listeners: {
    click: 'enterEditMode',
    keydown: 'checkForEscapeOrReturn',
    mouseover: 'enterHover',
    mouseout: 'leaveHover'
  }
});

Ajax.InPlaceCollectionEditor.DefaultOptions = {
  loadingCollectionText: 'Loading options...'
};


Form.Element.DelayedObserver = Class.create({
  initialize: function(element, delay, callback) {
    this.delay     = delay || 0.5;
    this.element   = $(element);
    this.callback  = callback;
    this.timer     = null;
    this.lastValue = $F(this.element);
    Event.observe(this.element,'keyup',this.delayedListener.bindAsEventListener(this));
  },
  delayedListener: function(event) {
    if(this.lastValue == $F(this.element)) return;
    if(this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(this.onTimerEvent.bind(this), this.delay * 1000);
    this.lastValue = $F(this.element);
  },
  onTimerEvent: function() {
    this.timer = null;
    this.callback(this.element, $F(this.element));
  }
});

(function() {
  function run(script) {
    try {
      return eval("with (window) { " + script + "}");
    } catch (e) {
      (function() { throw e }).defer();
    }
  }

  function processAsyncScripts(scripts) {
    if (!scripts.length) {
      window.async = run;
    } else {
      (function() {
        run(scripts.shift());
        processAsyncScripts(scripts);
      }).defer();
    }
  }

  document.observe("dom:loaded", function() {
    if (window.async && async.f)
      processAsyncScripts.defer(async.f);
  });
})();

document.observe("dom:loaded", function() {
  if (!$(document.body).hasClassName("identity_validation")) return;

  var valid = {}, username, password, confirmation, request;
  var form = $(document.body).down("form.identity_form");
  var originalUsername = $F("username");

  function get(id) {
    if ($(id)) return $F(id);
  }

  function validateElement(element) {
    element.up(".validated_field").
      removeClassName("invalid").
      addClassName("valid");
    valid[element.id] = true;
  }

  function invalidateElement(element, message) {
    var field = element.up(".validated_field");
    field.removeClassName("valid").
      addClassName("invalid");
    field.down("p.error").update(message);
    valid[element.id] = false;
  }

  function resetElement(element) {
    var field = element.up(".validated_field");
    field.removeClassName("valid").
      removeClassName("invalid");
    field.down("p.error").update("");
    valid[element.id] = false;
  }

  function getErrorForFirstName() {
    if (!$('first_name').getValue().length) {
      return form.readAttribute('data-first-name-required');
    }
  }

  function getErrorForUsername() {
    username = $("username").getValue().strip().gsub(/\s+/, " ");
    if (username.length < 3) {
      return form.readAttribute('data-username-too-short');
    }
  }

  function checkUsernameAvailability() {
    new Ajax.Request("/id/identities/availability", {
      parameters: { username: username, first_name: get("first_name"), last_name: get("last_name") },
      method:     "get",
      evalJSON:   true,
      onComplete: function(transport) {
        var result = transport.responseJSON;
        if (originalUsername.length && result.username == originalUsername) return;
        if (result && result.username == username && username && !result.available) {
          var message = form.readAttribute('data-username-unavailable');
          if ($("username_suggestions")) message += "<br />" + form.readAttribute('data-try-another-username');
          invalidateElement($("username"), message);
          suggestUsernames(result.suggestions);
        }
      }
    });
  }

  function suggestUsernames(suggestions) {
    if (!$("username_suggestions")) return;
    if (suggestions && suggestions.length) {
      $("username_suggestions").show().down("ul").update(
        suggestions.map(function(suggestedUsername) {
          var escapedUsername = suggestedUsername.escapeHTML();
          return "<li><a href=# data='" + escapedUsername +
            "'>" + escapedUsername + "</a></li>";
        }).join("")
      );
    } else {
      hideUsernameSuggestions();
    }
  }

  function hideUsernameSuggestions() {
    if (!$("username_suggestions")) return;
    $("username_suggestions").hide();
  }

  function getErrorForPassword() {
    password = $("password").getValue();
    if (password.length < 6) {
      return form.readAttribute('data-password-too-short');
    } else if (password == "password") {
      return form.readAttribute('data-password-not-password');
    } else if (username && username.length && password == username) {
      return form.readAttribute('data-password-same-as-username');
    }
  }

  function getErrorForPasswordConfirmation() {
    confirmation = $("password_confirmation").getValue();
    if (confirmation.length && confirmation != password)  {
      return form.readAttribute('data-password-mismatch');
    } else if (confirmation.length < 6) {
      return form.readAttribute('data-password-too-short');
    }
  }

  function performInteractiveValidationFor(element, validator, existingValue) {
    var value = element.getValue();
    if (element.getValue() == existingValue) return;

    if (!value.length || validator()) {
      resetElement(element);
    } else {
      validateElement(element);
    }
  }

  function performValidationFor(element, validator, complainAboutBlankValues) {
    var message = (validator || Prototype.K)(), value = element.getValue();

    if (!value.length) {
      if (complainAboutBlankValues) {
        invalidateElement(element, message);
      } else {
        resetElement(element);
      }
      return false;
    } else if (message) {
      invalidateElement(element, message);
      return false;
    } else {
      validateElement(element);
      return true;
    }
  }

  function dummifyElement(element) {
    if (element.hasClassName("dummy")) {
      element.setValue("                      ").writeAttribute("data-dummy", "true");
    }
  }

  function undummifyElement(element) {
    if (element.readAttribute("data-dummy")) {
      element.setValue("").writeAttribute("data-dummy", null);
    }
  }

  function dummify() {
    if (!$F("password") && !$F("password_confirmation")) {
      dummifyElement($("password"));
      dummifyElement($("password_confirmation"));
    }
  }

  function undummify() {
    undummifyElement($("password"));
    undummifyElement($("password_confirmation"));
  }

  $("first_name").observe("keyup", function(event) {
    resetElement(this);
  });

  $("first_name").observe("blur", function(event) {
    performValidationFor(this, getErrorForFirstName);
  });

  $("username").observe("keyup", function(event) {
    hideUsernameSuggestions();
    resetElement(this);
  });

  $("username").observe("blur", function(event) {
    hideUsernameSuggestions();
    if (performValidationFor(this, getErrorForUsername)) {
      checkUsernameAvailability();
    }
  });

  $("password").observe("focus", function(event) {
    undummify();
  });

  $("password").observe("keyup", function(event) {
    performInteractiveValidationFor(this, getErrorForPassword, password);
  });

  $("password").observe("blur", function(event) {
    performValidationFor(this, getErrorForPassword);
    dummify();
  });

  $("password_confirmation").observe("focus", function(event) {
    undummify();
  });

  $("password_confirmation").observe("keyup", function(event) {
    if (event.keyCode != Event.KEY_RETURN) {
      performInteractiveValidationFor(this, getErrorForPasswordConfirmation);
    }
  });

  $("password_confirmation").observe("blur", function(event) {
    performValidationFor(this, getErrorForPasswordConfirmation);
    dummify();
  });

  form.observe("click", function(event) {
    var element = event.findElement(".username_suggestions a[data]");
    if (element) {
      username = element.readAttribute("data");
      $("username").setValue(username);
      validateElement($("username"));
      hideUsernameSuggestions();
      checkUsernameAvailability();
      $("password").focus();
      event.stop();
    }
  });

  form.observe("submit", function(event) {
    performValidationFor($("first_name"), getErrorForFirstName, true);
    performValidationFor($("username"), getErrorForUsername, true);

    if ($("password").hasClassName("dummy")) {
      undummify();
      valid.password = valid.password_confirmation = true;
    } else {
      performValidationFor($("password"), getErrorForPassword, true);
      performValidationFor($("password_confirmation"), getErrorForPasswordConfirmation, true);
    }

    if (!valid.first_name || !valid.username || !valid.password || !valid.password_confirmation) {
      event.stop();
    }
  });

  dummify();

  if ($("username").hasClassName("autofocus")) {
    (function() { $("username").focus() }).defer();
  }
});
Element.addMethods({
  trace: function(element, expression) {
    element = $(element);
    if (element.match(expression)) return element;
    return element.up(expression);
  }
});
Element.addMethods({
  upwards: function(element, iterator) {
    while (element = $(element)) {
      if (element.URL !== undefined) return;
      if (iterator(element)) return element;
      element = element.parentNode;
    }
  }
});

var HoverObserver = Class.create({
  initialize: function(element, options) {
    this.element = $(element);
    this.options = Object.extend(Object.clone(HoverObserver.Options), options || {});
    this.start();
  },

  start: function() {
    if (!this.observers) {
      var events = $w(this.options.clickToHover ? "click" : "mouseover mouseout");
      this.observers = events.map(function(name) {
        var handler = this["on" + name.capitalize()].bind(this);
        this.element.observe(name, handler);
        return { name: name, handler: handler };
      }.bind(this));
    }
  },

  stop: function() {
    if (this.observers) {
      this.observers.each(function(info) {
        this.element.stopObserving(info.name, info.handler);
      }.bind(this));
      delete this.observers;
    }
  },

  onClick: function(event) {
    var element   = this.activeHoverElement = event.findElement();
    var container = this.getContainerForElement(element);

    if (container) {
      if (this.activeContainer && container == this.activeContainer)
        return this.deactivateContainer();
      this.activateContainer(container);
    }
  },

  onMouseover: function(event) {
    var element   = this.activeHoverElement = event.findElement();
    var container = this.getContainerForElement(element);

    if (container) {
      if (this.activeContainer) {
        this.activateContainer(container);
      } else {
        this.startDelayedActivation(container);
      }
    } else {
      this.startDelayedDeactivation();
    }
  },

  onMouseout: function(event) {
    delete this.activeHoverElement;
    this.startDelayedDeactivation();
  },

  activateContainer: function(container) {
    var memo = { toElement: container };
    this.stopDelayedDeactivation();

    if (this.activeContainer) {
      if (this.activeContainer == container) return;
      memo.fromElement = this.activeContainer;
      this.deactivateContainer(memo);
    }

    this.activeContainer = container;
    this.activeContainer.fire(this.options.activationEvent, memo);
    this.activeContainer.addClassName(this.options.activeClassName);
  },

  deactivateContainer: function(memo) {
    if (this.activeContainer) {
      try {
        this.activeContainer.removeClassName(this.options.activeClassName);
        this.activeContainer.fire(this.options.deactivationEvent, memo);
      } catch (e) {
      }

      delete this.activeContainer;
    }
  },

  startDelayedActivation: function(container) {
    if (this.options.activationDelay) {
      (function() {
        if (container == this.getContainerForElement(this.activeHoverElement))
          this.activateContainer(container);

      }).bind(this).delay(this.options.activationDelay);
    } else {
      this.activateContainer(container);
    }
  },

  startDelayedDeactivation: function() {
    if (this.options.deactivationDelay) {
      this.deactivationTimeout = this.deactivationTimeout || function() {
        var container = this.getContainerForElement(this.activeHoverElement);
        if (!container || container != this.activeContainer)
          this.deactivateContainer();

      }.bind(this).delay(this.options.deactivationDelay);
    } else {
      this.deactivateContainer();
    }
  },

  stopDelayedDeactivation: function() {
    if (this.deactivationTimeout) {
      window.clearTimeout(this.deactivationTimeout);
      delete this.deactivationTimeout;
    }
  },

  getContainerForElement: function(element) {
    if (!element) return;
    if (element.hasAttribute && !element.hasAttribute(this.options.containerAttribute)) {
      var target    = this.getTargetForElement(element);
      var container = this.getContainerForTarget(target);
      this.cacheContainerFromElementToTarget(container, element, target);
    }

    return $(element.readAttribute(this.options.containerAttribute));
  },

  getTargetForElement: function(element) {
    if (!element) return;
    return element.trace("." + this.options.targetClassName);
  },

  getContainerForTarget: function(element) {
    if (!element) return;
    var containerClassName = this.options.containerClassName,
        containerAttribute = this.options.containerAttribute,
        expression = "[" + containerAttribute + "], ." + containerClassName;

    var container = (element.hasClassName(containerClassName)) ? element : element.trace(expression);

    if (container && container.hasAttribute(containerAttribute)) {
      return $(container.readAttribute(containerAttribute));
    } else {
      return container;
    }
  },

  cacheContainerFromElementToTarget: function(container, element, target) {
    if (container && target) {
      element.upwards(function(e) {
        e.writeAttribute(this.options.containerAttribute, container.identify());
        if (e == target) return true;
      }.bind(this));
    }
  }
});

Object.extend(HoverObserver, {
  Options: {
    activationDelay:    0,
    deactivationDelay:  0.5,
    targetClassName:    "hover_target",
    containerClassName: "hover_container",
    containerAttribute: "hover_container",
    activeClassName:    "hover",
    activationEvent:    "hover:activated",
    deactivationEvent:  "hover:deactivated",
    clickToHover:       false
  }
});

var Cookie = {
  get: function(name) {
    var cookie = document.cookie.match(new RegExp('(^|;)\\s*' + escape(name) + '=([^;\\s]*)'));
    return (cookie ? unescape(cookie[2]) : null);
  },

  set: function(name, value, daysToExpire) {
    var attrs = '; path=/';
    if (daysToExpire != undefined) {
      var d = new Date();
      d.setTime(d.getTime() + (86400000 * parseFloat(daysToExpire)));
      attrs += '; expires=' + d.toGMTString();
    }
    return (document.cookie = encodeURIComponent(name) + '=' + encodeURIComponent(value || '') + attrs);
  },

  remove: function(name) {
    var cookie = Cookie.get(name) || true;
    Cookie.set(name, '', -1);
    return cookie;
  }
};

var Launchbar = {
  initialize: function() {
    $(document.body).addClassName("with_launchbar");
    new HoverObserver("launchbar", {
      activationDelay: 0.5,
      regionClassName: "hover_container"
    });
  },

  selectCurrent: function(application, name) {
    var app_id  = 'launchbar_app_' + application;
    var link_id = 'launchbar_link_' + application + '_' + name;

    if ($(app_id)) $(app_id).addClassName('on');

    if ($(link_id)) {
      $(link_id).addClassName('current_account');
      if ($(app_id)) $(app_id).innerHTML += ": " + $(link_id).innerHTML;
      $(link_id).innerHTML = "&bull; " + $(link_id).innerHTML;
    }
  },

  rememberLocation: function() {
    var daysToExpire = 0.125; // 3 hours
    Cookie.set("return_to", window.location.href, daysToExpire);
  }
};

document.observe("dom:loaded", function() {
  if ($("launchbar")) {
    Launchbar.initialize();
    Launchbar.rememberLocation();
  }
});
(function() {
  var focusInHandler = function(e) { e.findElement().fire("focus:in") };
  var focusOutHandler = function(e) { e.findElement().fire("focus:out") };

  if (document.addEventListener && !Prototype.Browser.IE) {
    document.addEventListener("focus", focusInHandler, true);
    document.addEventListener("blur", focusOutHandler, true);
  } else {
    document.observe("focusin", focusInHandler);
    document.observe("focusout", focusOutHandler);
  }
})();

var Placeholder = {
  supported: function() {
    var i = document.createElement('input');
    return 'placeholder' in i;
  },

  teardown: function(input) {
    Placeholder.focus(input);
  },

  clear: function(input) {
    input.value = '';
    input.removeClassName('placeholder');
  },

  focus: function(input) {
    if (input.hasClassName('placeholder') &&
        input.value == input.readAttribute('placeholder'))
      Placeholder.clear(input);
  },

  blur: function(input) {
    if (input.value.blank()) {
	    input.value = input.readAttribute('placeholder');
	    input.addClassName('placeholder');
		}
  }
};

document.observe('dom:loaded', function() {
  if (!Placeholder.supported()) {
    $$('input[placeholder]').each(Placeholder.blur);

    $(document.body).observe('focus:in', function(event) {
      var input = event.findElement('input[placeholder]');
      if (input) Placeholder.focus(input);
    });

    $(document.body).observe('focus:out', function(event) {
      var input = event.findElement('input[placeholder]');
      if (input) Placeholder.blur(input);
    });

    $(document.body).observe('submit', function(event) {
      event.element().select('input[placeholder]').each(Placeholder.teardown);
    });
  }
});

Placeholder.Overlay = {
  wrap: function(input) {
    if (!input)
      return $$('input.overlayable').each(Placeholder.Overlay.wrap);

    input = $(input);

    if (input.overlay) return;
    input.overlay = true;

    var wrapper = new Element('span', { 'class': 'overlay_wrapper' });
    input.parentNode.replaceChild(wrapper, input);
    wrapper.appendChild(input);

    input.label = new Element('label', { 'for': input.id, 'class': 'overlabel' });
    input.label.update(input.title);
    input.insert({ before: input.label });

    Placeholder.Overlay.reset(input);
  },

  reset: function(input) {
    if (input.value.blank())
      input.label.show();
    else
      input.label.hide();
  },

  focus: function(input) {
    if (input.label && input.value.blank())
      input.label.addClassName('focus');
  },

  blur: function(input) {
    if (input.label && input.value.blank()) {
      input.label.removeClassName('focus');
      input.label.show();
    }
  }
};

document.observe('dom:loaded', function() {
  document.observe('focus:in', function(event) {
    var input = event.findElement('.overlayable');
    if (input) Placeholder.Overlay.focus(input);
  });

  document.observe('focus:out', function(event) {
    var input = event.findElement('.overlayable');
    if (input) Placeholder.Overlay.blur(input);
  });

  document.observe('keypress', function(event) {
    if (event.keyCode == Event.KEY_TAB) return;
    var input = event.findElement('.overlayable');
    if (input && input.label) input.label.hide();
  });

  document.observe('paste', function(event) {
    var input = event.findElement('.overlayable');
    if (input && input.label) input.label.hide();
  });

  Placeholder.Overlay.wrap();

  $$('input.overlayable[autocomplete=on]').each(function(input) {
    Placeholder.Overlay.reset(input);

    new Form.Element.Observer(input, 0.2, function() {
      Placeholder.Overlay.reset(input);
    });
  });
});

var AvatarUploader = Class.create({
  initialize: function(input, path, options) {
    this.input = input;
    this.path = path;
    this.beforeUpload = options['beforeUpload'];
    this.observe();
  },

  observe: function() {
    var self = this;
    this.input.observe('change', function() {
      self.upload();
    });
  },

  reset: function() {
    var container = this.input.up();
    container.innerHTML = container.innerHTML;
    this.input = container.down('input[type=file]');
    this.observe();
  },

  upload: function() {
    if (this.beforeUpload) this.beforeUpload();
    this.input.up('form').submit();
    this.reset();
  }
});

var AvatarPreviewer = {
  init: function(element, path) {
    this.element = element;

    new AvatarUploader(element.down('input[type=file]'), path, {
      beforeUpload: this.uploadStart.bind(this)
    });

    element.down('[data-behavior~=remove_avatar]').observe('click',
      this.removeAvatar.bind(this)
    );
  },

  uploadStart: function() {
    this.element.className = 'busy';
  },

  uploadComplete: function(url, key) {
    $('avatar_key').value = key;
    this.element.down('div.photo').insert(new Element('img', { src: url }));
    this.element.className = 'complete';
  },

  removeAvatar: function(event) {
    event.stop();
    $('avatar_key').value = '';
    this.element.down('div.photo').clear();
    this.element.className = '';
  }
};

document.observe('dom:loaded', function() {
  var element = $$('[data-behavior~=avatar_previewer]')[0];
  if (element) AvatarPreviewer.init(element, '/id/avatar_previews');
});

document.observe('dom:loaded', function() {
  var zoneMap = {
    "10": "Hawaii",
     "9": "Alaska",
     "8": "Pacific Time (US & Canada)",
     "7": "Mountain Time (US & Canada)",
     "6": "Central Time (US & Canada)",
     "5": "Eastern Time (US & Canada)",
     "4": "Atlantic Time (Canada)",
     "3": "Greenland",
     "2": "Mid-Atlantic",
     "1": "Azores",
     "0": "UTC",
    "-1": "Amsterdam",
    "-2": "Athens",
    "-3": "Moscow",
    "-4": "Muscat",
    "-5": "Ekaterinburg",
    "-6": "Almaty",
    "-7": "Bangkok",
    "-8": "Beijing",
    "-9": "Tokyo",
   "-10": "Brisbane",
   "-11": "Magadan",
   "-12": "Auckland",
   "-13": "Nuku'alofa"
  };

  function setTimezone(field, name) {
    if (name != null) $(field).value = name;
  }

  function getTimezone() {
    var today  = new Date();
    var winter = new Date(today.getFullYear(), 0, 1);
    var summer = new Date(today.getFullYear(), 6, 1);
    var offset = Math.max(winter.getTimezoneOffset(), summer.getTimezoneOffset()) / 60;

    return zoneMap[offset];
  }

  if ($(document.body).hasClassName('rsvp')) {
    var field = $$('[data-behavior~=time_zone_detection]')[0];
    if (field) setTimezone(field, getTimezone());
  }
});


var MenuObserver = Class.create({
  initialize: function(region, options) {
    this.region  = $(region);
    this.options = options;
    this.registerObservers();
    this.start();
  },

  registerObservers: function() {
    var startEvent, endEvent;

    if (Prototype.BrowserFeatures.Multitouch) {
      startEvent = "touchstart", endEvent = "touchend";
    } else {
      startEvent = "mousedown", endEvent = "mouseup";
    }

    $(document.body).observe("mousedown", this.onDocumentMouseDown.bind(this));
    this.region.observe(startEvent, this.onRegionMouseDown.bind(this));
    this.region.observe(endEvent, this.onRegionMouseUp.bind(this));
    this.region.observe("click", this.onRegionClick.bind(this));
    this.region.observe("mouseover", this.onRegionMouseOver.bind(this));
    this.region.observe("mouseout", this.onRegionMouseOut.bind(this));
    this.region.observe("keydown", this.onRegionKeyDown.bind(this));
    this.region.observe("menu:deactivate", this.deactivate.bind(this));
  },

  start: function() {
    this.started = true;
  },

  stop: function() {
    this.started = false;
  },

  onDocumentMouseDown: function(event) {
    if (!this.started || !this.activeContainer) return;

    var element = event.findElement();
    if (!this.elementBelongsToActiveContainer(element)) {
      this.dismiss();
    }
  },

  onRegionMouseDown: function(event) {
    if (!this.started) return;

    var element = event.findElement();
    if (!this.elementBelongsToActiveContainer(element)) {
      if (!this.dismiss()) return;
    }

    var target = this.findTargetForElement(element);
    if (target) {
      var container = this.findContainerForElement(target);
      if (container == this.activeContainer) {
        this.dismiss();
      } else {
        this.activate(container);
      }
      event.stop();
    }
  },

  onRegionMouseUp: function(event) {
    if (!this.started || !this.activeContainer || this.isIgnorable(event)) return;

    var element = event.findElement();
    if (this.elementBelongsToActiveContainer(element)) {
      var action = this.findActionForElement(element);
      if (action) {
        this.select(action);
        this.deactivate();
        event.stop();
      }
    }
  },

  onRegionClick: function(event) {
    if (!this.started || this.isIgnorable(event)) return;

    var element = event.findElement();
    var provision = this.findProvisionForElement(element);

    if (provision && provision.match("a[href='#']")) {
      event.stop();
    }
  },

  onRegionMouseOver: function(event) {
    var element = event.findElement("[data-menuaction]");
    if (element) element.addClassName("hover");
  },

  onRegionMouseOut: function(event) {
    var element = event.findElement("[data-menuaction]");
    if (element) element.removeClassName("hover");
  },

  onRegionKeyDown: function(event) {
    if (!this.started) return;

    if (event.keyCode == Event.KEY_ESC) {
      this.dismiss();
      event.stop();
    }
  },

  activate: function(container) {
    if (container) {
      var event = container.fire("menu:prepared", {
        container: this.activeContainer
      });

      if (!event.stopped) {
        this.finishDeactivation();
        this.activeContainer = container;
        this.activeContainer.addClassName("active_menu");
        this.activeContent = this.findContentForContainer(container);
        this.activeContent.show();
        this.activeContainer.fire("menu:activated");
      }
    }
  },

  deactivate: function() {
    if (this.activeContainer) {
      var container = this.activeContainer;
      var content = this.activeContent;
      this.activeContainer = this.activeContent = false;

      this.deactivation = {
        container: container,
        content: content
      };

      try {
        this.deactivation.effect = new Effect.Fade(content, {
          duration: 0.2,
          afterFinish: this.finishDeactivation.bind(this)
        });
      } catch (x) {
        this.finishDeactivation();
      }
    }
  },

  finishDeactivation: function() {
    if (this.deactivation) {
      try {
	      this.deactivation.container.removeClassName("active_menu");
	      this.deactivation.container.fire("menu:deactivated");
	      if (this.deactivation.effect) this.deactivation.effect.cancel();
	      this.deactivation.content.setStyle({opacity: ''}).hide();
      } catch (x) {
      } finally {
	      this.deactivation = false;
      }
    }
  },

  dismiss: function() {
    if (!this.activeContainerIsModal()) {
      this.deactivate();
      return true;
    }
  },

  select: function(action) {
    if (this.activeContainer) {
      var actionName  = action.readAttribute("data-menuaction");
      var actionValue = action.readAttribute("data-menuvalue");

      action.fire("menu:selected", {
        container: this.activeContainer,
        action:    actionName,
        value:     actionValue
      });
    }
  },

  isIgnorable: function(event) {
    return event.button > 1 || event.ctrlKey || event.metaKey;
  },

  elementBelongsToActiveContainer: function(element) {
    if (this.activeContainer) {
      return this.findContainerForElement(element) == this.activeContainer;
    }
  },

  elementsBelongToSameContainer: function(first, second) {
    var firstContainer  = this.findContainerForElement(first);
    var secondContainer = this.findContainerForElement(second);
    return firstContainer == secondContainer;
  },

  findTargetForElement: function(element) {
    var target = element.trace(".menu_target");
    if (this.elementsBelongToSameContainer(element, target)) return target;
  },

  findActionForElement: function(element) {
    var action = element.trace("[data-menuaction]");
    if (this.elementsBelongToSameContainer(element, action)) return action;
  },

  findProvisionForElement: function(element) {
    var provision = element.trace(".menu_target, .menu_content, [data-menuaction]");
    if (this.elementsBelongToSameContainer(element, provision)) return provision;
  },

  findContainerForElement: function(element) {
    if (!element) return;

    var parent = element.trace(".menu_content, .menu_container");
    if (!parent) return;

    if (parent == this.activeContent) {
      return this.activeContainer;
    } else if (parent.hasClassName("menu_content")) {
      return parent.trace(".menu_container");
    } else {
      return parent;
    }
  },

  findContentForContainer: function(container) {
    var id = container.readAttribute("data-menucontent");
    if (id) {
      return $(id);
    } else {
      return container.down(".menu_content");
    }
  },

  activeContainerIsModal: function() {
    return this.activeContainer && this.activeContainer.hasClassName("modal");
  }
});
Element.addMethods({
  autofocus: function(element, options) {
    var field;
    element = $(element);
    options = options || {};

    if (options.firstBlankElement) {
      field = element.select(".autofocus").find(function(candidate) {
        return candidate.getValue().blank();
      });
    }

    if (!field) {
      field = element.down(".autofocus");
    }

    if (field) {
      (function() { try { field.focus() } catch (e) { } }).defer();
    }

    return element;
  }
});
Effect.Height = Class.create();
Object.extend(Effect.Height.prototype, Effect.Base.prototype);
Object.extend(Effect.Height.prototype, {
  initialize: function(element, options) {
    this.element = $(element);
    options = Object.extend({
      from: this.element.getHeight(),
      to: 0
    }, options || {});
    this.start(options);
  },

  setup: function() {
    this.setHeight(this.options.from);
  },

  update: function(position) {
    this.setHeight(position);
  },

  finish: function() {
    this.setHeight(this.options.to);
  },

  setHeight: function(height) {
    this.element.style.height = parseInt(height) + "px";
  }
});

Effect.Blend = Class.create();
Object.extend(Effect.Blend.prototype, Effect.Base.prototype);
Object.extend(Effect.Blend.prototype, {
  initialize: function(element, options) {
    this.element = $(element);
    options = Object.extend({
      invert: false,
      from: 0.0,
      to: 1.0
    }, options || {});
    this.start(options);
  },

  setup: function() {
    this.setOpacityByPosition(this.options.from);
  },

  update: function(position) {
    this.setOpacityByPosition(position);
  },

  finish: function() {
    this.setOpacityByPosition(this.options.to);
  },

  setOpacityByPosition: function(position) {
    var opacity = this.options.invert ? 1.0 - position : position;
    this.element.setOpacity(opacity);
  }
});

var Transitions = {
  animationEnabled: true
};

Element.addMethods({
  transition: function(element, change, options) {
    if (typeof change == "object" && typeof options == "function")
      change = [change, options], options = change.shift(), change = change.shift();

    element = $(element);
    options = options || {};
    options.animate = options.animate !== false && Transitions.animationEnabled;
    options.fade = options.fade !== false;

    function finish() {
      (options.after || Prototype.K)();
    }

    function highlightAndFinish(destinationElement) {
      if (options.highlight) {
        var highlightElement = options.highlight === true ? destinationElement : ($(options.highlight) || destinationElement);
        new Effect.Highlight(highlightElement, { duration: 2, afterFinish: finish });
      } else {
        finish.defer();
      }
    }

    function cloneWithoutIDs(element) {
      element = $(element);
      var clone = element.cloneNode(true);
      clone.id = "";
      clone.getElementsBySelector("*[id]").each(function(e) { e.id = "" });
      return clone;
    }

    if (options.animate) {
      var transitionElement = new Element("div").setStyle({ position: "relative", overflow: "hidden" });
      element.insert({ before: transitionElement });

      var sourceElement = cloneWithoutIDs(element);
      var sourceElementWrapper = sourceElement.wrap("div");
      var destinationElementWrapper = element.wrap("div");
      transitionElement.appendChild(sourceElementWrapper);
      transitionElement.appendChild(destinationElementWrapper);
    }

    change(element);

    if (options.animate) {
      var sourceHeight = sourceElementWrapper.getHeight(), destinationHeight = destinationElementWrapper.getHeight();
      var sourceWidth  = sourceElementWrapper.getWidth(),  destinationWidth  = destinationElementWrapper.getWidth();

      var outerWrapper = new Element("div");
      transitionElement.insert({ before: outerWrapper });
      outerWrapper.setStyle({ overflow: "hidden", height: sourceHeight + "px"});
      outerWrapper.appendChild(transitionElement);

      var maxHeight = destinationHeight > sourceHeight ? destinationHeight : sourceHeight;
      transitionElement.setStyle({ height: maxHeight + "px" });
      sourceElementWrapper.setStyle({ position: "absolute", height: maxHeight + "px", width: sourceWidth + "px", top: 0, left: 0 });
      destinationElementWrapper.setStyle({ position: "absolute", height: maxHeight + "px", width: sourceWidth + "px", top: 0, left: 0, opacity: 0, zIndex: 2000 });

      var effects = [
        new Effect.Height(transitionElement, { sync: true, from: sourceHeight, to: destinationHeight }),
        new Effect.Blend(destinationElementWrapper, { sync: true })
      ];

      if (options.fade) {
        effects.push(new Effect.Blend(sourceElementWrapper, { invert: true, sync: true }));
        destinationElementWrapper.setStyle({ zIndex: 0 });
        sourceElementWrapper.setStyle({ zIndex: 2000 });
      }

      new Effect.Parallel(effects, {
        duration: options.duration || 0.3,

        afterUpdate: function() {
          if (outerWrapper) {
            outerWrapper.insert({ before: transitionElement });
            outerWrapper.remove();
            outerWrapper = false;
          }
        },

        afterFinish: function() {
          var destinationElement = destinationElementWrapper.down();
          if (destinationElement)
            transitionElement.insert({ before: destinationElement });
          transitionElement.remove();

          highlightAndFinish(destinationElement);
        }
      });

    } else {
      highlightAndFinish(element);
    }

    return {
      after: function(after) {
        options.after = (options.after || Prototype.K).wrap(function(proceed) {
          proceed();
          after();
        });
        return this;
      }
    };
  }
});


if (Prototype.Browser.WebKit) {
  document.observe("dom:loaded", function() {
    document.documentElement.setStyle({
      backgroundColor: document.body.getStyle("backgroundColor")
    });
  });
}


document.observe("dom:loaded", function() {
  var button;

  document.on("mousedown", "div.link_button", function(event, element) {
    button = element;
    button.addClassName("pressed");
    event.stop();
  });

  document.on("mouseup", function(event, element) {
    if (button) {
      var element = event.findElement("div.link_button");
      if (!element) {
        event.stop();
      }
      button.removeClassName("pressed");
      button = null;
    }
  });

  document.on("mouseover", function(event) {
    if (button) {
      var element = event.findElement("div.link_button");
      if (button == element) {
        button.addClassName("pressed");
      } else {
        button.removeClassName("pressed");
      }
    }
  });
});
document.on("click", "a[href][behavior~=return_to]", function(event, element) {
  var source = element.readAttribute("href").gsub(/#.*$/, "");
  var destinationWithAnchor = String(window.location);
  var destinationWithoutAnchor = window.location.pathname + window.location.search;

  if (source != destinationWithoutAnchor) {
    var hash = $H();
    hash.set(source, destinationWithAnchor);
    JsonCookie.set("return_to_paths", hash);
  }
});


/* ------------------------------------------------------------------------
 * application.js
 * Copyright (c) 2004-2008 37signals, LLC. All rights reserved.
 * ------------------------------------------------------------------------ */

Element.addMethods("input", {
  enableAndRevert: function(element) {
    element.enable();
    var original = element.getAttribute('originalValue');
    if (original)
      element.value = original;
    return element;
  }
});

Element.addMethods(new function() {
  this.is         = Element.hasClassName
  this.isNot      = function() { return ! Element.is.apply(undefined, arguments) }
  this.classify   = Element.addClassName
  this.declassify = Element.removeClassName
  this.any        = function() { return ! Element.empty.apply(undefined, arguments) }
});

/* Watch for nubbins */
document.observe("dom:loaded", function() {
  if (Prototype.Browser.MobileSafari)
    $(document.body).addClassName("iphone");

  if ($("screen_body")) {
    window.hoverObserver = new HoverObserver("screen_body");

    if (RAILS_ENV == "development") {
      document.observe("keyup", function(event) {
        if (event.ctrlKey && /h/i.match(String.fromCharCode(event.charCode || event.keyCode))) {
          if (observer.isActive())
            hoverObserver.stop();
          else
            hoverObserver.start();
        }
      });
    }
  }
});

var includeCaption = true; // Turn on the "caption" feature, and write out the caption HTML
var zoomTime       = 5;    // Milliseconds between frames of zoom animation
var zoomSteps      = 15;   // Number of zoom animation frames
var includeFade    = 1;    // Set to 1 to fade the image in / out as it zooms
var minBorder      = 90;   // Amount of padding between large, scaled down images, and the window edges
var shadowSettings = '0px 5px 25px rgba(0, 0, 0, '; // Blur, radius, color of shadow for compatible browsers

var zoomImagesURI   = '/images/zoom/'; // Location of the zoom and shadow images


var myWidth = 0, myHeight = 0, myScroll = 0; myScrollWidth = 0; myScrollHeight = 0;
var zoomOpen = false, preloadFrame = 1, preloadActive = false, preloadTime = 0, imgPreload = new Image();
var preloadAnimTimer = 0;

var zoomActive = new Array(); var zoomTimer  = new Array();
var zoomOrigW  = new Array(); var zoomOrigH  = new Array();
var zoomOrigX  = new Array(); var zoomOrigY  = new Array();

var zoomID         = "ZoomBox";
var theID          = "ZoomImage";
var zoomCaption    = "ZoomCaption";
var zoomCaptionDiv = "ZoomCapDiv";

if (navigator.userAgent.indexOf("MSIE") != -1) {
	var browserIsIE = true;
}


function setupZoom() {
	prepZooms();
	insertZoomHTML();
	zoomdiv = document.getElementById(zoomID);
	zoomimg = document.getElementById(theID);
}


function prepZooms() {
	if (! document.getElementsByTagName) {
		return;
	}
	var links = document.getElementsByTagName("a");
	for (i = 0; i < links.length; i++) {
		if (links[i].getAttribute("href")) {
			if (links[i].getAttribute("href").search(/(.*)\.(jpg|jpeg|gif|png|bmp|tif|tiff)/gi) != -1) {
				if (links[i].getAttribute("rel") != "nozoom") {
					links[i].onclick = function (event) { return zoomClick(this, event); };
					links[i].onmouseover = function () { zoomPreload(this); };
				}
			}
		}
	}
}


function zoomPreload(from) {

	var theimage = from.getAttribute("href");


	if (imgPreload.src.indexOf(from.getAttribute("href").substr(from.getAttribute("href").lastIndexOf("/"))) == -1) {
		preloadActive = true;
		imgPreload = new Image();


		imgPreload.onload = function() {
			preloadActive = false;
		}

		imgPreload.src = theimage;
	}
}


function preloadAnimStart() {
	preloadTime = new Date();
	document.getElementById("ZoomSpin").style.left = (myWidth / 2) + 'px';
	document.getElementById("ZoomSpin").style.top = ((myHeight / 2) + myScroll) + 'px';
	document.getElementById("ZoomSpin").style.visibility = "visible";
	preloadFrame = 1;
	document.getElementById("SpinImage").src = zoomImagesURI+'zoom-spin-'+preloadFrame+'.png';
	preloadAnimTimer = setInterval("preloadAnim()", 100);
}


function preloadAnim(from) {
	if (preloadActive != false) {
		document.getElementById("SpinImage").src = zoomImagesURI+'zoom-spin-'+preloadFrame+'.png';
		preloadFrame++;
		if (preloadFrame > 12) preloadFrame = 1;
	} else {
		document.getElementById("ZoomSpin").style.visibility = "hidden";
		clearInterval(preloadAnimTimer);
		preloadAnimTimer = 0;
		zoomIn(preloadFrom);
	}
}


function zoomClick(from, evt) {

	var shift = getShift(evt);

	if (! evt && window.event && (window.event.metaKey || window.event.altKey)) {
		return true;
	} else if (evt && (evt.metaKey|| evt.altKey)) {
		return true;
	}

	getSize();

	if (preloadActive == true) {
		if (preloadAnimTimer == 0) {
			preloadFrom = from;
			preloadAnimStart();
		}
	} else {
		zoomIn(from, shift);
	}

	return false;

}


function zoomIn(from, shift) {

	zoomimg.src = from.getAttribute("href");


	if (from.childNodes[0].width) {
		startW = from.childNodes[0].width;
		startH = from.childNodes[0].height;
		startPos = findElementPos(from.childNodes[0]);
	} else {
		startW = 50;
		startH = 12;
		startPos = findElementPos(from);
	}

	hostX = startPos[0];
	hostY = startPos[1];


	if (document.getElementById('scroller')) {
		hostX = hostX - document.getElementById('scroller').scrollLeft;
	}


	endW = imgPreload.width;
	endH = imgPreload.height;


	if (zoomActive[theID] != true) {


		if (document.getElementById("ShadowBox")) {
			document.getElementById("ShadowBox").style.visibility = "hidden";
		} else if (! browserIsIE) {

			if (fadeActive["ZoomImage"]) {
				clearInterval(fadeTimer["ZoomImage"]);
				fadeActive["ZoomImage"] = false;
				fadeTimer["ZoomImage"] = false;
			}

			document.getElementById("ZoomImage").style.webkitBoxShadow = shadowSettings + '0.0)';
		}

		document.getElementById("ZoomClose").style.visibility = "hidden";


		if (includeCaption) {
			document.getElementById(zoomCaptionDiv).style.visibility = "hidden";
			if (from.getAttribute('title') && includeCaption) {
				document.getElementById(zoomCaption).innerHTML = from.getAttribute('title');
			} else {
				document.getElementById(zoomCaption).innerHTML = "";
			}
		}


		zoomOrigW[theID] = startW;
		zoomOrigH[theID] = startH;
		zoomOrigX[theID] = hostX;
		zoomOrigY[theID] = hostY;


		zoomimg.style.width = startW + 'px';
		zoomimg.style.height = startH + 'px';
		zoomdiv.style.left = hostX + 'px';
		zoomdiv.style.top = hostY + 'px';


		if (includeFade == 1) {
			setOpacity(0, zoomID);
		}
		zoomdiv.style.visibility = "visible";


		sizeRatio = endW / endH;
		if (endW > myWidth - minBorder) {
			endW = myWidth - minBorder;
			endH = endW / sizeRatio;
		}
		if (endH > myHeight - minBorder) {
			endH = myHeight - minBorder;
			endW = endH * sizeRatio;
		}

		zoomChangeX = ((myWidth / 2) - (endW / 2) - hostX);
		zoomChangeY = (((myHeight / 2) - (endH / 2) - hostY) + myScroll);
		zoomChangeW = (endW - startW);
		zoomChangeH = (endH - startH);


		if (shift) {
			tempSteps = zoomSteps * 7;
		} else {
			tempSteps = zoomSteps;
		}


		zoomCurrent = 0;


		if (includeFade == 1) {
			fadeCurrent = 0;
			fadeAmount = (0 - 100) / tempSteps;
		} else {
			fadeAmount = 0;
		}


		zoomTimer[theID] = setInterval("zoomElement('"+zoomID+"', '"+theID+"', "+zoomCurrent+", "+startW+", "+zoomChangeW+", "+startH+", "+zoomChangeH+", "+hostX+", "+zoomChangeX+", "+hostY+", "+zoomChangeY+", "+tempSteps+", "+includeFade+", "+fadeAmount+", 'zoomDoneIn(zoomID)')", zoomTime);
		zoomActive[theID] = true;
	}
}


function zoomOut(from, evt) {


	if (getShift(evt)) {
		tempSteps = zoomSteps * 7;
	} else {
		tempSteps = zoomSteps;
	}


	if (zoomActive[theID] != true) {


		if (document.getElementById("ShadowBox")) {
			document.getElementById("ShadowBox").style.visibility = "hidden";
		} else if (! browserIsIE) {

			if (fadeActive["ZoomImage"]) {
				clearInterval(fadeTimer["ZoomImage"]);
				fadeActive["ZoomImage"] = false;
				fadeTimer["ZoomImage"] = false;
			}

			document.getElementById("ZoomImage").style.webkitBoxShadow = shadowSettings + '0.0)';
		}


		document.getElementById("ZoomClose").style.visibility = "hidden";


		if (includeCaption && document.getElementById(zoomCaption).innerHTML != "") {
			document.getElementById(zoomCaptionDiv).style.visibility = "hidden";
		}


		startX = parseInt(zoomdiv.style.left);
		startY = parseInt(zoomdiv.style.top);
		startW = zoomimg.width;
		startH = zoomimg.height;
		zoomChangeX = zoomOrigX[theID] - startX;
		zoomChangeY = zoomOrigY[theID] - startY;
		zoomChangeW = zoomOrigW[theID] - startW;
		zoomChangeH = zoomOrigH[theID] - startH;


		zoomCurrent = 0;


		if (includeFade == 1) {
			fadeCurrent = 0;
			fadeAmount = (100 - 0) / tempSteps;
		} else {
			fadeAmount = 0;
		}


		zoomTimer[theID] = setInterval("zoomElement('"+zoomID+"', '"+theID+"', "+zoomCurrent+", "+startW+", "+zoomChangeW+", "+startH+", "+zoomChangeH+", "+startX+", "+zoomChangeX+", "+startY+", "+zoomChangeY+", "+tempSteps+", "+includeFade+", "+fadeAmount+", 'zoomDone(zoomID, theID)')", zoomTime);
		zoomActive[theID] = true;
	}
}


function zoomDoneIn(zoomdiv, theID) {


	zoomOpen = true;
	zoomdiv = document.getElementById(zoomdiv);


	if (document.getElementById("ShadowBox")) {

		setOpacity(0, "ShadowBox");
		shadowdiv = document.getElementById("ShadowBox");

		shadowLeft = parseInt(zoomdiv.style.left) - 13;
		shadowTop = parseInt(zoomdiv.style.top) - 8;
		shadowWidth = zoomdiv.offsetWidth + 26;
		shadowHeight = zoomdiv.offsetHeight + 26;

		shadowdiv.style.width = shadowWidth + 'px';
		shadowdiv.style.height = shadowHeight + 'px';
		shadowdiv.style.left = shadowLeft + 'px';
		shadowdiv.style.top = shadowTop + 'px';

		document.getElementById("ShadowBox").style.visibility = "visible";
		fadeElementSetup("ShadowBox", 0, 100, 5);

	} else if (! browserIsIE) {
		fadeElementSetup("ZoomImage", 0, .8, 5, 0, "shadow");
	}


	if (includeCaption && document.getElementById(zoomCaption).innerHTML != "") {
		zoomcapd = document.getElementById(zoomCaptionDiv);
		zoomcapd.style.top = parseInt(zoomdiv.style.top) + (zoomdiv.offsetHeight + 15) + 'px';
		zoomcapd.style.left = (myWidth / 2) - (zoomcapd.offsetWidth / 2) + 'px';
		zoomcapd.style.visibility = "visible";
	}


	if (!browserIsIE) setOpacity(0, "ZoomClose");
	document.getElementById("ZoomClose").style.visibility = "visible";
	if (!browserIsIE) fadeElementSetup("ZoomClose", 0, 100, 5);

	document.onkeypress = getKey;

}


function zoomDone(zoomdiv, theID) {


	zoomOpen = false;


	zoomOrigH[theID] = "";
	zoomOrigW[theID] = "";
	document.getElementById(zoomdiv).style.visibility = "hidden";
	zoomActive[theID] == false;


	document.onkeypress = null;

}


function zoomElement(zoomdiv, theID, zoomCurrent, zoomStartW, zoomChangeW, zoomStartH, zoomChangeH, zoomStartX, zoomChangeX, zoomStartY, zoomChangeY, zoomSteps, includeFade, fadeAmount, execWhenDone) {



	if (zoomCurrent == (zoomSteps + 1)) {
		zoomActive[theID] = false;
		clearInterval(zoomTimer[theID]);

		if (execWhenDone != "") {
			eval(execWhenDone);
		}
	} else {


		if (includeFade == 1) {
			if (fadeAmount < 0) {
				setOpacity(Math.abs(zoomCurrent * fadeAmount), zoomdiv);
			} else {
				setOpacity(100 - (zoomCurrent * fadeAmount), zoomdiv);
			}
		}


		moveW = cubicInOut(zoomCurrent, zoomStartW, zoomChangeW, zoomSteps);
		moveH = cubicInOut(zoomCurrent, zoomStartH, zoomChangeH, zoomSteps);
		moveX = cubicInOut(zoomCurrent, zoomStartX, zoomChangeX, zoomSteps);
		moveY = cubicInOut(zoomCurrent, zoomStartY, zoomChangeY, zoomSteps);

		document.getElementById(zoomdiv).style.left = moveX + 'px';
		document.getElementById(zoomdiv).style.top = moveY + 'px';
		zoomimg.style.width = moveW + 'px';
		zoomimg.style.height = moveH + 'px';

		zoomCurrent++;

		clearInterval(zoomTimer[theID]);
		zoomTimer[theID] = setInterval("zoomElement('"+zoomdiv+"', '"+theID+"', "+zoomCurrent+", "+zoomStartW+", "+zoomChangeW+", "+zoomStartH+", "+zoomChangeH+", "+zoomStartX+", "+zoomChangeX+", "+zoomStartY+", "+zoomChangeY+", "+zoomSteps+", "+includeFade+", "+fadeAmount+", '"+execWhenDone+"')", zoomTime);
	}
}


function getKey(evt) {
	if (! evt) {
		theKey = event.keyCode;
	} else {
		theKey = evt.keyCode;
	}

	if (theKey == 27) { // ESC
		zoomOut(this, evt);
	}
}


function fadeOut(elem) {
	if (elem.id) {
		fadeElementSetup(elem.id, 100, 0, 10);
	}
}

function fadeIn(elem) {
	if (elem.id) {
		fadeElementSetup(elem.id, 0, 100, 10);
	}
}


var fadeActive = new Array();
var fadeQueue  = new Array();
var fadeTimer  = new Array();
var fadeClose  = new Array();
var fadeMode   = new Array();

function fadeElementSetup(theID, fdStart, fdEnd, fdSteps, fdClose, fdMode) {


	if (fadeActive[theID] == true) {
		fadeQueue[theID] = new Array(theID, fdStart, fdEnd, fdSteps);
	} else {
		fadeSteps = fdSteps;
		fadeCurrent = 0;
		fadeAmount = (fdStart - fdEnd) / fadeSteps;
		fadeTimer[theID] = setInterval("fadeElement('"+theID+"', '"+fadeCurrent+"', '"+fadeAmount+"', '"+fadeSteps+"')", 15);
		fadeActive[theID] = true;
		fadeMode[theID] = fdMode;

		if (fdClose == 1) {
			fadeClose[theID] = true;
		} else {
			fadeClose[theID] = false;
		}
	}
}


function fadeElement(theID, fadeCurrent, fadeAmount, fadeSteps) {

	if (fadeCurrent == fadeSteps) {


		clearInterval(fadeTimer[theID]);
		fadeActive[theID] = false;
		fadeTimer[theID] = false;


		if (fadeClose[theID] == true) {
			document.getElementById(theID).style.visibility = "hidden";
		}


		if (fadeQueue[theID] && fadeQueue[theID] != false) {
			fadeElementSetup(fadeQueue[theID][0], fadeQueue[theID][1], fadeQueue[theID][2], fadeQueue[theID][3]);
			fadeQueue[theID] = false;
		}
	} else {

		fadeCurrent++;


		if (fadeMode[theID] == "shadow") {


			if (fadeAmount < 0) {
				document.getElementById(theID).style.webkitBoxShadow = shadowSettings + (Math.abs(fadeCurrent * fadeAmount)) + ')';
			} else {
				document.getElementById(theID).style.webkitBoxShadow = shadowSettings + (100 - (fadeCurrent * fadeAmount)) + ')';
			}

		} else {


			if (fadeAmount < 0) {
				setOpacity(Math.abs(fadeCurrent * fadeAmount), theID);
			} else {
				setOpacity(100 - (fadeCurrent * fadeAmount), theID);
			}
		}

		clearInterval(fadeTimer[theID]);
		fadeTimer[theID] = setInterval("fadeElement('"+theID+"', '"+fadeCurrent+"', '"+fadeAmount+"', '"+fadeSteps+"')", 15);
	}
}



function setOpacity(opacity, theID) {

	var object = document.getElementById(theID).style;


	if (navigator.userAgent.indexOf("Firefox") != -1) {
		if (opacity == 100) { opacity = 99.9999; } // This is majorly awkward
	}


	object.filter = "alpha(opacity=" + opacity + ")"; // IE/Win
	object.opacity = (opacity / 100);                 // Safari 1.2, Firefox+Mozilla

}


function linear(t, b, c, d)
{
	return c*t/d + b;
}

function sineInOut(t, b, c, d)
{
	return -c/2 * (Math.cos(Math.PI*t/d) - 1) + b;
}

function cubicIn(t, b, c, d) {
	return c*(t/=d)*t*t + b;
}

function cubicOut(t, b, c, d) {
	return c*((t=t/d-1)*t*t + 1) + b;
}

function cubicInOut(t, b, c, d)
{
	if ((t/=d/2) < 1) return c/2*t*t*t + b;
	return c/2*((t-=2)*t*t + 2) + b;
}

function bounceOut(t, b, c, d)
{
	if ((t/=d) < (1/2.75)){
		return c*(7.5625*t*t) + b;
	} else if (t < (2/2.75)){
		return c*(7.5625*(t-=(1.5/2.75))*t + .75) + b;
	} else if (t < (2.5/2.75)){
		return c*(7.5625*(t-=(2.25/2.75))*t + .9375) + b;
	} else {
		return c*(7.5625*(t-=(2.625/2.75))*t + .984375) + b;
	}
}



function getSize() {


	if (self.innerHeight) { // Everyone but IE
		myWidth = window.innerWidth;
		myHeight = window.innerHeight;
		myScroll = window.pageYOffset;
	} else if (document.documentElement && document.documentElement.clientHeight) { // IE6 Strict
		myWidth = document.documentElement.clientWidth;
		myHeight = document.documentElement.clientHeight;
		myScroll = document.documentElement.scrollTop;
	} else if (document.body) { // Other IE, such as IE7
		myWidth = document.body.clientWidth;
		myHeight = document.body.clientHeight;
		myScroll = document.body.scrollTop;
	}


	if (window.innerHeight && window.scrollMaxY) {
		myScrollWidth = document.body.scrollWidth;
		myScrollHeight = window.innerHeight + window.scrollMaxY;
	} else if (document.body.scrollHeight > document.body.offsetHeight) { // All but Explorer Mac
		myScrollWidth = document.body.scrollWidth;
		myScrollHeight = document.body.scrollHeight;
	} else { // Explorer Mac...would also work in Explorer 6 Strict, Mozilla and Safari
		myScrollWidth = document.body.offsetWidth;
		myScrollHeight = document.body.offsetHeight;
	}
}


function getShift(evt) {
	var shift = false;
	if (! evt && window.event) {
		shift = window.event.shiftKey;
	} else if (evt) {
		shift = evt.shiftKey;
		if (shift) evt.stopPropagation(); // Prevents Firefox from doing shifty things
	}
	return shift;
}


function findElementPos(elemFind)
{
	var elemX = 0;
	var elemY = 0;
	do {
		elemX += elemFind.offsetLeft;
		elemY += elemFind.offsetTop;
	} while ( elemFind = elemFind.offsetParent )

	return Array(elemX, elemY);
}

function insertZoomHTML() {


	var inBody = document.getElementsByTagName("body").item(0);


	var inSpinbox = document.createElement("div");
	inSpinbox.setAttribute('id', 'ZoomSpin');
	inSpinbox.style.position = 'absolute';
	inSpinbox.style.left = '10px';
	inSpinbox.style.top = '10px';
	inSpinbox.style.visibility = 'hidden';
	inSpinbox.style.zIndex = '525';
	inBody.insertBefore(inSpinbox, inBody.firstChild);

	var inSpinImage = document.createElement("img");
	inSpinImage.setAttribute('id', 'SpinImage');
	inSpinImage.setAttribute('src', zoomImagesURI+'zoom-spin-1.png');
	inSpinbox.appendChild(inSpinImage);


	var inZoombox = document.createElement("div");
	inZoombox.setAttribute('id', 'ZoomBox');

	inZoombox.style.position = 'absolute';
	inZoombox.style.left = '10px';
	inZoombox.style.top = '10px';
	inZoombox.style.visibility = 'hidden';
	inZoombox.style.zIndex = '499';

	inBody.insertBefore(inZoombox, inSpinbox.nextSibling);

	var inImage1 = document.createElement("img");
	inImage1.onclick = function (event) { zoomOut(this, event); return false; };
	inImage1.setAttribute('src',zoomImagesURI+'spacer.gif');
	inImage1.setAttribute('id','ZoomImage');
	inImage1.setAttribute('border', '0');

	inImage1.setAttribute('style', '-webkit-box-shadow: '+shadowSettings+'0.0)');
	inImage1.style.display = 'block';
	inImage1.style.width = '10px';
	inImage1.style.height = '10px';
	inImage1.style.cursor = 'pointer'; // -webkit-zoom-out?
	inZoombox.appendChild(inImage1);

	var inClosebox = document.createElement("div");
	inClosebox.setAttribute('id', 'ZoomClose');
	inClosebox.style.position = 'absolute';

	if (browserIsIE) {
		inClosebox.style.left = '-1px';
		inClosebox.style.top = '0px';
	} else {
		inClosebox.style.left = '-15px';
		inClosebox.style.top = '-15px';
	}

	inClosebox.style.visibility = 'hidden';
	inZoombox.appendChild(inClosebox);

	var inImage2 = document.createElement("img");
	inImage2.onclick = function (event) { zoomOut(this, event); return false; };
	inImage2.setAttribute('src',zoomImagesURI+'closebox.png');
	inImage2.setAttribute('width','30');
	inImage2.setAttribute('height','30');
	inImage2.setAttribute('border','0');
	inImage2.style.cursor = 'pointer';
	inClosebox.appendChild(inImage2);


	if (! document.getElementById('ZoomImage').style.webkitBoxShadow && ! browserIsIE) {


		var inFixedBox = document.createElement("div");
		inFixedBox.setAttribute('id', 'ShadowBox');
		inFixedBox.style.position = 'absolute';
		inFixedBox.style.left = '50px';
		inFixedBox.style.top = '50px';
		inFixedBox.style.width = '100px';
		inFixedBox.style.height = '100px';
		inFixedBox.style.visibility = 'hidden';
		inFixedBox.style.zIndex = '498';
		inBody.insertBefore(inFixedBox, inZoombox.nextSibling);



		var inShadowTable = document.createElement("table");
		inShadowTable.setAttribute('border', '0');
		inShadowTable.setAttribute('width', '100%');
		inShadowTable.setAttribute('height', '100%');
		inShadowTable.setAttribute('cellpadding', '0');
		inShadowTable.setAttribute('cellspacing', '0');
		inFixedBox.appendChild(inShadowTable);

		var inShadowTbody = document.createElement("tbody");	// Needed for IE (for HTML4).
		inShadowTable.appendChild(inShadowTbody);

		var inRow1 = document.createElement("tr");
		inRow1.style.height = '25px';
		inShadowTbody.appendChild(inRow1);

		var inCol1 = document.createElement("td");
		inCol1.style.width = '27px';
		inRow1.appendChild(inCol1);
		var inShadowImg1 = document.createElement("img");
		inShadowImg1.setAttribute('src', zoomImagesURI+'zoom-shadow1.png');
		inShadowImg1.setAttribute('width', '27');
		inShadowImg1.setAttribute('height', '25');
		inShadowImg1.style.display = 'block';
		inCol1.appendChild(inShadowImg1);

		var inCol2 = document.createElement("td");
		inCol2.setAttribute('background', zoomImagesURI+'zoom-shadow2.png');
		inRow1.appendChild(inCol2);
		var inSpacer1 = document.createElement("img");
		inSpacer1.setAttribute('src',zoomImagesURI+'spacer.gif');
		inSpacer1.setAttribute('height', '1');
		inSpacer1.setAttribute('width', '1');
		inSpacer1.style.display = 'block';
		inCol2.appendChild(inSpacer1);

		var inCol3 = document.createElement("td");
		inCol3.style.width = '27px';
		inRow1.appendChild(inCol3);
		var inShadowImg3 = document.createElement("img");
		inShadowImg3.setAttribute('src', zoomImagesURI+'zoom-shadow3.png');
		inShadowImg3.setAttribute('width', '27');
		inShadowImg3.setAttribute('height', '25');
		inShadowImg3.style.display = 'block';
		inCol3.appendChild(inShadowImg3);


		inRow2 = document.createElement("tr");
		inShadowTbody.appendChild(inRow2);

		var inCol4 = document.createElement("td");
		inCol4.setAttribute('background', zoomImagesURI+'zoom-shadow4.png');
		inRow2.appendChild(inCol4);
		var inSpacer2 = document.createElement("img");
		inSpacer2.setAttribute('src',zoomImagesURI+'spacer.gif');
		inSpacer2.setAttribute('height', '1');
		inSpacer2.setAttribute('width', '1');
		inSpacer2.style.display = 'block';
		inCol4.appendChild(inSpacer2);

		var inCol5 = document.createElement("td");
		inCol5.setAttribute('bgcolor', '#ffffff');
		inRow2.appendChild(inCol5);
		var inSpacer3 = document.createElement("img");
		inSpacer3.setAttribute('src',zoomImagesURI+'spacer.gif');
		inSpacer3.setAttribute('height', '1');
		inSpacer3.setAttribute('width', '1');
		inSpacer3.style.display = 'block';
		inCol5.appendChild(inSpacer3);

		var inCol6 = document.createElement("td");
		inCol6.setAttribute('background', zoomImagesURI+'zoom-shadow5.png');
		inRow2.appendChild(inCol6);
		var inSpacer4 = document.createElement("img");
		inSpacer4.setAttribute('src',zoomImagesURI+'spacer.gif');
		inSpacer4.setAttribute('height', '1');
		inSpacer4.setAttribute('width', '1');
		inSpacer4.style.display = 'block';
		inCol6.appendChild(inSpacer4);


		var inRow3 = document.createElement("tr");
		inRow3.style.height = '26px';
		inShadowTbody.appendChild(inRow3);

		var inCol7 = document.createElement("td");
		inCol7.style.width = '27px';
		inRow3.appendChild(inCol7);
		var inShadowImg7 = document.createElement("img");
		inShadowImg7.setAttribute('src', zoomImagesURI+'zoom-shadow6.png');
		inShadowImg7.setAttribute('width', '27');
		inShadowImg7.setAttribute('height', '26');
		inShadowImg7.style.display = 'block';
		inCol7.appendChild(inShadowImg7);

		var inCol8 = document.createElement("td");
		inCol8.setAttribute('background', zoomImagesURI+'zoom-shadow7.png');
		inRow3.appendChild(inCol8);
		var inSpacer5 = document.createElement("img");
		inSpacer5.setAttribute('src',zoomImagesURI+'spacer.gif');
		inSpacer5.setAttribute('height', '1');
		inSpacer5.setAttribute('width', '1');
		inSpacer5.style.display = 'block';
		inCol8.appendChild(inSpacer5);

		var inCol9 = document.createElement("td");
		inCol9.style.width = '27px';
		inRow3.appendChild(inCol9);
		var inShadowImg9 = document.createElement("img");
		inShadowImg9.setAttribute('src', zoomImagesURI+'zoom-shadow8.png');
		inShadowImg9.setAttribute('width', '27');
		inShadowImg9.setAttribute('height', '26');
		inShadowImg9.style.display = 'block';
		inCol9.appendChild(inShadowImg9);
	}

	if (includeCaption) {


		var inCapDiv = document.createElement("div");
		inCapDiv.setAttribute('id', 'ZoomCapDiv');
		inCapDiv.style.position = 'absolute';
		inCapDiv.style.visibility = 'hidden';
		inCapDiv.style.marginLeft = 'auto';
		inCapDiv.style.marginRight = 'auto';
		inCapDiv.style.zIndex = '501';

		inBody.insertBefore(inCapDiv, inZoombox.nextSibling);

		var inCapTable = document.createElement("table");
		inCapTable.setAttribute('border', '0');
		inCapTable.setAttribute('cellPadding', '0');	// Wow. These honestly need to
		inCapTable.setAttribute('cellSpacing', '0');	// be intercapped to work in IE. WTF?
		inCapDiv.appendChild(inCapTable);

		var inTbody = document.createElement("tbody");	// Needed for IE (for HTML4).
		inCapTable.appendChild(inTbody);

		var inCapRow1 = document.createElement("tr");
		inTbody.appendChild(inCapRow1);

		var inCapCol1 = document.createElement("td");
		inCapCol1.setAttribute('align', 'right');
		inCapRow1.appendChild(inCapCol1);
		var inCapImg1 = document.createElement("img");
		inCapImg1.setAttribute('src', zoomImagesURI+'zoom-caption-l.png');
		inCapImg1.setAttribute('width', '13');
		inCapImg1.setAttribute('height', '26');
		inCapImg1.style.display = 'block';
		inCapCol1.appendChild(inCapImg1);

		var inCapCol2 = document.createElement("td");
		inCapCol2.setAttribute('background', zoomImagesURI+'zoom-caption-fill.png');
		inCapCol2.setAttribute('id', 'ZoomCaption');
		inCapCol2.setAttribute('valign', 'middle');
		inCapCol2.style.fontSize = '14px';
		inCapCol2.style.fontFamily = 'Helvetica';
		inCapCol2.style.fontWeight = 'bold';
		inCapCol2.style.color = '#ffffff';
		inCapCol2.style.textShadow = '0px 2px 4px #000000';
		inCapCol2.style.whiteSpace = 'nowrap';
		inCapRow1.appendChild(inCapCol2);

		var inCapCol3 = document.createElement("td");
		inCapRow1.appendChild(inCapCol3);
		var inCapImg2 = document.createElement("img");
		inCapImg2.setAttribute('src', zoomImagesURI+'zoom-caption-r.png');
		inCapImg2.setAttribute('width', '13');
		inCapImg2.setAttribute('height', '26');
		inCapImg2.style.display = 'block';
		inCapCol3.appendChild(inCapImg2);
	}
}
/* ------------------------------------------------------------------------
 * account.js
 * Copyright (c) 2004-2008 37signals, LLC. All rights reserved.
 * ------------------------------------------------------------------------ */

var Account = {
  toggleNewsletter: function(checkbox, url) {
    checkbox.up('p').addClassName('busy');

    new Ajax.Request(url, {
      method: 'put', parameters: 'account[wants_newsletter]=' + (checkbox.checked ? '1' : '0'),
      onSuccess: function() { checkbox.up('p').removeClassName('busy') }.bind(checkbox)
    });
  }
};
var AnchorObserver = {
  enabled:  true,
  interval: 0.1
};

document.observe("dom:loaded", function() {
  var lastAnchor = "";

  function poll() {
    var anchor = (window.location.hash || "").slice(1);
    if (anchor != lastAnchor) {
      document.fire("anchor:changed", { to: anchor, from: lastAnchor });
      lastAnchor = anchor;
    }
  }

  if (AnchorObserver.enabled) {
    setInterval(poll, AnchorObserver.interval * 1000);
  }
});

document.observe("dom:loaded", function() {
  if (!$(document.body).match("[behavior~=anchor_sheet]")) return;

  var allSheetElements = getSheetElements();
  var currentSheetName = "";
  var currentSheetElements = allSheetElements;

  function getSheetNameFromAnchor() {
    var matches = window.location.hash.match(/^#\/([a-z_-][a-z0-9_-]*)/i);
    if (matches) return matches[1];
    return "index";
  }

  function getSheetElements(sheetName) {
    sheetName = sheetName ? ("=" + sheetName) : "";
    return $(document.body).select("*[sheet" + sheetName + "]");
  }

  function changeSheet() {
    var newSheetName = getSheetNameFromAnchor();
    var newSheetElements = getSheetElements(newSheetName);

    if (!newSheetElements.length) return false;
    currentSheetElements.invoke("hide");

    currentSheetName = newSheetName;
    currentSheetElements = newSheetElements;
    newSheetElements.invoke("show").invoke("autofocus");
  }

  document.on("anchor:changed", changeSheet);
  changeSheet();
});
document.on('dom:loaded', function() {
  $$('#app_header .menu_container').each(function(container) {
    var menuObserver = new MenuObserver(container)
    container.select('[behavior~=new_task_button]').each(function(button){
      button.on('keydown', function(event){
        if (event.keyCode === Event.KEY_RETURN) {
          event.stop()
          menuObserver.activate(container)
        }
      })
    })
  })

  $$('#app_header .live_search').each(function(element) {
    var liveSearch = new LiveSearch(element, {
      maxResults: 50,
      noMatchesMessage: "No one matched",
      noMatchesResults: [ ["#newPerson", "Add a new person with this name…"] ]
    });

    element.observe("livesearch:selected", function(event) {
      var value = $F(element);
      liveSearch.clear();

      if (event.memo.key.charAt(0) == "#") {
        switch (event.memo.key) {
          case "#newPerson":
            var name = value.split(" ").map(function(part) { return part.charAt(0).toUpperCase() + part.slice(1) });
            var params = $H({ first_name: name.shift(), last_name: name.join(" ") });
            window.location = "/people/new?" + params.toQueryString();
            break;
        }

      } else {
        element.setValue(event.memo.value);
        element.disable();

        Event.observe(window, "unload", function() {
          element.setValue("");
          element.enable();
        });

        window.location = event.memo.key;
      }
    });
  });
});
document.observe("dom:loaded", function() {
  if (window.localStorage  && !navigator.userAgent.match("MSIE 8") && !navigator.userAgent.match("MSIE 7")) {
    $$("[data-behavior~=autosave]").each(function(input) {
      new Autosave(input);
    })
  }
});

Autosave = function(input) {
  generateStorageKey = function(input) {
    return ["autosave:", $$("meta[name~=current-user]")[0].content, input.name, input.up("form").action, escape(window.location.pathname)].join('')
  }

  restore = function() {
    var saved;
    if (saved = window.localStorage.getItem(self.storageKey)) {
      if (!self.input.value) {
        return self.input.value = saved;
      }
    }
  }

  watchForChanges = function() {
    self.input.observe('change', function() {self.save()})
    self.input.observe('paste', function() {self.save()})
    self.input.observe('keyup', function() {self.save()})
  }

  save = function() {
    window.localStorage.setItem(self.storageKey, self.input.value);
  }

  clear = function() {
    window.localStorage.removeItem(self.storageKey);
  }

  clearWhenSubmit = function() {
    self.input.up("form").observe('submit', function() {
      self.clear();
    })
  }

  var self = this;
  self.input = input;
  self.storageKey = generateStorageKey(input);
  self.save = save;
  self.clear = clear;
  restore();
  watchForChanges();
  clearWhenSubmit();
}
/* ------------------------------------------------------------------------
 * browser.js
 * Copyright (c) 2010-2011 37signals, LLC. All rights reserved.
 * ------------------------------------------------------------------------ */

Browser = Class.create({
  initialize: function(element) {
    this.element      = $(element);
    this.href         = this.element.getAttribute('data-href');
    this.cookieName   = this.element.getAttribute('data-cookie-name');
    this.menuObserver = new MenuObserver(this.element);
    this.filters      = new Browser.Filters();
    this.filterPicker = new Browser.FilterPicker(this.element);
    this.filterList   = new Browser.FilterList(this);
    this.scopePicker  = new Browser.ScopePicker(this.element);
    this.importPicker = new Browser.ImportPicker(this.element);
    this.content      = new Browser.Content(this.element);
    this.repository   = new Browser.Repository(this.element, this.href);
    if (this.element.down('[behavior~=pager]')) {
      this.pager      = new Browser.Pager(this.element);
      this.preloader  = new Browser.Preloader(this);
    }
    this.bulkControls = new Browser.BulkControls(this);

    Browser.createClassificationObserver(this);

    this.installObservers();
    this.bootstrapCollectionFromContent();
    this.replaceFilterFromCookie();
  },

  installObservers: function() {
    this.element.observe('browser:filters:replace', this.replaceFilter.bind(this));
    this.element.observe('browser:filters:set',     this.setFilter.bind(this));
    this.element.observe('browser:filters:add',     this.addFilter.bind(this));
    this.element.observe('browser:filters:remove',  this.removeFilter.bind(this));
    this.element.observe('browser:filtered',        this.setCookie.bind(this));
    this.element.observe('browser:loading',         this.fireCurrentEvent.bind(this));
    this.element.observe('browser:loaded',          this.fireCurrentEvent.bind(this));
    this.element.observe('browser:loadFailed',      this.fireCurrentEvent.bind(this));
    this.element.observe('browser:dirty',           this.dirtied.bind(this));
    this.element.observe('operation:completed',     this.operationCompleted.bind(this));
  },

  installHistorian: function() {
    if (window.history && window.history.pushState) {
      this.historian = new Browser.Html5Historian(this);
    } else {
      this.historian = new Browser.UrlFragmentHistorian(this);
    }
  },

  teardown: function() {
    this.filterPicker.teardown();
    this.filterList.teardown();
    this.scopePicker.teardown();
    this.importPicker.teardown();
    this.content.teardown();
    this.repository.teardown();
    if (this.pager) {
    	this.pager.teardown();
    }
    if (this.preloader) {
    	this.preloader.teardown();
    }
    this.bulkControls.teardown();
  },

  replaceFilter: function(event, paged) {
    this.filters.replace($H(event.memo));
    this.filtered(paged);
  },

  setFilter: function(event) {
    /* Hack to distinguish pagination filtering. Setting any other filter will flip back to first page. */
    var paged = event.memo.paged;
    if (paged)
      delete event.memo.paged;
    this.filters.set($H(event.memo));
    this.filtered(paged);
  },

  addFilter: function(event) {
    this.filters.add($H(event.memo));
    this.filtered();
  },

  removeFilter: function(event) {
    this.filters.remove($H(event.memo));
    this.filtered();
  },

  filtered: function(paged) {
    this.repository.find(this.filters.query);
    this.fire('browser:filtered', { paged: paged, filters: this.filters.toQueryParams() });
  },

  dirtied: function() {
    this.repository.dirtied(this.filters.query);
  },

  operationCompleted: function(event) {
    this.dirtied.bind(this).delay(1)
  },

  setCookie: function() {
    if (this.cookieName) Cookie.set(this.cookieName, this.filters.query);
  },

  replaceFilterFromCookie: function() {
    var params = Cookie.get(this.cookieName);
    if (params) this.replaceFilter({ memo: params.toQueryParams() }, true);
  },

  /* Bootstrap the already-rendered HTML as the initial collection. */
  bootstrapCollectionFromContent: function() {
    var prerendered = this.content.element.innerHTML;
    if (!prerendered.blank()) {
      var query = this.content.element.down('[data-query]').getAttribute('data-query');
      this.repository.load(query, prerendered);
      this.replaceFilter({ memo: query.toQueryParams() }, true);
    }
  },

  /* Fire when collection load events affect the current collection. */
  fireCurrentEvent: function(event) {
    if (this.filters.query == event.memo.collection.query)
      this.fire(event.eventName + ':current', event.memo);
  },

  fire: function(event, memo) { return this.element.fire(event, memo || {}); }
});

/* Find and cache collections for queries. */
Browser.Repository = Class.create({
  initialize: function(element, href) {
    this.element = element;
    this.href = href;
    this.collections = {};
  },

  teardown: function() {
    this.dirtied();
    this.element = null;
  },

  dirtied: function(query) {
    $H(this.collections).each(function(pair) { pair.value.teardown(); });
    this.collections = {};
    if (query) this.load(query)
  },

  find: function(query) {
    var collection = this.collections[query];
    if (collection) {
      collection.load();
    } else {
      this.load(query);
    }
  },

  load: function(query, content, quietly) {
    this.collections[query] = new Browser.Collection(this.element, this.href, query, content, quietly);
  }
});
Browser.Collection = Class.create({
  initialize: function(element, href, query, content, quietly) {
    this.element = element;
    this.href = href;
    this.query = query;
    this.preload(content, quietly);
  },

  teardown: function() {
    if (this.request) {
      this.request.transport.abort();
      this.request = null;
    }
    this.content = null;
    this.element = null;
  },

  preload: function(content, quietly) {
    if (content && !content.blank())
      this.content = content;
    this.load(quietly);
  },

  load: function(quietly) {
    if (this.isLoaded()) {
      if (!quietly) this.fire('browser:loaded');
    } else {
      if (!quietly) this.fire('browser:loading');
      this.reload();
    }
  },

  reload: function() {
    if (!this.isLoading()) {
      this.request = new Ajax.Request(this.href, {
        method:     'get',
        parameters: this.query,
        onSuccess:  this.loaded.bind(this),
        onFailure:  this.loadFailed.bind(this)
      });
    }
  },

  isLoaded: function() {
    return this.content != null;
  },

  isLoading: function() {
    return this.request != null;
  },

  loaded: function(response) {
    this.request = null;
    this.content = response.responseText;
    this.fire('browser:loaded');
  },

  loadFailed: function(response) {
    this.request = null;
    this.content = null;
    this.fire('browser:loadFailed');
  },

  fire: function(event) { return this.element.fire(event, { collection: this }); }
});
Browser.Html5Historian = Class.create({
  initialize: function(browser) {
    this.browser = browser;
    this.browser.element.observe('browser:filtered', this.push.bind(this));
    window.onpopstate = this.pop.bind(this);

    /* Set URL to initial query pulled from cookie. */
    window.history.replaceState(this.browser.filters.query, '', '?' + this.browser.filters.query)
  },

  teardown: function() {
    this.browser = null;
  },

  /* Push new query string to browser history */
  push: function(event) {
    window.history.pushState(this.browser.filters.query, '', '?' + this.browser.filters.query);
  },

  /* Back button restores old filters */
  pop: function(event) {
    var queryParams = event.state ? $H(event.state.toQueryParams()) : $H();
    this.browser.fire('browser:filters:replace', queryParams);
  }
});

Browser.UrlFragmentHistorian = Class.create({
  initialize: function(browser) {
    this.browser = browser;
    this.browser.element.observe('browser:filtered', this.push.bind(this));
    document.observe('anchor:changed', this.pop.bind(this));

    /* Filter using URL fragment on initial page load. */
    if (this.hasFragment()) {
      this.filterByFragment();
    } else {
      this.push();
    }
  },

  teardown: function() {
    this.browser = null;
  },

  /* Push new query string to URL fragment */
  push: function(event) {
    window.location = window.location.pathname + '#?' + this.browser.filters.query;
  },

  /* Back button restores old filters */
  pop: function(event) {
    if (this.hasFragment()) {
      this.filterByFragment();
    } else {
      this.browser.fire('browser:filters:replace', $H());
    }
  },

  hasFragment: function() {
    return window.location.hash.startsWith('#?');
  },

  filterByFragment: function(event) {
    if (this.hasFragment()) {
      var query = window.location.hash.substr(2);
      if (query != this.browser.filters.query)
        this.browser.fire('browser:filters:replace', $H(query.toQueryParams()));
    }
  }
});
Browser.Filters = Class.create({
  DEFAULTS: $H({ n: [0], kind: ['parties'] }),
  HIDDEN: ['n', 'kind', 'scope', 'company_id', 'contact_import_id', 'operation_id'],

  initialize: function(attributes) {
    this.replace(attributes);
    this.buildQueryString();
  },

  reset: function() {
    this.attributes = this.DEFAULTS.clone();
  },

  replace: function(params) {
    this.reset();
    this.add(params);
  },

  set: function(params) {
    $H(params).each(function(param) {
      var key = param.key.sub(/(\[\])*$/, '');
      this.attributes.set(key, this.wrapArray(param.value));
    }.bind(this));

    this.buildQueryString();
  },

  add: function(params) {
    $H(params).each(function(param) {
      var key = param.key.sub(/(\[\])*$/, '');
      var vals = this.attributes.get(key) || [];
      if (vals == this.DEFAULTS.get(key))
        vals = [];
      vals = vals.concat(this.wrapArray(param.value));
      this.attributes.set(key, vals.sort().uniq());
    }.bind(this));

    this.buildQueryString();
  },

  remove: function(params) {
    $H(params).each(function(param) {
      var vals = this.attributes.get(param.key);
      var paramValues = this.wrapArray(param.value);

      if (vals) {
        var remaining = vals.reject(function(v) { return paramValues.include(v); });

        if (remaining.any()) {
          this.attributes.set(param.key, remaining);
        } else {
          this.attributes.unset(param.key);
        }
      }
    }.bind(this));

    this.buildQueryString();
  },

  buildQueryString: function() {
    this.query = this.toQueryParams().toQueryString();
  },

  toQueryParams: function() {
    var params = $H();

    this.attributes.keys().sort().each(function(key) {
      var value = this.attributes.get(key);
      if (value.size() > 1)
        key = key.sub(/(\[\])*$/, '[]');
      params.set(key, value);
    }.bind(this));

    return params;
  },

  criteria: function() {
    var params = [];
    this.attributes.keys().each(function(key) {
      if (!this.HIDDEN.include(key)) {
        this.attributes.get(key).each(function(value) {
          params.push({ key: key, value: value });
        });
      }
    }.bind(this));
    return params;
  },

  clone: function() {
    return new Browser.Filters(this.attributes);
  },

  /* Because $A('foo') == ['f', 'o', 'o'] not ['foo'] */
  wrapArray: function(value) {
    if (!value || value == '') {
      return [];
    } else if (value instanceof Array) {
      return value;
    } else {
      return [value];
    }
  }
});
/* [x name] [x city] */
Browser.FilterList = Class.create({
  initialize: function(browser) {
    this.browser = browser;
    this.element = this.browser.element.down('[behavior~=selected]');

    if (this.element) {
      this.element.observe('click', this.removed.bind(this));
      this.browser.element.observe('browser:filtered', this.redraw.bind(this));
      this.redraw();
    }
  },

  teardown: function() {
    this.element = null;
    this.browser = null;
  },

  removed: function(event) {
    event.stop();
    var link = event.findElement('a'), params = {};
    var key = decodeURIComponent(link.name).replace(/ /g, '_')
    params[key] = decodeURIComponent(link.getAttribute('value'));
    this.browser.fire('browser:filters:remove', params);
  },

  redraw: function() {
    var content = this.browser.filters.criteria().map(function(param) {
      var key = param.key.replace(/_/g, ' ').toLowerCase().escapeHTML();
      var value = param.value.strip().escapeHTML();
      return '<a href="#" class="filter" name="' + encodeURIComponent(key) +
        '" value="' + encodeURIComponent(param.value) + '">' + key +
        ': <strong>' + value + '</strong></a>';
    });

    this.element.update(content.join(''));
  }
});
/* Find contacts by [name] [city] ... */
Browser.FilterPicker = Class.create({
  initialize: function(element) {
    this.element = element.down('[behavior~=filter_picker]');

    if (this.element) {
      this.element.observe('menu:activated', this.activated.bind(this));
      this.element.observe('form:submit', this.submitted.bind(this));
    }
  },

  teardown: function() {
    this.element = null;
  },

  submitted: function(event) {
    event.stop();

    var form = event.findElement(), input = form.findFirstElement(), params = {};
    if (input.value && !input.value.blank())
      params[input.name] = input.value.strip();

    this.element.fire('menu:deactivate');
    form.reset();
    this.element.fire('browser:filters:add', params);
  },

  activated: function(event) {
    var menu = event.findElement('.menu_container');

    var input = menu.down('input.filter');
    input[input.value.blank() ? 'focus' : 'select']();

    var balloon = menu.down('.balloon');
    var link = menu.down('a').getDimensions();
    balloon.setStyle({
      marginLeft: -(115 - (link.width / 2)) + 'px'
    });
  }
});
/* All people & companies (Change view) */
Browser.ScopePicker = Class.create({
  initialize: function(element) {
    this.element = element;
    this.view = $$('[behavior~=scope_picker]').first();

    if (this.view) {
      this.menu = this.view.down('select');

      this.setTitle();

      this.view.observe('click', this.clicked.bind(this));
      this.menu.observe('change', this.changed.bind(this));

      this.element.observe('browser:filtered', this.filtered.bind(this));
    }
  },

  teardown: function() {
    this.element = null;
    this.view = null;
    this.menu = null;
  },

  changed: function(event) {
    event.stop();
    this.picked(this.menu.value);
    this.toggle();
  },

  picked: function(query) {
    this.element.fire('browser:filters:set', query.toQueryParams());
    this.setTitle();
  },

  setTitle: function() {
    var option = this.menu.options[this.menu.selectedIndex];
    if (option) this.view.down('span.title').update(option.innerHTML);
  },

  clicked: function(event) {
    var link = event.findElement('a[behavior~=toggle]');
    if (link) {
      event.stop();
      this.toggle();
    }
  },

  filtered: function(event) {
    var scope = event.memo.filters.get('scope');

    if (scope) {
      this.pick('scope=' + scope.first());
    } else {
      this.pick('kind=' + (event.memo.filters.get('kind').first() || 'parties'));
    }
  },

  pick: function(query) {
    var option = $A(this.menu.options).select(function(o) { return o.value.include(query); }).first();
    if (option)
      option.selected = true;
    this.setTitle();
  },

  toggle: function() {
    this.view.down('[behavior~=picker]').toggle();
    this.view.down('h1').toggle();
  }
});
/* Your recent imports
 * 6 people - Dec 17 (vCard)
 * 8 people - Jan 20 (vCard) */
Browser.ImportPicker = Class.create({
  initialize: function(element) {
    this.element = element;
    this.view = $$('[behavior~=import_picker]').first();

    if (this.view) {
      this.view.observe('click', this.clicked.bind(this));
      this.element.observe('browser:filtered', this.filtered.bind(this));
    }
  },

  teardown: function() {
    this.view = null;
    this.element = null;
  },

  filtered: function(event) {
    var contact_import_id = event.memo.filters.get('contact_import_id');

    if (contact_import_id) {
      this.pick(contact_import_id.first());
    } else {
      this.pick(null);
    }
  },

  clicked: function(event) {
    var link = event.findElement('a');

    if (link) {
      event.stop();

      if (link.hasClassName('selected')) {
        this.clear();
        this.pick(null);
      } else {
        var query = link.getAttribute('href').replace(/^.*\?/, "");
        var params = $H(query.toQueryParams());
        this.element.fire('browser:filters:replace', params);

        var contact_import_id = params.get('contact_import_id');
        if (contact_import_id)
          this.pick(contact_import_id);
      }
    }
  },

  pick: function(contact_import_id) {
    this.view.select('a').each(function(link) {
      if (contact_import_id && link.getAttribute('href').include('contact_import_id=' + contact_import_id)) {
        link.addClassName('selected');
      } else {
        link.removeClassName('selected');
      }
    });
  },

  clear: function() {
    this.element.fire('browser:filters:replace', {});
  }
});
/* Browse by tag
 * A Accounting
 * F Foo
 * P Partner Principal */
Browser.TagPicker = Class.create({
  initialize: function(browser) {
    this.browser = browser;
    $(document).on('click', '[behavior~=tag_picker]', this.clicked.bind(this));
    $(document).on('browser:filtered', this.reselect.bind(this));
    $(document).on('browser:rendered', this.reselect.bind(this));
  },

  teardown: function() { this.browser = null; },

  clicked: function(event) {
    var link = event.findElement('a');
    if (link) {
      event.stop();

      var tagName = link.innerHTML;
      var action = link.hasClassName('selected') ? 'remove' : 'add';
      this.browser.element.fire('browser:filters:' + action, { tag: tagName });
    }
  },

  reselect: function() {
    var tags = $A(this.browser.filters.attributes.get('tag'));
    $$('a[behavior~=tag_picker]').each(function(link) {
      var action = tags.include(link.innerHTML) ? 'add' : 'remove';
      link[action + 'ClassName']('selected');
    });
  }
});
Browser.BulkControls = Class.create({
  initialize: function(browser) {
    this.browser = browser;
    this.selection = 'none'
    this.browser.element.on('browser:rendered', this.reset.bind(this));
    this.browser.element.on('click', '[behavior~=select_none]', this.selectNone.bind(this));
    this.browser.element.on('click', '[behavior~=select_page]', this.selectPage.bind(this));
    this.browser.element.on('click', '[behavior~=select_filter]', this.selectFiltered.bind(this));
    this.browser.element.on('click', '[behavior~=party_id_input]', this.clicked.bind(this));
  },

  teardown: function() {
    this.browser = null;
  },

  reset: function() {
    this.removeClassNames();
    this.selection = 'none';
  },

  removeClassNames: function() {
    this.browser.element.removeClassName('with_one_selected');
    this.browser.element.removeClassName('with_n_selected');
    this.browser.element.removeClassName('with_filter_selected');
    this.browser.element.removeClassName('with_page_selected');
  },

  checkboxes: function() {
    return this.browser.content.element.select('input[type=checkbox]');
  },

  setCheckboxes: function(partyIds) {
    var ids = $A(partyIds)
    var updateContactRowFor = this.updateContactRowFor
    this.checkboxes().each(function(box){
      if (ids.include(box.value)) {
        box.checked = true
        updateContactRowFor(box)
      }
    });
  },

  setAllCheckboxes: function(value) {
    var updateContactRowFor = this.updateContactRowFor
    this.checkboxes().each(function(box){
      box.checked = value
      updateContactRowFor(box)
    });
  },

  updateContactRowFor: function(box) {
    box.up('tr')[box.checked ? 'addClassName' : 'removeClassName']('selected');
  },

  clicked: function(event) {
    this.updateContactRowFor(event.findElement())
    this.setSelectionFromCheckboxes()
  },

  allChecked: function() {
    var checkboxes = this.checkboxes();
    return checkboxes.any() && checkboxes.all(function(box) { return box.checked })
  },

  setSelectionFromCheckboxes: function() {
    var checked = this.checkboxes().select(function(box) { return box.checked });

    if (this.allChecked()) {
      this.selection = 'page';
      this.browser.element.addClassName('with_page_selected');
      this.fireSelectionChange({type: 'page', size: checked.length});
    } else {
      this.removeClassNames();

      if (checked.length === 1) this.browser.element.addClassName('with_one_selected');
      if (checked.length > 1)   this.browser.element.addClassName('with_n_selected');
      if (checked.length)       this.browser.element.down('[behavior~=selection_size]');

      this.browser.element.select('[behavior~=selection_size]').each(function(element){
        element.update(checked.length)
      })

      this.fireSelectionChange({type: 'list', size: checked.length});
    }
  },

  selectNone: function() {
    this.setAllCheckboxes(false);
    this.reset();
    this.fireSelectionChange({type: 'list', size: 0});
  },

  selectPage: function() {
    this.setAllCheckboxes(true);
    this.selection = 'page';
    this.removeClassNames();
    this.browser.element.addClassName('with_page_selected');
    this.fireSelectionChange({type: 'page', size: this.checkboxes().length});
  },

  selectFiltered: function() {
    this.removeClassNames();
    this.browser.element.addClassName('with_filter_selected');
    this.selection = 'filter';
    this.fireSelectionChange({type: 'filter'});
  },

  selectSome: function(partyIds) {
    var ids = $A(partyIds)
    this.setCheckboxes(ids)
    this.selection = 'none'
    this.setSelectionFromCheckboxes()
  },

  fireSelectionChange: function(options) {
    this.browser.element.fire('parties:selection:change', {selection: Browser.Selection(options)});
  },

  setPartiesForForm: function(form, ids) {
    if (!this.browser.element.hasClassName('with_filter_selected')) {
      var parties = $(form).down(".parties");
      parties.update(ids.map(function(id) { return "<input type=hidden name=parties[id][] value=" + id + ">" }).join(""));
    }
  },

  submitted: function(form) {
    $(form).addClassName("busy");
    this.setPartiesForForm(form, Parties.getCheckedCheckboxes().invoke("getValue"));
  }
});
/* Pagination is implemented as a filter.
 * (If other filters are changed, be sure to flip back to the first page.) */
Browser.Pager = Class.create({
  initialize: function(element) {
    this.element = element;

    this.pageOffset = 0;
    this.pageSize   = 50;
    this.isLastPage = false;

    this.element.observe('browser:filtered', this.filtered.bind(this));
    this.element.observe('browser:rendered', this.refresh.bind(this));

    this.views = this.element.select('[behavior~=pager]').map(function(element) {
      return new Browser.Pager.View(this, element);
    }.bind(this));
  },

  teardown: function() {
    this.views.each(function(view) { view.teardown(); });
    this.views = null;
    this.element = null;
  },

  pageNumber: function() { return Math.ceil(this.pageOffset / this.pageSize) + 1; },

  hasPrev:    function() { return this.pageOffset > 0; },
  hasNext:    function() { return !this.isLastPage; },
  hasOthers:  function() { return this.hasPrev() || this.hasNext(); },

  nextPage:   function() { return this.pageOffset + this.pageSize; },
  prevPage:   function() { return this.pageOffset - this.pageSize; },

  flipToNext: function() { this.flipTo(this.nextPage()); },
  flipToPrev: function() { this.flipTo(this.prevPage()); },

  flipTo: function(offset) {
    if (!offset || offset < 0) offset = 0;
    if (this.pageOffset != offset) {
      this.pageOffset = offset;
      this.element.fire('browser:pager:changed');
      this.element.fire('browser:filters:set', { n: offset.toString(), paged: true });
      window.scrollTo(0, 0);
    }
  },

  /* When other filters are applied, flip back to the first page. */
  filtered: function(event) {
    if (this.hasPrev() && !event.memo.paged) {
      event.stop();
      this.flipTo(0);
    }
  },

  refresh: function(event) {
    var data = event.memo.content.element.down('[data-is-last-page]');

    this.pageOffset = parseInt(data.getAttribute('data-page-offset'));
    this.pageSize   = parseInt(data.getAttribute('data-page-size'));
    this.isLastPage = data.getAttribute('data-is-last-page') != 'false';

    this.element.fire('browser:pager:changed');
  }
});

/* [ First | Page 1 | Next ] */
Browser.Pager.View = Class.create({
  initialize: function(pager, element) {
    this.pager    = pager;
    this.element  = element;
    this.links    = this.linksByRel();

    this.pager.element.observe('browser:pager:changed', this.render.bind(this));

    this.links.next.observe('click', this.flipToNext.bind(this));
    this.links.prev.observe('click', this.flipToPrev.bind(this));
  },

  teardown: function() {
    this.pager   = null;
    this.element = null;
    this.links   = null;
  },

  flipToNext: function(event) {
    event.stop();
    this.pager.flipToNext();
  },

  flipToPrev: function(event) {
    event.stop();
    this.pager.flipToPrev();
  },

  render: function() {
    if (this.pager.hasPrev()) {
      this.links.prev.show(); this.links.first.hide();
    } else {
      this.links.prev.hide(); this.links.first.show();
    }

    this.element.down('span.current').update('Page ' + this.pager.pageNumber());

    if (this.pager.hasNext()) {
      this.links.next.show(); this.links.last.hide();
    } else {
      this.links.next.hide(); this.links.last.show();
    }

    this.element[(!this.pager.hasPrev() && !this.pager.hasNext()) ? 'hide' : 'show']();
  },

  linksByRel: function() {
    return this.element.select('a[rel]').inject({}, function(h, e) {
      h[e.getAttribute('rel')] = e;
      return h;
    });
  }
});
/* When a collection is loaded, preload the collection for the next page. */
Browser.Preloader = Class.create({
  initialize: function(browser) {
    this.browser = browser;
    this.browser.element.observe('browser:loaded:current', this.preloadNextPage.bind(this));
  },

  teardown: function() {
    this.browser = null;
  },

  preloadNextPage: function() {
    if (this.browser.pager.hasNext())
      this.browser.repository.find(this.nextPageQueryString());
  },

  nextPageQueryString: function() {
    var next = this.browser.filters.clone();
    next.set({ n: this.browser.pager.nextPage().toString() });
    return next.query;
  }
});
/* Render the current collection. Show a spinner if the collection hasn't loaded yet. */
Browser.Content = Class.create({
  initialize: function(element) {
    this.element = element.down('[behavior~=content]');
    this.spinner = element.down('[behavior~=spinner]');

    element.observe('browser:loading:current',    this.loading.bind(this));
    element.observe('browser:loaded:current',     this.loaded.bind(this));
    element.observe('browser:loadFailed:current', this.failed.bind(this));
  },

  teardown: function() {
    this.element = null;
    this.spinner = null;
  },

  loading: function() {
    this.spinner.show();
    this.element.addClassName('loading');
  },

  loaded: function(event) {
    this.element.update(event.memo.collection.content);
    this.ready();
    this.element.fire('browser:rendered', { content: this });
  },

  failed: function(event) {
    this.ready();
  },

  ready: function() {
    this.spinner.hide();
    this.element.removeClassName('loading');
  }
});
Browser.Selection = function(options) {
  return {
    'type': options.type,
    'size': options.size,
    'name': Browser.Selection.nameFor(options.type, options.size)
  }
};

Browser.Selection.nameFor = function(type, size) {
  if (type === 'filter') return 'contact_filter'
  if (type === 'page')   return 'page_of_contacts'
  if (size > 1)          return 'n_contacts'
  if (size === 1)        return 'one_contact'
  else                   return 'no_contacts'
};
Browser.createClassificationObserver = function(browser)
{
  browser.element.on('browser:rendered', function() {
    var contactImportId = browser.filters.attributes.get('contact_import_id')
    if (contactImportId && contactImportId.length) {
      browser.element.addClassName('with_contact_import')
    } else {
      browser.element.removeClassName('with_contact_import')
    }
  })

  browser.element.on('browser:filtered', function() {
    var criteria = browser.filters.criteria()
    if (criteria && criteria.length) {
      browser.element.addClassName('with_search_criteria')
    } else {
      browser.element.removeClassName('with_search_criteria')
    }
  })
};

document.observe('dom:loaded', function() {
  var browser = $('browser');
  if (browser) window.browser = new Browser(browser);
});

Event.observe(window, 'unload', function() {
  if (window.browser) {
    window.browser.teardown();
    window.browser = null;
  }
});
(function() {
  function findSubmitFor(element) {
    element = $(element);
    return element.down("p.submit, .submits, .submit") || element;
  }

  Element.addMethods("form", {
    markAsBusy: function(element) {
      findSubmitFor(element).addClassName("busy");
    },

    markAsBusyIf: function(element, condition) {
      if (condition) $(element).markAsBusy();
      return condition;
    },

    markAsNotBusy: function(element) {
      findSubmitFor(element).removeClassName("busy");
      return true;
    }
  });
})();
var CalendarDate = Class.create({
  initialize: function(year, month, day) {
    this.date  = new Date(Date.UTC(year, month - 1));
    this.date.setUTCDate(day);

    this.year  = this.date.getUTCFullYear();
    this.month = this.date.getUTCMonth() + 1;
    this.day   = this.date.getUTCDate();
    this.value = this.date.getTime();
  },

  beginningOfMonth: function() {
    return new CalendarDate(this.year, this.month, 1);
  },

  beginningOfWeek: function() {
    return this.previous(this.date.getUTCDay());
  },

  next: function(value) {
    if (value === 0) return this;
    return new CalendarDate(this.year, this.month, this.day + (value || 1));
  },

  previous: function(value) {
    if (value === 0) return this;
    return this.next(-(value || 1));
  },

  succ: function() {
    return this.next();
  },

  equals: function(calendarDate) {
    return this.value == calendarDate.value;
  },

  isWeekend: function() {
    var day = this.date.getUTCDay();
    return day == 0 || day == 6;
  },

  getMonthName: function() {
    return CalendarDate.MONTHS[this.month - 1];
  },

  toString: function() {
    return this.stringValue = this.stringValue ||
      [this.year, this.month, this.day].invoke("toPaddedString", 2).join("-");
  }
});

Object.extend(CalendarDate, {
  MONTHS:   $w("January February March April May June July August September October November December"),
  WEEKDAYS: $w("Sunday Monday Tuesday Wednesday Thursday Friday Saturday"),

  parse: function(date) {
    if (!(date || "").toString().strip()) {
      return CalendarDate.parse(new Date());

    } else if (date.constructor == Date) {
      return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());

    } else if (Object.isArray(date)) {
      var year = date[0], month = date[1], day = date[2];
      return new CalendarDate(year, month, day);

    } else {
      return CalendarDate.parse(date.toString().split("-"));
    }
  }
});
var CalendarDateSelect = Class.create({
  initialize: function(field, options) {
    this.field   = $(field);
    this.options = options || {};

    this.onFieldChanged();
    this.createElement();
    this.field.insert({ after: this });
  },

  createElement: function() {
    this.element = new Element("div", { className: "calendar_date_select" });

    this.header = new Element("div", { className: "header" });
    this.pager = new CalendarDateSelect.Pager(this.cursor);
    this.header.insert(this.pager);
    this.element.insert(this.header);

    this.body = new Element("div", { className: "body" });
    this.updateBody();
    this.element.insert(this.body);

    this.footer = new Element("div", { className: "footer" });
    this.title = new Element("span").update((this.options.title || "Due:") + " ");
    this.description = new Element("span");
    this.updateDescription();
    this.footer.insert(this.title);
    this.footer.insert(this.description);
    this.element.insert(this.footer);

    this.element.observe("calendar:cursorChanged", this.onCursorChanged.bind(this));
    this.element.observe("calendar:dateSelected", this.onDateSelected.bind(this));
    this.element.observe("calendar:fieldChanged", this.onFieldChanged.bind(this));
  },

  onCursorChanged: function(event) {
    this.setCursor(event.memo.cursor);
  },

  onDateSelected: function(event) {
    this.setDate(event.memo.date);
  },

  onFieldChanged: function(event) {
    this.setDate(CalendarDate.parse($F(this.field)));
    this.setCursor(this.date);
  },

  setCursor: function(date) {
    this.cursor = date.beginningOfMonth();
    this.updateBody();
  },

  setDate: function(date) {
    this.date = date;
    this.field.setValue(this.date);
    this.updateDescription();
  },

  updateBody: function() {
    if (this.body) {
      this.grid = new CalendarDateSelect.Grid(this.date, this.cursor);
      this.body.update(this.grid);
    }
  },

  updateDescription: function() {
    if (this.description) {
      this.description.update("#{month} #{day}, #{year}".interpolate({
        month: this.date.getMonthName(), day: this.date.day, year: this.date.year
      }));
    }
  },

  toElement: function() {
    return this.element;
  }
});


CalendarDateSelect.Pager = Class.create({
  initialize: function(cursor) {
    this.cursor = cursor;
    this.createElement();
  },

  createElement: function() {
    this.element = new Element("div", { className: "pager" });

    this.left = new Element("a", { href: "#", method: "previous" });
    this.left.update('<img src="/images/calendar_date_select-previous_month.gif" />');
    this.left.observe("click", this.onButtonClicked.bind(this));
    this.element.insert(this.left);

    this.select = new Element("select", { className: "months" });
    this.updateSelect();
    this.select.observe("change", this.onSelectChanged.bind(this));
    this.element.insert(this.select);

    this.right = new Element("a", { href: "#", method: "next" });
    this.right.update('<img src="/images/calendar_date_select-next_month.gif" />');
    this.right.observe("click", this.onButtonClicked.bind(this));
    this.element.insert(this.right);
  },

  onButtonClicked: function(event) {
    var element = event.findElement("a[method]");
    if (element) {
      this[element.readAttribute("method")]();
      event.stop();
    }
  },

  onSelectChanged: function(event) {
    this.setCursor(CalendarDate.parse($F(this.select)));
  },

  previous: function() {
    this.setCursor(this.cursor.beginningOfMonth().previous());
  },

  next: function() {
    this.setCursor(new CalendarDate(this.cursor.year, this.cursor.month + 1, 1));
  },

  setCursor: function(cursor) {
    cursor = cursor.beginningOfMonth();
    var event = this.element.fire("calendar:cursorChanged", { cursor: cursor });

    if (!event.stopped) {
      var oldCursor = this.cursor;
      this.cursor = cursor;
      this.updateSelect(oldCursor);
    }
  },

  updateSelect: function(oldCursor) {
    if (!oldCursor || this.cursor.year != oldCursor.year) {
      this.months = this.getDatesForSurroundingMonths();
      this.select.options.length = 0;
      this.getDatesForSurroundingMonths().each(function(date, index) {
        var title = [date.getMonthName().slice(0, 3), date.year].join(" ");
        this.select.options[index] = new Option(title, date.toString());
        if (this.cursor.equals(date)) this.select.selectedIndex = index;
      }, this);

    } else {
      this.select.selectedIndex = this.months.pluck("value").indexOf(this.cursor.value);
    }
  },

  getDatesForSurroundingMonths: function() {
    return $R(this.cursor.year - 1, this.cursor.year + 2).map(function(year) {
      return $R(1, 12).map(function(month) {
        return new CalendarDate(year, month, 1);
      });
    }).flatten();
  },

  toElement: function() {
    return this.element;
  }
});


CalendarDateSelect.Grid = Class.create({
  initialize: function(date, cursor) {
    this.date    = CalendarDate.parse(date);
    this.cursor  = CalendarDate.parse(cursor).beginningOfMonth();
    this.today   = CalendarDate.parse();

    this.createElement();
  },

  createElement: function() {
    var table = new Element("table");
    var tbody = new Element("tbody");
    var html  = [];

    html.push('<tr class="weekdays">');
    CalendarDate.WEEKDAYS.each(function(weekday) {
      html.push("<th>", weekday.substring(0, 1), "</th>");
    });
    html.push("</tr>");

    this.getWeeks().each(function(week) {
      html.push('<tr class="days">');
      week.each(function(date) {
        html.push('<td class="', this.getClassNamesForDate(date).join(" "));
        html.push('" date="', date, '"><a href="#">', date.day, "</a></td>");
      }, this);
      html.push("</tr>");
    }, this);

    tbody.insert(html.join(""));
    table.insert(tbody);
    table.observe("click", this.onDateClicked.bind(this));

    return this.element = table;
  },

  getStartDate: function() {
    return this.cursor.beginningOfWeek();
  },

  getEndDate: function() {
    return this.getStartDate().next(41);
  },

  getDates: function() {
    return $R(this.getStartDate(), this.getEndDate());
  },

  getWeeks: function() {
    return this.getDates().inGroupsOf(7);
  },

  getClassNamesForDate: function(date) {
    var classNames = [];

    if (date.equals(this.today)) classNames.push("today");
    if (date.equals(this.date))  classNames.push("selected");
    if (date.isWeekend())        classNames.push("weekend");
    if (!date.beginningOfMonth().equals(this.cursor))
      classNames.push("other");

    return classNames;
  },

  onDateClicked: function(event) {
    var element = event.findElement("td[date]");
    if (element) {
      this.selectDate(element);
      event.stop();
    }
  },

  selectDate: function(element) {
    var date  = CalendarDate.parse(element.readAttribute("date"));
    var event = element.fire("calendar:dateSelected", { date: date });

    if (!event.stopped) {
      var selection = this.element.down("td.selected");
      if (selection) selection.removeClassName("selected");

      this.selectedElement = element;
      this.date = date;

      element.addClassName("selected");
    }
  },

  toElement: function() {
    return this.element;
  }
});
/* ------------------------------------------------------------------------
 * categories.js
 * Copyright (c) 2004-2008 37signals, LLC. All rights reserved.
 * ------------------------------------------------------------------------ */

var Categories = {
  create: function(options) {
    options = options || {};
    var params = options.parameters || {};
    var name, route, field;

    switch(params.from) {
      case "tasks":
        route = "task_categories";
        field = "task_category";
        break;
      case "deals":
        route = "deal_categories";
        field = "deal_category";
        break;
      default:
        route = "categories";
        field = "category";
    }

    if (name = prompt("Enter a name for the new category:", "")) {
      params[field + "[name]"] = name;
      new Ajax.Request("/" + route, { parameters: params });
      return true;
    }
  },

  edit: function(category) {
    var element = $(category);
    if (element) {
      this.cancel();
      element.addClassName("editing");
      element.down("form").focusFirstElement();
    }
  },

  cancel: function() {
    var element;
    if (element = $("categories").down("li.editing")) {
      element.down("form").reset();
      element.down("input[type=submit]").enableAndRevert();
      element.removeClassName("editing");
    }
  },

  destroy: function(category) {
    var container = $(category), element = container.down("div.inner");
    new Effect.Parallel([
      new Effect.BlindUp(element, {sync: true}),
      new Effect.Fade(element, {sync: true})
    ], {
      duration: 0.5,
      afterFinish: function() {
        container.remove();
      }
    });
  }
};
document.observe("dom:loaded", function() {
  if (!$(document.body).hasClassName("categories")) return;

  var menuObserver = new MenuObserver("categories_container");

  document.observe("menu:selected", function(event) {
    var element = event.findElement("li"), memo = event.memo, value = memo.value;
    memo.container.down(".selected_color_swatch").setStyle({ backgroundColor: "#" + value });

    var oldSelection = memo.container.down(".selected");
    if (oldSelection) oldSelection.removeClassName("selected");
    element.addClassName("selected");

    var menu = element.up(".menu_container"), input = menu.down("input[type=hidden]");
    if (input.getValue() != value) {
      input.setValue(value);

      var form = input.up("form");
      if (form.hasClassName("submit_on_change")) {
        form.request();
      }
    }
  });
});
/* ------------------------------------------------------------------------
 * collections.js
 * Copyright (c) 2004-2008 37signals, LLC. All rights reserved.
 * ------------------------------------------------------------------------ */

var Collections = {
  NEW_PREFIX: "_!@#$#@!:",

  observeSelect: function(selector, options) {
    $(selector).observe('collection:change', function(e) {
      if (!Collections.selected(e.element(), options))
        e.stop();
    });
  },

  addNewCase: function(selector) {
    var name = prompt("Enter the new case name:", "");

    if (!name || name.length < 1) {
      selector.options[0].selected = true;
    } else {
      var new_kase = new Option(name, Collections.NEW_PREFIX + name);
      var index = selector.options.length;
      selector.options[index] = new_kase;
      selector.selectedIndex = index;
    }
  },

  removeNew: function(selector) {
    var value = selector.options[selector.options.length - 1].value;
    /* the assumption here is that "new cases" are added as the last item in
     * the list. The "create a new case" option in the list will have a value
     * of "new_kase", and existing cases will have an integer id, so we make
     * sure the last element of the list is neither "new_kase", nor an integer.
     * If that condition holds, we then remove that element from the list. */
    if (value != "new_kase" && !value.blank() && !value.match(/^\d+$/)) {
      selector.options[selector.options.length - 1] = null;
    }
  },

  manageContactsInCollection: function() {
    $('show_contacts_in_collection').hide();
    $('manage_contacts_in_collection').show();
    $('live_search_for_involvement').focus();
  },

  doneManagingContactsInCollection: function(dim) {
    $('show_contacts_in_collection').show();
    $('manage_contacts_in_collection').hide();
    $('manage_contacts_in_collection').hide();
    if (dim == 'true') {
      $('collection_parties_module').addClassName('dim');
    }
  },

  selected: function(selector, options) {
    var kase_id = selector.options[selector.selectedIndex].value;
    var form = $(selector).up('form');
    var klass = options.collection.substring(0,options.collection.length-1).capitalize();
    var opposite = options.collection == "kases" ? "deals" : "kases";
    var name = options.collection == "kases" ? "case" : "deal";
    var opposite_name = opposite == "deals" ? "deal" : "case";
    var opposite_selector = form.down('.' + opposite);

    if(opposite_selector) {
      if(opposite_selector.selectedIndex > 0) {
        if(!confirm("Sorry, you can't attach a note to a " + opposite_name + " AND a " + name + ". It has to be one or the other.\n\nThis note is already attached to a " + opposite_name +". If you attach this note to the " + name + " you selected, it will no longer be attached to the " + opposite_name +".\n\nDo you still want to attach it to the " + name + "?")) {
          selector.selectedIndex = 0;
          return false;
        }
      }

      opposite_selector.selectedIndex = 0;
    }

    switch(kase_id) {
      case 'new_kase':
        Collections.addNewCase(selector);
        break;
      case '':
        Collections.removeNew(selector);
        break;
    }

    form.down('.collection_type').value = klass;
    form.down('.collection_id').value = selector.options[selector.selectedIndex].value;

    return true;
  }
};
/* ------------------------------------------------------------------------
 * companies.js
 * Copyright (c) 2004-2008 37signals, LLC. All rights reserved.
 * ------------------------------------------------------------------------ */

var Companies = {
  add: function(selector) {
    var name = prompt("Enter the new company name:", "");

    if (!name || name.length < 1) {
      selector.options[0].selected = true;
    } else {
      var new_company = new Option(name);
      new_company.selected = true;
      selector.options[selector.length] = new_company;
    }
  }
};
var ContactImport = {
  adjustSize: function(element, amount){
    var oldSize = Number(element.readAttribute('data-size'))
    var newSize = oldSize + amount
    var content = newSize + " " + (newSize === 1 ? "contact" : "contacts")
    element.writeAttribute('data-size', newSize).update(content)
  }
};
Event.delegate = function(selector, eventName, handler) {
  $(document).observe(eventName, function(e) {
    if (e.findElement(selector))
      handler(e);
  });
};


Element.addMethods({
  getFormElements: Form.Methods.getElements,
  getFormInputs: Form.Methods.getInputs,

  activeFormElements: function(element) {
    return $(element).getFormElements().findAll(function(element) {
      return 'hidden' != element.type && !element.disabled;
    });
  },

  findFirstFormElement: function(element) {
    var elements = $(element).activeFormElements();
    var firstByIndex = elements.findAll(function(element) {
      return element.hasAttribute('tabIndex') && element.tabIndex >= 0;
    }).sortBy(function(element) { return element.tabIndex }).first();

    return firstByIndex ? firstByIndex : elements.find(function(element) {
      return ['input', 'select', 'textarea'].include(element.tagName.toLowerCase());
    });
  },

  findLastFormElement: function(element) {
    var elements = $(element).activeFormElements();
    var firstByIndex = elements.findAll(function(element) {
      return element.hasAttribute('tabIndex') && element.tabIndex >= 0;
    }).sortBy(function(element) { return element.tabIndex }).last();

    return firstByIndex ? firstByIndex : elements.findAll(function(element) {
      return ['input', 'select', 'textarea'].include(element.tagName.toLowerCase());
    }).last();
  }
});

Form.Element.Tabbing = {
  previousElement: function(element) {
    var form = element.up('form');
    if (!form) return;

    var fields = form.activeFormElements();
    var index = fields.indexOf(element);

    return fields[index-1];
  },

  nextElement: function(element) {
    var form = element.up('form');
    if (!form) return;

    var fields = form.activeFormElements();
    var index = fields.indexOf(element);

    return fields[index+1];
  }
};
Element.addMethods("INPUT", Form.Element.Tabbing);
Element.addMethods("SELECT", Form.Element.Tabbing);
Element.addMethods("TEXTAREA", Form.Element.Tabbing);

Form.Element.Elastic = {
  valueWidth: function(element) {
    var properties = $A(['fontSize', 'fontStyle', 'fontWeight', 'fontFamily', 'lineHeight']);

    var div = new Element('div');

    var styles = {}
    properties.each(function(property) {
      styles[property] = $(element).getStyle(property);
    })
    div.setStyle(styles)

    div.setStyle({ position: 'absolute', width:'auto', visibility:'hidden'});
    div.update($(element).value);

    $(document.body).insert(div);
    var width = div.measure('width');
    div.remove();

    return width;
  },

  fitWidth: function(element, padding) {
    element = $(element);
    var width = element.valueWidth();
    if (padding) width += padding;
    element.setStyle({ width: width + 'px' });
    return element;
  }
};
Element.addMethods("INPUT", Form.Element.Elastic);


var ContactInfo = {
  setupBlankSlateTabTrap: function() {
    if (this._blank_slate_tab_trap) return;
    this._blank_slate_tab_trap = true;

    var upToContactForm = function(element) {
      var form = null;
      if (!element) return form;
      while (!form) {
        if (!element.up) break;
        element = element.up();
        if (element.contact_form)
          form = element.contact_form
      };
      return form;
    }

    $(document).observe('keydown', function(e) {
      if (e.keyCode != Event.KEY_TAB) return;
      if (!e.element().nextElement || !e.element().previousElement) return;

      var input;
      if (e.shiftKey)
        input = e.element().previousElement();
      else
        input = e.element().nextElement();

      var contact_form = upToContactForm(input);
      if (!contact_form) return;

      if (!contact_form.visible())
        contact_form.show();

      e.stop();
      input.focus();
    });
  }
};

ContactInfo.Overlay = {
  wrap: function(element, options) {
    element = $(element), options = Object.clone(options || { });

    if (element.overlay) return;
    element.overlay = true;

    var wrapper = new Element('span', { 'class': 'overlay_wrapper' });
    element.parentNode.replaceChild(wrapper, element);
    wrapper.appendChild(element);

    var label = new Element('label', { 'for': element.id, 'class': 'overlabel' });
    label.update(element.title);
    element.insert({ before: label });

    function fitWidth() {
      if (options.elastic) {
        if (element.value.blank()) {
          element.setStyle({width: element.getStyle('maxWidth')});
        } else {
          element.fitWidth(5);
        }
      }
    }

    element.observe('focus', function() {
      if (element.value.blank())
        label.addClassName('focus');

      if (options.elastic)
        element.setStyle({width: element.getStyle('maxWidth')});
    })
    element.observe('blur', function() {
      if (element.value.blank()) {
        label.removeClassName('focus');
        label.show();
      }

      if (options.elastic)
        fitWidth();
    });

    element.observe('keypress', function(e) {
      if (e.keyCode == Event.KEY_TAB) return;
      label.hide();
    });

    if (!element.value.blank())
      label.hide();
    else
      label.show();
    fitWidth();
  }
};

ContactInfo.ContactForm = Class.create({
  initialize: function(element, template) {
    this.element = $(element);
    this.template = template;

    var form = this;
    this.element.contact_form = this;

    this.blank_slate = this.element.select('.blank_slate').first();
    this.add_link = this.element.select('.add_contact_method').first();

    this.blank_slate.observe('click', function() {
      form.show();
      form.focus();
    });

    this.element.observe('focus:in', function(e) {
      e.element().focused = true;
    });

    this.element.observe('focus:out', function(e) {
      e.element().focused = false;
      form.toggle.bind(form).defer();
    });

    if (this.add_link) {
      new ContactInfo.ContactForm.Observer(this.element, 0.5, this.toggleAdd.bind(this));

      this.add_link.observe('click', function(e) {
        form.addContactMethod();
        form.element.select(".autofocus").last().focus();
        e.stop();
      });

      this.element.observe('click', function(e) {
        if (e.element().hasClassName('remove')) {
          form.removeContactMethod(e.element().up('.contact_method'));
          e.stop();
        }
      });
    }

    ContactInfo.setupBlankSlateTabTrap();

    this.toggle();
  },

  contactMethodsBlock: function() {
    return this.element.select('.contact_methods').first();
  },

  contactMethods: function() {
    return this.element.select('.contact_method');
  },

  addContactMethod: function() {
    var safe_id = 'x' +
      Math.floor(Math.random(0xFFFFFFFF) * 0xFFFFFFFF).toString(16) +
      new Date().getTime().toString(16);

    this.add_link.insert({ before: this.template.interpolate({ safe_id: safe_id }) });
    this.add_link.hide();
  },

  removeContactMethod: function(element) {
    element = $(element);

    if (element.hasClassName('existing_contact_method')) {
      var hidden = element.select('input[type=hidden]').first();
      hidden.value = '-' + hidden.value;

      element.hide();
      element.removeClassName('existing_contact_method');
      element.removeClassName('contact_method');
    } else {
      element.remove();
    }

    if (this.contactMethods().length < 1)
      this.addContactMethod();

    this.toggle();
  },

  visible: function() {
    return !this.blank_slate.visible();
  },

  toggle: function() {
    if (this.focused())
      return;

    if (this.blank() && this.contactMethods().length <= 1) {
      this.hide();
    } else {
      this.show();
      this.toggleAdd();
    }
  },

  toggleAdd: function() {
    if (!this.add_link) return;

    if (this.present())
      this.add_link.show();
    else
      this.add_link.hide();
  },

  show: function() {
    this.contactMethodsBlock().show();
    this.blank_slate.hide();
  },

  hide: function() {
    this.element.select('.existing_contact_method').each(function(element) {
      this.removeContactMethod(element)
    }.bind(this));

    this.contactMethodsBlock().hide();
    this.blank_slate.show();
  },

  blank: function() {
    return this.contactMethods().map(function(e) {
      return this.inputs(e).invoke('getValue').invoke('blank').all();
    }.bind(this)).all();
  },

  present: function() {
    return this.contactMethods().map(function(e) {
      return !this.inputs(e).invoke('getValue').invoke('blank').all();
    }.bind(this)).all();
  },

  inputs: function(element) {
    var inputs = [];
    inputs.push(element.select('input[type=text]'));
    inputs.push(element.select('textarea'));
    inputs.push(element.select('select.country'));
    return inputs.flatten();
  },

  focused: function() {
    return this.element.getFormElements().pluck('focused').any();
  },

  focus: function(last) {
    if (last)
      this.element.findLastFormElement().focus();
    else
      this.element.findFirstFormElement().focus();
  }
});

ContactInfo.ContactForm.Observer = Class.create(Abstract.TimedObserver, {
  getValue: function() {
    return [this.element.contact_form.blank(), this.element.contact_form.present()];
  }
});
var Deal = Class.create();

Object.extend(Deal, {
  collection: {},

  populate: function(data) {
    this.collection = data;
  },

  renderDealOptions: function(deal_select) {
    var deal_select = $(deal_select);
    var recording_deal_id = parseInt(deal_select.readAttribute('data-recording-deal-id'));

    deal_select.update(templates['_deal_option']({recording_deal_id: recording_deal_id, deals: Deal.collection}));
  }
});
/* ------------------------------------------------------------------------
 * deals.js
 * Copyright (c) 2008 37signals, LLC. All rights reserved.
 * ------------------------------------------------------------------------ */

var Deals = {
  validate: function(form) {
    if($F('deal_name').blank()) {
      alert("Please provide a name for this deal.");
      $('deal_name').focus();
      return false;
    }

    var price_type = $F('deal_price_type');
    var duration = parseInt($F('deal_duration'));
    if(price_type != 'fixed' && (isNaN(duration) || duration < 1)) {
      alert("You've indicated that this deal is worth a set amount per " + price_type +
        ". You must also say how long it will live, by entering a positive number of " +
        price_type + "s.");
      $('deal_duration').value = 1;
      $('deal_duration').focus();
      return false;
    }

    return true;
  },

  showNewPerson: function() {
    $('deal_search_for_party').hide();
    var name = $F('live_search_for_deal');
    var parts = name.split(' ');
    $('deal_person_last_name').value = parts.pop();
    $('deal_person_first_name').value = parts.join(' ');
    $('deal_party_id').value = "";
    $('deal_person').show();
    $('deal_person_first_name').focus();
  },

  showNewCompany: function() {
    $('deal_search_for_party').hide();
    $('deal_company_name').value = $F('live_search_for_deal');
    $('deal_party_id').value = "";
    $('deal_company').show();
    $('deal_company_name').focus();
  },

  showSearchForParty: function() {
    $('deal_person').hide();
    $('deal_company').hide();
    $('chosen_deal_party').hide();
    $('deal_search_for_party').show();
    $('deal_company_name').value = "";
    $('deal_person_first_name').value = "";
    $('deal_person_last_name').value = "";
    $('live_search_for_deal').focus();
  },

  changeCategory: function(select) {
    if ($F(select) != "new") return;
    if (Categories.create({parameters: {from: "deals", update: select.id}})) {
      select.innerHTML = "<option>Adding category...</option>";
      select.blur();
      select.disable();
    } else {
      select.down("option").selected = true;
    }
  },

  selectBidType: function(select) {
    var index = select.selectedIndex;

    $('price_type_pulldown').selectedIndex = index;

    if(index == 0) {
      $('special_bid').hide();
    } else {
      $('special_bid').show();
    }

    Deals.setDurationUnitLabel($('deal_duration').value);

    $('deal_price_type').value = select.options[index].value;
  },

  setDurationUnitLabel: function(value) {
    var index = $('price_type_pulldown').selectedIndex;
    var label = $('price_type_pulldown').options[index].value;
    if (value != '1') { label = label + 's' };
    $('time_unit').innerHTML = label;
  },

  setStatus: function(status) {
    var form = $('deal_status_form')
    var originalStatus = $('status_name').value;
    form.className = status + ' status';
    if (confirm('Are you sure you want to change the status of this deal to ' + status + '?')) {
      $('status_name').value = status;
      form.submit();
      $('saving_status_indicator').show();
      new Effect.Pulsate('saving_status_indicator', {duration: 30, from: 0.3, pulses: 20});
    } else {
      form.className = originalStatus + ' status';
      form.reset();
    }
  }
};
/*
 * Easing Equations for Script.aculo.us
 * @author Brian Crescimanno <brian.crescimanno@gmail.com>
 * @version 0.8.1
 * @revised November 20, 2008
 * @copyright 2008 Brian Crescimanno, all rights reserved
 *
 * Released under terms of the BSD License
 * http://www.opensource.org/licenses/bsd-license.php
 *
 * The math for these equations was created by Robert Penner
 * http://www.robertpenner.com/profmx
 *
 */



Effect.Transitions.easeInQuad = function(pos){
  return Math.pow(pos, 2);
}

Effect.Transitions.easeOutQuad = function(pos){
  return -(Math.pow((pos-1), 2) -1);
}

Effect.Transitions.easeInOutQuad = function(pos){
  if ((pos/=0.5) < 1) return 0.5*Math.pow(pos,2);
    return -0.5 * ((pos-=2)*pos - 2);
}



Effect.Transitions.easeInCubic = function(pos){
  return Math.pow(pos, 3);
}

Effect.Transitions.easeOutCubic = function(pos){
  return (Math.pow((pos-1), 3) +1);
}

Effect.Transitions.easeInOutCubic = function(pos){
  if ((pos/=0.5) < 1) return 0.5*Math.pow(pos,3);
    return 0.5 * (Math.pow((pos-2),3) + 2);
}



Effect.Transitions.easeInQuart = function(pos){
  return Math.pow(pos, 4);
}

Effect.Transitions.easeOutQuart = function(pos){
  return -(Math.pow((pos-1), 4) -1)
}

Effect.Transitions.easeInOutQuart = function(pos){
  if ((pos/=0.5) < 1) return 0.5*Math.pow(pos,4);
    return -0.5 * ((pos-=2)*Math.pow(pos,3) - 2);
}



Effect.Transitions.easeInQuint = function(pos){
  return Math.pow(pos, 5);
}

Effect.Transitions.easeOutQuint = function(pos){
  return (Math.pow((pos-1), 5) +1);
}

Effect.Transitions.easeInOutQuint = function(pos){
  if ((pos/=0.5) < 1) return 0.5*Math.pow(pos,5);
    return 0.5 * (Math.pow((pos-2),5) + 2);
}



Effect.Transitions.easeInSine = function(pos){
  return -Math.cos(pos * (Math.PI/2)) + 1;
}

Effect.Transitions.easeOutSine = function(pos){
  return Math.sin(pos * (Math.PI/2));
}

Effect.Transitions.easeInOutSine = function(pos){
  return (-.5 * (Math.cos(Math.PI*pos) -1));
}



Effect.Transitions.easeInExpo = function(pos){
  return (pos==0) ? 0 : Math.pow(2, 10 * (pos - 1));
}

Effect.Transitions.easeOutExpo = function(pos){
  return (pos==1) ? 1 : -Math.pow(2, -10 * pos) + 1;
}

Effect.Transitions.easeInOutExpo = function(pos){
  if(pos==0) return 0;
  if(pos==1) return 1;
  if((pos/=0.5) < 1) return 0.5 * Math.pow(2,10 * (pos-1));
  return 0.5 * (-Math.pow(2, -10 * --pos) + 2);
}



Effect.Transitions.easeInCirc = function(pos){
  return -(Math.sqrt(1 - (pos*pos)) - 1);
}

Effect.Transitions.easeOutCirc = function(pos){
  return Math.sqrt(1 - Math.pow((pos-1), 2))
}

Effect.Transitions.easeInOutCirc = function(pos){
  if((pos/=0.5) < 1) return -0.5 * (Math.sqrt(1 - pos*pos) - 1);
  return 0.5 * (Math.sqrt(1 - (pos-=2)*pos) + 1);
}



Effect.Transitions.easeInBounce = function(pos){
  return 1;
}

Effect.Transitions.easeOutBounce = function(pos){
  if ((pos) < (1/2.75)) {
    return (7.5625*pos*pos);
  } else if (pos < (2/2.75)) {
    return (7.5625*(pos-=(1.5/2.75))*pos + .75);
  } else if (pos < (2.5/2.75)) {
    return (7.5625*(pos-=(2.25/2.75))*pos + .9375);
  } else {
    return (7.5625*(pos-=(2.625/2.75))*pos + .984375);
  }
}

Effect.Transitions.easeInOutBounce = function(pos){
  return 1;
}


Effect.Transitions.easeInBack = function(pos){
  var s = 1.70158;
  return (pos)*pos*((s+1)*pos - s);
}

Effect.Transitions.easeOutBack = function(pos){
  var s = 1.70158;
  return (pos=pos-1)*pos*((s+1)*pos + s) + 1;
}

Effect.Transitions.easeInOutBack = function(pos){
  var s = 1.70158;
  if((pos/=0.5) < 1) return 0.5*(pos*pos*(((s*=(1.525))+1)*pos -s));
  return 0.5*((pos-=2)*pos*(((s*=(1.525))+1)*pos +s) +2);
}


Effect.Transitions.easeInElastic = function(pos){
  return 1;
}

Effect.Transitions.easeOutElastic = function(pos){
  return 1;
}

Effect.Transitions.easeInOutElastic = function(pos){
  return 1;
}



/* ------------------------------------------------------------------------
 * edit_tabs.js
 * Copyright (c) 2004-2008 37signals, LLC. All rights reserved.
 * ------------------------------------------------------------------------ */

var EditTabs = {
  selectOnLoad: function() {
    if (location.hash) {
      var name = location.hash.substr(1);
      if (name) EditTabs.select_and_show(name);
    }
  },

  selected: function() {
    return $$(".current_edit_tab").first();
  },

  currently_visible: function() {
    return $$(".visible_edit_tab").first();
  },

  clear_visible_tabs: function() {
    var visible = EditTabs.currently_visible();
    if (visible) {
      Element.hide(visible);
      visible.removeClassName("visible_edit_tab");
    }
  },

  clear_links: function() {
    var selected = EditTabs.selected();
    if (selected) selected.removeClassName("current_edit_tab");
  },

  select_and_show: function(name) {
    EditTabs.clear_links();
    EditTabs.show(name + '_tab');
    EditTabs.select(name + '_link');
    EditTabs.setSelectedTab(name);
		window.location.hash = name;
  },

  show: function(element) {
    EditTabs.clear_visible_tabs();
    $(element).addClassName("visible_edit_tab");
    Element.show(element);
  },

  select: function(link_element) {
    $(link_element).addClassName("current_edit_tab");
  },

  clearBlanks: function() {
    $$('.blank').each(function(i) {
      if(navigator.userAgent.match(/Safari/) && i.tagName == "TEXTAREA") {
        i.innerHTML = '';
        i.value = '';
      } else {
        i.value = '';
      }
    })
  },

  validate: function() {
    var validationAlert = function(tab, message, element) {
      if($(tab + "_link")) {
        EditTabs.select(tab + "_link", tab + "_tab");
      }
      alert(message);
      element.focus();
      return false;
    }

    var pass = $('person_user_password');
    if(pass && pass.value.match(/\S/)) {
      var confirmation = $('person_user_password_confirmation');
      if(pass.value != confirmation.value) {
        return validationAlert('user_account', "The password and password confirmation do not match.", confirmation);
      }
    }

    var isValid = function(address) {
      if(!address.value.match(/[^@]+@[^@]+\.[^@]+/)) {
        return validationAlert('contact_info', "The email address does not appear to be valid. Please make sure you have formatted it correctly.", address);
      }
      return true;
    }

    var rows = $$('div.email_addresses div.contact_method');
    for(var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var address = row.down('input[type=text]');
      if (address) {
        if(address.value.match(/\S/))
          if(!isValid(address)) return false;
      }
    }

    return true;
  },

  submit: function() {
    if(!this.validate()) return false;
    this.clearBlanks();
    return true;
  },

  setSelectedTab: function(name) {
    var element = $('selected_edit_tab');
    if (element) element.value = name;
  }
};
var EndlessPage = {
  offset: 0,
  active: true,

  activate: function(offset) {
    this.offset = offset;
    this.queue_check_scroll();
  },

  check_scroll: function() {
    if (!this.active) return;

    if (EndlessPage.near_bottom()) {
      $('infinity_spinner').show();

      new Ajax.Request(document.location.pathname, {
        method: 'get',
        parameters: Object.extend(String(document.location.search).toQueryParams(), { n: this.offset }),
        onSuccess: function(transport) {
          $('infinity_spinner').hide();

          if (transport.responseText.blank()) {
            this.active = false;
          } else {
            this.queue_check_scroll();
          }
        }.bind(this)
      });
    } else {
      this.queue_check_scroll();
    }
  },

  queue_check_scroll: function() {
    setTimeout("EndlessPage.check_scroll()", 100);
  },

  near_bottom: function() {
    return this.scroll_distance_from_bottom() < 300;
  },

  scroll_distance_from_bottom: function(argument) {
    return this.page_height() - (this.get_scroll_height() + this.get_inner_height());
  },

  page_height: function() {
    return $('recordings').scrollHeight;
  },

  get_scroll_height: function() {
    var h = window.pageYOffset || document.body.scrollTop || document.documentElement.scrollTop;
    return h ? h : 0;
  },

  get_inner_height: function() {
    var h = self.innerHeight || document.body.clientWidth;
    return h ? h : 0;
  }
}
/* ------------------------------------------------------------------------
 * files.js
 * Copyright (c) 2004-2008 37signals, LLC. All rights reserved.
 * ------------------------------------------------------------------------ */

var Files = {
  hasPendingAttachments: function(id) {
    if ($(id).down('.pending_attachments')) {
      var pending_attachments = $(id).down('.pending_attachments').down();
      return pending_attachments && pending_attachments.down();
    } else {
      return false;
    }
  }
};
var Time = function(time_since_epoch_in_miliseconds, timezone)
{
  var time = new Number(time_since_epoch_in_miliseconds || (new Date).getTime())
  time.zone  = timezone || Time.zone
  time.date  = new Date(time - Time.zone.utc_offset + time.zone.utc_offset)
  return Object.extend(time, Time.prototype)
}

Time.prototype = new(function()
{
  this.utc = function()
  {
    return Time(this, {utc_offset: 0})
  }

  this.hour = function()
  {
    return this.date.getHours()
  }

  this.minute = function()
  {
    return this.date.getMinutes()
  }

  this.second = function()
  {
    return this.date.getSeconds()
  }

  this.toString = function()
  {
    var abs_offset = this.zone.utc_offset.abs()
    var zone_operator = (this.zone.utc_offset > 0) ? '+' : '-'
    var zone_offset_hour   = (abs_offset / (1).hour()).floor().toPaddedString(2)
    var zone_offset_minute = ((abs_offset % (1).hour()) / (1).minute()).floor().toPaddedString(2)
    var zone_offset_string = "UTC" + zone_operator + zone_offset_hour + zone_offset_minute
    return this.date.toString().replace(/GMT-\d\d\d\d \([A-Z]+\)/, zone_offset_string)
  }
})

Time.Numeric = new(function()
{
  this.day = this.days = function()
  {
    return this.hours() * 24
  }

  this.hour = this.hours = function()
  {
    return this.minutes() * 60
  }

  this.minute = this.minutes = function()
  {
    return this.seconds() * 60
  }

  this.second = this.seconds = function()
  {
    return this.miliseconds() * 1000
  }

  this.milisecond = this.miliseconds = function()
  {
    return this.valueOf()
  }
})

Object.extend(Number.prototype, Time.Numeric)

Time.zone = { utc_offset: -1 * (new Date).getTimezoneOffset() * (1).minute() }

Function.prototype.recur = function(interval) {
  var recurrance = {}
  var beginning  = Time()
  var interval   = window.setInterval(this, interval * (1).second())

  recurrance.duration = function(){ return Time() - beginning }

  recurrance.stop = function() {
    window.clearInterval(interval)
    var duration = this.duration()
    return (this.stop = this.duration = function() { return duration })()
  }

  return recurrance
}
document.observe("dom:loaded", function() {
  var global_links = $("global_links_container");
  if (global_links) {
    var e = global_links.down("div.menu_container");
    if (e)
      new MenuObserver(e);
  }
});
document.on('submit', '[behavior~=group_form]', function(event, form){
  var nameInput = form.down('[behavior~=group_name_input]')
  if (nameInput.getValue().blank()) {
    nameInput.focus()
    event.stop()
  } else {
    form.markAsBusy()
  }
})
/*

Highrise specific fix for Ajax.Autocompleter in controls.js

This fix forces Internet Explorer to redraw the element that contains autocomplete updates. Without this fix
Internet Explorer users will often find that suggestions are not displayed the first time they add or edit a
tag in Highrise.

*/
if (Prototype.Browser.IE) {
  Ajax.Autocompleter.prototype.render = Autocompleter.Base.prototype.render.wrap(
    function(proceed)
    {
      this.update.hide().show();
      return proceed();
    }
  );
};
/* ------------------------------------------------------------------------
 * ie7_prompt_fix.js
 * Copyright (c) 2004-2008 37signals, LLC. All rights reserved.
 * ------------------------------------------------------------------------ */

if (Prototype.Browser.IE) {
  window._prompt = window.prompt;
  window.prompt = function(text, value) {
    var self = arguments.callee;

    if (self.useModalDialog) {
      text = (text || "").toString(), value = (value || "").toString();
      return window.showModalDialog("/ie7_prompt_fix.html",
        { title: document.title, text: text.escapeHTML(), value: value.escapeHTML() },
        "dialogHeight:150px;dialogWidth:400px;scroll:no;status:no"
      );

    } else {
      var time = new Date().getTime(), result = window._prompt(text, value);
      if (new Date().getTime() - time < 10) {
        self.useModalDialog = true;
        result = self(text, value);
      }
      return result;
    }
  };
};
$(document).on('focus:in', '[behavior~=menu_input]', function(event, input) {
  var observers = []

  observers.push(input.on('focus:out', deactivate))
  observers.push(input.on('change', change))

  function deactivate() {
    observers.invoke('stop')
    input.fire('input:validate')
    input.fire('input:commit')
  }

  function change() {
    input.fire('input:change')
    input.fire('input:changed')
    input.blur()
  }
});

new(function() {
  var on = Element.on.curry(document)

  on('input:validate', '[behavior~=menu_input].required', function(event, input) {
    if (input.getValue().blank()) {
      input.classify('invalid')
    } else {
      input.declassify('invalid')
    }
  })
});

$(document).on('focus:in', '[behavior~=text_input]', function(event, input) {
  var originalValue = input.retrieve('original_value', input.getValue())
  var startValue    = input.getValue()
  var previousValue = startValue
  var currentValue  = startValue
  var observers     = []

  observers.push(input.on('focus:out', deactivate))

  if (input.tagName.toLowerCase() !== 'textarea') {
	  observers.push(input.on('keydown', onEnter))
  }
  observers.push(input.on('keydown', onAnyKey))
  observers.push(input.on('keyup', onAnyKey))

  function deactivate() {
    observers.invoke('stop')
    if (input.getValue() === startValue) {
      input.fire('input:reset', memo())
    } else {
      input.fire('input:changed', memo())
    }
    input.fire('input:validate', memo())
    input.fire('input:commit', memo())
  }

  function reset() {
    input.setValue(originalValue)
    change()
    deactivate()
    input.blur()
  }

	function onEnter(event) {
		if (event.keyCode === Event.KEY_RETURN) {
			event.stop()
      input.fire('input:submit', memo())
		}
	}

  function onAnyKey(event) {
    if (event.keyCode === Event.KEY_ESC) {
      reset()
    } else {
      change()
    }
  }

  function change() {
    if (input.getValue() !== currentValue) {
      previousValue = currentValue
      currentValue = input.getValue()
      input.fire('input:change', memo())
    }
  }

  function memo() {
    return {'currentValue':currentValue, 'previousValue':previousValue, 'originalValue':originalValue}
  }
});

new(function() {
  var on = Element.on.curry(document)

  on('input:validate', '[behavior~=text_input][required]', function(event, input) {
    if (input.getValue().blank()) {
      invalidate(input)
    }
  })

  var EMAIL_ADDRESS_PATTERN = /^[^@]+@[^@]+\.[^@]+$/

  on('input:validate', '[behavior~=text_input][type=email]', function(event, input) {
    var value = input.getValue()
    if (value && (EMAIL_ADDRESS_PATTERN.test(value) === false)) {
      invalidate(input)
    }
  })

  function invalidate(input) {
    input.classify('invalid')
    var observer = input.on('input:change', function() {
      input.declassify('invalid')
      observer.stop()
    })
  }
});
/* ------------------------------------------------------------------------
 * json_cookie.js
 * Copyright (c) 2004-2007 37signals, LLC. All rights reserved.
 * ------------------------------------------------------------------------ */

var Cookie = {
  get: function(name) {
    var cookie = document.cookie.match(new RegExp('(^|;)\\s*' + escape(name) + '=([^;\\s]*)'));
    return (cookie ? unescape(cookie[2]) : null);
  },

  set: function(name, value, daysToExpire) {
    var attrs = '; path=/';
    if (daysToExpire != undefined) {
      var d = new Date();
      d.setTime(d.getTime() + (86400000 * parseFloat(daysToExpire)));
      attrs += '; expires=' + d.toGMTString();
    }
    return (document.cookie = escape(name) + '=' + escape(value || '') + attrs);
  },

  remove: function(name) {
    var cookie = Cookie.get(name) || true;
    Cookie.set(name, '', -1);
    return cookie;
  }
};

var JsonCookie = {
  get: function(name) {
    return Cookie.get(name).evalJSON();
  },

  set: function(name, value, daysToExpire) {
    return Cookie.set(name, Object.toJSON(value), daysToExpire);
  },

  remove: function(name) {
    return Cookie.remove(name);
  }
};
/* ------------------------------------------------------------------------
 * kases.js
 * Copyright (c) 2004-2008 37signals, LLC. All rights reserved.
 * ------------------------------------------------------------------------ */

var Kases = {
  validate: function() {
    EditTabs.clearBlanks()
    if($('kase_name').value.match(/^\s*$/)) {
      alert("You must specify a name for the case.");
      $('kase_name').focus();
      $('kase_name').removeClassName("blank");
      return false;
    }

    return true;
  }
};
document.on('dom:loaded', function() {
  document.on('display:activated', '[behavior~=linkedin_display]', function(event) {
    var profile = $('linkedin');

    if (profile.innerHTML == '') {
      new Ajax.Request(profile.readAttribute('data-url'), { method: 'get' });
    }
  });

  document.on('click', '[behavior~=linkedin_search]', function(event) {
    event.preventDefault();
    var results = $('linkedin');
    var spinner = $('linkedin_spinner');

    $(event.target).hide();
    results.hide();
    spinner.show();

    new Ajax.Request(results.readAttribute('data-url'), {
      method: 'get',
      parameters: { first_name: $F('person_first_name'), last_name: $F('person_last_name'), company_name: $F('person_company_name') },
      onComplete: function() { spinner.hide(); }
    });
  });

  document.on('click', '[behavior~=linkedin_result]', function(event) {
    event.preventDefault();
    var url = $(event.target).up().readAttribute('data-linkedin-url');
    var updateUrl = $('linkedin_search_results').readAttribute('data-update-url');

    if (updateUrl) {
      new Ajax.Request(updateUrl, { method: 'put', parameters: { 'linkedin_url': url } });
      $('linkedin').addClassName('busy');
    } else {
      $('person_linkedin_url').value = url;
      $('person_linkedin_url').focus();
      $('person_linkedin_url').label.hide();
    }

    hideResults();
  });

  document.on('click', '[behavior~=linkedin_none]', function(event) {
    event.preventDefault();
    $('linkedin_search').show();
    hideResults();
  });

  function hideResults() {
    Effect.SlideUp('linkedin_search_results', { duration: 0.4 });
  }
});
new(function()
{
  $(document).on('change', '[behavior~=linkedin_url]', function(event, element){
    var input = element.down('[behavior~=linkedin_url_input]')
    var help  = element.down('[behavior~=linkedin_url_help]')
    if (validate(input.value)) {
      help.hide()
      element.declassify('invalid')
    } else {
      help.show()
      input.activate()
      element.classify('invalid')
    }
  })

  var URL_FORMATS = [
    /^http:\/\/\w{0,3}\.*linkedin\.com\/in\/.+$/,
    /^http:\/\/\w{0,3}\.*linkedin\.com\/pub\/.+\/[a-z0-9]+\/[a-z0-9]+\/[a-z0-9]+$/
  ]

  function validate(url) {
    if (url.blank()) {
      return true
    } else {
      return URL_FORMATS.detect(function(pattern){ return pattern.test(url) })
    }
  }
});

var LiveSearch = Class.create({
  initialize: function(element, options) {
    this.element = $(element);
    this.results = {};
    this.name    = this.element.readAttribute("name");
    this.source  = this.element.readAttribute("source");
    this.options = LiveSearch.DEFAULT_OPTIONS.merge(options);
    this.resultList = new LiveSearch.ResultList(this);
    this.registerObservers();

    this.maxPrefixLength = 3;
    this.prefixLength = 2;
  },

  registerObservers: function() {
    this.element.observe("keydown", this.onKeyDown.bind(this));
    this.element.observe("paste", this.onPaste.bind(this));
    this.element.observe("keyup", this.onKeyUp.bind(this));
    this.element.observe("livesearch:resultClicked", this.onResultClicked.bind(this));
    this.element.observe("livesearch:resultsLoaded", this.onResultsLoaded.bind(this));

    var event = Prototype.Browser.Gecko ? "keypress" : "keydown";
    this.element.observe(event, this.onKeyPress.bind(this));
  },

  onKeyDown: function(event) {
    if (!this.element.value.length && event.keyCode == 32) {
      this.element.blur();
    }
  },

  onPaste: function(event) {
    this.element.label.hide();
  },

  onKeyUp: function() {
    var value = this.element.value.replace(/\s+/, "");

    if (value.split("").length >= this.prefixLength) {
      this.searchFor(value);
    } else {
      this.reset();
    }
  },

  onKeyPress: function(event) {
    switch (event.keyCode) {
      case Event.KEY_DOWN:   this.resultList.down(); event.stop(); break;
      case Event.KEY_UP:     this.resultList.up(); event.stop(); break;
      case Event.KEY_ESC:    this.clear(); event.stop(); break;
      case Event.KEY_RETURN: this.select(); event.stop(); break;
    }
  },

  onResultClicked: function(event) {
    this.select();
    event.stop();
  },

  searchFor: function(value) {
    if (this.value == value) return;
    this.value = value;

    if (this.hasResultsForCurrentPrefix()) {
      this.displayResults();
    } else {
      this.fetchResults();
    }
  },

  getPrefix: function() {
    return this.value.split("").slice(0, this.prefixLength).join("");
  },

  hasResultsForCurrentPrefix: function() {
    var prefix = this.getPrefix();
    return this.results[prefix] && !this.isFetchingResultsForPrefix(prefix);
  },

  isFetchingResultsForPrefix: function(prefix) {
    return this.results[prefix] && this.results[prefix].isLoading();
  },

  fetchResults: function() {
    var prefix = this.getPrefix();
    if (!this.results[prefix])
      this.results[prefix] = new LiveSearch.Results(this, prefix);
  },

  stopFetchingResults: function() {
    var prefix = this.getPrefix();
    if (this.isFetchingResultsForPrefix(prefix)) {
      this.results[prefix].cancel();
      this.results[prefix] = null;
    }
  },

  onResultsLoaded: function(event) {
    if (event.memo.results.prefix == this.getPrefix())
      this.displayResults();
  },

  getResults: function() {
    return this.results[this.getPrefix()];
  },

  displayResults: function() {
    var results = this.getResults();
    if (results) this.resultList.display(results, this.value);
  },

  reset: function() {
    this.prefix = "";
    this.value = "";
    this.resultList.hide();
  },

  clear: function() {
    this.element.setValue("");
    this.reset();
  },

  select: function() {
    var key = this.resultList.getSelectedKey(), results = this.getResults();
    if (key && results) this.fire("livesearch:selected", { liveSearch: this, key: key, value: results.getValue(key) });
  },

  overflow: function() {
    if (this.prefixLength < this.maxPrefixLength) {
      this.prefixLength += 1;
      this.fetchResults();
    }
  },

  fire: function(event, memo) {
    return this.element.fire(event, memo || {});
  }
});

LiveSearch.Results = Class.create({
  initialize: function(liveSearch, prefix) {
    this.liveSearch = liveSearch;
    this.prefix = prefix;
    this.regexes = {};
    this.fetch();
  },

  fetch: function() {
    if (this.request) return;
    var parameters = {};
    parameters[this.liveSearch.name] = this.prefix;

    this.request = new Ajax.Request(this.liveSearch.source, {
      method:     "get",
      evalJSON:   false,
      parameters: parameters,
      onSuccess: this.onResultsLoaded.bind(this),
      on413: this.onResultsOverflow.bind(this)
    });
  },

  cancel: function() {
    if (this.isLoading()) {
      this.request.transport.abort();
      this.request = null;
    }
  },

  isLoading: function() {
    return this.request != null;
  },

  onResultsLoaded: function(response) {
    if (this.isLoading()) {
      this.data = {};
      var data = response.responseText.evalJSON();
      for (var i = 0, length = data.length; i < length; i++)
        this.data[data[i][0]] = data[i][1];

      this.request = null;
      this.liveSearch.fire("livesearch:resultsLoaded", { results: this });
    }
  },

  onResultsOverflow: function(response) {
    if (this.isLoading()) {
      this.request = null;
      this.liveSearch.overflow();
    }
  },

  eachResultMatching: function(query, iterator) {
    var keys = this.getOrderedKeysForQuery(query);
    var length = Math.min(keys.length, this.liveSearch.options.get("maxResults"));

    for (var i = 0; i < length; i++)
      iterator(keys[i], this.data[keys[i]]);
  },

  getOrderedKeysForQuery: function(query) {
    var scores = this.getScoresForQuery(query);
    return Object.keys(scores).sort(function(a, b) {
      return scores[a] == scores[b] ? 0 : scores[a] < scores[b] ? -1 : 1;
    });
  },

  getScoresForQuery: function(query) {
    var scores = {}, score;

    for (var key in this.data)
      if (score = this.getScoreForQueryAndValue(query, this.data[key]))
        scores[key] = score;

    return scores;
  },

  getRegexForQuery: function(query) {
    if (this.regexes[query]) return this.regexes[query];
    var pieces = ["^"].concat(query.split("").map(RegExp.escape));
    return this.regexes[query] = new RegExp(pieces.join("(.*?)"), "i");
  },

  getScoreForQueryAndValue: function(query, value) {
    var matches = value.match(this.getRegexForQuery(query));
    if (matches) return this.getScoreForValueAndMatches(value, matches);
  },

  getScoreForValueAndMatches: function(value, matches) {
    var score = 0, handicap = 0;
    for (var i = 1, length = matches.length; i < length; i++) {
      var match = matches[i];
      if (match.length > 0 && match.charAt(match.length - 1) != " ")
        handicap = 1;
      score += match.length;
    }
    return 2 + handicap - (value.length - score) / value.length;
  },

  getValue: function(key) {
    return this.data[key];
  }
});

LiveSearch.ResultList = Class.create({
  initialize: function(liveSearch) {
    this.liveSearch = liveSearch;
  },

  createElement: function() {
    if (this.element) return;
    this.element = new Element("div").addClassName("live_search_result_list");
    this.content = new Element("div").addClassName("content");

    var fieldLayout = new Element.Layout(this.liveSearch.element);
    var fieldLayoutHeight = fieldLayout.get('border-box-height');

    this.element.setStyle({ position: "absolute", top: fieldLayoutHeight, left: 0, width: 0, height: 0 }).hide();
    this.liveSearch.element.up(1).insert(this.element, { position: "after" });

    this.element.setStyle({ top: this.liveSearch.element.getHeight() + "px", minWidth: "360px", width: this.liveSearch.element.getWidth() + "px", height: "auto" });
    this.element.insert(this.content);

    this.registerObservers();
  },

  registerObservers: function() {
    this.content.observe("mousedown", this.onMouseDown.bind(this));
    this.content.observe("click", this.onClick.bind(this));
  },

  onMouseDown: function(event) {
    var element = event.findElement("div.result");
    if (element) {
      this.select(element);
      event.stop();
    }
  },

  onClick: function(event) {
    var element = event.findElement("div.result");
    if (element) {
      this.liveSearch.fire("livesearch:resultClicked");
      event.stop();
    }
  },

  display: function(results, query) {
    this.createElement();
    this.content.update(this.getContentForResultsAndQuery(results, query));
    this.selected = null;
    this.show();
  },

  show: function() {
    if (this.element) {
      this.home();
      this.element.show();
    }
  },

  hide: function() {
    if (this.element) {
      this.deselect();
      this.element.hide();
    }
  },

  getSelectedKey: function() {
    if (!this.selected) return;
    return this.selected.readAttribute("key");
  },

  home: function() {
    this.select(this.content.down("div.result"));
  },

  down: function() {
    this.select(this.selected.next("div.result"));
  },

  up: function() {
    this.select(this.selected.previous("div.result"));
  },

  select: function(element) {
    if (this.selected == element || !element) return;
    this.deselect();
    this.selected = element;
    this.selected.addClassName("selected");
    if (Prototype.Browser.IE) this.element.hide().show();
    this.scrollToSelectedElement();
  },

  deselect: function() {
    if (!this.selected) return;
    this.selected.removeClassName("selected");
    this.selected = null;
  },

  scrollToSelectedElement: function() {
    var listTop = this.content.scrollTop;
    var listBottom = listTop + this.content.getHeight();
    var elementTop = listTop + this.selected.positionedOffset().top;
    var elementBottom = elementTop + this.selected.measure("border-box-height");

    if (listTop > elementTop)
      this.content.scrollTop = elementTop;
    else if (elementBottom > listBottom)
      this.content.scrollTop = listTop + elementBottom - listBottom;
  },

  getContentForResultsAndQuery: function(results, query) {
    var content = [], debug = this.liveSearch.options.get("debug");

    results.eachResultMatching(query, function(key, value) {
      content.push('<div class="result" key="', key.escapeHTML(), '">');
      if (debug) content.push('<div class="score">', Math.round(results.getScoreForQueryAndValue(query, value) * 1000) / 1000, '</div>');
      content.push('<span class="name">', value.escapeHTML(), '</span>');
      if      (key.startsWith("/deal")) content.push(' <span class="type">Deal</span>');
      else if (key.startsWith("/kase")) content.push(' <span class="type">Case</span>');
      else if (key.startsWith("/tags")) content.push(' <span class="type">Tag</span>');
      content.push('</div>');
    });

    if (!content.length) {
      content.push('<div class="info result">', this.liveSearch.options.get("noMatchesMessage"), '</div>');
      this.liveSearch.options.get("noMatchesResults").each(function(result) {
        var key = result[0], value = result[1];
        content.push('<div class="result" key="', key.escapeHTML(), '">', value.escapeHTML(), '</div>');
      });
    }

    return content.join("");
  }
});

LiveSearch.DEFAULT_OPTIONS = $H({
  maxResults: 50,
  debug: false,
  noMatchesMessage: "No matches",
  noMatchesResults: []
});
$(document).on('click', '[behavior~=mail_to_dropbox]', function(event, element){
  if (Event.isLeftClick(event)) {
    var originalHref = element.readAttribute('href')
    var originalHTML = element.innerHTML
    element.writeAttribute('href', 'mailto:?bcc=' + originalHref.replace('mailto:', ''))
    if (Prototype.Browser.IE) element.update(originalHTML)
    var afterword = function() {
      element.writeAttribute('href', originalHref)
      if (Prototype.Browser.IE) element.update(originalHTML)
    }
    afterword.delay(1)
  }
});
var Mapping = {
  rows: [],
  currentRow: 0,

  selectFirstRecord: function() {
    this.currentRow = 0;
    this.populateColumns();
  },

  selectNextRecord: function() {
    this.currentRow = (this.currentRow + 1) % this.rows.length;
    this.populateColumns();
  },

  selectPreviousRecord: function() {
    this.currentRow = this.currentRow - 1;
    if(this.currentRow < 0) this.currentRow = this.rows.length - 1;

    this.populateColumns();
  },

  populateColumns: function() {
    var row = this.rows[this.currentRow];

    for(var i = 0; i < this.rows[0].length; i++) {
      $('column_' + i).innerHTML = row[i] || "";
    }
  }
};
/* ------------------------------------------------------------------------
 * notes.js
 * Copyright (c) 2004-2008 37signals, LLC. All rights reserved.
 * ------------------------------------------------------------------------ */

var Notes = {
  submit: function(form) {
    if (!this.validate(form)) return false;
    form.select('.submit').each(function(s){ s.addClassName('busy') });
    this.setReturnToFor(form);
    if (Files.hasPendingAttachments(form)) {
      return true;
    } else {
      form.request(form.action);
      return false;
    }
  },

  validate: function(form) {
    var has_files = Files.hasPendingAttachments(form) || PendingAttachments.hasExistingAttachments(form);
    var has_text  = $(form).down("textarea").value.match(/\S/);
    return (has_files || has_text) ? true : false;
  },

  setReturnToFor: function(form) {
    var field = form.down("input[type=hidden][name=return_to]");
    if (field) field.setValue(window.location);
  },

  adjustTextarea: function(textarea, collapsed, expanded) {
    expanded = expanded || collapsed * 2;

    var height = $(textarea).measure("height");
    if (height != collapsed && height != expanded) return;

    var lines = textarea.value.split("\n");
    var count = lines.length;
    lines.each(function(line) { count += parseInt(line.length / 70); });

    var rows = parseInt(collapsed / 20);

    if (count > rows) {
      textarea.style.height = expanded + 'px';
    }

    if (count <= rows) {
      textarea.style.height = collapsed + 'px';
    }
  }
};
new(function() {
  if (! Object.create) {
    Object.create = function(prototype) {
      var constructor = function(){}
      constructor.prototype = prototype
      return new constructor
    }
  }
});
new(function()
{
  $(document).on('parties:selection:change', onSelectionChange)
  $(document).on('activity:activate', '[behavior~=party_selection_activities]', onActivityActivate)
  $(document).on('activity:stop', '[behavior~=party_selection_activities]', onActivityStop)
  $(document).on('click', '[behavior~=party_selection_activities] [behavior~=stop_activity]', onActivityStop)
  $(document).on('browser:rendered', reset)

  var activeActivity

  function reset(event) {
    activeActivity = undefined
  }

  function containerFor(activity) {
    return activity.up('[behavior~=party_selection_activities]')
  }

  function classNameFor(activity) {
    return activity.readAttribute('data-container-class-name')
  }

  function onActivityActivate(event) {
    var activity = event.element()
    if (activeActivity) {
      deactivate(activeActivity, activity)
    } else {
      activate(activity)
    }
  }

  function onSelectionChange(event) {
    if (activeActivity && event.memo.selection.name === 'no_contacts') {
      deactivate(activeActivity)
    }
  }

  function onActivityStop(event, activity) {
    if (activeActivity) {
      deactivate(activeActivity)
    }
  }

  function activate(activity) {
    var container = containerFor(activity)
    var oldHeight = container.measure('padding-box-height')
    container.setStyle({height: Math.max(oldHeight, 5)+'px'})
    container.addClassName(classNameFor(activity))
    activity.setStyle({opacity: '0'})
    activity.show()
    activeActivity = activity
    var newHeight = activity.measure('border-box-height')
    container.morph({height: newHeight+'px'}, {
      duration: Math.max(Math.abs(newHeight - oldHeight) / 600, 0.15),
      afterFinish: function() {
        container.setStyle({height:'auto'})
        container.addClassName('activated')
        activity.morph({opacity: '1'}, {
          duration: 0.2,
          transition:Effect.Transitions.linear,
          afterFinish: function() {
            activity.fire('activity:activated')
          }
        })
      }
    })
  }

  function deactivate(activity, nextActivity) {
    var container = containerFor(activity)
    container.setStyle({height: container.measure('border-box-height')+'px'})
    container.removeClassName('activated')
    container.removeClassName(classNameFor(activity))
    if (nextActivity) container.addClassName(classNameFor(nextActivity))
    activity.fire('activity:deactivate')
    activeActivity = undefined
    if (nextActivity) {
      activity.morph({opacity: '0'}, {
        duration: 0.15,
        transition: Effect.Transitions.linear,
        afterFinish: function() {
          activity.hide()
          activity.fire('activity:deactivated')
          activate(nextActivity)
        }
      })
    } else {
      activity.setStyle({opacity: '0.25'})
      container.morph({height: '0px'}, {
        duration: Math.max(container.measure('padding-box-height') / 400, 0.3),
        afterFinish: function() {
          activity.hide()
          activity.fire('activity:deactivated')
        }
      })
    }
  }
});
new(function()
{
  $(document).on('parties:selection:change', onSelectionChange)

  function onSelectionChange(event) {
    var selectionName = event.memo.selection.name
    if (selectionName === 'no_contacts') {
      deactivate()
    } else {
      activate(selectionName)
    }
  }

  function activate(selectionName) {
    $$('[behavior~=party_selection_controls]').each(function(element) {
      element.select('[behavior~=selection_summary]').invoke('hide')
      element.down('[behavior~='+selectionName+']').show()
      if (! element.hasClassName('activated')) {
        var sleeve = element.down('[behavior~=sleeve]')
        var content = sleeve.down('[behavior~=content]')
        var contentHeight = content.measure('border-box-height')
        var morphDuration = Math.max(contentHeight * 0.00666)
        sleeve.morph({'height': contentHeight+'px'}, {
          duration: morphDuration,
          transition: Effect.Transitions.easeOutQuad,
          afterFinish: function() {
            element.addClassName('activated')
            sleeve.setStyle({height:'auto'})
          }
        })
      }
    })
  }

  function deactivate() {
    $$('[behavior~=party_selection_controls]').each(function(element) {
      if (element.hasClassName('activated')) {
        var sleeve = element.down('[behavior~=sleeve]')
        sleeve.morph({opacity: '0'}, {
          duration: 0.3,
          delay: 0.01,
          transition: Effect.Transitions.linear,
          afterFinish: function() {
            element.removeClassName('activated')
            sleeve.setStyle({'height': '0px', 'opacity': '1'})
            element.select('[behavior~=selection_summary]').invoke('hide')
            var content = element.down('[behavior~=no_contacts]').show()
            sleeve.morph({'height': content.measure('border-box-height')+'px'}, {
              duration: 0.5,
              delay: 0.1
            })
          }
        })
      }
    })
  }
});
/* ------------------------------------------------------------------------
 * pending_attachments.js
 * Copyright (c) 2004-2008 37signals, LLC. All rights reserved.
 * ------------------------------------------------------------------------ */

var PendingAttachments = {
  add: function(file_selector, id) {
    var offscreen = $(id).down("p.offscreen"), template = $(id).down("p.template");
    var templateHTML = template.innerHTML;

    if (template.down('input').name.match(/^\w+\[\d\]\[\w+\]$/)) {
      var last_key = (offscreen.lastChild) ? Number(offscreen.lastChild.name.match(/(\d+)/).last()) : 0;
      file_selector.name = file_selector.name.sub(/\d/, last_key + 1);
    }

    this.updatePendingAttachments(id);
    offscreen.appendChild(file_selector);
    template.innerHTML = templateHTML;
  },

  remove: function(path, id) {
    this.removeFileSelector(path, id);
    this.updatePendingAttachments(id);
  },

  hasPendingAttachments: function(id) {
    if ($(id).down('.pending_attachments')) {
      var pending_attachments = $(id).down('.pending_attachments').down();
      return pending_attachments && pending_attachments.down();
    } else {
      return false;
    }
  },

  hasExistingAttachments: function(id) {
    if ($(id).getElementsBySelector('.attachments li')) {
      var existing_attachments = $(id).getElementsBySelector('.attachments li');
      return existing_attachments.detect(function(item) { return item.visible(); });
    } else {
      return false;
    }
  },

  findFileSelector: function(path, id) {
    return $(id).select('input.file_selectors').select(function(file_selector) { return file_selector.value == decodeURIComponent(path); }).first();
  },

  removeFileSelector: function(path, id) {
    this.findFileSelector(path, id).remove();
  },

  updatePendingAttachments: function(id) {
    new Ajax.Request('/pending_attachments', { parameters: this.pendingFilesAsParameters(id) + "&id=" + id });
  },

  pendingFilesAsParameters: function(id) {
    return $(id).getElementsBySelector('input.file_selectors').select(function(file_selector) {
      return file_selector.value != "";
    }).collect(function(file_selector) {
      return "files[]=" + encodeURIComponent(file_selector.value);
    }).join("&");
  }
};
/* ------------------------------------------------------------------------
 * people.js
 * Copyright (c) 2004-2008 37signals, LLC. All rights reserved.
 * ------------------------------------------------------------------------ */

var People = {
  submit: function(form, current_user_id) {
    return this.isPersonValid(form);
  },

  jumpToFirstResult: function(event) {
    if (event.keyCode == 13 && $('first_party_url').value != '') {
      window.location = $('first_party_url').value;
    }
  },

  onLiveSearchKeypress: function(event) {
    var field = event.element();
    var results = People.liveSearchResultsElement(field), result, element;

    function selectAdjacentResult(direction) {
      People.selectLiveSearchResult(field, function(selected) {
        return selected[direction]("li.live_search_result");
      });
    }

    switch (event.keyCode) {
      case Event.KEY_RETURN:
        if (result = $("first_party_url")) {
          if ($F(result)) window.location = $F(result);
        } else if (result = results.down("li.live_search_result.selected")) {
          People.highlightLiveSearchResult(field, result, function() {
            window.location = result.down("a").readAttribute("href");
          });
        }
        return event.stop();

      case Event.KEY_DOWN:
        selectAdjacentResult("next");
        return event.stop();

      case Event.KEY_UP:
        selectAdjacentResult("previous");
        return event.stop();

      case Event.KEY_ESC:
        People.hideLiveSearchResults(field);
        return event.stop();
    }
  },

  onLiveSearchResultClick: function(event) {
    var field = event.element();
    var result = field.up("li");
    People.selectLiveSearchResult(field, result);
    People.highlightLiveSearchResult(field, result);
  },

  liveSearchResultsElement: function(field) {
    return People.resultsElement = People.resultsElement ||
      $($(field).readAttribute("live_search_results_id"));
  },

  liveSearch: function(field, search_url, context, options, parameters) {
    field = $(field);
    var results = People.liveSearchResultsElement(field), name = $F(field).toString();
    var spinner = field.up(".field").down(".live_search_spinner");

    parameters.context = context;
    parameters.name = name;

    if (options && options.exclude) {
      parameters.exclude = options.exclude;
      parameters.kind    = options.kind;
    }

    if (parameters.name.blank()) {
      return People.hideLiveSearchResults(field);
    } else {
      results.show();
    }

    results.setStyle({ opacity: 0.5 });
    spinner.show();

    new Ajax.Request(search_url, {
      method: 'get',
      parameters: parameters,
      onSuccess: function() {
        spinner.hide();
        results.setStyle({ opacity: 1 });
      }
    });
  },

  selectLiveSearchResult: function(field, element) {
    var results = People.liveSearchResultsElement(field), result;

    if (result = results.down("li.live_search_result.selected")) {
      if (element = Object.isFunction(element) ? element(result) : element) {
        result.removeClassName("selected");
        element.addClassName("selected").slideIntoView();
      }
    }
  },

  highlightLiveSearchResult: function(field, element, afterFinish) {
    new Effect.Tween(element, 0, 20, {
      duration: 1,
      afterFinish: function() {
        (afterFinish || Prototype.K)();
        People.hideLiveSearchResults(field);
      }
    }, function(position) {
      if (position < 6 && parseInt(position) % 3) {
        element.removeClassName("selected").addClassName("highlighted");
      } else {
        element.addClassName("selected").removeClassName("highlighted");
      }
    });
  },

  hideLiveSearchResults: function(field) {
    field.setValue("");
    var results = People.liveSearchResultsElement(field);

    results.fade({
      duration: 0.3,
      afterFinish: function() {
        results.update("")
      }
    });
  },

  isPersonValid: function(form) {
    if ($('person_name').value == 'Name' || $('person_name').value == '') {
      alert('People need names');
      Field.focus('person_name');

      return false;
    } else {
      if ($('person_title').value == 'Title') {
        $('person_title').value = '';
      }

      return true;
    }
  }
};
/* ------------------------------------------------------------------------
 * permissions.js
 * Copyright (c) 2004-2008 37signals, LLC. All rights reserved.
 * ------------------------------------------------------------------------ */

var Permissions = {
  revealControls: function(selector) {
    if (selector[selector.selectedIndex].value != "" && selector[selector.selectedIndex].text != 'Nobody') {
      $(selector.parentNode).getElementsBySelector('.remove_viewer_selector', '.add_viewer_selector').invoke('show');
    }
  },

  removeSelector: function(selector_container, selector_parent_id) {
    selector_container.parentNode.removeChild(selector_container);
    this.update(selector_parent_id);
  },

  addSelector: function(selector_parent_id) {
    this.update(selector_parent_id);
    $(selector_parent_id).select('.add_viewer_selector').last().addClassName('busy');
  },

  update: function(selector_parent_id) {
    new Ajax.Request('/permissions/update', {
      parameters: Form.serialize($$("#" + selector_parent_id + " .permission_categories").first()), method: 'get'
    });
  }
};
(function() {
  var queue = $A([]);

  queue.flush = function() {
    while (queue.any()) { queue.pop().fire("dom:modified"); }
  }

  var notify;
  function deferFire(element) {
    if (!queue.include(element))
      queue.push(element);

    if (notify)
      window.clearTimeout(notify);

    notify = queue.flush.defer();
  }

  function isFormField(element) {
    if (Object.isElement(element)) {
      return element.tagName.toLowerCase() in {
        input: 0, select: 0, button: 0, option: 0, optgroup: 0, textarea: 0
      };
    }
  }

  function fireModifiedEvent() {
    var args = $A(arguments), proceed = args.shift(), parent = $(args.first()).up();
    var element = proceed.apply(this, args);

    if (!isFormField(element)) {
      if (Object.isElement(element) && element.up("html")) {
        deferFire(element);
      } else if (Object.isElement(parent) && parent.up("html")) {
        deferFire(parent);
      }
    }

    return element;
  }

  Element.addMethods({
    insert: Element.Methods.insert.wrap(fireModifiedEvent),
    replace: Element.Methods.replace.wrap(fireModifiedEvent),
    update: Element.Methods.update.wrap(fireModifiedEvent)
  });

  document.observe("dom:loaded", function() {
    Event.fire.defer(document.body, "dom:modified");
  });
})();

document.on("dom:modified", function(event, container) {
  container.select("div[behavior~=placeholder]").each(function(element) {
    new Ajax.Request(element.readAttribute("href"), { method: "get", evalScripts: true });
  });
});
var Popup = {
  showForActivator: function(activator) {
    var popup = this.findForElement(activator);
    if (!popup.visible()) {
      this.positionNearElement(popup, activator);
      this.show(popup);
    }
  },

  hideForDeactivator: function(deactivator) {
    var popup = this.findForElement(deactivator);
    if (popup.visible()) {
      this.hide(popup);
    }
  },

  findForElement: function(element) {
    return $(element.readAttribute("popup"));
  },

  positionNearElement: function(popup, element) {
    var position = element.readAttribute("popup_position") || "top left"
    popup.positionInViewportAt(popup.getOffsetRelativeToElement(element, position));
  },

  show: function(popup) {
    popup.show();
  },

  hide: function(popup) {
    popup.hide();
  }
};

document.observe("dom:loaded", function() {
  $(document.body).observe("click", function(event) {
    var element = event.findElement(".popup_activator");
    if (element) {
      Popup.showForActivator(element);
      event.stop();
    }
  });

  $(document.body).observe("click", function(event) {
    var element = event.findElement(".popup_deactivator");
    if (element) {
      Popup.hideForDeactivator(element);
      event.stop();
    }
  });
});
Element.addMethods((function() {
  function getDimensions(element) {
    element = $(element);
    var display = Element.getStyle(element, 'display');
    if (display != 'none' && display != null) // Safari bug
      return {width: element.offsetWidth, height: element.offsetHeight};

    var els = element.style,
        originalVisibility = els.visibility,
        originalPosition = els.position,
        originalDisplay = els.display;
    els.visibility = 'hidden';
    if (originalPosition != 'fixed') // Switching fixed to absolute causes issues in Safari
      els.position = 'absolute';
    els.display = 'block';
    var originalWidth = element.clientWidth,
        originalHeight = element.clientHeight;
    els.display = originalDisplay;
    els.position = originalPosition;
    els.visibility = originalVisibility;
    return {width: originalWidth, height: originalHeight};
  }

  return {
    getMargins: function(element) {
      element = $(element);
      return {
        top:    parseInt(element.getStyle("margin-top")),
        right:  parseInt(element.getStyle("margin-right")),
        bottom: parseInt(element.getStyle("margin-bottom")),
        left:   parseInt(element.getStyle("margin-left"))
      };
    },

    getBounds: function(element) {
      element = $(element);
      var offset = element.cumulativeOffset()
      var top = parseInt(offset.top), left = parseInt(offset.left);
      var dimensions = getDimensions(element);

      return {
        top:    top,
        right:  left + dimensions.width,
        bottom: top + dimensions.height,
        left:   left,
        width:  dimensions.width,
        height: dimensions.height
      };
    },

    getOffsetRelativeToElement: function(element, otherElement, position) {
      element = $(element), otherElement = $(otherElement);
      var bounds = element.getBounds(), otherBounds = otherElement.getBounds();

      position = (position || "top left").strip().split(" ");
      var x = position[1], y = position[0];
      var left = otherBounds.left, top = otherBounds.top;

      switch (x) {
        case "right":  left += otherBounds.width - bounds.width; break;
        case "center": left += parseInt((otherBounds.width / 2) - (bounds.width / 2));
      }

      switch (y) {
        case "bottom": top += otherBounds.height - bounds.height; break;
        case "center": top += parseInt((otherBounds.height / 2) - (bounds.height / 2));
      }

      return {
        top: top, left: left
      }
    },

    positionInViewportAt: function(element, offset) {
      element = $(element);
      var margin = element.getMargins();
      var dimensions = getDimensions(element);

      var bottom = offset.top + dimensions.height + margin.bottom;
      var right = offset.left + dimensions.width + margin.right;

      var viewportOffset = document.viewport.getScrollOffsets();
      var viewportDimensions = document.viewport.getDimensions();
      var viewportBottom = viewportOffset.top + viewportDimensions.height;
      var viewportRight = viewportOffset.left + viewportDimensions.width;

      if (bottom > viewportBottom)
        offset.top = viewportBottom - dimensions.height - margin.top - margin.bottom;
      if (right > viewportRight)
        offset.left = viewportRight - dimensions.width - margin.left - margin.right;

      document.body.appendChild(element);
      element.setStyle({ position: "absolute", top: offset.top + "px", left: offset.left + "px" });
      return element;
    }
  };
})());
document.observe("dom:loaded", function() {
  if ($(document.body).down('[behavior~=switchable_container]')) return

  var focusCandidates = $$('.autofocus[data-focus-priority]').sort(function(a,b) {
    var priorityA = a.readAttribute('data-focus-priority');
    var priorityB = b.readAttribute('data-focus-priority');
    return priorityB - priorityA;
  });

  var focusChampion = focusCandidates.first();
  if (focusChampion) {
    var focus = function(){ focusChampion.focus() };
    if (focusChampion.visible()) {
      focus();
    } else {
      focus.defer();
    }
  }
});

var ProgressBar = function(element) {
  var instance = element.retrieve('progress_bar')
  if (! instance) {
    instance = Object.create(ProgressBar.prototype)
    instance.element = element
    element.store('progress_bar', instance)
  }
  return instance
};

ProgressBar.prototype = new(function() {

  this.update = function(memo) {
    if (this.completed != memo.completed || this.total != memo.total) {
      this.stop()
      this.record(memo)
      this.start()
    }
    return this
  }

  this.record = function(memo) {
    if (! this.updates) this.updates = []
    this.updates.push(Time())
    this.completed = memo.completed
    this.total = memo.total
    return this
  }

  this.start = function() {
    this.animation = new Effect.Morph(this.element, {
      style: {width: this.percentage()},
      duration: this.duration(),
      transition: Effect.Transitions.linear
    })
    return this
  }

  this.stop = function() {
    if (this.animation) this.animation.cancel()
    return this
  }

  this.complete = function() {
    this.stop()
    this.completed = this.total
    this.element.setStyle({width: '100%'})
    return this
  }

  this.clear = function() {
    this.stop()
    delete this.completed
    delete this.total
    this.element.setStyle({width: '0%'})
    return this
  }

  this.duration = function() {
    var length = this.updates.length
    if (length > 2) {
      return ((this.updates[length - 1] - this.updates[length - 2]) / 1000) * 2
    } else {
      return 2
    }
  }

  this.percentage = function() {
    return Math.round((this.completed / this.total) * 100) + '%'
  }
});

var ProgressCounter = function(element) {
  var instance = element.retrieve('progress_counter')
  if (! instance) {
    instance = Object.create(ProgressCounter.prototype)
    instance.element = element
    element.store('progress_counter', instance)
  }
  return instance
};

ProgressCounter.prototype = new(function() {
  this.frequency = 0.2

  this.update = function(memo) {
    if (this.completed != memo.completed || this.total != memo.total) {
      this.stop()
      this.record(memo)
      this.start()
    }
    return this
  }

  this.record = function(memo) {
    if (! this.updates) this.updates = []
    this.updates.push(Time())
    this.completed = memo.completed
    this.total = memo.total
    this.current = this.current || 0
    this.steps = Math.floor(this.duration() / this.frequency)
    this.index = 0
    this.increment = Math.floor((this.completed - this.current) / this.steps)
  }

  this.start = function() {
    this.animation = this.animate.bind(this).recur(this.frequency)
    return this
  }

  this.stop = function() {
    if (this.animation) this.animation.stop()
    return this
  }

  this.complete = function() {
    this.stop()
    this.current = this.completed = this.total
    this.element.update(this.current)
    return this
  }

  this.clear = function() {
    this.stop()
    delete this.current
    delete this.completed
    delete this.total
    this.element.update(0)
    return this
  }

  this.animate = function() {
    if (this.index < this.steps) {
      this.current = this.current + this.increment
      this.index = this.index + 1
    } else {
      this.stop()
      this.index = 0
      this.current = this.completed
    }
    this.element.update(this.current)
  }

  this.duration = function() {
    var length = this.updates.length
    if (length > 2) {
      return ((this.updates[length - 1] - this.updates[length - 2]) / 1000) * 2
    } else {
      return 2
    }
  }
});
var QuickShowWindow = Class.create({
  initialize: function(element) {
    this.element = $(element);
    this.wrapperElement = this.element.down(".quick_show_window_wrapper");
    this.contentElement = this.element.down(".quick_show_window_content");
    this.visible = false;
    this.cache = { };
  },

  show: function() {
    if (this.effect) {
      this.effect.cancel();
      this.effect = false;
    }

    if (this.hoverRegion)
      this.hoverRegion.appendChild(this.element);
    this.element.setStyle({ opacity: 1 });
    this.element.show();
    this.reposition();
    this.element.slideIntoView();
    this.visible = true;
  },

  hide: function() {
    if (this.visible) {
      this.activeRequest = false;
      this.effect = new Effect.Fade(this.element, {
        duration: 0.3,
        afterFinish: function() {
          this.effect = this.visible = false;
          document.body.appendChild(this.element);
        }.bind(this)
      });
    }
  },

  reposition: function(width, height) {
    var offset = this.element.up().positionedOffset();
    var left   = Math.max(0, offset.left - this.element.getWidth());
    var top    = Math.max(0, offset.top - this.element.getHeight());
    this.element.setStyle({ top: top + "px", left: left + "px" });
  },

  setHoverRegion: function(element) {
    this.hoverRegion = $(element);
    this.updateHoverRegionCache();
  },

  updateHoverRegionCache: function() {
    if (this.hoverRegion) {
      [this.element].concat(this.element.descendants()).
        invoke("writeAttribute", "hover_container", this.hoverRegion.identify());
    }
  },

  loadContentFrom: function(url, title) {
    var content = this.cache[url];
    if (content instanceof Ajax.Request) {
      this.activeRequest = content;
      return;

    } else if (!content) {
      content = "<h1 class=busy>" + title.escapeHTML() + "</h1>";
      this.cache[url] = this.activeRequest = new Ajax.Request(url, {
        method: "get",
        onComplete: function(transport) {
          this.cache[url] = transport.responseText;
          if (this.activeRequest == transport.request) {
            this.wrapperElement.transition({
              after: this.element.slideIntoView.bind(this.element),
              afterUpdate: this.reposition.bind(this),
              animate: false
            }, this.loadContentFrom.bind(this, url));
          }
        }.bind(this)
      });
    }

    this.contentElement.update(content);
  }
});

document.observe("dom:loaded", function() {
  var element = $("quick_show_window");
  if (!element) return;

  var quickShowWindow = new QuickShowWindow(element);

  document.observe("hover:activated", function(event, element) {
    if (element = event.findElement(".quick_show_tag")) {
      quickShowWindow.setHoverRegion(element);
      quickShowWindow.loadContentFrom(element.readAttribute("href"), element.readAttribute("quick_show_title"));
      quickShowWindow.show();
    }
  });

  document.observe("hover:deactivated", function(event, element) {
    if (element = event.findElement(".quick_show_tag")) {
      quickShowWindow.hide();
    }
  });
});
var SelectAllCheckbox = Class.create({
  initialize: function(aggregator, container) {
    this.aggregator = $(aggregator);
    this.container  = container ? $(container) : this.aggregator.up("form");
    this.updateAggregator();

    this.container.observe("click", function(event) {
      var element = event.findElement("input[type=checkbox]");
      if (element) this.onCheckboxClicked(event, element);
    }.bind(this));
  },

  onCheckboxClicked: function(event, element) {
    if (element == this.aggregator) {
      this.setAllCheckboxes(element.checked);
    } else {
      this.updateAggregator();
    }
  },

  getCheckboxes: function() {
    return this.checkboxes = this.checkboxes ||
      this.container.select("input[type=checkbox]").without(this.aggregator);
  },

  updateAggregator: function() {
    this.aggregator.checked = this.getAggregateValue();
  },

  getAggregateValue: function() {
    return this.getCheckboxes().all(function(element) { return element.checked });
  },

  setAllCheckboxes: function(value) {
    this.getCheckboxes().each(function(element) { element.checked = value });
  }
});
var SelectFiling = {
  submit: function(element) {
    element.down(".close").addClassName("busy");

    var form = element.down("form");
    form.request();
    form.disable();
  },

  observeSelection: function(element) {
    element = $(element);
    element.observe("collection:change", function(e) {
      SelectFiling.submit(element);
    });
  }
};

document.on('dom:modified', function(event, modified) {
  modified.select('[behavior~=select_permissions]').each(function(container) {
    if (container.readAttribute('data-permissions-initialized')) return
    container.writeAttribute('data-permissions-initialized', true)

    container.select('.scope input[type=radio]').each(function(input){ input.observe('click', activateScope) })

    var namedGroupMenu = container.down('select.named_group')
    if (namedGroupMenu) namedGroupMenu.observe('change', changePermission)

    container.select('.adhoc_group_members .adhoc_group_member').each(AdhocGroupMember)

    AdhocGroupMember.menu = container.down('select.new_adhoc_group_member')
    if (AdhocGroupMember.menu) {
      AdhocGroupMember.menu.observe('change', function() {
        AdhocGroupMember.insert()
      })
    }

    function activateScope(event) {
      var activated = event.findElement('.scope')
      container.select('.scope.activated').each(function(scope){ scope.removeClassName('activated') })
      activated.addClassName('activated')
      changePermission()
    }

    function changePermission() {
      container.fire('permission:change', {'users_ids': viewers()})
    }

    function viewers() {
      switch (container.down('.scope input[checked]').value) {
      case 'Owner':
        return []
      case 'NamedGroup':
        return namedGroupMembers()
      case 'AdhocGroup':
        return adhocGroupMembers()
      default:
        return everyone()
      }
    }

    function everyone() {
      var values = AdhocGroupMember.menu.select('option').map(function(option){
        if (option.value) return option.value
      }).compact()
      return (everyone = function(){ return values }).call()
    }

    function namedGroupMembers() {
      return namedGroups()[container.down('select.named_group').value] || []
    }

    function adhocGroupMembers() {
      return container.select('.adhoc_group_members .adhoc_group_member select').map(function(menu){ return menu.value })
    }

    function namedGroups() {
      var groups = container.down('.named_groups_data').readAttribute('data').evalJSON()
      return (namedGroups = function() { return groups }).call()
    }

    function AdhocGroupMember(member) {
      member.down('select').observe('change', changePermission)
      member.down('span.sprite.remove').observe('click', function(){ AdhocGroupMember.remove(member) })
      member.down('span.sprite.add'   ).observe('click', function(){ AdhocGroupMember.add(member)    })
      return member
    }

    AdhocGroupMember.remove = function(member) {
      var removed = member.remove()
      var members = container.select('.adhoc_group_members .adhoc_group_member')
      if (members.length === 0) {
        AdhocGroupMember.activateMenu()
      } else {
        if (removed.hasClassName('last')) members.last().addClassName('last')
      }
      changePermission()
    }

    AdhocGroupMember.add = function(lastMember) {
      lastMember.removeClassName('last')
      AdhocGroupMember.activateMenu()
    }

    AdhocGroupMember.insert = function() {
      if (! adhocGroupMembers().include(AdhocGroupMember.menu.value)) {
        var lastMember = container.down('.adhoc_group_members .last.adhoc_group_member')
        if (lastMember) lastMember.removeClassName('last')
        container.down('.adhoc_group_members').insert(AdhocGroupMember.create().addClassName('last'))
        AdhocGroupMember.deactivateMenu()
        changePermission()
      } else {
        AdhocGroupMember.activateMenu()
      }
    }

    AdhocGroupMember.create = function() {
      var member = $(container.down('.adhoc_group_member.template').cloneNode(true))
      member.removeClassName('template').show()
      member.down('select').enable().value = AdhocGroupMember.menu.value
      return AdhocGroupMember(member)
    }

    AdhocGroupMember.activateMenu = function() {
      var ids  = adhocGroupMembers()
      var menu = AdhocGroupMember.menu
      if (ids.any()) {
        menu.down('option').update('Select another...')
      } else {
        menu.down('option').update('Select somebody...')
      }
      menu.value = ""
      menu.enable().show()
    }

    AdhocGroupMember.deactivateMenu = function() {
      AdhocGroupMember.menu.disable().hide()
    }
  })
});

document.on('dom:modified', function(event, modified) {
  modified.select('[behavior~=select_subscribers]').each(function(element) {
    new SelectAllCheckbox(element.down('.everyone input'), element)

    element.up('form').on('permission:change', function(event){
      var ids = event.memo.users_ids
      if (ids.any()) {
        store()
        render(ids)
        element.show()
      } else {
        element.hide()
      }
    })

    function store() {
      var storage = element.down('.storage')
      element.select('.selection .subscriber').each(function(subscriber) {
        subscriber.down('input').disable()
        storage.insert(subscriber)
      })
    }

    function render(ids) {
      var columns   = element.select('.selection td')
      var perColumn = Math.ceil(ids.length / columns.length)
      ids.inGroupsOf(perColumn).each(function(groupOfIds){
        var column = columns.shift()
        groupOfIds.each(function(id){
          if (id) {
            var subscriber = $('subscriber_' + id)
            subscriber.down('input').enable()
            column.insert(subscriber)
          }
        })
      })
    }
  })
});
/* ------------------------------------------------------------------------
 * show_hide.js
 * Copyright (c) 2004-2008 37signals, LLC. All rights reserved.
 * ------------------------------------------------------------------------ */

var ShowHide = Class.create();
ShowHide.prototype = {
  initialize: function(element, callbacks) {
    this.element   = element = $(element);
    this.effect    = element.getAttribute('effect') || 'slide';
    this.duration  = parseFloat(element.getAttribute('duration')) || 0.25;
    this.activeClassName = element.getAttribute('activeclassname') || 'active';
    this.callbacks = callbacks;
    this.active    = Element.visible(element);
    this.element.showHide = this;
  },

  togglers: function() {
    return $A(document.getElementsByClassName('show_hide_toggler_' + this.element.id));
  },

  toggle: function() {
    if (this.callbacks.beforeToggle) this.callbacks.beforeToggle(this);
    Effect.toggle(this.element, this.effect, {duration: this.duration,
      afterFinish: (this.callbacks.afterToggle || Prototype.K).bind(null, this)});
    this.active = !this.active;
    this.togglers().concat(this.element).each(this.adjustClassName.bind(this));
  },

  show: function() {
    if (this.active) return;
    this.toggle();
  },

  hide: function() {
    if (!this.active) return;
    this.toggle();
  },

  adjustClassName: function(element) {
    Element[this.active ? 'addClassName' : 'removeClassName'](element, this.activeClassName);
  }
};
/* ------------------------------------------------------------------------
 * slide_into_view.js
 * Copyright (c) 2004-2008 37signals, LLC. All rights reserved.
 * ------------------------------------------------------------------------ */

Element.addMethods({
  slideIntoView: function(element, options) {
    element = $(element), options = options || {};

    function scroll() {
      var effect;
      var top = element.cumulativeOffset()[1], height = element.getHeight(), bottom = top + height;
      var viewTop = document.viewport.getScrollOffsets().top, viewHeight = document.viewport.getHeight(),
          viewBottom = viewTop + viewHeight;

      if (top < viewTop) {
        effect = new Effect.ScrollTo(element, Object.extend({ duration: 0.15 }, options));
      } else if (bottom > viewBottom) {
        effect = new Effect.ScrollTo(element, Object.extend({ duration: 0.15, offset: height - viewHeight }, options));
      }

      return effect;
    }

    if (options.sync) return scroll();

    scroll.defer();
    return element;
  }
});
var Subdomains = {
  check: function(response) {
    var result = response.responseJSON;
    if(result.available || result.subdomain.blank()) {
      $('subdomain_notice').hide();
    } else {
      $('subdomain_notice').innerHTML = '"' + result.subdomain + '" is not available. Please choose another URL.';
      $('subdomain_notice').show();
    }
  }
};
$(document).on('input:change', '[behavior~=subject_datum_container]', function(event, container) {
  var textInput = container.down('[behavior~=subject_datum_value]')
  var idInput = container.down('[behavior~=subject_datum_id]')
  if (idInput) {
    var id = idInput.value.replace('-', '')
    if (textInput.value.blank()) {
      idInput.setValue('-' + id)
    } else {
      idInput.setValue(id)
    }
  }
})
new(function() {
  var on = Element.on.curry(document)

  on('activity:commit', '[behavior~=subject_field_definition_activity]', function(event, activity) {
    var requiredInput = activity.down('[behavior~=label_input]')
    if (requiredInput.getValue().blank()) {
      requiredInput.activate()
    } else {
      activity.classify('networking')
      var commitButton = activity.down('[behavior~=commit_button]')
      commitButton.setValue(commitButton.readAttribute('data-disabled-text'))
      commitButton.disable()
      activity.submit()
    }
  })
});
$(document).on('dom:loaded', function() {
  if (! (document.body).down('[behavior~=subject_field]')) return

  $$('.highlighted.subject_field').each(function(element) {
    element.morph({'background-color': '#ffffff'}, {delay: 1, duration: 2})
  })

  var on = Element.on.curry(document)


  on('click', '[behavior~=toggle_field_deletion_activity]', function(event, control) {
    var container = control.up('[behavior~=subject_field]')
    if (container.is('deleting')) {
      stopDeletionActivityFor(container)
    } else {
      startDeletionActivityFor(container)
    }
  })

  on('click', '[behavior~=stop_field_deletion_activity]', function(event, control) {
    var container = control.up('[behavior~=subject_field]')
    stopDeletionActivityFor(container)
  })

  function startDeletionActivityFor(container) {
    var content  = container.down('[behavior~=content]')
    var activity = container.down('[behavior~=field_deletion_activity]')
    var toggle   = container.down('[behavior~=toggle_field_deletion_activity]')
    container.classify('deleting')
    container.classify('highlighted')
    toggle.classify('toggled')
    container.setStyle({height: container.measure('padding-box-height')+'px'})
    activity.show().setStyle({'visibility': 'hidden'})
    container.morph({height: content.measure('padding-box-height')+'px'}, {
      duration: 0.25,
      transition: Effect.Transitions.easeOutQuad,
      afterFinish: function() {
        activity.setStyle({'visibility': 'visible'})
        activity.down('[behavior~=commit_button]').focus()
      }
    })
  }

  function stopDeletionActivityFor(container) {
    var content  = container.down('[behavior~=content]')
    var activity = container.down('[behavior~=field_deletion_activity]')
    var toggle   = container.down('[behavior~=toggle_field_deletion_activity]')
    container.declassify('highlighted')
    toggle.declassify('toggled')
    container.setStyle({height: container.measure('padding-box-height')+'px'})
    activity.hide()
    container.morph({height: content.measure('padding-box-height')+'px'}, {
      duration: 0.25,
      transition: Effect.Transitions.easeOutQuad,
      afterFinish: function() {
        container.declassify('deleting')
      }
    })
  }

  on('click', '[behavior~=commit_field_deletion_form]', function(event, control) {
    var container = control.up('[behavior~=subject_field]')
    var content   = container.down('[behavior~=content]')
    control.classify('activated')
    container.classify('expired')
    container.down('[behavior~=field_deletion_form]').request({
      onComplete: function() {
        container.classify('removing')
        container.morph({height: '0px'}, {
          duration: content.measure('padding-box-height') / 250,
          transition: Effect.Transitions.easeOutQuad,
          afterFinish: function() { container.remove() }
        })
      }
    })
  })

  on('form:submit', '[behavior~=field_deletion_activity]', function(event, activity) {
    activity.select('[behavior~=commit_button]').each(function(commitButton) {
      commitButton.blur()
      commitButton.disable()
      commitButton.setValue(commitButton.readAttribute('data-disabled-text'))
    })
    var container = activity.up('[behavior~=subject_field]')
    var content   = container.down('[behavior~=content]')
    var toggle    = container.down('[behavior~=toggle_field_deletion_activity]')
    container.classify('expired')
    container.declassify('highlighted')
    toggle.declassify('toggled')
    activity.request({
      onComplete: function() {
        container.classify('removing')
        container.morph({height: '0px'}, {
          duration: content.measure('padding-box-height') / 250,
          transition: Effect.Transitions.easeOutQuad,
          afterFinish: function() { container.remove() }
        })
      }
    })
  })


  on('click', '[behavior~=start_field_renaming_activity]', function(event, control) {
    startRenaming(control.up('[behavior~=subject_field]'))
  })

  on('dblclick', '[behavior~=subject_field] .label', function(event, control) {
    startRenaming(control.up('[behavior~=subject_field]'))
  })

  on('input:changed', '[behavior~=field_renaming_activity]', function(event, activity) {
    var requiredInput = event.element()
    if (requiredInput.getValue().blank()) {
      stopRenaming(activity.up('[behavior~=subject_field]'))
      requiredInput.setValue(event.memo.originalValue)
    } else {
      activity.up('[behavior~=subject_field]').classify('networking')
      activity.request()
      activity.disable()
    }
  })

  on('input:reset', '[behavior~=field_renaming_activity]', function(event, activity) {
    stopRenaming(activity.up('[behavior~=subject_field]'))
  })

  on('input:submit', '[behavior~=field_renaming_activity]', function(event, activity) {
    event.element().blur()
  })

  function startRenaming(element) {
    if (element.isNot('deleting')) {
      element.declassify('reading').classify('renaming')
      element.down('[behavior~=field_renaming_activity] [behavior~=first_input]').activate()
    }
  }

  function stopRenaming(element) {
    if (element.isNot('networking')) {
      element.declassify('renaming').classify('reading')
    }
  }
});

$(document).on('click', '[behavior~=start_activity_to_create_add_tags_operation]', function(event, control){
  var container = control.up('[behavior~=party_selection_container]')
  var activity = container.down('[behavior~=activity_to_create_add_tags_operation]')
  if (control.hasClassName('activated')) return activity.fire('activity:stop')
  control.addClassName('activated')
  var observer = activity.on('activity:deactivate', function() {
    observer.stop()
    control.removeClassName('activated')
  })
  activity.fire('activity:activate')
});

$(document).on('activity:activated', '[behavior~=activity_to_create_add_tags_operation]', function(event, activity) {
  activity.down('[behavior~=tag_name_input]').focus()
});

$(document).on('form:submit', '[behavior~=activity_to_create_add_tags_operation]', function(event, form){
  var input = form.down('[behavior~=tag_name_input]')
  if (String(input.getValue()).blank()) {
    input.activate()
  } else {
    input.blur()

    var commitButton = form.down('[behavior~=commit_button]')
    commitButton.disable()
    commitButton.setValue(commitButton.readAttribute('data-disabled-text'))

    SubjectOperation.fillFormWithCurrentSelectionOfParties(form)
    form.addClassName('networking')
    form.request()
  }
});

$(document).on('operation:progress', '[behavior~=activity_to_create_add_tags_operation]', function(event) {
  var container = event.element()
  if (container.hasClassName('activated')) return
  var content = container.down('[behavior~=content]')
  content.setStyle({opacity:'0'})
  container.setStyle({height: '0px'})
  container.show()
  container.addClassName('activated')
  var contentHeight = content.measure('margin-box-height')
  container.morph({height: contentHeight+'px'}, {
    duration: 0.25,
    afterFinish: function() {
      container.setStyle({height: 'auto'})
      content.morph({opacity: '1'}, {
        duration: 0.25,
        transition: Effect.Transitions.linear
      })
    }
  })
});

$(document).on('operation:completed', '[behavior~=activity_to_create_add_tags_operation]', function(event, activity) {
  activity.removeClassName('networking').addClassName('completed')
});

$(document).on('click', '[behavior~=start_activity_to_create_change_visibility_operation]', function(event, control) {
  var container = control.up('[behavior~=party_selection_container]')
  var activity = container.down('[behavior~=activity_to_create_change_visibility_operation]')
  if (control.hasClassName('activated')) return activity.fire('activity:stop')
  control.addClassName('activated')
  var observer = activity.on('activity:deactivate', function() {
    observer.stop()
    control.removeClassName('activated')
  })
  activity.fire('activity:activate')
});

$(document).on('form:submit', '[behavior~=activity_to_create_change_visibility_operation]', function(event, form) {
  var commitButton = form.down('[behavior~=commit_button]')
  commitButton.disable()
  commitButton.setValue(commitButton.readAttribute('data-disabled-text'))
  SubjectOperation.fillFormWithCurrentSelectionOfParties(form)
  form.addClassName('networking')
  form.request()
});

$(document).on('operation:progress', '[behavior~=activity_to_create_change_visibility_operation]', function(event, activity) {
  var operation = event.element()
  if (! operation.hasClassName('activated')) {
    operation.morph({'margin-top': '0px'}, {
      duration: 0.6,
      transition: Effect.Transitions.easeOutQuad,
      afterFinish: function() {
        operation.addClassName('activated')
      }
    })
  }
});

$(document).on('operation:completed', '[behavior~=activity_to_create_change_visibility_operation]', function(event, activity) {
  activity.removeClassName('networking').addClassName('completed')
});

$(document).on('parties:selection:change', function(event) {
  var name = event.memo.selection.name
  if (name === "no_contacts") return
  $$('[behavior~=activity_to_create_destroy_operation]').each(function(activity) {
    activity.select('[behavior~=selection_context]').invoke('hide')
    activity.select('[behavior~='+name+']').invoke('show')
  })
});

$(document).on('click', '[behavior~=start_activity_to_create_destroy_operation]', function(event, control){
  var container = control.up('[behavior~=party_selection_container]')
  var activity = container.down('[behavior~=activity_to_create_destroy_operation]')
  if (control.hasClassName('activated')) return activity.fire('activity:stop')
  control.addClassName('activated')
  var observer = activity.on('activity:deactivate', function() {
    observer.stop()
    control.removeClassName('activated')
  })
  activity.fire('activity:activate')
});

$(document).on('form:submit', '[behavior~=activity_to_create_destroy_operation]', function(event, activity){
  event.stop()
  activity.select('[behavior~=selection_context]').each(function(selectionContext){
    if (! selectionContext.visible()) selectionContext.remove()
  })
  activity.select('[behavior~=commit_button]').each(function(commitButton) {
    commitButton.disable()
    commitButton.setValue(commitButton.readAttribute('data-disabled-text'))
  })
  SubjectOperation.fillFormWithCurrentSelectionOfParties(activity)
  activity.addClassName('networking')
  activity.request()
});

$(document).on('operation:progress', '[behavior~=activity_to_create_destroy_operation]', function(event) {
  var operation = event.element()
  if (! operation.hasClassName('activated')) {
    operation.morph({'margin-top': '0px'}, {
      duration: 0.5,
      transition: Effect.Transitions.easeOutQuad,
      afterFinish: function() {
        operation.addClassName('activated')
      }
    })
  }
});

$(document).on('operation:completed', '[behavior~=activity_to_create_destroy_operation]', function(event, activity) {
  activity.removeClassName('networking').addClassName('completed')
});
$(document).on('queue:updates', '#completed_operations', function(event, container) {
  var content = container.down('[behavior~=content]')
  if (container.hasClassName('activated')) {
    var oldContentHeight = content.measure('padding-box-height')
    container.setStyle({height: oldContentHeight+'px'})
    content.addClassName('fixed_at_bottom')
    var outgoingNotice = content.down()
    var outgoingNoticeHeight = outgoingNotice.measure('margin-box-height')
    content.insert({top: event.memo.html})
    var incomingNotice = content.down()
    var incomingNoticeHeight = incomingNotice.measure('margin-box-height')
    var newContentHeight = content.measure('padding-box-height') - outgoingNoticeHeight
    outgoingNotice.addClassName('expired')
    var diff = Math.abs(newContentHeight - oldContentHeight)
    if (newContentHeight === oldContentHeight) {
      incomingNotice.setStyle({opacity:'0'})
      content.morph({bottom: '-'+outgoingNoticeHeight+'px'}, {
        duration: incomingNoticeHeight / 200,
        delay: 0.15,
        transition: Effect.Transitions.easeOutQuad,
        afterSetup: function() {
          incomingNotice.setStyle({opacity:''})
        },
        afterFinish: function() {
          outgoingNotice.remove()
          content.setStyle({bottom: ''})
          content.removeClassName('fixed_at_bottom')
          container.setStyle({height: 'auto'})
        }
      })
      return
    }
    if (newContentHeight < oldContentHeight) {
      content.removeClassName('fixed_at_bottom')
      content.addClassName('fixed_at_top')
      content.setStyle({top: '-'+incomingNoticeHeight+'px'})
      incomingNotice.setStyle({opacity: '0'})
      outgoingNotice.morph({opacity: '0'}, {
        duration: 0.25,
        transition: Effect.Transitions.linear,
        afterFinish: function() {
          outgoingNotice.remove()
        }
      })
      content.morph({top: '0px'}, {
        duration: incomingNoticeHeight / 200,
        delay: 0.15,
        transition: Effect.Transitions.easeOutQuad,
        afterSetup: function() {
          incomingNotice.setStyle({opacity:''})
        },
        afterFinish: function() {
          content.setStyle({top: ''})
          container.morph({height: newContentHeight+'px'}, {
            duration: diff / 50,
            afterFinish: function() {
              content.removeClassName('fixed_at_top')
              container.setStyle({height: 'auto'})
            }
          })
        }
      })
      return
    }
    if (newContentHeight > oldContentHeight) {
      content.removeClassName('fixed_at_bottom')
      content.addClassName('fixed_at_top')
      content.setStyle({top: '-'+incomingNoticeHeight+'px'})
      incomingNotice.setStyle({opacity:'0'})
      container.morph({height: newContentHeight+'px'}, {
        duration: Math.max(diff / 100, 0.15),
        transition: Effect.Transitions.linear,
        afterFinish: function() {
          content.morph({top: '0px'}, {
            duration: incomingNoticeHeight / 150,
            transition: Effect.Transitions.easeOutQuad,
            afterSetup: function() {
              incomingNotice.setStyle({opacity:''})
            },
            afterFinish: function() {
              outgoingNotice.remove()
              content.setStyle({top: ''})
              content.removeClassName('fixed_at_top')
              container.setStyle({height: 'auto'})
            }
          })
        }
      })
      return
    }
  } else {
    container.setStyle({height: '0px'})
    content.addClassName('fixed_at_bottom')
    content.insert(event.memo.html)
    var contentHeight = content.measure('padding-box-height')
    container.morph({height: contentHeight+'px'}, {
      duration: contentHeight / 200,
      transition: Effect.Transitions.easeOutQuad,
      afterFinish: function() {
        content.removeClassName('fixed_at_bottom')
        container.setStyle({height: 'auto'})
        container.addClassName('activated')
      }
    })
  }
});

$(document).on('click', '[behavior~=hide_completed_operations]', function(event, control) {
  var container = $('completed_operations')
  var content = container.down('[behavior~=content]')
  var contentHeight = content.measure('padding-box-height')
  container.setStyle({height: contentHeight+'px'})
  content.morph({opacity:'0'}, {
    duration: 0.25,
    transition: Effect.Transitions.linear,
    afterFinish: function() {
      container.morph({height: '0px'}, {
        duration: contentHeight / 100,
        transition: Effect.Transitions.easeOutQuad,
        afterFinish: function() {
          content.update('')
          content.setStyle({opacity: '1'})
          container.removeClassName('activated')
        }
      })
    }
  })
});

$(document).on('operation:progress', '[behavior~=pending_subject_operation]', function(event, element) {
  var progressCounter = ProgressCounter(element.down('[behavior~=progress_counter]')).update(event.memo)
  var progressBar = ProgressBar(element.down('[behavior~=progress_bar]')).update(event.memo)
  if (! element.retrieve('progress_completion_observer')) {
    var observer = element.on('operation:completed', function() {
      progressCounter.complete()
      progressBar.complete()
      observer.stop()
    })
    element.store('progress_completion_observer', observer)
  }
});
var SubjectOperation = new(function()
{
  this.fillFormWithCurrentSelectionOfParties = function(form) {
    var partyInputContainer = form.down('[behavior~=party_id_input_container]')
    partyInputContainer.update('')
    if ($('browser').hasClassName('with_filter_selected')) {
      form.down('[behavior~=filter_query]').setValue(window.browser.filters.query)
    } else {
      form.down('[behavior~=filter_query]').setValue('')
      $$('#parties [behavior~=party_id_input]').each(function(box){
        if (box.getValue()) {
          partyInputContainer.insert('<input type="hidden" name="id[]" value="'+box.getValue()+'" />')
        }
      })
    }
    form.down('[behavior~=dom_id_input]').setValue(form.identify())
    return form
  }
});


new(function(){
  document.on('dom:loaded', function(event) {
    if ($(document.body).down('[behavior~=switchable_container]')) {
      if (window.location.hash.blank()) {
        switchTo($(document.body).down('[behavior~=switchable_controls] > *').readAttribute('data-display'))
      }

      document.on('anchor:changed', function(event) {
        switchTo(event.memo.to)
      })

      document.on('click', '[behavior~=switch_to]', function(event, control) {
        if (control.hasClassName('activated')) event.stop()
      })
    }
  })

  function switchTo(displayName) {
    var controls = $(document.body).select('[behavior~=switchable_controls] > *')
    var displays = $(document.body).select('[behavior~=switchable_displays] > *')

    var activatedControl = controls.detect(function(c){ return c.match('[data-display='+displayName+']') })
    var inactiveControls = controls.without(activatedControl)
    var activatedDisplay = displays.detect(function(d){ return d.match('.'+displayName) })
    var inactiveDisplays = displays.without(activatedDisplay)

    if (activatedControl && activatedDisplay) {
      inactiveControls.invoke('declassify', 'activated')
      activatedControl.classify('activated')
      inactiveDisplays.invoke('hide')
      activatedDisplay.show()
    }

    $(document.body).down('[behavior~=switchable_container]').show()

    if (activatedDisplay) {
      activatedDisplay.autofocus()
      activatedDisplay.fire('display:activated')
    }
  }
});
/* ------------------------------------------------------------------------
 * tags.js
 * Copyright (c) 2004-2008 37signals, LLC. All rights reserved.
 * ------------------------------------------------------------------------ */

var Tags = {
  fadeAndRemove: function(tag) {
    tag = $(tag);
    var wrapper = tag.up("span.wrapper");
    wrapper.visualEffect('fade', {
      duration: 0.5,
      afterFinish: function() {
        tag.remove();
      }
    })
  },

  rename: function() {
    $("rename_tag_link").hide();
    with ($("tag_name_editor")) {
      down(".show").hide();
      down(".edit").show();
      down("input[type=text]").activate();
    }
  },

  cancelRename: function() {
    Tags.resetRenameForm();
    $("rename_tag_link").show();
    with ($("tag_name_editor")) {
      down(".show").show();
      down(".edit").hide();
    }
  },

  resetRenameForm: function() {
    $("tag_name_editor").down("form").removeClassName("busy").reset();
  },

  add: function(form) {
    form = $(form);
    var input = form.down("input[type=text]");
    if (input.value.blank()) {
      input.activate();
    } else {
      form.markAsBusy();
      form.request();
    }
    return false;
  }
};
/* ------------------------------------------------------------------------
 * task_recordings.js
 * Copyright (c) 2004-2008 37signals, LLC. All rights reserved.
 * ------------------------------------------------------------------------ */

var TaskRecordings = {
  destroy: function(taskRecording) {
    taskRecording = $(taskRecording);
    if (taskRecording.tagName == "TR") {
      taskRecording.remove();
    } else {
      taskRecording.visualEffect("fade", { duration: 0.5 });
    }
  }
};
/* ------------------------------------------------------------------------
 * tasks.js
 * Copyright (c) 2004-2008 37signals, LLC. All rights reserved.
 * ------------------------------------------------------------------------ */

var Tasks = {
  addOrRemoveEmptyClass: function(element) {
    if (!element) return;
    if (element.down('div.show_task') || element.down('a.show_all_tasks') || element.down('div.completed_task'))
      element.removeClassName('empty');
    else
      element.addClassName('empty');
  },

  adjustFrameClass: function(frame) {
    frame = $(frame);
    [frame, frame.up('div.frames'), frame.up('div.tasks.section'), frame.up('body.tasks')].each(Tasks.addOrRemoveEmptyClass);
  },

  highlight: function(task) {
    task = $(task);

    var to = '#ffffff';
    if (task.up("div.frame.today"))
      to = '#ffffcc';
    else if (task.up("div.col.sidebar"))
      to = '#e5e5e5';

    task.visualEffect('highlight', {duration: 2, startcolor: '#ffff66', endcolor: to});
  },

  fadeAndRemove: function(task) {
    task = $(task);
    task.visualEffect('fade', {
      duration: 1.0,
      afterFinish: function() {
        Tasks.remove(task);
      }
    })
  },

  remove: function(task) {
    task = $(task);
    var frame = task.up('div.frame');
    task.remove();
    if (frame) Tasks.adjustFrameClass(frame);
  },

  toggleFollowupForm: function() {
    var dialog = $('new_followup_task_dialog'), link = $('new_followup_task_link');

    if (dialog.visible()) {
      dialog.hide();
      link.show();
    } else {
      link.hide();
      dialog.visualEffect('blindDown', {
        duration: 0.3,
        afterFinish: function() {
          $('new_followup_task').slideIntoView();
          $('followup_body_task').focus();
        }
      });
    }
  },

  hideFlash: function() {
    Tasks.flashTimeout = null;
    $('task_flash').visualEffect('fade', { duration: 1.0 });
  },

  showFlash: function(message, duration) {
    if(Tasks.flashTimeout) {
      clearTimeout(Tasks.flashTimeout);
      Tasks.flashTimeout = null;
    }

    var flash = $("task_flash");
    var element = flash.down('div.inner_task_flash');
    element.update(message);

    flash.visualEffect('appear', {
      duration: 0.3,
      afterFinish: function() {
        Tasks.flashTimeout = setTimeout(Tasks.hideFlash, duration || 2000);
      }
    });
  },

  changeCategory: function(element) {
    if ($F(element) != "new") return;
    if (Categories.create({parameters: {from: "tasks", update: element.id}})) {
      element.update("<option>Adding category...</option>");
      element.blur();
      element.disable();
    } else {
      element.down("option").selected = true;
    }
  },

  changeFrame: function(element, toFrame) {
    var element  = $(element);
    var frame    = toFrame || $F(element);
    var controls = element.up("form").down("div.controls");
    var option   = element.down("option[value=" + frame + "]");
    var params   = $H(option.readAttribute("params").evalJSON());

    option.selected = true;

    if (frame == "specific") {
      controls.addClassName("specific");
    } else {
      controls.removeClassName("specific");
      params.each(function(pair) {
        controls.down("[name='" + pair.key + "']").setValue(pair.value);
      });
      controls.down("div.calendar_date_select").fire("calendar:fieldChanged");
    }

    var task_div = controls.up("div.task");
    if(task_div) task_div.slideIntoView();
  }
};

document.observe("dom:loaded", function() {
  /* global "new task" button */
  if ($('new_task_container')) new MenuObserver("new_task_container");

  /* per-page "new task" button */
  if ($('new_task_container_for_page')) new MenuObserver("new_task_container_for_page");

  $$('#page_filter .menu_collection').each(function(collection) {
    new MenuObserver(collection);
  });

  /* task list */
  if ($('task_frames')) new MenuObserver("task_frames");

  document.observe("menu:activated", function(event) {
    var autofocus = event.target.select('.autofocus').first();
    if (autofocus) autofocus.focus();
  });

  document.observe("menu:deactivated", function(event) {
    event.target.select(".reset-on-dismissal").each(function(element) {
      element.update('<div class="menu_content"></div>');
      element.hide();
    });
    event.target.select(".inner_task_flash").each(function(element) {
      element.update('');
      element.up().hide();
    });
  });
});
window.templates || (window.templates = {});
window.templates["_deal_option"] = function (__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      var deal, deals, status, _i, _j, _len, _len2, _ref;
      __out.push('<option value="">No deal</option>\n\n');
      _ref = ['pending', 'won', 'lost'];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        status = _ref[_i];
        __out.push('\n  ');
        deals = this.deals[status];
        __out.push('\n  ');
        if (deals) {
          __out.push('\n    <optgroup label="');
          __out.push(__sanitize(status.capitalize()));
          __out.push('">\n      ');
          for (_j = 0, _len2 = deals.length; _j < _len2; _j++) {
            deal = deals[_j];
            __out.push('\n        <option value="');
            __out.push(__sanitize(deal.id));
            __out.push('" ');
            if (deal.id === this.recording_deal_id) {
              __out.push(__sanitize('selected="selected"'));
            }
            __out.push('>');
            __out.push(__sanitize(deal.name));
            __out.push('</option>\n      ');
          }
          __out.push('\n    </optgroup>\n  ');
        }
        __out.push('\n');
      }
      __out.push('\n');
    }).call(this);

  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
};
var Twitter = {
  template: new Template(
    '<div class="tweet">' +
    '  <div class="message">#{text}</div>' +
    '  <div class="created"><a href="http://twitter.com/#{user.screen_name}/status/#{id_str}">#{created_at} ago</a></div>' +
    '</div>'
  ),

  renderTweets: function(tweets) {
    if (tweets.length == 0)
      return;

    var statuses = '';
    var username = tweets[0].user.screen_name.toLowerCase();

    tweets.each(function(tweet) {
      statuses += Twitter.renderTweet(tweet);
    });

    $('tweets_' + username).update(statuses);
  },

  renderTweet: function(tweet) {
    tweet.text = this.linkify(tweet.text);
    tweet.created_at = this.timeAgoInWords(tweet.created_at);

    return this.template.evaluate(tweet);
  },

  linkify: function(text) {
    var urls = /https?:\/\/([-\w\.]+)+(:\d+)?(\/([-\w\/\.]*(\?\S+)?)?)?/;
    var replies = /@([\w]*)\b/;

    text = text.gsub(urls, '<a href="#{0}">#{0}</a>');
    text = text.gsub(replies, '<a href="http://twitter.com/#{1}">#{0}</a>');

    return text;
  },

  timeAgoInWords: function(from) {
    var d = from.split(' ');
    from = Date.parse(d[1]+" "+d[2]+", "+d[5]+" "+d[3]+" UTC");

    var seconds = ((new Date() - new Date(from)) / 1000);
    var minutes = (seconds / 60).floor();

    if (minutes == 0)      return 'A moment';
    if (minutes < 2)       return 'A minute';
    if (minutes < 45)      return minutes + ' minutes';
    if (minutes < 120)     return 'An hour';
    if (minutes < 1440)    return (minutes / 60).floor() + ' hours';
    if (minutes < 2880)    return '1 day';
    if (minutes < 43200)   return (minutes / 1440).floor() + ' days';
    if (minutes < 86400)   return 'A month';
    if (minutes < 525960)  return (minutes / 43200).floor() + ' months';
    if (minutes < 1051199) return 'A year';

    return 'over ' + (minutes / 525960).floor() + ' years';
  }
};
document.on('change', '[behavior~=twitter_username]', function(event, element){
  var hidden_id = $(element).up().previous('[type=hidden][behavior~=twitter_username_id]');

  if ($(element).value.blank() && !hidden_id.value.startsWith('-')){
    hidden_id.value = '-' + hidden_id.value;
  } else {
    hidden_id.value = hidden_id.value.sub('-', '');
  }
});
/* ------------------------------------------------------------------------
 * users.js
 * Copyright (c) 2004-2008 37signals, LLC. All rights reserved.
 * ------------------------------------------------------------------------ */

var Users = {
  toggleAdmin: function(checkbox, url) {
    checkbox.up().addClassName('busy');

    new Ajax.Request(url, {
      method: 'put', parameters: 'user[admin]=' + (checkbox.checked ? '1' : '0'),
      onSuccess: function() { checkbox.up().removeClassName('busy') }.bind(checkbox)
    });
  },

  toggleCanExportContacts: function(checkbox, url) {
    checkbox.up().addClassName('busy');

    new Ajax.Request(url, {
      method: 'put', parameters: 'user[can_export_contacts]=' + (checkbox.checked ? '1' : '0'),
      onSuccess: function() { checkbox.up().removeClassName('busy') }.bind(checkbox)
    });
  },

  addMoreAddresses: function() {
    var i;
    for(i = 0; i < 5; i++) {
      var count = $$('tr.other_address').length;
      var text = Users.emailAddressTemplate.gsub(/123456789/, function(match) { return count; }).gsub(/123456790/, function(match) { return count+1 });
      $('other_addresses_tail').insert({before: text});
    }
  }
};
Form.validate = function(form) {
  var invalid = form.down('.invalid')
  if (invalid) {
    invalid.down('input').activate()
    return false
  } else {
    return true
  }
};
var ZoomCard = Class.create({
  initialize: function(element) {
    this.element = $(element);
  },

  show: function(event) {
    if (ZoomCard.zooming) return;
		ZoomCard.zooming = true;
    this.element.show();

    ZoomCard.content_div = this.element.down(".zoom_contact_details");
    ZoomCard.content_div.show();
    var width = ZoomCard.content_div.getWidth() + 80;
    var height = ZoomCard.content_div.getHeight() + 0;
    ZoomCard.content_div.hide();

    ZoomCard.close_button = this.element.down("#zoom_close");
    ZoomCard.close_button.hide();

    var viewport_width = window.innerWidth || (window.document.documentElement.clientWidth || window.document.body.clientWidth);
		var viewport_height = window.innerHeight || (window.document.documentElement.clientHeight || window.document.body.clientHeight);
    var viewport_y_offset = document.viewport.getScrollOffsets()[1];

    var zoom_link = event.findElement("#zoom_link")
    var zoom_me = zoom_link.up(".sidebox") || zoom_link.up(".header");
    var zoom_me_offset = zoom_me.cumulativeOffset();
    ZoomCard.zoom_me_width = zoom_me.getWidth() + 22;
    ZoomCard.zoom_me_height = zoom_me.getHeight() + 22;

    var startTop = zoom_me_offset.top;
    var startLeft = zoom_me_offset.left;
    var endLeft = (viewport_width / 2) - (width / 2);
    var endTop = Math.max((viewport_height / 2) - (height / 2) + viewport_y_offset, 0);

    ZoomCard.moveX = -(startLeft - endLeft);
		ZoomCard.moveY = -(startTop - endTop);

    this.element.setStyle({
      top: startTop + "px",
      left: startLeft + "px",
      width: ZoomCard.zoom_me_width + "px",
      height: ZoomCard.zoom_me_height + "px",
      opacity: 0
    });

    new Effect.Parallel([
      new Effect.Appear(this.element, {to: 1, sync: true}),
			new Effect.Move(this.element, {x: ZoomCard.moveX, y: ZoomCard.moveY, sync: true}),
			new Effect.Morph(this.element, {
			  style: {
			    width: width + "px",
			    height: height + "px"
			  },
			  sync: true,
			  afterFinish: function(effect) {
			    ZoomCard.content_div.show();
			    ZoomCard.close_button.show();
			    ZoomCard.zooming = false;
		    }
			})
		], { duration: 0.3 });
  },

  hide: function() {
    if (ZoomCard.zooming) return;
		ZoomCard.zooming = true;
    new Effect.Parallel([
      new Effect.Fade(this.element, {to: 0, sync: true}),
			new Effect.Move(this.element, {x: ZoomCard.moveX*-1, y: ZoomCard.moveY*-1, sync: true}),
			new Effect.Morph(this.element, {
			  style: {
			    width: ZoomCard.zoom_me_width + "px",
          height: ZoomCard.zoom_me_height + "px"
			  },
			  sync: true,
			  beforeStart: function(effect) {
			    ZoomCard.close_button.hide();
			    ZoomCard.content_div.hide();
		    },
			  afterFinish: function(effect) {
			    ZoomCard.zooming = false;
		    }
			})
		], { duration: 0.3 });
  }
});

document.observe("dom:loaded", function() {
  var element = $("zoom_card");
  if (!element) return;

  var zoomCard = new ZoomCard(element);

  document.observe("click", function(event, element) {
    if (element = event.findElement("#zoom_link")) {
      display = $("zoom_card").getStyle('display');
      if (display == 'block') {
        zoomCard.hide(element);
      } else {
        zoomCard.show(event);
      }
    }
  });

  document.observe("click", function(event, element) {
    if (element = event.findElement("#zoom_close")) {
      zoomCard.hide();
    }
  });

  $(document).observe('keyup', function(e) {
    var display = $("zoom_card").getStyle('display');
    if (e.keyCode == Event.KEY_ESC && display == 'block') {
      zoomCard.hide();
    }
  });

});
