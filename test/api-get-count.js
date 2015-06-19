var helper = require('./helper');
var helperForHooks = require('./helper-for-hooks');
var request = helper.request;

describe('GET count method', function() {

  before(function(done) {

    helper.initDefaultServer(done);

  });

  it('should get count of values', function(done){

    request
    .get('/api/generic/user-alert-messages/count')
    .expect(200)
    .end(function(err, res) {
      parseInt(res.body).should.eql(3);
      done(err);
    });

  });

  it('should return a 404 for an invalid table on count', function(done){

    request
    .get('/api/generic/user-alert-messages2/count')
    .expect(404, '{"code":"ResourceNotFound","message":"Invalid resource \\"user-alert-messages2\\""}', done);

  });

  it('should run pre hook with success', function(done){

    helperForHooks.setupPreHookWithSuccessTest('getCount', 'delete', function(validator) {

      request
      .get('/api/generic/replace-me-by-hook/count')
      .end(function(err, res) {

        if (err) return done(err);

        res.statusCode.should.eql(200);

        parseInt(res.body).should.eql(3);

        validator(res, done);

      });

    });

  });

  it('should run pre hook with error',  function(done){

    helperForHooks.setupPreHookWithErrorTest('getCount', 'delete', function(validator) {

      request
      .get('/api/generic/replace-me-by-hook/count')
      .end(function(err, res) {

        validator(res, done);

      });

    });

  });

  it('should run post hook with success', function(done) {

    helperForHooks.setupPostHookWithSuccessTest('getCount', 'delete', function(validator) {

      request
      .get('/api/generic/user-alert-messages/count')
      .end(function(err, res) {

        if (err) return done(err);

        validator(res, done);

      });

    });

  });

  it('should run post hook with error',  function(done) {

    helperForHooks.setupPostHookWithErrorTest('getCount', 'delete', function(validator) {

      request
      .get('/api/generic/user-alert-messages/count')
      .end(function(err, res) {

        validator(res, done);

      });

    });

  });

  it('should should handle a database error',  function(done) {

    helperForHooks.setupDatabaseErrorTest('getCount', function(validator) {

      request
      .get('/api/generic/user-alert-messages/count')
      .end(function(err, res) {

        validator(res, done);

      });

    });

  });

});
