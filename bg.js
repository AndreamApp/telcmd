const request = require('request');
const iconv = require('iconv-lite');
const exec = require('child_process').exec;
// const build_in = require('./build_in');
const fs = require('fs');

let host = '';
let name = 'pc';
let lastFlushTime = 0;
let flushPeriod = 60000;
const DEBUG = true;

function initHost() {
    if(fs.existsSync('host')) {
        host = fs.readFileSync('host').toString().trim();
    }
    else {
        fs.writeFileSync('host', host);
    }
    if(fs.existsSync('name')) {
        name = fs.readFileSync('name').toString().trim() + 'bg'; // suffix 'bg' to identify background service
    }
    else {
        fs.writeFileSync('name', name);
    }
    log('started with host:' + host + ' name:' + name);
}

function log(str) {
    if(DEBUG) console.log(str + '\n');
}

function get(url, callback){
    request.get({
        url:url,
        encoding: null,
        followRedirect: false,
        time: false,
        forever: true
    }, callback);
}

function telcmd(cmd, name){
    get(host + '/telcmd?cmd=' + cmd + '&name=' + name, function (error, response, buf) {
    });
}

function result(id, cmd, stdout, stderr, callback) {
    request.post({
        url: host + '/result',
        body: {
            id: id,
            name: name,
            cmd: cmd,
            stdout: stdout,
            stderr: stderr,
            time: new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')
        },
        json: true
    }, callback);
}

function build_in(cmd) {
    if(cmd) {
        let [matched, stdout, stderr] = [true, '', ''];
        let args = cmd.trim().split(' ');
        if('sethost' == args[0]) {
            if(args.length >= 2) {
                let newHost = args[1].trim();
                if(newHost != host) {
                    log('host:' + host + ' -> ' + newHost)
                    stdout = 'successfully set host from "' + host + '" to "' + newHost + '"';
                    host = newHost;
                    fs.writeFileSync('host', host);
                }
                else {
                    stdout = 'not changed';
                }
            }
            else {
                stderr = 'expected 2 arguments';
            }
        }
        else if('setname' == args[0]) {
            stderr = 'cann\'t set name through background service';
        }
        else if('period' == args[0]) {
            let period = args.length >= 2 ? parseInt(args[1].trim()) : 60000;
            if(!isNaN(period)) {
                period = Math.max(1000, period);
                log('period:' + flushPeriod + ' -> ' + period)
                stdout = 'successfully set flush period from ' + flushPeriod + ' to ' + period;
                flushPeriod = period;
            }
            else {
                stderr = 'invalid period: ' + args[1];
            }
        }
        else {
            matched = false;
        }
        return [matched, stdout, stderr];
    }
    return [false, '', ''];
}

// change name to your client name
function flush(){
    let now = new Date().getTime();
    if(now - lastFlushTime < flushPeriod) {
        return;
    }
    // log('flush');
    lastFlushTime = now;

    get(host + '/flush?name=' + name, async function (error, response, buf) {
        if(!buf) return;
        let json = new Buffer(buf).toString();
        let cmd_buffer = await JSON.parse(json)['cmd_buffer'];
        for(let i = 0; i < cmd_buffer.length; i++){
            let item = cmd_buffer[i];
            let id = item.id;
            let cmd = item.cmd;
            let encoding = item.encoding ? item.encoding :'gbk';
            if(cmd){
                log('> ' + cmd);
                // remove useless build_in
                let [matched, stdout, stderr] = build_in(cmd);
                if(matched){
                    result(id, cmd, stdout, stderr);
                    log('build-in:\n' + stdout + '\n' + stderr);
                }
                else {
                    exec(cmd, {encoding: 'buffer'}, function(err, stdoutBuf, stderrBuf) {
                        stdout = iconv.decode(stdoutBuf, encoding) 
                        stderr = iconv.decode(stderrBuf, encoding);
                        result(id, cmd, stdout, stderr);
                        log(stdout + '\n' + stderr);
                    });
                }
            }
        }
    });
}

function deamon(){
    setImmediate(flush);
    setInterval(flush, 1000);
}

if (require.main === module) {
    initHost();
    deamon();
}

module.exports = {
    telcmd: telcmd,
    flush: flush
};
