var async = require('async');
var assert = require('assert');

module.exports = Hooks;

function Hooks() {

  this.preHooksForAllResources = {};
  this.postHooksForAllResources = {};

  this.preHooksByResource = {};
  this.postHooksByResource = {};

  var self = this;
  this.events.forEach(function(event) {
    self.preHooksForAllResources[event] = [];
    self.postHooksForAllResources[event] = [];

    self.preHooksByResource[event] = {};
    self.postHooksByResource[event] = {};
  });

}

Hooks.prototype.events = [
  'get',
  'getList',
  'getCount',
  'post',
  'put',
  'delete'
];


Hooks.prototype.addPreHookForAllResources = function(event, hookFunction) {

  validateEventArg(event);

  this.preHooksForAllResources[event].push(hookFunction);


};

Hooks.prototype.addPostHookForAllResources = function(event, hookFunction) {

  validateEventArg(event);

  this.postHooksForAllResources[event].push(hookFunction);

};

Hooks.prototype.addPreHookForResource = function(event, resource, hookFunction) {

  validateEventArg(event);

  if (!this.preHooksByResource[event][resource]) {
    this.preHooksByResource[event][resource] = [];
  }

  this.preHooksByResource[event][resource].push(hookFunction);

};

Hooks.prototype.addPostHookForResource = function(event, resource, hookFunction) {

  validateEventArg(event);

  if (!this.postHooksByResource[event][resource]) {
    this.postHooksByResource[event][resource] = [];
  }

  this.postHooksByResource[event][resource].push(hookFunction);

};

function validateEventArg(event) {
  assert(Hooks.prototype.events.indexOf(event) !== -1 , 'invalid event value "' + event + '"');
}

Hooks.prototype.runPreHooks = function(event, resource, req, res, dbClient, next) {

  var self = this;

  async.series([

    function(next) {
      callHooks(self.preHooksForAllResources[event], req, res, dbClient, next);
    },

    function(next) {
      if (self.preHooksByResource[event][resource]) {
        callHooks(self.preHooksByResource[event][resource], req, res, dbClient, next);
      } else {
        next();
      }
    },

  ], function(err) {
    next(err);
  });

};

Hooks.prototype.runPostHooks = function(event, resource, req, res, dbClient, next) {

  var self = this;

  async.series([

    function(next) {
      callHooks(self.postHooksForAllResources[event], req, res, dbClient, next);
    },

    function(next) {
      if (self.postHooksByResource[event][resource]) {
        callHooks(self.postHooksByResource[event][resource], req, res, dbClient, next);
      } else {
        next();
      }
    },

  ], function(err) {
    next(err);
  });

};


function callHooks(hooks, req, res, dbClient, next) {

  var i = -1;
  var lastIndex = hooks.length;

  callHook(null);

  function callHook(err) {

    if (err) {
      return next(err);
    }

    i++;

    if (i === lastIndex) {
      return next(null);
    }

    hooks[i].call(null, req, res, dbClient, callHook);

  }

}
