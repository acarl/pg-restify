# pg-restify

[![build status](https://travis-ci.org/acarl/pg-restify.svg?branch=master)](https://travis-ci.org/acarl/pg-restify)
[![Coverage Status](https://coveralls.io/repos/acarl/pg-restify/badge.svg?branch=master)](https://coveralls.io/r/acarl/pg-restify?branch=master)
[![dependencies](https://david-dm.org/acarl/pg-restify.svg)](https://david-dm.org/acarl/pg-restify)
[![devDependency Status](https://david-dm.org/acarl/pg-restify/dev-status.svg)](https://david-dm.org/acarl/pg-restify#info=devDependencies)
<span class="badge-npmversion"><a href="https://npmjs.org/package/pg-restify" title="View this project on NPM"><img src="https://img.shields.io/npm/v/pg-restify.svg" alt="NPM version" /></a></span>

This package allows you to automatically generate a RESTful API by
just pointing to any PostgreSQL schema.

All tables are automatically mapped to RESTful endpoints without additional
configuration.

## Getting Started

### Installation

```
npm install restify
npm install pg-restify
```

### Simple Configuration

```js
var restify = require('restify');
var pgRestify = require('pg-restify');

// create a simple restify server
var server = restify.createServer();

// add any additional custom server configuration

// add the pgRestify functionality
// by providing the restify instance
// and a server connection string
pgRestify.initialize({
  server: server,
  pgConfig: 'pg://localhost/pg_restify'
}, function(err, pgRestifyInstance) {

  // If there is an error initializing you will see it here.
  if (err) throw err;

  // now that the query to get table metadata is done,
  // start the server
  server.listen(8080);

});

```

## REST API Support

After the initialize function is called a full REST API for the pg_restify
database is available. Below are examples of the API actions available.

For these examples assume you have the following table in the database.
```sql
create table user_alert_messages (
   id serial primary key,
   user_name text not null,
   message text
);
```

---

### Create

Inserts a new record into the database.

**Request**
```
curl -X POST \
127.0.0.1:8080/api/generic/user-alert-messages \
-H "Content-Type: application/json" \
-d '{"userName":"John"}'
```

**Response**
```
HTTP 201 Created
location: http://127.0.0.1:8080/api/generic/user-alert-messages/1
```

---

### Get by Id

Returns the current record from the database with the specified id.
If the record doesn't exist it will return a 404.

**Request**
```
curl -X GET \
127.0.0.1:8080/api/generic/user-alert-messages/1
```

**Response**

```js
{"id":1,"userName":"John","message":null}
```

---


### Get List

Returns a list of records from the database.

Optional parameters:

| name | default | description |
| --- | --- | --- |
| orderBy | id | The field to order the results by. |
| orderByDesc | false | Whether or not the results should be ordered in descending order. |
| page | 1 | The page number of results to display. Starts at page 1. |
| pageSize | 25 | The number of results to return in a single request. |


**Request**
```
curl -X GET \
"127.0.0.1:8080/api/generic/user-alert-messages?orderBy=userName&orderByDesc=true"
```

**Response**

```js
[
  {"id":2,"userName":"Mary","message":"New content available."},
  {"id":1,"userName":"John","message":null}
]
```

---

### Get Count

Returns the current total number of records from the database.
This is useful if you're making a paged list and need to determine
the total number of pages.

**Request**
```
curl -X GET \
127.0.0.1:8080/api/generic/user-alert-messages/count
```

**Response**

```js
"2"
```

---

### Update

Updates the record in the database with the specified id.
If you do not explicitly specify a field in the data it will not be updated.
This means that the PUT method works as a PATCH method.

**Request**
```
curl -X PUT \
127.0.0.1:8080/api/generic/user-alert-messages/1 \
-H "Content-Type: application/json" \
-d '{"userName":"John","message":"password expired"}'
```

**Response**
```
HTTP 200 OK
```

---

### Delete

This will delete the  record with the specified id in the databse.
If you need to restrict access to this operation (or any other) you
can always add a custom hook. (see the Hook Configuration section)

**Request**
```
curl -X DELETE \
127.0.0.1:8080/api/generic/user-alert-messages/1
```

**Response**
```
HTTP 200 OK
```



## Advanced Usage

### Hook Configuration
It's nice to have a very simple API that supports the entire database, but maybe
you want to customize specific resource endpoints.

Here are just a few examples of what you can achieve through hooks.

1. Remove some database tables from the list of resources.
2. Alter the request before it reaches the base operation.
3. Perform additional queries within the same transaction as the base operation.
4. Alter or append to the response of the API call.

To accomplish this you can configure hooks into the API which will allow you to
add custom functionality.

The following is a list events you can add a hook to.

* get
* getList
* getCount
* post
* put
* delete

Below are the examples of the four different methods you can use to add a hook.

```js

var hooks = new pgRestify.Hooks();

// You can specify a hook to apply to all resources for a given event type.
// This will fire before the the main operation occurs.
hooks.addPreHookForAllResources('get', function(req, res, dbClient, next) {

  // The req object is the http request which can be modified.
  req.params.userId = 123;

  // The res object is the http response object which will be sent to the client.
  res.header('hook1', 'true');

  // The dbClient is the actual client acquired from pg.
  // It's wrapped in a transaction with the other hooks and the main operation.
  // If an error occurs the entire transaction is rolled back.
  dbClient.query('select count(*) from user_alert_messages', [], function(err, result) {

    if (err) return next(err);

    res.header('totalCount', result.rows[0].count);

    return next();

  });

});

// One more example for custom where
// with this pre-hook you can call: <api-endpoint>/api/v1/message?read=0&pageSize=10
// Will generate query with {read: 0}
hooks.addPreHookForAllResources('getList', function(req, res, dbClient, next){

  req.pgRestifyWhere = {};
  for (key in req.query){
    switch (key){
      case 'pageSize':
      case 'page':
      case 'orderBy':
      case 'orderByDesc':
        break;
      default:
        req.pgRestifyWhere[key] = req.query[key];
    }
  }
  return next();

});

// You can also specify a specific resource and event type to apply a hook to.
hooks.addPreHookForResource('delete', 'user-alert-messages', function(req, res, dbClient, next) {

  // You can choose to execute the callback with an error to halt further execution.
  return next(new restify.MethodNotAllowedError('DELETE is not supported on user-alert-messages.'));

});

// You can also add a hook after the main operation has been completed.
hooks.addPostHookForAllResources('getList', function(req, res, dbClient, next){

  // You can access the intended response.
  assert(res.statusCode === 200);

  // You can even access or overwrite the intended response body.
  res.pgRestifyResponseBody = {'message':'message was altered'};

  return next();

});

// You can add a hook after the main operation for a single resource.
hooks.addPostHookForResource('getCount', 'user-alert-messages', function(req, res, dbClient, next){

  return next();

});

```



### Resource Name Conversion
So why is the resource called "user-alert-messages" and the database tabled
called "user_alert_messages"? In short "spinal-case" makes a lot of sense when
it comes to REST URLs. However, when it comes to databases "snake_case" is
standard and using "spinal-case" in queries can be cumbersome.

If you don't like this concept you can simply overwrite the transform functions
in the configuration listed below.


### Accessible Configuration Properties

The following are attributes which can be passed into the initial configuration
object and are available to be accessed on the pgRestifyInstance object passed
to the post-initialization function.

| property | default | description |
| --- | --- | --- |
| server | undefined | This is the restify server instance to extend and is a required parameter in the initial configuration. |
| pool | | A reference to the Pool instance used. |
| basePath | /api/generic | This is the default endpoint on the server used to bind the API to. By not making it the root URL other custom endpoints can easily be added without conflicts. |
| hooks | new Hooks() | This is the datastructure containing any custom hook definitions. By default this is an empty definition. |
| convertResourceToTable | user-alerts => user_alerts | A function which transforms a string from the URL into a table name. |
| convertTableToResource | user_alerts => user-alerts | A function which transforms a string from a table name into one for a URL. |
| convertFieldToColumn | userName => user_name | A function which transforms a field from submitted JSON into a column name in the database. |
| convertColumnToField | user_name => userName | A function which transforms a column name from the database into a field name in returned JSON. |
| tableIdColumns | {} | A map of table name to column name to use for the id field. If the table is not defined the default value of 'id' will be used for the column name. |
| ignoredTableNames | [] | An array of tables which will be ignored when querying table metadata. |


### Instance functions

The following available functions available on the prototype for the pgRestifyInstance.
This is useful if you want to add additional functionality to the API.

| function | description |
| --- | --- |
| executeWithHooks(req, res, next, eventName, innerFunction) | A function which is used to internally to execute a function wrapped with the hooks in the same transaction. |
| convertFieldsToColumns(data) | For each key in the data object convert from a field name (api) to a column name (database). |
| convertColumnsToFields(data) | For each key in the data object convert from a column name (database) to a field name (api). |
| validateTable(tableName, next) | Validates the table name is accurate for the database and then calls the next callback. |
| validateTableAndColumns(tableName, data, next) | Validate that the tableName and fields in the data are accurate for the database and then calls the next callback. |
| refreshDatabaseSchema(next) | Gets updated schema definitions from the database for future validations. |
| runQuery(sql, params, next) | Runs a query using the configuration of this pgRestifyInstance. |




## TODO

- start with a default instance of restify
- generate documentation for the generated API automatically
- parameterize test case config
