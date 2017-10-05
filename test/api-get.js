var helper = require('./helper');
var helperForHooks = require('./helper-for-hooks');
var request = helper.request;

describe('GET by id method', function() {

  before(function(done) {

    helper.initDefaultServer(done);

  });

  var expectedRow = {id:1, userName:'b user', message:'message1'};

  it('should get a record by id', function(done){

    helper.validateValueWithGet('user-alert-messages', expectedRow, done);

  });

  it('should return a 404 for an invalid id', function(done){

    request
    .get('/api/generic/user-alert-messages/999')
    .expect(404, '{"code":"ResourceNotFound","message":"Entry with id \\"999\\" not found for resource \\"user-alert-messages\\"."}', done);

  });

  it('should return a 404 for an invalid table', function(done){

    request
    .get('/api/generic/user-alert-messages2/999')
    .expect(404, '{"code":"ResourceNotFound","message":"Invalid resource \\"user-alert-messages2\\""}', done);

  });

  it('should error if multiple rows have the same id', function(done){

    request
    .get('/api/generic/user-alert-messages-bad-id/1')
    .expect(500, '{"code":"InternalServer","message":"Multiple rows returned for resource \\"user-alert-messages-bad-id and id \\"1\\"."}', done);

  });

  it('should run pre hook with success', function(done){

    helperForHooks.setupPreHookWithSuccessTest('get', 'delete', function(validator) {

      request
      .get('/api/generic/replace-me-by-hook/' + expectedRow.id)
      .expect(200)
      .end(function(err, res) {

        if (err) return done(err);

        res.body.should.eql(expectedRow);

        validator(res, done);

      });

    });

  });

  it('should run pre hook with error',  function(done){

    helperForHooks.setupPreHookWithErrorTest('get', 'delete', function(validator) {

      request
      .get('/api/generic/replace-me-by-hook/' + expectedRow.id)
      .end(function(err, res) {

        validator(res, done);

      });

    });

  });

  it('should run post hook with success', function(done) {

    helperForHooks.setupPostHookWithSuccessTest('get', 'delete', function(validator) {

      request
      .get('/api/generic/user-alert-messages/' + expectedRow.id)
      .end(function(err, res) {

        if (err) return done(err);

        validator(res, done);

      });

    });

  });

  it('should run post hook with error',  function(done) {

    helperForHooks.setupPostHookWithErrorTest('get', 'delete', function(validator) {

      request
      .get('/api/generic/user-alert-messages/' + expectedRow.id)
      .end(function(err, res) {

        validator(res, done);

      });

    });

  });

  it('should should handle a database error',  function(done) {

    helperForHooks.setupDatabaseErrorTest('get', function(validator) {

      request
      .get('/api/generic/user-alert-messages/' + expectedRow.id)
      .end(function(err, res) {

        validator(res, done);

      });

    });

  });

});
