const request = require('request');
const exec = require('child_process').exec;
const build_in = require('./build_in');

const host = 'http://andreamapp.com:81';

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
    get((host + '/telcmd?cmd=%s&name=%s') % (cmd, name), function (error, response, buf) {
    });
}

// change name to your client name
function flush(name = 'pc'){
    console.log('~');
    get((host + '/flush?name=%s') % (name), async function (error, response, buf) {
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

function deamon(){
    setImmediate(flush);
    setInterval(flush, 3000);
}

if (require.main === module) {
    deamon();
}

module.exports = {
    telcmd: telcmd,
    flush: flush
};
