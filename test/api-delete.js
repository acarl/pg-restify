var async = require('async');
var helper = require('./helper');
var helperForHooks = require('./helper-for-hooks');
var request = helper.request;

describe('DELETE method', function() {

  before(function(done) {

    helper.initDefaultServer(done);

  });

  after(function(done) {

    helper.resetDatabase(done);

  });

  it('should delete a row', function(done){

    var row = {userName:'user', message:'message text'};

    async.waterfall([
      function(next) {

        // insert a row

        request
        .post('/api/generic/user-alert-messages')
        .send(row)
        .expect(201, '')
        .end(next);

      },
      function(res, next) {

        // validate it was inserted

        row.id = helper.getIdFromResponse(res);

        helper.validateValueWithGet('user-alert-messages', row, next);

      },
      function(next) {

        // delete the row

        request
        .del('/api/generic/user-alert-messages/' + row.id)
        .expect(200, '', next);

      },
      function(res, next) {

        // validate that it was deleted
        request
        .get('/api/generic/user-alert-messages/' + row.id)
        .expect(404, '{"code":"ResourceNotFound","message":"Entry with id \\"' + row.id + '\\" not found for resource \\"user-alert-messages\\"."}', next);

      }
    ], done);

  });

  it('return 404 for an invalid id', function(done){

    var row = {userName:'user', message:'message text'};

    request
    .del('/api/generic/user-alert-messages/999')
    .expect(404, '{"code":"ResourceNotFound","message":"Entry with id \\"999\\" not found for resource \\"user-alert-messages\\"."}', done);

  });

  it('should return a 404 for an invalid table', function(done){

    request
    .del('/api/generic/user-alert-messages2/999')
    .expect(404, '{"code":"ResourceNotFound","message":"Invalid resource \\"user-alert-messages2\\""}', done);

  });

  it('should run pre hook with success', function(done){

    helperForHooks.setupPreHookWithSuccessTest('delete', 'put', function(validator) {

      var row = {userName:'user', message:'message text'};

      async.waterfall([
        function(next) {

          // insert a row

          request
          .post('/api/generic/user-alert-messages')
          .send(row)
          .expect(201, '')
          .end(next);

        },
        function(res, next) {

          // validate it was inserted

          row.id = helper.getIdFromResponse(res);

          helper.validateValueWithGet('user-alert-messages', row, next);

        },
        function(next) {

          // delete the row

          request
          .del('/api/generic/replace-me-by-hook/' + row.id)
          .end(next);

        },
        function(res, next) {

          // validate that the delete worked
          request
          .get('/api/generic/user-alert-messages/' + row.id)
          .expect(404, '{"code":"ResourceNotFound","message":"Entry with id \\"' + row.id + '\\" not found for resource \\"user-alert-messages\\"."}',
          function(err) {

            return next(err, res);

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

    helperForHooks.setupPreHookWithErrorTest('delete', 'put', function(validator) {

      var row = {userName:'user', message:'message text'};

      async.waterfall([
        function(next) {

          // insert a row

          request
          .post('/api/generic/user-alert-messages')
          .send(row)
          .expect(201, '')
          .end(next);

        },
        function(res, next) {

          // validate it was inserted

          row.id = helper.getIdFromResponse(res);

          helper.validateValueWithGet('user-alert-messages', row, next);

        },
        function(next) {

          // delete the row

          request
          .del('/api/generic/replace-me-by-hook/' + row.id)
          .end(function(err, res) {
            next(null, res);
          });

        },
        function(res, next) {

          // validate that the delete did not happen

          helper.validateValueWithGet('user-alert-messages', row,
          function(err) {

            return next(err, res);

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

    helperForHooks.setupPostHookWithSuccessTest('delete', 'put', function(validator) {

      var row = {userName:'user', message:'message text'};

      async.waterfall([
        function(next) {

          // insert a row

          request
          .post('/api/generic/user-alert-messages')
          .send(row)
          .expect(201, '')
          .end(next);

        },
        function(res, next) {

          // validate it was inserted

          row.id = helper.getIdFromResponse(res);

          helper.validateValueWithGet('user-alert-messages', row, next);

        },
        function(next) {

          // delete the row

          request
          .del('/api/generic/user-alert-messages/' + row.id)
          .end(next);

        },
        function(res, next) {

          // validate that the delete worked
          request
          .get('/api/generic/user-alert-messages/' + row.id)
          .expect(404, '{"code":"ResourceNotFound","message":"Entry with id \\"' + row.id + '\\" not found for resource \\"user-alert-messages\\"."}',
          function(err) {

            return next(err, res);

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

    helperForHooks.setupPostHookWithErrorTest('delete', 'put', function(validator) {

      var row = {userName:'user', message:'message text'};

      async.waterfall([
        function(next) {

          // insert a row

          request
          .post('/api/generic/user-alert-messages')
          .send(row)
          .expect(201, '')
          .end(next);

        },
        function(res, next) {

          // validate it was inserted

          row.id = helper.getIdFromResponse(res);

          helper.validateValueWithGet('user-alert-messages', row, next);

        },
        function(next) {

          // delete the row

          request
          .del('/api/generic/user-alert-messages/' + row.id)
          .end(function(err, res) {
            next(null, res);
          });

        },
        function(res, next) {

          // validate the delete didn't happen

          helper.validateValueWithGet('user-alert-messages', row,
          function(err) {
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

  it('should should handle a database error',  function(done) {

    helperForHooks.setupDatabaseErrorTest('delete', function(validator) {

      var row = {userName:'user', message:'message text'};

      async.waterfall([
        function(next) {

          // insert a row

          request
          .post('/api/generic/user-alert-messages')
          .send(row)
          .expect(201, '')
          .end(next);

        },
        function(res, next) {

          // validate it was inserted

          row.id = helper.getIdFromResponse(res);

          helper.validateValueWithGet('user-alert-messages', row, next);

        },
        function(next) {

          // delete the row

          request
          .del('/api/generic/user-alert-messages/' + row.id)
          .end(function(err, res) {
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
