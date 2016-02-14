var pgRestify = require('../lib/index');
var restify = require('restify');
var pg = require('pg');
var bunyan = require('bunyan');
var helper = require('./helper');
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


  it('should handle an error if the connction fails after initialize', function(done){

    helper.pgRestifyInstance.pgConfig = helper.invalidpgConfig;

    request
    .get('/api/generic/user-alert-messages')
    .expect(500, '{"message":"Unexpected error"}', done);

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

    // drop the id column from the test table
    pg.connect(helper.pgConfig, function(err, client, pgDone) {

      if (err) throw err;

      client.query('alter table user_alert_messages drop column id;', [], function(err) {

        pgDone();

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

  });





  //TODO: test other method overrides



});
