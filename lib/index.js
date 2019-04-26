var async = require('async');
var restify = require('restify');
var restifyErrors = require('restify-errors');
var bunyan = require('bunyan');
var { Pool } = require('pg');
var sql = require('sql-bricks-postgres');

exports.initialize = function(config, postInitFunction) {
  return new PgRestify(config, postInitFunction);
};

exports.Hooks = require('./hooks');

function PgRestify(config, postInitFunction) {

  this.pool = new Pool(config.pgConfig);
  this.basePath = config.basePath || '/api/generic';
  this.convertResourceToTable = config.convertResourceToTable || defaultConvertResourceToTable;
  this.convertTableToResource = config.convertTableToResource || defaultConvertTableToResource;
  this.convertFieldToColumn = config.convertFieldToColumn || defaultConvertFieldToColumn;
  this.convertColumnToField = config.convertColumnToField || defaultConvertColumnToField;
  this.hooks = config.hooks || new exports.Hooks();
  this.tableIdColumns = config.tableIdColumns || {};
  this.ignoredTableNames = config.ignoredTableNames || [];
  var self = this;

  var server = config.server;
  this.server = server;
  server.use(restify.plugins.bodyParser());
  server.use(restify.plugins.queryParser());
  server.use(restify.plugins.requestLogger({
    serializers: {
      err: bunyan.stdSerializers.err,
      req: bunyan.stdSerializers.req
    }
  }));

  server.get(this.basePath + '/:resource', function handleGetList(req, res, next) {

    self.executeWithHooks(req, res, next, 'getList', function(dbClient, next) {

      // Skip if res.pgRestifyResponseBody is not empty, we assume preHook already generated content
      if (res.pgRestifyResponseBody){
        return next();
      }

      var table = self.convertResourceToTable(req.params.resource);

      self.validateTable(table, function(err) {

        if (err) return next(err);

        var orderBy = self.tableIdColumns[table] || 'id';
        if (req.query.orderBy) {
          var orderByColumn = self.convertFieldToColumn(req.query.orderBy);

          var columns = self.columnsByTable[table];

          if (columns.indexOf(orderByColumn) === -1) {
            return next(new restifyErrors.BadRequestError('Invalid orderBy field "' + req.query.orderBy + '"'));
          } else {
            orderBy = orderByColumn;
          }

        }
        var orderByDesc = false;
        if (req.query.orderByDesc) {
          if (req.query.orderByDesc === 'true') {

            orderByDesc = true;

          } else if (req.query.orderByDesc === 'false') {

            orderByDesc = false;

          } else {

            return next(new restifyErrors.BadRequestError('Invalid orderByDesc value "' + req.query.orderByDesc + '"'));

          }
        }
        if (orderByDesc) {
          orderBy = orderBy + ' desc ';
        }

        var page = 1;
        if (typeof req.query.page !== 'undefined') {

          if (isNaN(req.query.page)) {
            return next(new restifyErrors.BadRequestError('Invalid page value "' + req.query.page + '"'));
          }

          page = parseInt(req.query.page);

          if (page < 1)  {
            return next(new restifyErrors.BadRequestError('page must be > 0 but was "' + page + '"'));
          }
        }

        var pageSize = 25;
        if (typeof req.query.pageSize !== 'undefined') {

          if (isNaN(req.query.pageSize)) {
            return next(new restifyErrors.BadRequestError('Invalid pageSize value "' + req.query.pageSize + '"'));
          }

          pageSize = parseInt(req.query.pageSize);

          if (pageSize < 1)  {
            return next(new restifyErrors.BadRequestError('pageSize must be > 0 but was "' + pageSize + '"'));
          }
        }

        var query = sql
                    .select()
                    .from(table);
        if (req.pgRestifyWhere){
          query = query.where(req.pgRestifyWhere);
        }
        query = query
                .orderBy(orderBy)
                .limit(pageSize)
                .offset((page-1)*pageSize)
                .toParams();

        dbClient.query(query.text, query.values, function(err, result) {

          if (err) return next(err);

          var finalRows = [];
          result.rows.forEach(function(row){
            finalRows.push(self.convertColumnsToFields(row));
          });

          // Add the intended response body to the response.
          // This allows the post hooks to modify if necessary.
          res.pgRestifyResponseBody = finalRows;

          return next();

        });

      });
    });

  });

  server.get(this.basePath + '/:resource/count', function handleGetCount(req, res, next) {

    self.executeWithHooks(req, res, next, 'getCount', function(dbClient, next) {

      var table = self.convertResourceToTable(req.params.resource);

      self.validateTable(table, function(err) {

        if (err) return next(err);

        var query = sql
                    .select('count(*)')
                    .from(table)
                    .toString();

        dbClient.query(query, function(err, result) {

          if (err) return next(err);

          res.pgRestifyResponseBody =  result.rows[0].count;

          return next();

        });

      });
    });

  });

  server.get(this.basePath + '/:resource/:id', function handleGetById(req, res, next) {

    self.executeWithHooks(req, res, next, 'get', function(dbClient, next) {

      var table = self.convertResourceToTable(req.params.resource);
      var id = req.params.id;

      self.validateTable(table, function(err) {

        if (err) return next(err);

        var query = sql
                    .select()
                    .from(table)
                    .where(self.tableIdColumns[table] || 'id', id)
                    .toParams();

        dbClient.query(query.text, query.values, function(err, result) {

          if (err) return next(err);

          if (result.rows.length === 0) {
            return next(new restifyErrors.ResourceNotFoundError('Entry with id "' + id + '" not found for resource "' + req.params.resource + '".'));
          }

          if (result.rows.length !== 1) {
            return next(new restifyErrors.InternalServerError('Multiple rows returned for resource "' + req.params.resource + ' and id "' + id + '".'));
          }

          res.pgRestifyResponseBody = self.convertColumnsToFields(result.rows[0]);

          return next();

        });

      });
    });
  });

  server.post(this.basePath + '/:resource', function handlePost(req, res, next) {

    self.executeWithHooks(req, res, next, 'post', function(dbClient, next) {

      var table = self.convertResourceToTable(req.params.resource);
      var data = self.convertFieldsToColumns(req.body);

      self.validateTableAndColumns(table, data, function(err) {

        if (err) return next(err);

        var query = sql
                    .insert(table, data)
                    .returning(self.tableIdColumns[table] || 'id')
                    .toParams();

        dbClient.query(query.text, query.values, function(err, result) {

          if (err) return next(err);

          var location = ((req.isSecure()) ? 'https' : 'http') +
          '://' + req.headers.host + req.url + '/' + result.rows[0][self.tableIdColumns[table] || 'id'];
          res.setHeader('location', location);
          res.status(201);

          return next();

        });

      });
    });
  });

  server.put(this.basePath + '/:resource/:id', function handlePutById(req, res, next) {

    self.executeWithHooks(req, res, next, 'put', function(dbClient, next) {

      var table = self.convertResourceToTable(req.params.resource);
      var id = req.params.id;
      var data = self.convertFieldsToColumns(req.body);

      self.validateTableAndColumns(table, data, function(err) {

        if (err) return next(err);

        var query = sql
                    .update(table, data)
                    .where(self.tableIdColumns[table] || 'id', id)
                    .toParams();

        dbClient.query(query.text, query.values, function(err, result) {

          if (err) return next(err);

          if (result.rowCount === 0) {

            return next(new restifyErrors.ResourceNotFoundError('Entry with id "' + id + '" not found for resource "' + req.params.resource + '".'));

          } else {

            res.status(200);

            return next();

          }

        });
      });
    });
  });

  server.del(this.basePath + '/:resource/:id', function handleDeleteById(req, res, next) {

    self.executeWithHooks(req, res, next, 'delete', function(dbClient, next) {

      var table = self.convertResourceToTable(req.params.resource);
      var id = req.params.id;

      self.validateTable(table, function(err) {

        if (err) return next(err);

        var query = sql
                    .delete(table)
                    .where(self.tableIdColumns[table] || 'id', id)
                    .toParams();

        dbClient.query(query.text, query.values, function(err, result) {

          if (err) return next(err);

          if (result.rowCount === 0) {

            return next(new restifyErrors.ResourceNotFoundError('Entry with id "' + id + '" not found for resource "' + req.params.resource + '".'));

          } else {

            res.status(200);

            return next();

          }
        });
      });
    });
  });

  this.refreshDatabaseSchema(function(err) {

    postInitFunction(err, self);

  });

}

