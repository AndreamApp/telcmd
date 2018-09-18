var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var cmd_buffer = [];

app.get('/telcmd', function(req, res, next) {
    var cmd = req.query.cmd;
    cmd_buffer.push(cmd);
    res.end('');
});

app.get('/flush', function(req, res, next) {
    var cmd = req.query.cmd;
    res.json({
        cmd_buffer: cmd_buffer
    });
    cmd_buffer = [];
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.end(err);
});

var httpServer = app.listen(81, function () {
    var host = httpServer.address().address
    var port = httpServer.address().port
    console.log("应用实例，访问地址为 http://%s:%s", host, port)
});

module.exports = app;
