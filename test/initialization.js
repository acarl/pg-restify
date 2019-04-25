var pgRestify = require('../lib/index');
var restify = require('restify');
var { Client } = require('pg');
var bunyan = require('bunyan');
var helper = require('./helper');
var async = require('async');
var request = helper.request;

describe('initialize method', function() {

  before(function(done) {

    helper.initDefaultServer(done);

  });

  it('should return an error for an invalid database', function(done) {

    var server = restify.createServer({
      log: bunyan.createLogger({
        name: 'restify-test-logger',
        level: 'error'
      })
    });

    pgRestify.initialize({
      server:server,
      pgConfig:helper.invalidpgConfig},
      postInit);

    function postInit(err, conf) {

      err.message.should.eql('database "pg_restify_invalid" does not exist');

      done();

    }

  });

  it('should return an error for an invalid tableIdColumns value', function(done) {

    var server = restify.createServer({
      log: bunyan.createLogger({
        name: 'restify-test-logger',
        level: 'error'
      })
    });

    pgRestify.initialize({
      server:server,
      pgConfig:helper.pgConfig,
      tableIdColumns:{'user_alert_messages':'bad_id_column'}
    },
    postInit);

    function postInit(err, conf) {

      err.message.should.eql('Id column of \'bad_id_column\'' +
                             ' does not exist for table \'user_alert_messages\'.' +
                             ' Check tableIdColumns configuration value.');

      done();

    }

  });


  it('should return an error if the table has no id column', function(done) {

    var client = new Client(helper.pgConfig);
    client.connect();

    // drop the id column from the test table

    client.query('alter table user_alert_messages drop column id;', [], function(err) {

      client.end();

      if (err) throw err;

      var server = restify.createServer({
        log: bunyan.createLogger({
          name: 'restify-test-logger',
          level: 'error'
        })
      });

      pgRestify.initialize({
        server:server,
        pgConfig:helper.pgConfig
      },
      postInit);

      function postInit(err, conf) {

        err.message.should.eql('Id column of \'id\'' +
                               ' does not exist for table \'user_alert_messages\'.' +
                               ' Check tableIdColumns configuration value.');

        done();

      }

    });
  });


  it('should ignore a table if in ignoredTableNames', function(done) {

    var client = new Client(helper.pgConfig);
    client.connect();

    // drop the id column from the test table

    async.series([
      function (next) {
        client.query('alter table user_alert_messages_bad_id drop column if exists id;', [], next);
      },
      function (next) {
        client.query('alter table user_alert_messages drop column if exists id;', [], next);
      }
    ], function(err) {

      client.end();

      if (err) throw err;

      var server = restify.createServer({
        log: bunyan.createLogger({
          name: 'restify-test-logger',
          level: 'error'
        })
      });

      pgRestify.initialize({
          server:server,
          pgConfig:helper.pgConfig,
          ignoredTableNames: ['user_alert_messages', 'user_alert_messages_bad_id']
        },
        postInit);

      function postInit(err, conf) {

        should(err).be.undefined();

        done();

      }

    });

  });



  //TODO: test other method overrides



});
