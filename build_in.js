const puppeteer = require('puppeteer');

let browser = null;
let pages = {};

async function exec(cmd) {
    let args = cmd.split(' ');
    console.log('exec:', cmd);
    if('p' === args[0]){
        if('nm' === args[1]){
            if('play' === args[2]){
                await nm_search_play(args[3]);
                return true;
            }
            else if('pause' === args[2]){
                await nm_pause();
                return true;
            }
            else if('next' === args[2]){
                await nm_next();
                return true;
            }
            else if('prev' === args[2]){
                await nm_prev();
                return true;
            }
            else if('exit' === args[2]){
                await nm_exit();
                return true;
            }
        }
    }
    return false;
}

async function interceptPage(page){
    await page.setRequestInterception(true);
    // 拦截图片、css，因为页面不需要渲染
    interceptions = ['.png', '.gif', '.jpg', 'ico', '.css'];
    page.on('request', req => {
        for(let i = 0; i < interceptions.length; i++){
            if(req.url().endsWith(interceptions[i])){
                req.abort();
                return;
            }
        }
        req.continue();
    });
}

async function new_page(name, intercept = true){
    if(!browser){
        browser = await puppeteer.launch({
            headless: false,
            // executablePath: 'D:/Program Files (x86)/Chromium/chrome.exe'
            args: ['--no-sandbox', '--start-fullscreen']
        });
    }
    if(!(name in pages)){
        pages[name] = await browser.newPage();
        if(intercept){
            //await interceptPage(pages[name]);
        }
        await pages[name].setViewport({ width: 1366, height: 666});
    }
    return pages[name];
}

async function nm_search_play(song){
    let page = await new_page('nm');
    await page.goto('https://music.163.com/#/search/m/?s=' + song);
    await page.frames()[1].waitForSelector('.srchsongst > div > div > div > .ply');
    await page.frames()[1].click('.srchsongst > div > div > div > .ply');
    await page.frames()[0].click('[data-action=lock]');
}

async function nm_pause(){
    let page = await new_page('nm');
    await page.frames()[0].click('#g_player > div.btns > .ply');
}

async function nm_next(){
    let page = await new_page('nm');
    await page.frames()[0].click('#g_player > div.btns > .nxt');
}

async function nm_prev(){
    let page = await new_page('nm');
    await page.frames()[0].click('#g_player > div.btns > .prv');
}

async function nm_exit(){
    let page = await new_page('nm');
    await page.close();
	delete pages['nm'];
    await browser.close();
	browser = null;
}

module.exports = {
    exec: exec
};