PgRestify.prototype.executeWithHooks = function(req, res, next, eventName, innerFunction) {

  var self = this;

  this.pool.connect(function(err, client, done) {

    if (err) {

      req.log.error({
        err: err,
        req: req,
        reqBody: req.body
      },
      err.message);

      return next(new Error('Unexpected error'));

    }

    async.series([
      function(next) {
        client.query('begin', next);
      },
      function(next) {
        self.hooks.runPreHooks(eventName, req.params.resource, req, res, client, next);
      },
      function(next) {
        innerFunction.call(null, client, next);
      },
      function(next) {
        self.hooks.runPostHooks(eventName, req.params.resource, req, res, client, next);
      },
      function(next) {
        client.query('commit', next);
      }
    ], function(err) {

      if (err) {

        client.query('rollback', function(rollbackErr) {

          done(rollbackErr);

          if (err.statusCode === 404 || err.statusCode === 400) {
            req.log.warn({
              err: err,
              req: req,
              reqBody: req.body
            },
            err.message);
          } else {
            req.log.error({
              err: err,
              req: req,
              reqBody: req.body
            },
            err.message);
          }

          if (err.statusCode) {
            // if a status code is already set keep the original
            return next(err);
          } else {
            // hide the internal error message for the client
            return next(new Error('Unexpected error'));
          }

        });

      } else {

        done();

        res.json(res.statusCode, res.pgRestifyResponseBody);

        return next();

      }

    });

  });

};

