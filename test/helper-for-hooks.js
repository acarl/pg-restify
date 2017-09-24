var pgRestify = require('../lib/index');
var helper = require('./helper');
var request = helper.request;
var restify = require('restify');
var restifyErrors = require('restify-errors');
var async = require('async');
var should = require('should');
var sql = require('sql-bricks-postgres');

exports.setupPreHookWithSuccessTest = function(eventName, notEventName, next) {

  var insertedRow = {userName:'inserted user', message:'inserted message'};
  var dataToInsert = helper.pgRestifyInstance.convertFieldsToColumns(insertedRow);

  // create a new hooks property for the server
  var hooks = new pgRestify.Hooks();
  helper.pgRestifyInstance.hooks = hooks;

  // triggered
  hooks.addPreHookForAllResources(eventName, function(req, res, dbClient, next) {

    // validate req handling
    if (req.params.resource === 'replace-me-by-hook') {
      req.params.resource = 'user-alert-messages';
      req.params.userId = 123;
    }

    // validate res handling
    res.header('hook1', 'true');

    // validate dbClient handling
    insertUserAlertMessageForHooks(dbClient, dataToInsert, function(err, id) {
      if (err) return next(err);
      insertedRow.id = id;
      return next();
    });

  });
  hooks.addPreHookForResource(eventName, 'replace-me-by-hook', function(req, res, dbClient, next) {

    // validate that the changes are passed in from the previous hook
    if (req.params.resource === 'user-alert-messages' &&
        req.params.userId === 123 &&

        res.getHeader('hook1') === 'true') {

      getUserAlertMessageForHooks(dbClient, insertedRow.id, function(err, row) {
        if (err) return next(err);

        if (row.user_name === 'inserted user') {

          res.header('hook2', 'true');

        }

        return next();
      });

    } else {
      return next();
    }

  });

  // not triggered
  hooks.addPreHookForAllResources(notEventName, function(req, res, dbClient, next) {

    return next(new Error('should not be called'));

  });
  hooks.addPreHookForResource(eventName, 'not-replace-me-by-hook', function(req, res, dbClient, next) {

    return next(new Error('should not be called'));

  });


  // tested req by changing resource name
  // tested res by adding headers
  // tested db by adding additional row

  var validatePassingTest = function(res, done) {

    res.header.hook1.should.eql('true');
    res.header.hook2.should.eql('true');

    // validate that database insert was comitted
    getUserAlertMessageForHooksCount(function(err, count) {

      if (err) throw err;

      count.should.eql('1');

      return resetData(done);

    });

  };

  // before continuing, validate that the initial row count is accurate
  getUserAlertMessageForHooksCount(function(err, count) {

    if (err) throw err;

    count.should.eql('0');

    return next(validatePassingTest);

  });

};

exports.setupPreHookWithErrorTest = function(eventName, notEventName, next) {

  var insertedRow = {userName:'inserted user', message:'inserted message'};
  var dataToInsert = helper.pgRestifyInstance.convertFieldsToColumns(insertedRow);

  // create a new hooks property for the server
  var hooks = new pgRestify.Hooks();
  helper.pgRestifyInstance.hooks = hooks;

  // triggered
  hooks.addPreHookForAllResources(eventName, function(req, res, dbClient, next){

    // validate req handling
    if (req.params.resource === 'replace-me-by-hook') {
      req.params.resource = 'user-alert-messages';
      req.params.userId = 123;
    }

    // validate res handling
    res.header('hook1', 'true');

    // validate dbClient handling (this should be rolled back due to error)
    insertUserAlertMessageForHooks(dbClient, dataToInsert, function(err, id) {
      if (err) return next(err);
      insertedRow.id = id;
      return next();
    });

  });
  hooks.addPreHookForResource(eventName, 'replace-me-by-hook', function(req, res, dbClient, next){

    // validate that the changes are passed in from the previous hook
    if (req.params.resource === 'user-alert-messages' &&
        req.params.userId === 123 &&
        res.getHeader('hook1') === 'true') {

      getUserAlertMessageForHooks(dbClient, insertedRow.id, function(err, row) {
        if (err) return next(err);

        if (row.user_name === 'inserted user') {

          res.header('hook2', 'true');

          // simulate user not authorized and return a generic 404 (safer than 401)
          return next(new restifyErrors.ResourceNotFoundError());
        }

        return next();

      });

    } else {
      return next();
    }

  });

  // not triggered
  hooks.addPreHookForAllResources(notEventName, function(req, res, dbClient, next){

    return next(new Error('should not be called'));

  });
  hooks.addPreHookForResource(eventName, 'not-replace-me-by-hook', function(req, res, dbClient, next){

    return next(new Error('should not be called'));

  });


  // tested req by changing resource name
  // tested res by adding headers
  // tested db by not adding additional row

  var validatePassingTest = function(res, done) {

    // validate response
    res.statusCode.should.eql(404);
    res.header.hook1.should.eql('true');
    res.header.hook2.should.eql('true');
    res.body.should.eql({ code: 'ResourceNotFound', message: '' });

    // validate that database insert was rolled back and count is still 3
    getUserAlertMessageForHooksCount(function(err, count) {

      if (err) throw err;

      count.should.eql('0');

      return resetData(done);

    });


  };

  // before continuing, validate that the initial row count is accurate
  getUserAlertMessageForHooksCount(function(err, count) {

    if (err) throw err;

    count.should.eql('0');

    return next(validatePassingTest);

  });

};

