// дополнительный ресурсы:
// https://medium.com/@e_mad_ehsan/getting-started-with-puppeteer-and-chrome-headless-for-web-scrapping-6bf5979dee3e
// https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md

const puppeteer = require('puppeteer');
const Promise   = require("bluebird");
var fs      = require('fs'),
    fsAsync = Promise.promisifyAll(require("fs")),
    path    = require('path');
    require('events').EventEmitter.prototype._maxListeners = 300;
const INPUT_SELECTOR = '#gwt-uid-719';
const BUTTON_SELECTOR = '#gwt-uid-365';
//ждем пока не появится надпись "Обрабокта обновления" , ниже ее селектор

// с помощью программы editThisCookie делаем экспорт куков,
// находясь на странице гугл плей консоль, и вставляем в cookie.json
// таким образом мы авторизуемся
var cookie;
fs.readFile('cookie.json', 'utf8', function (err, data) {
if (err) throw err;
   cookie = JSON.parse(data);
});
//


//нужно пройтись по всем файлам и вытащить манифест
var baseDir = path.join('mobile-materials'),
    bundles = [];

fsAsync.readdirAsync(baseDir).map(function (filename) {
    let fileErr = path.resolve(baseDir,filename)
        let stat = fs.statSync(fileErr);
            if (!stat || !stat.isDirectory()) {
                return;
            }
    let tmpNameManifest = `${baseDir}/${filename}/manifest.json`;
    let ManifestJson = JSON.parse(fs.readFileSync(tmpNameManifest, 'utf-8'));

    if (ManifestJson.androidBundleId) {
        bundles.push(ManifestJson.androidBundleId);
    } else {
        bundles.push(ManifestJson.bundleId);        
    }
}).then(function () {
    console.log('считал все бандлы');
    (async () => {
        const browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();
        for (let i = 0; i < cookie.length; i++) {
            page.setCookie(cookie[i]);
        }
        //идем на любую страницу, чтобы проставились куки
        await page.goto('https://google.com',{waitUntil:'networkidle'});

        for (let bundl of bundles) {
            //идем на нужную страницу
            const page = await browser.newPage();
            let qwe = `https://play.google.com/apps/publish/?hl=ru&account=4975155093784083645#PricingPlace:p=${bundl}`;
            await page.goto(qwe);
            //ждем пока прогрузится нужный селектор в течении 30 секунд
            try {
                await page.waitForSelector(INPUT_SELECTOR);
            } catch (error) {
                continue;   
            }
            await page.click(INPUT_SELECTOR);
            console.log('загрузилась страница и кликнулась кнопка');

            // определяем не задизайблина ли кнопка сохранить?
            // если задизейблина, то этот параметр уже сохранен делаем следующую итерацию
            let isButtonDisabled = await page.evaluate((sel) => {
                return document.querySelector(sel).hasAttribute('disabled')?true:false;
            }, BUTTON_SELECTOR);
            console.log("isButtonDisabled",isButtonDisabled);
            const snooze = ms => new Promise(resolve => setTimeout(resolve, ms));
            if (!isButtonDisabled) {
                await page.click(BUTTON_SELECTOR);
            } else {
                await snooze(1 * 1000);
                await page.close();
                continue;
            }
            //теперь нужно как-то понять сохранились ли изменения, пока не придумал как. сделаем просто задержку
            await snooze(5 * 1000);
            //await page.waitForNavigation({waitUntil:'domcontentloaded'});
            console.log('Закончили работу приступаем к следующему');
            await page.close();
        }
    })();
})
