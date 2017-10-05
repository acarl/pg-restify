var async = require('async');
var pgRestify = require('../lib/index');
var restify = require('restify');
var bunyan = require('bunyan');
var fs = require('fs');
var helper = require('./helper');
var helperForHooks = require('./helper-for-hooks');
var request = helper.request;

describe('POST method', function() {

  before(function(done) {

    helper.initDefaultServer(done);

  });

  it('should insert a new row', function(done){

    var row = {userName:'user3', message:'message text'};

    async.waterfall([
      function(next) {

        // post the new row

        request
        .post('/api/generic/user-alert-messages')
        .send(row)
        .expect(201, '', next);

      },
      function(res, next) {

        // validate the new row was inserted

        row.id = helper.getIdFromResponse(res);

        helper.validateValueWithGet('user-alert-messages', row, next);

      }
    ], done);

  });

  it('should not allow an insert with an invalid column', function(done){

    var rowCount;

    async.series([
      function(next) {

        // check row count before

        request
        .get('/api/generic/user-alert-messages')
        .end(function(err, res) {
          rowCount = res.body.length;
          next(err);
        });

      },
      function(next) {

        // try to post with an invalid column

        var row = {userName:'user3', message:'message text', badColumn:'bad value'};

        request
        .post('/api/generic/user-alert-messages')
        .send(row)
        .expect(400, '{"code":"BadRequest","message":"Invalid field \\"badColumn\\""}', next);

      },
      function(next) {

        // check count after to see if it's the same
        request
        .get('/api/generic/user-alert-messages')
        .end(function(err, res) {
          rowCount.should.eql(res.body.length);
          next(err);
        });

      }
    ], done);

  });

  it('should insert a new row with id specified', function(done){

    var row = {id:100, userName:'user', message:'message text'};

    async.waterfall([
      function(next) {

        // post the new row

        request
        .post('/api/generic/user-alert-messages')
        .send(row)
        .expect(201, '', next);

      },
      function(res, next) {

        // validate the new row was inserted

        helper.validateValueWithGet('user-alert-messages', row, next);

      }
    ], done);

  });

  it('should return https for location URL', function(done) {

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    var serverPort = 8083;

    var privateKey = fs.readFileSync(__dirname + '/ssl/privatekey.pem').toString();
    var certificate = fs.readFileSync(__dirname + '/ssl/certificate.pem').toString();

    var server = restify.createServer({
      log: bunyan.createLogger({
        name: 'restify-test-logger',
        level: 'error'
      }),
      key: privateKey,
      certificate: certificate
    });
    server.listen(serverPort);

    pgRestify.initialize({
      server:server,
      pgConfig:helper.pgConfig},
      postInit);

    function postInit(err, conf) {

      if (err) throw err;

      var fullServerPath = 'https://localhost:'+serverPort;
      var altRequest = require('supertest')(fullServerPath);
      var expectedLocationPrefix = fullServerPath+'/api/generic/user-alert-messages';

      var row = {userName:'user3', message:'message text'};

      async.waterfall([
        function(next) {

          // post the new row

          altRequest
          .post('/api/generic/user-alert-messages')
          .send(row)
          .expect(201, '', next);

        },
        function(res, next) {

          // validate the new row was inserted

          row.id = helper.getIdFromResponseWithLocation(expectedLocationPrefix, res);

          altRequest
          .get('/api/generic/user-alert-messages/' + row.id)
          .expect(200)
          .end(function(err, res) {
            res.body.should.eql(row);
            next(err);
          });

        }
      ], done);
    }

  });


  it('should run pre hook with success', function(done){

    helperForHooks.setupPreHookWithSuccessTest('post', 'put', function(validator) {

      var row = {userName:'user', message:'message text'};

      async.waterfall([
        function(next) {

          // insert a row

          request
          .post('/api/generic/replace-me-by-hook')
          .send(row)
          .expect(201, '')
          .end(next);

        },
        function(res, next) {

          // validate it was inserted

          row.id = helper.getIdFromResponseWithLocation(helper.fullServerPath + '/api/generic/replace-me-by-hook', res);

          helper.validateValueWithGet('user-alert-messages', row, function(err) {
            next(err, res);
          });

        },
        function(res, next) {

          // validate the res of the triggered api call

          validator(res, next);

        },

      ], done);

    });

  });

  it('should run pre hook with error',  function(done){

    helperForHooks.setupPreHookWithErrorTest('post', 'put', function(validator) {

      var row = {userName:'user', message:'message text'};
      var rowCount;

      async.waterfall([
        function(next) {

          // check row count before

          request
          .get('/api/generic/user-alert-messages')
          .end(function(err, res) {
            rowCount = res.body.length;
            next(err);
          });

        },
        function(next) {

          // insert a row

          request
          .post('/api/generic/replace-me-by-hook')
          .send(row)
          .end(function(err, res){
            next(null, res);
          });

        },
        function(passedResponse, next) {

          // check count after to see if it's the same
          request
          .get('/api/generic/user-alert-messages')
          .end(function(err, res) {
            rowCount.should.eql(res.body.length);
            next(err, passedResponse);
          });

        },
        function(res, next) {

          // validate the res of the triggered api call

          validator(res, next);

        },

      ], done);

    });

  });

  it('should run post hook with success', function(done) {

    helperForHooks.setupPostHookWithSuccessTest('post', 'put', function(validator) {

      var row = {userName:'user', message:'message text'};

      async.waterfall([
        function(next) {

          // insert a row

          request
          .post('/api/generic/user-alert-messages')
          .send(row)
          .end(next);

        },
        function(res, next) {

          // validate it was inserted

          row.id = helper.getIdFromResponse(res);

          helper.validateValueWithGet('user-alert-messages', row, function(err) {
            next(err, res);
          });

        },
        function(res, next) {

          // validate the res of the triggered api call

          validator(res, next);

        },

      ], done);

    });

  });

  it('should run post hook with error',  function(done) {

    helperForHooks.setupPostHookWithErrorTest('post', 'put', function(validator) {

      var row = {userName:'user', message:'message text'};
      var rowCount;

      async.waterfall([
        function(next) {

          // check row count before

          request
          .get('/api/generic/user-alert-messages')
          .end(function(err, res) {
            rowCount = res.body.length;
            next(err);
          });

        },
        function(next) {

          // insert a row

          request
          .post('/api/generic/user-alert-messages')
          .send(row)
          .end(function(err, res){
            next(null, res);
          });

        },
        function(passedResponse, next) {

          // check count after to see if it's the same
          request
          .get('/api/generic/user-alert-messages')
          .end(function(err, res) {
            rowCount.should.eql(res.body.length);
            next(err, passedResponse);
          });

        },
        function(res, next) {

          // validate the res of the triggered api call

          validator(res, next);

        },

      ], done);

    });

  });

  it('should should handle a database error',  function(done) {

    helperForHooks.setupDatabaseErrorTest('post', function(validator) {

      var row = {userName:'user', message:'message text'};

      async.waterfall([
        function(next) {

          // insert a row

          request
          .post('/api/generic/user-alert-messages')
          .send(row)
          .end(function(err, res){
            next(null, res);
          });

        },
        function(res, next) {

          // validate the res of the triggered api call

          validator(res, next);

        },

      ], done);

    });

  });


});