exports.setupPostHookWithSuccessTest = function(eventName, notEventName, next) {

  var insertedRow = {userName:'inserted user', message:'inserted message'};
  var dataToInsert = helper.pgRestifyInstance.convertFieldsToColumns(insertedRow);

  var postHookAlteredData = {message: 'replaced response'};

  // create a new hooks property for the server
  var hooks = new pgRestify.Hooks();
  helper.pgRestifyInstance.hooks = hooks;

  // triggered
  hooks.addPostHookForAllResources(eventName, function(req, res, dbClient, next){

    // add a req property (maybe used by downstream post hooks?)
    req.params.userId = 123;

    // validate res handling
    res.header('hook1', 'true');

    // validate dbClient handling
    insertUserAlertMessageForHooks(dbClient, dataToInsert, function(err, id) {
      if (err) return next(err);
      insertedRow.id = id;
      return next();
    });

  });
  hooks.addPostHookForResource(eventName, 'user-alert-messages', function(req, res, dbClient, next){

    // validate that the changes are passed in from the previous hook
    if (req.params.userId === 123 &&
        res.getHeader('hook1') === 'true') {

      getUserAlertMessageForHooks(dbClient, insertedRow.id, function(err, row) {
        if (err) return next(err);

        if (row.user_name === 'inserted user') {

          res.header('hook2', 'true');

          res.statusCode = 200;

          // replace the body to verify you can overwrite it
          res.pgRestifyResponseBody = postHookAlteredData;

        }

        return next();
      });

    } else {
      return next();
    }

  });

  // not triggered
  hooks.addPostHookForAllResources(notEventName, function(req, res, dbClient, next){

    return next(new Error('should not be called'));

  });
  hooks.addPostHookForResource(eventName, 'invalid-user-alert-messages', function(req, res, dbClient, next){

    return next(new Error('should not be called'));

  });

  // tested req by altering params
  // tested res by adding headers
  // tested db by adding additional row
  // tested res modification by changing results

  var validatePassingTest = function(res, done) {

    // validate response
    res.statusCode.should.eql(200);
    res.header.hook1.should.eql('true');
    res.header.hook2.should.eql('true');
    res.body.should.eql(postHookAlteredData);

    // verify that the insert happened by querying the increased count
    getUserAlertMessageForHooksCount(function(err, count) {

      if (err) throw err;

      count.should.eql('1');

      return resetData(done);

    });


  };

  // before continuing, validate that the initial row count is accurate
  getUserAlertMessageForHooksCount(function(err, count) {

    if (err) throw err;

    count.should.eql('0');

    return next(validatePassingTest);

  });


};

