var _ = require('underscore');
var path = require('path');
var EventEmitter = require('./event-emitter');
var when = require('when');
var nodefn = require('when/node');
var fs = require('fs');
var util = require('util');

function Config(project, config) {
  var self = this;

  var defaults = {
    outputDir: path.join(project.inputDir, '.lfa', 'build'),
    ignores: ['.DS_Store', 'node_modules', '/.lfa', '/lfa.json', '.*.sw*', '.git*'],
    target: 'default',
    compilers: ['jade', 'stylus', 'coffee-script'],
    extensions: {},
    npm_dependencies: {},
  };
  _.extend(self, defaults, config || {});

  self.parsedExtensions = [];
  self.initBasicExtensions();

  self.loaded = self.readConfig(project.inputDir)
    .then(self.updateNpm.bind(self));
}

util.inherits(Config, EventEmitter);

Config.prototype.readConfig = function(module) {
  var self = this;

  return nodefn.call(fs.readFile, path.join(module, 'lfa.json'))
    .then(function(json) {
      json = JSON.parse(json);

      if (json.compilers instanceof Array) {
        self.compilers.push.apply(self.compilers, json.compilers);
      }
      delete json.compilers;

      if (typeof(json.npm_dependencies) === 'object') {
        _.defaults(self.npm_dependencies, json.npm_dependencies);
      }
      delete json.npm_dependencies;

      var promises = [];

      if (typeof(json.extensions) instanceof Array) {
        _.each(json.extensions, function(ext) {
          promises.push(self.parseExtension(ext));
        });
      }
      delete json.extensions;

      promises.push(nodefn.call(fs.readdir, path.join(module, 'extensions'))
          .catch(function(err) {
            if (!((err instanceof Error) && err.code === 'ENOENT')) {
              throw err;
            }
            return [];
          })
          .then(function(files) {
            var prom = [];
            for (var i = 0, n = files.length; i < n; i++) {
              var file = files[i];
              if (file !== 'node_modules' && file.substr(0, 1) !== '.' ) {
                prom.push(self.parseExtension(path.join(module, 'extensions', file)));
              }
            }
            return when.all(prom);
          })
      );

      _.extend(self, json);
      return when.all(promises);
    });
};

Config.prototype.parseExtension = function(ext) {
  var self = this;
  function loadExtension(extPath) {
    return self.readConfig(extPath)
      .then(self.updateNpm.bind(self))
      .then(function() {
        self.parsedExtensions.push(require(extPath));
      });
  }

  function loadWithNpm(key, path) {
    console.log(key, path);
  }

  if (ext.match(/https?|git|ssh|:/)) {
    var r;
    var name = ext;
    if ((r = ext.match(/[\/:]([^\/:])^/))) {
      name = r[1];
      if ((r = name.match(/$(.*)\.git^/))) {
        name = r[1];
      }
    }  
    return loadWithNpm(name, path);
  }

  if (ext.indexOf(path.sep) !== -1) {
    return loadExtension(ext);
  }

  return when();
};

Config.prototype.updateNpm = function() {
  var self = this;
  console.log('Update npm: ', self.npm_dependencies);
};

Config.prototype.addExtension = function(ext) {
  this.parsedExtensions.push(ext);
};

Config.prototype.initBasicExtensions = function() {
  this.addExtension(require('./extensions/default-target'));
};

module.exports = Config;
