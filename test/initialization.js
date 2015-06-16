var pgRestify = require('../lib/index');
var restify = require('restify');
var bunyan = require('bunyan');
var helper = require('./helper');
var request = helper.request;

describe('initialize method', function() {

  before(function(done) {

    helper.initDefaultServer(done);

  });


  it('should return an error for an invalid database', function(done) {

    var serverPort = 8082;

    var server = restify.createServer({
      log: bunyan.createLogger({
        name: 'restify-test-logger',
        level: 'error'
      })
    });
    server.listen(serverPort);

    pgRestify.initialize({
      server:server,
      pgConnectionString:helper.invalidPgConnectionString},
      postInit);

    function postInit(err, conf) {

      err.message.should.eql('database "pg_restify_invalid" does not exist');

      done();

    }

  });


  it('should handle an error if the connction fails after initialize', function(done){

    helper.pgRestifyInstance.pgConnectionString = helper.invalidPgConnectionString;

    request
    .get('/api/generic/user-alert-messages')
    .expect(500, '{"message":"Unexpected error"}', done);

  });

  //TODO: test other method overrides



});
