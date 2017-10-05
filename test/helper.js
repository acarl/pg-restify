var request = require('supertest');
var pgRestify = require('../lib/index');
var restify = require('restify');
var async = require('async');
var bunyan = require('bunyan');
var MemoryStream = require('memorystream');
var should = require('should');
var { Pool } = require('pg');


exports.serverPort = 8081;

exports.fullServerPath = 'http://localhost:' + exports.serverPort;

exports.request = request(exports.fullServerPath);


//TODO:parameterize the connection string and server port
exports.pgConfig = {
  connectionString: 'pg://postgres@localhost/pg_restify'
};
exports.invalidpgConfig = {
  connectionString: 'pg://postgres@localhost/pg_restify_invalid'
};

exports.pgRestifyInstance = null;

exports.logWriter = MemoryStream.createWriteStream();


exports.initDefaultServer = function(next) {

  if (exports.pgRestifyInstance) {
    // if already initialize just return the cached instance
    return next(null, exports.pgRestifyInstance);
  }

  var log = bunyan.createLogger({
    name: 'node-rest-api',
    stream: exports.logWriter,// comment out this line for errors to log to the console
    level: 'error'
  });

  var server = restify.createServer({log:log});

  // catch and wrap internal errors
  server.on('uncaughtException', function(req, res, route, err) {
    if (res._headerSent) {
      // If this response was already sent this could be any error.
      // Because domains are weird you could actually have test case
      // validation errors enter this method.
      // If this happens just throw the err.
      throw err;
    }
    log.error(err);
    res.send(new restify.InternalError('Internal error'));
  });

  exports.resetDatabase(function(err) {

    if (err) throw err;

    pgRestify.initialize({
      server:server,
      pgConfig:exports.pgConfig
    }, postInit);

    function postInit(err, conf) {

      if (err) throw err;

      exports.pgRestifyInstance = conf;

      server.listen(exports.serverPort);

      return next();

    }

  });

};

exports.resetDatabase = function(next) {

  var pool = new Pool(exports.pgConfig);

  pool.connect(function(err, client, done) {

    if (err) return next(err);

    async.series([
      function(next) {
        client.query('drop table if exists user_alert_messages;', [], next);
      },
      function(next) {
        client.query('drop table if exists user_alert_messages_for_hooks;', [], next);
      },
      function(next) {
        client.query(
          ' create table user_alert_messages ( ' +
          '   id serial primary key, ' +
          '   user_name text not null, ' +
          '   message text  ' +
          ' ); ',
        [], next);
      },
      function(next) {
        client.query(
          ' create table user_alert_messages_for_hooks ( ' +
          '   id serial primary key, ' +
          '   user_name text not null, ' +
          '   message text  ' +
          ' ); ',
        [], next);
      },
      function(next) {
        client.query(
          ' insert into user_alert_messages (user_name, message) ' +
          ' values ' +
          ' (\'b user\', \'message1\'), ' +
          ' (\'a user\', \'message2\'), ' +
          ' (\'c user\', \'message3\') ' +
          '; ',
        [], next);
      },
      function(next) {
        client.query('drop table if exists user_alert_messages_bad_id;', [], next);
      },
      function(next) {
        client.query(
          ' create table user_alert_messages_bad_id ( ' +
          '   id int, ' +
          '   user_name text not null, ' +
          '   message text  ' +
          ' ); ',
        [], next);
      },
      function(next) {
        client.query(
          ' insert into user_alert_messages_bad_id (id, user_name, message) ' +
          ' values ' +
          ' (1, \'user1\', \'message1\'), ' +
          ' (1, \'user2\', \'message2\') ' +
          '; ',
        [], next);
      },
    ],function(err) {

      done();

      return next(err);

    });

  });

};


exports.getIdFromResponseWithLocation = function(expectedLocationPrefix, res) {

  var location = res.headers.location;

  var idSplitIndex = location.lastIndexOf('/');

  var locationPrefix = location.substring(0,idSplitIndex);
  locationPrefix.should.eql(expectedLocationPrefix);

  var id = parseInt(location.substring(idSplitIndex+1));

  return id;

};

exports.expectedLocationPrefix = exports.fullServerPath + '/api/generic/user-alert-messages';

exports.getIdFromResponse = function(res) {
  return exports.getIdFromResponseWithLocation(exports.expectedLocationPrefix, res);
};

exports.validateValuesWithGet = function(path, expectedRows, next) {

  exports.request
  .get('/api/generic/' + path)
  .expect(200)
  .end(function(err, res) {
    res.body.should.eql(expectedRows);
    next(err);
  });

};

exports.validateValueWithGet = function(path, expectedRow, next) {

  exports.request
  .get('/api/generic/' + path + '/' + expectedRow.id)
  .expect(200)
  .end(function(err, res) {
    res.body.should.eql(expectedRow);
    next(err);
  });

};

exports.validateErrorLoggedContains = function(errorText) {

  exports.logWriter.toString().should.containEql(errorText);

  // clear out the current error so it doesn't affect the next
  exports.logWriter.queue = [];

};
