var async = require('async');
var helper = require('./helper');
var helperForHooks = require('./helper-for-hooks');
var request = helper.request;

describe('PUT method', function() {

  before(function(done) {

    helper.initDefaultServer(done);

  });

  it('should update a row', function(done){

    var row = {userName:'user3', message:'message text'};

    async.waterfall([
      function(next) {

        // insert initial row

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

        // update the row

        row.userName = 'updated name';

        request
        .put('/api/generic/user-alert-messages/' + row.id)
        .send(row)
        .expect(200, '')
        .end(next);

      },
      function(res, next) {

        // validate that it was updated

        helper.validateValueWithGet('user-alert-messages', row, next);

      }
    ], done);

  });

  it('return 404 for an invalid id', function(done){

    var row = {userName:'user', message:'message text'};

    request
    .put('/api/generic/user-alert-messages/999')
    .send(row)
    .expect(404, '{"code":"ResourceNotFound","message":"Entry with id \\"999\\" not found for resource \\"user-alert-messages\\"."}', done);

  });

  it('should not allow an update with an invalid column', function(done){

    var row = {userName:'user3', message:'message text'};

    async.waterfall([
      function(next) {

        // insert the inital row
        request
        .post('/api/generic/user-alert-messages')
        .send(row)
        .expect(201, '', next);

      },
      function(res, next) {

        // validate it was inserted

        row.id = helper.getIdFromResponse(res);
        helper.validateValueWithGet('user-alert-messages', row, next);

      },
      function(next) {

        // try to update with a bad column

        row.userName2 = 'bad value';

        request
        .put('/api/generic/user-alert-messages/' + row.id)
        .send(row)
        .expect(400, '{"code":"BadRequest","message":"Invalid field \\"userName2\\""}')
        .end(next);

      },
      function(res, next) {

        // delete the bad field for the GET check

        delete row.userName2;

        helper.validateValueWithGet('user-alert-messages', row, next);

      }
    ], done);

  });

  it('should run pre hook with success', function(done){

    helperForHooks.setupPreHookWithSuccessTest('put', 'delete', function(validator) {

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

          // update the row

          row.userName = 'updated name';

          request
          .put('/api/generic/replace-me-by-hook/' + row.id)
          .send(row)
          .expect(200, '')
          .end(next);

        },
        function(res, next) {

          // validate that it was updated

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

    helperForHooks.setupPreHookWithErrorTest('put', 'delete', function(validator) {

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

          // update the row

          row.userName = 'updated name';

          request
          .put('/api/generic/replace-me-by-hook/' + row.id)
          .send(row)
          .end(function(err, res) {
            next(null, res);
          });

        },
        function(res, next) {

          // validate that it didn't get updated

          row.userName = 'user';

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

  it('should run post hook with success', function(done) {

    helperForHooks.setupPostHookWithSuccessTest('put', 'delete', function(validator) {

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

          // update the row

          row.userName = 'updated name';

          request
          .put('/api/generic/user-alert-messages/' + row.id)
          .send(row)
          .end(next);

        },
        function(res, next) {

          // validate that it was updated

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

    helperForHooks.setupPostHookWithErrorTest('put', 'delete', function(validator) {

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

          // update the row

          row.userName = 'updated name';

          request
          .put('/api/generic/user-alert-messages/' + row.id)
          .send(row)
          .end(function(err, res) {
            next(null, res);
          });

        },
        function(res, next) {

          // validate that it didn't get updated

          row.userName = 'user';

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

  it('should should handle a database error',  function(done) {

    helperForHooks.setupDatabaseErrorTest('put', function(validator) {

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

          // update the row

          row.userName = 'updated name';

          request
          .put('/api/generic/user-alert-messages/' + row.id)
          .send(row)
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
