var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const fs = require('fs');
const EventEmitter = require('events').EventEmitter; 

let app = express();
let em = new EventEmitter();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger(':date[iso] :remote-addr :method :status :url\t:res[content-length]\t - :response-time ms'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

let cmd_buffer = [];
let res_buffer = [];
let host = '';
let password = '';
let maxId = 1;

let aliasMap = {};

if(fs.existsSync('password')) {
    password = fs.readFileSync('password');
}
if(fs.existsSync('host')) {
    host = fs.readFileSync('host');
}
if(fs.existsSync('alias')) {
    let aliasCmds = fs.readFileSync('alias').toString().trim().split('\n');
    for(let cmd of aliasCmds) {
        let args = cmd.trim().split(' ');
        if('alias' == args[0]) {
            let k = args[1];
            let v = args.slice(2).join(' ');
            aliasMap[k] = v;
        }
    }
}

function alias(cmd) {
    let args = cmd.trim().split(' ');
    if(args[0] in aliasMap) {
        let aliasCmd = aliasMap[args[0]];
        if(args.length > 1) {
            aliasCmd += ' ' + args.slice(1).join(' ');
        }
        return aliasCmd;
    }
    return cmd;
}

function serverSideBuildIn(id, cmd, name, data, wai) {
    let args = cmd.trim().split(' ');
    if('alias' == args[0]) {
        let k = args[1];
        let v = args.slice(2).join(' ');
        aliasMap[k] = v;
        fs.appendFileSync('alias', cmd.trim() + '\n');
        return {
            id: id,
            name: name,
            cmd: cmd,
            stdout: 'set alias ' + k + '=' + v,
            stderr: '',
            time: new Date().toLocaleString()
        };
    }
    else {
        return false;
    }
}

app.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
  res.header("X-Powered-By", ' 3.2.1')
  if(req.method == 'OPTIONS') {
      res.sendStatus(200); 
  } else { 
      next(); 
  }
});

app.get('/telcmd', function(req, res, next) {
    let cmd = req.query.cmd;
    let name = req.query.name;
    let data = req.query.data;
    let wait = req.query.wait ? req.query.wait : 0; 
    let id = maxId++;
    let serverSideRes = serverSideBuildIn(id, cmd, name, data, wait);
    if(serverSideRes) {
        if(wait) {
            res.json(serverSideRes);
        }
        else {
            res.end('');
        }
    }
    else {
        cmd_buffer.push({
            id: id,
            cmd: alias(cmd),
            name: name,
            data: data,
            wait: wait
        });
        if(wait) {
            em.once('cmd' + id, result => {
                res.json(result);
            });
        }
        else{
            res.end('');
        }
    }
});

app.post('/telcmd', function(req, res, next) {
    let cmd = req.body.cmd;
    let name = req.body.name;
    let data = req.body.data;
    let wait = req.body.wait ? req.body.wait : 0; 
    let id = maxId++;
    cmd_buffer.push({
        id: id,
        cmd: cmd,
        name: name,
        data: data,
        wait: wait
    });
    if(wait) {
        em.once('cmd' + id, result => {
            res.json(result);
        });
    }
    else{
        res.end('');
    }
});

app.get('/flush', function(req, res, next) {
    let flushed = [];
    let remained = [];
    let name = req.query.name;
    for(let i = 0; i < cmd_buffer.length; i++){
        let item = cmd_buffer[i];
        if(item.name == name) {
            flushed.push(item);
        }
        else{
            remained.push(item);
        }
    }
    cmd_buffer = remained;
    res.json({
        cmd_buffer: flushed
    });
});

app.get('/host', function(req, res, next) {
    res.send(host);
});

app.post('/result', function(req, res, next) {
    if(req.body) {
        res_buffer.push(req.body);
        console.log(req.body);
        fs.appendFileSync('results.log', JSON.stringify(req.body. null, 4) + '\n');
        let id = req.body.id;
        if(id) {
            em.emit('cmd' + id, req.body);
        }
    }
    res.end('');
});

app.get('/results', function(req, res, next) {
    if(req.query.password == password) {
        res.json(res_buffer);
    }
    else {
        res.end('');
    }
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