PgRestify.prototype.convertFieldsToColumns = function(data) {
  var newData = {};
  for (var field in data) {
    newData[this.convertFieldToColumn(field)] = data[field];
  }
  return newData;
};


PgRestify.prototype.convertColumnsToFields = function(data) {
  var newData = {};
  for (var column in data) {
    newData[this.convertColumnToField(column)] = data[column];
  }
  return newData;
};


PgRestify.prototype.validateTable = function(tableName, next) {

  if (!this.columnsByTable[tableName]) {
    return next(new restifyErrors.ResourceNotFoundError('Invalid resource "' + this.convertTableToResource(tableName) + '"'));
  } else {
    return next();
  }

};

PgRestify.prototype.validateTableAndColumns = function(tableName, data, next) {

  var self = this;

  async.series([
    function(next) {
      self.validateTable(tableName, next);
    },
    function(next) {

      var columns = self.columnsByTable[tableName];

      for (var field in data) {
        if (columns.indexOf(field) === -1) {
          return next(new restifyErrors.BadRequestError('Invalid field "' + self.convertColumnToField(field) + '"'));
        }
      }

      return next();

    }
    ], function(err) {
      next(err);
    });

};

PgRestify.prototype.columnsByTable = null;

PgRestify.prototype.refreshDatabaseSchema = function(next) {

  var self = this;
  var schema = 'public';//TODO:support multiple schemas

  var currentColumnsByTable = {};

  let sqlGetDatabaseMetadata = `
    select table_name, column_name  
    from information_schema.columns 
    where table_schema=$1 `;

  const queryParams = [schema];

  if (this.ignoredTableNames.length > 0) {

    sqlGetDatabaseMetadata += ' and table_name not in (';

    sqlGetDatabaseMetadata += this.ignoredTableNames.map(function(ignoredTableName, index) {
      return '$'+(index + 2);
    }).join(', ');

    this.ignoredTableNames.forEach(function(ignoredTableName) {
      queryParams.push(ignoredTableName);
    });

    sqlGetDatabaseMetadata += ')';
  }

  this.runQuery(sqlGetDatabaseMetadata, queryParams, function(err, result) {

    if (err) return next(err);

    result.rows.forEach(function(row) {

      var tableName = row.table_name;

      if (!currentColumnsByTable[tableName]) {
        currentColumnsByTable[tableName] = [];
      }

      currentColumnsByTable[tableName].push(row.column_name);

    });

    self.columnsByTable = currentColumnsByTable;

    // validate an id field exists for each table
    for (var table in self.columnsByTable) {

      if ((self.tableIdColumns[table] && self.columnsByTable[table].indexOf(self.tableIdColumns[table]) === -1) ||
          (!self.tableIdColumns[table] && self.columnsByTable[table].indexOf('id') === -1)) {

        var errorMessage = 'Id column of \'' + (self.tableIdColumns[table] || 'id') + '\'' +
                           ' does not exist for table \'' +  table + '\'.' +
                           ' Check tableIdColumns configuration value.';

        return next(new Error(errorMessage));
      }

    }

    return next();

  });

};


PgRestify.prototype.runQuery = function(sql, params, next) {

  this.pool.connect(function(err, client, done) {

    if (err) return next(err);

    client.query(sql, params, function(err, result) {

      done();

      return next(err, result);

    });

  });

};


function defaultConvertResourceToTable(path) {
  return path.replace(/-/g,'_');
}

function defaultConvertTableToResource(table) {
  return table.replace(/_/g,'-');
}

function defaultConvertFieldToColumn(field) {
  return field.replace(/([a-z][A-Z])/g, function (g) { return g[0] + '_' + g[1].toLowerCase(); });
}

function defaultConvertColumnToField(column) {
  return column.replace(/_([a-z])/g, function (g) { return g[1].toUpperCase(); });
}
