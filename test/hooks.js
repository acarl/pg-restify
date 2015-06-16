var pgRestify = require('../lib/index');
var should = require('should');
var async = require('async');

describe('hooks', function() {

  it('should validate the event argument', function(done){

    var hooks = new pgRestify.Hooks();

    // validate that the right event names work

    hooks.events.forEach(function(event) {

      hooks.addPreHookForAllResources(event, function(){});
      hooks.addPostHookForAllResources(event, function(){});

      hooks.addPreHookForResource(event, 'resource', function(){});
      hooks.addPostHookForResource(event, 'resource', function(){});

    });

    // validate that bad values throw an error

    (function() {
      hooks.addPreHookForAllResources('bad', function(){});
    }).should.throw('invalid event value "bad"');

    (function() {
      hooks.addPostHookForAllResources('bad', function(){});
    }).should.throw('invalid event value "bad"');

    (function() {
      hooks.addPreHookForResource('bad', 'resource', function(){});
    }).should.throw('invalid event value "bad"');

    (function() {
      hooks.addPostHookForResource('bad', 'resource', function(){});
    }).should.throw('invalid event value "bad"');


    done();

  });

  it('should run hooks for all resources', function(done){

    var hooks = new pgRestify.Hooks();

    hooks.addPreHookForAllResources('get', function preHook1(req, res, dbClient, next) {
      req.preHook1 = true;
      dbClient.value = 1;
      next(null);
    });
    hooks.addPreHookForAllResources('get', function preHook2(req, res, dbClient, next) {
      res.preHook2 = true;
      dbClient.value = 2;
      next(null);
    });
    hooks.addPreHookForAllResources('post', function notRunPreHook(req, res, dbClient, next) {
      res.preHook2 = false;
      dbClient.value = 2;
      next(null);
    });

    hooks.addPostHookForAllResources('get', function postHook1(req, res, dbClient, next) {
      req.postHook1 = 'test';
      res.postHook2 = 12;
      next(null);
    });
    hooks.addPostHookForAllResources('get', function postHook2(req, res, dbClient, next) {
      res.postHook2 = 123;
      dbClient.value = 3;
      next(null);
    });
    hooks.addPostHookForAllResources('put', function notRunPostHook(req, res, dbClient, next) {
      res.postHook2 = 1234;
      dbClient.value = 3;
      next(null);
    });


    var req = {};
    var res = {};
    var dbClient = {};

    async.series([

      function(next) {
        hooks.runPreHooks('get', '', req, res, dbClient, function(err) {

          req.preHook1.should.eql(true);
          res.preHook2.should.eql(true);
          (typeof req.postHook1).should.eql('undefined');
          (typeof res.postHook2).should.eql('undefined');
          dbClient.value.should.eql(2);

          next();

        });
      },

      function(next) {
        hooks.runPostHooks('get', '', req, res, dbClient, function(err) {

          req.preHook1.should.eql(true);
          res.preHook2.should.eql(true);
          req.postHook1.should.eql('test');
          res.postHook2.should.eql(123);
          dbClient.value.should.eql(3);

          next();

        });
      },

    ], done);

  });

  it('should run hooks for a specific resource', function(done){

    var hooks = new pgRestify.Hooks();

    hooks.addPreHookForResource('get', 'foos', function preHook1(req, res, dbClient, next) {
      req.preHook1 = true;
      dbClient.value = 1;
      next(null);
    });
    hooks.addPreHookForResource('get', 'foos', function preHook2(req, res, dbClient, next) {
      res.preHook2 = true;
      dbClient.value = 2;
      next(null);
    });
    hooks.addPreHookForResource('get', 'bars', function notRunPreHook(req, res, dbClient, next) {
      res.preHook2 = false;
      dbClient.value = 3;
      next(null);
    });

    hooks.addPostHookForResource('get', 'foos', function postHook1(req, res, dbClient, next) {
      req.postHook1 = true;
      dbClient.value++; // 3
      next(null);
    });
    hooks.addPostHookForResource('get', 'foos', function postHook2(req, res, dbClient, next) {
      res.postHook2 = true;
      dbClient.value = dbClient.value + 2; // 5
      next(null);
    });
    hooks.addPostHookForResource('get', 'bars', function notRunPreHook(req, res, dbClient, next) {
      res.preHook2 = false;
      dbClient.value = dbClient.value++; // 6
      next(null);
    });


    var req = {};
    var res = {};
    var dbClient = {};

    async.series([

      function(next) {
        hooks.runPreHooks('get', 'foos', req, res, dbClient, function(err) {

          req.preHook1.should.eql(true);
          res.preHook2.should.eql(true);
          (typeof req.postHook1).should.eql('undefined');
          (typeof res.postHook2).should.eql('undefined');
          dbClient.value.should.eql(2);

          next();

        });
      },

      function(next) {
        hooks.runPostHooks('get', 'foos', req, res, dbClient, function(err) {

          req.preHook1.should.eql(true);
          res.preHook2.should.eql(true);
          req.postHook1.should.eql(true);
          res.postHook2.should.eql(true);
          dbClient.value.should.eql(5);

          next();

        });
      },

    ], done);

  });

  it('should run hooks for all and specific resource', function(done) {

    var hooks = new pgRestify.Hooks();

    hooks.addPreHookForAllResources('get', function preHook1(req, res, dbClient, next) {
      req.preHook1 = true;
      dbClient.value = 1;
      next(null);
    });
    hooks.addPreHookForResource('get', 'foos', function preHook2(req, res, dbClient, next) {
      res.preHook2 = true;
      dbClient.value = 2;
      next(null);
    });
    hooks.addPreHookForResource('get', 'bars', function notRunPreHook(req, res, dbClient, next) {
      res.preHook2 = false;
      dbClient.value = 3;
      next(null);
    });

    //the all resources should be run first even if defined second
    hooks.addPostHookForResource('get', 'foos', function postHook2(req, res, dbClient, next) {
      res.postHook2 = true;
      req.postHook1.should.eql(true);
      dbClient.value.should.eql(3);//this value should already be set by postHook1
      dbClient.value++;//4
      next(null);
    });
    hooks.addPostHookForAllResources('get', function postHook1(req, res, dbClient, next) {
      req.postHook1 = true;
      dbClient.value++;//3
      next(null);
    });
    hooks.addPostHookForResource('get', 'bars', function notRunPostHook(req, res, dbClient, next) {
      res.postHook2 = false;
      dbClient.value = 1;
      next(null);
    });


    var req = {};
    var res = {};
    var dbClient = {};

    async.series([

      function(next) {
        hooks.runPreHooks('get', 'foos', req, res, dbClient, function(err) {

          req.preHook1.should.eql(true);
          res.preHook2.should.eql(true);
          (typeof req.postHook1).should.eql('undefined');
          (typeof res.postHook2).should.eql('undefined');
          dbClient.value.should.eql(2);

          next();

        });
      },

      function(next) {
        hooks.runPostHooks('get', 'foos', req, res, dbClient, function(err) {

          req.preHook1.should.eql(true);
          res.preHook2.should.eql(true);
          req.postHook1.should.eql(true);
          res.postHook2.should.eql(true);
          dbClient.value.should.eql(4);

          next();

        });
      },

    ], done);

  });

  it('should run pre hooks until an error', function(done) {

    var hooks = new pgRestify.Hooks();

    hooks.addPreHookForAllResources('get', function preHook1(req, res, dbClient, next) {
      req.preHook1 = true;
      dbClient.value = 1;
      next(null);
    });
    hooks.addPreHookForAllResources('get', function preHook2(req, res, dbClient, next) {
      res.preHook2 = true;
      dbClient.value = 2;
      next(new Error('pre hook error'));
    });
    // this third hook isn't run because an error occurs
    hooks.addPreHookForAllResources('get', function notRunPreHook(req, res, dbClient, next) {
      res.preHook2 = false;
      dbClient.value = 0;
      next(null);
    });

    hooks.addPostHookForAllResources('get', function postHook1(req, res, dbClient, next) {
      req.postHook1 = 'test';
      res.postHook2 = 12;
      next(null);
    });
    hooks.addPostHookForAllResources('get', function postHook2(req, res, dbClient, next) {
      res.postHook2 = 123;
      dbClient.value = 3;
      next(new Error('post hook error'));
    });
    // this third hook isn't run because an error occurs
    hooks.addPostHookForAllResources('get', function notRunPostHook(req, res, dbClient, next) {
      res.postHook2 = false;
      dbClient.value = 0;
      next(null);
    });


    var req = {};
    var res = {};
    var dbClient = {};

    async.series([

      function(next) {
        hooks.runPreHooks('get', '', req, res, dbClient, function(err) {

          err.message.should.eql('pre hook error');

          req.preHook1.should.eql(true);
          res.preHook2.should.eql(true);
          (typeof req.postHook1).should.eql('undefined');
          (typeof res.postHook2).should.eql('undefined');
          dbClient.value.should.eql(2);

          next();

        });
      },

      function(next) {
        hooks.runPostHooks('get', '', req, res, dbClient, function(err) {

          err.message.should.eql('post hook error');

          req.preHook1.should.eql(true);
          res.preHook2.should.eql(true);
          req.postHook1.should.eql('test');
          res.postHook2.should.eql(123);
          dbClient.value.should.eql(3);

          next();

        });
      },

    ], done);

  });

});