exports.setupPostHookWithErrorTest = function(eventName, notEventName, next) {

  var insertedRow = {userName:'inserted user', message:'inserted message'};
  var dataToInsert = helper.pgRestifyInstance.convertFieldsToColumns(insertedRow);

  // create a new hooks property for the server
  var hooks = new pgRestify.Hooks();
  helper.pgRestifyInstance.hooks = hooks;

  // triggered
  hooks.addPostHookForAllResources(eventName, function(req, res, dbClient, next){

    // add a req property (maybe used by downstream post hooks?)
    req.params.userId = 123;

    // validate res handling
    res.header('hook1', 'true');

    // validate dbClient handling
    insertUserAlertMessageForHooks(dbClient, dataToInsert, function(err, id) {
      if (err) return next(err);
      insertedRow.id = id;
      return next();
    });

  });
  hooks.addPostHookForResource(eventName, 'user-alert-messages', function(req, res, dbClient, next){

    // validate that the changes are passed in from the previous hook
    if (req.params.userId === 123 &&
        res.getHeader('hook1') === 'true') {

      getUserAlertMessageForHooks(dbClient, insertedRow.id, function(err, row) {
        if (err) return next(err);

        if (row.user_name === 'inserted user') {

          res.header('hook2', 'true');

          // now for some reason we determine the user shouldn't have access
          return next(new restifyErrors.ResourceNotFoundError());

        }

        return next();
      });

    } else {
      return next();
    }

  });

  // not triggered
  hooks.addPostHookForAllResources(notEventName, function(req, res, dbClient, next){

    return next(new Error('should not be called'));

  });
  hooks.addPostHookForResource(eventName, 'invalid-user-alert-messages', function(req, res, dbClient, next){

    return next(new Error('should not be called'));

  });

  // tested req by altering params
  // tested res by adding headers
  // tested db by adding additional row (should be rolled back)
  // tested error by returning 404

  var validatePassingTest = function(res, done) {

    // validate response
    res.statusCode.should.eql(404);
    res.header.hook1.should.eql('true');
    res.header.hook2.should.eql('true');
    res.body.should.eql({ code: 'ResourceNotFound', message: '' });

    // verify that the insert was rolled back
    getUserAlertMessageForHooksCount(function(err, count) {

      if (err) throw err;

      count.should.eql('0');

      return resetData(done);

    });


  };

  // before continuing, validate that the initial row count is accurate
  getUserAlertMessageForHooksCount(function(err, count) {

    if (err) throw err;

    count.should.eql('0');

    return next(validatePassingTest);

  });

};

exports.setupDatabaseErrorTest = function(eventName, next) {

  // create a new hooks property for the server
  var hooks = new pgRestify.Hooks();
  helper.pgRestifyInstance.hooks = hooks;

  hooks.addPreHookForAllResources(eventName, function(req, res, dbClient, next){

    // return next();
    return dbClient.query('set local search_path to not_public;', [], next);

  });

  var validatePassingTest = function(res, done) {

    // validate response
    res.statusCode.should.eql(500);

    helper.validateErrorLoggedContains('error: relation \\"user_alert_messages\\" does not exist');

    // reset hooks to original
    helper.pgRestifyInstance.hooks = new pgRestify.Hooks();

    return done();
  };

  return next(validatePassingTest);

};

/* Cleans up the database for the next test case */
function resetData(next) {
  helper.pgRestifyInstance.hooks = new pgRestify.Hooks();

  helper.pgRestifyInstance.pool.connect(function(err, client, done) {

    if (err) return next(err);

    client.query('delete from user_alert_messages_for_hooks;', [], function(err) {
      done();
      next(err);
    });

  });

}

function insertUserAlertMessageForHooks(dbClient, row, next) {

  var query = sql
              .insert('user_alert_messages_for_hooks', row)
              .returning('id')
              .toParams();

  dbClient.query(query.text, query.values, function(err, result) {

    if (err) return next(err);

    return next(null, result.rows[0].id);

  });

}

function getUserAlertMessageForHooks(dbClient, id, next) {

  var query = sql
              .select()
              .from('user_alert_messages_for_hooks')
              .where('id', id)
              .toParams();

  dbClient.query(query.text, query.values, function(err, result) {

    if (err) return next(err);

    return next(null, result.rows[0]);

  });

}

function getUserAlertMessageForHooksCount(next) {

  helper.pgRestifyInstance.pool.connect(function(err, client, done) {

    if (err) return next(err);

    var query = sql
                .select('count(*)')
                .from('user_alert_messages_for_hooks')
                .toString();

    client.query(query, function(err, result) {

      done();

      if (err) return next(err);

      return next(null, result.rows[0].count);

    });

  });

}
