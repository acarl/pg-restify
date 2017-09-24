var helper = require('./helper');
var helperForHooks = require('./helper-for-hooks');
var request = helper.request;
var pgRestify = require('../lib/index');

describe('GET list method', function() {

  before(function(done) {

    helper.initDefaultServer(done);

  });

  it('should get a list of values', function(done){

    var rows = [
    {id:1, userName:'b user', message:'message1'},
    {id:2, userName:'a user', message:'message2'},
    {id:3, userName:'c user', message:'message3'}
    ];

    helper.validateValuesWithGet('user-alert-messages', rows, done);

  });

  it('should get a list of values with orderBy', function(done){

    var rows = [
    {id:2, userName:'a user', message:'message2'},
    {id:1, userName:'b user', message:'message1'},
    {id:3, userName:'c user', message:'message3'}
    ];

    helper.validateValuesWithGet('user-alert-messages?orderBy=userName', rows, done);

  });

  it('should get a list of values with orderByDesc=true', function(done){

    var rows = [
    {id:3, userName:'c user', message:'message3'},
    {id:1, userName:'b user', message:'message1'},
    {id:2, userName:'a user', message:'message2'}
    ];

    helper.validateValuesWithGet('user-alert-messages?orderBy=userName&orderByDesc=true', rows, done);

  });

  it('should get a list of values with orderByDesc=false', function(done){

    var rows = [
    {id:2, userName:'a user', message:'message2'},
    {id:1, userName:'b user', message:'message1'},
    {id:3, userName:'c user', message:'message3'}
    ];

    helper.validateValuesWithGet('user-alert-messages?orderBy=userName&orderByDesc=false', rows, done);

  });

  it('should get page 1 of values', function(done){

    var rows = [
    {id:1, userName:'b user', message:'message1'},
    {id:2, userName:'a user', message:'message2'}
    ];

    helper.validateValuesWithGet('user-alert-messages?page=1&pageSize=2', rows, done);

  });

  it('should get page 2 of values', function(done){

    var rows = [
    {id:3, userName:'c user', message:'message3'}
    ];

    helper.validateValuesWithGet('user-alert-messages?page=2&pageSize=2', rows, done);

  });

  it('should get page 3 of empty values', function(done){

    var rows = [];

    helper.validateValuesWithGet('user-alert-messages?page=3&pageSize=2', rows, done);

  });

  it('should get page 1 of values with orderBy and orderByDesc', function(done){

    var rows = [
    {id:3, userName:'c user', message:'message3'},
    {id:1, userName:'b user', message:'message1'}
    ];

    helper.validateValuesWithGet('user-alert-messages?page=1&pageSize=2&orderBy=userName&orderByDesc=true', rows, done);

  });

  it('should return a 404 for an invalid table', function(done){

    request
    .get('/api/generic/user-alert-messages2')
    .expect(404, '{"code":"ResourceNotFound","message":"Invalid resource \\"user-alert-messages2\\""}', done);

  });

  it('should return a 400 for an invalid orderBy', function(done){

    request
    .get('/api/generic/user-alert-messages?orderBy=userName2')
    .expect(400, '{"code":"BadRequest","message":"Invalid orderBy field \\"userName2\\""}', done);

  });

  it('should return a 400 for an invalid orderByDesc', function(done){

    request
    .get('/api/generic/user-alert-messages?orderByDesc=f')
    .expect(400, '{"code":"BadRequest","message":"Invalid orderByDesc value \\"f\\""}', done);

  });

  it('should return a 400 for page 0', function(done){

    request
    .get('/api/generic/user-alert-messages?page=0')
    .expect(400, '{"code":"BadRequest","message":"page must be > 0 but was \\"0\\""}', done);

  });

  it('should return a 400 for page NaN', function(done){

    request
    .get('/api/generic/user-alert-messages?page=one')
    .expect(400, '{"code":"BadRequest","message":"Invalid page value \\"one\\""}', done);

  });

  it('should return a 400 for pageSize 0', function(done){

    request
    .get('/api/generic/user-alert-messages?pageSize=0')
    .expect(400, '{"code":"BadRequest","message":"pageSize must be > 0 but was \\"0\\""}', done);

  });

  it('should return a 400 for pageSize NaN', function(done){

    request
    .get('/api/generic/user-alert-messages?pageSize=one')
    .expect(400, '{"code":"BadRequest","message":"Invalid pageSize value \\"one\\""}', done);

  });

  it('should run pre hook with success', function(done){

    helperForHooks.setupPreHookWithSuccessTest('getList', 'delete', function(validator) {

      request
      .get('/api/generic/replace-me-by-hook')
      .end(function(err, res) {

        if (err) return done(err);

        var expectedRows = [
        {id:1, userName:'b user', message:'message1'},
        {id:2, userName:'a user', message:'message2'},
        {id:3, userName:'c user', message:'message3'}
        ];

        res.statusCode.should.eql(200);

        res.body.should.eql(expectedRows);

        validator(res, done);

      });

    });

  });

  it('should run pre hook with error',  function(done){

    helperForHooks.setupPreHookWithErrorTest('getList', 'delete', function(validator) {

      request
      .get('/api/generic/replace-me-by-hook')
      .end(function(err, res) {

        validator(res, done);

      });

    });

  });

  it('should shortcut if the prehook has already set the pgRestifyResponseBody',  function(done){

    var hooks = new pgRestify.Hooks();
    helper.pgRestifyInstance.hooks = hooks;

    var alternateResponseBody = [{customResponseId: 1}, {customResponseId: 2}];

    hooks.addPreHookForAllResources('getList', function(req, res, dbClient, next) {

      res.pgRestifyResponseBody = alternateResponseBody;

      next();

    });

    request
      .get('/api/generic/alternate-response')
      .end(function(err, res) {

        res.body.should.eql(alternateResponseBody);

        done();

      });

  });


  it('should use a custom where clause set on the preHook if pgRestifyWhere is set',  function(done){

    var hooks = new pgRestify.Hooks();
    helper.pgRestifyInstance.hooks = hooks;

    hooks.addPreHookForAllResources('getList', function(req, res, dbClient, next) {

      req.pgRestifyWhere = {id: '2'};

      next();

    });

    request
      .get('/api/generic/user-alert-messages')
      .end(function(err, res) {

        res.body.should.eql([{id:2, userName:'a user', message:'message2'}]);

        done();

      });

  });

  it('should run post hook with success', function(done) {

    helperForHooks.setupPostHookWithSuccessTest('getList', 'delete', function(validator) {

      request
      .get('/api/generic/user-alert-messages')
      .end(function(err, res) {

        if (err) return done(err);

        validator(res, done);

      });

    });

  });

  it('should run post hook with error',  function(done) {

    helperForHooks.setupPostHookWithErrorTest('getList', 'delete', function(validator) {

      request
      .get('/api/generic/user-alert-messages')
      .end(function(err, res) {

        validator(res, done);

      });

    });

  });

  it('should should handle a database error',  function(done) {

    helperForHooks.setupDatabaseErrorTest('getList', function(validator) {

      request
      .get('/api/generic/user-alert-messages')
      .end(function(err, res) {

        validator(res, done);

      });

    });

  });

});
