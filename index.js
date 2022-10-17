const { chromium } = require('playwright');
const getImagePos = require('./handleCanvas');

const webUrl = 'https://big16.leju.com/vote/detail/96/1368';

const total = 10;
let count = 1;

console.log(`--- 预设投票次数: ${total} ---`);
console.log('---------------------------------');

async function main () {
    if (total < count) {
        console.log('--- 完成 ---')
        console.log(`共投票 ${count} 次`)
        return
    }

    try {
        const browser = await chromium.launch();
        const page = await browser.newPage();
        page.once('load', () => console.log('Page loaded!'));

        await page.goto(webUrl);
        console.log(`--- 第 ${count} 次开始 ---`)

        console.log('当前票数：', await page.innerText('.js_vote_count'))

        await voteBtnClick(page)

        const voteUrl = `https://big16.leju.com/vote/vote/is_vote?work_id=1368&project_id=96`
        await watchVoteApi(page, voteUrl)

        delay(1000);

        const subDataBase64 = await page.getAttribute('#puzzleImageBoxBlock', 'src', { timeout: 10000 })
        const mainDataBase64 = await page.getAttribute('#puzzleImageBoxBg', 'src', { timeout: 10000 })

        const sideLeft = await getImagePos(subDataBase64, mainDataBase64)
        console.log('sideLeft', sideLeft)
        if (sideLeft <= 0) {
            await browser.close();
            return
        }

        // 获取拖动按钮位置信息
        const btnRect = await page.evaluate(async () => {
            const btn = document.querySelector('#slideHead')
            return btn.getBoundingClientRect();
        });
        // console.log(btnRect);

        // 获取拖动按钮位置并拖动
        const x = btnRect['x'] + btnRect['width'] / 2
        const y = btnRect['y'] + btnRect['height'] / 2
        await page.mouse.move(x, y);
        await page.mouse.down();

        const mov_x = x + (sideLeft * 0.97)
        await page.mouse.move(mov_x, y)
        await page.mouse.up();

        delay(1000);

        await page.screenshot({ path: `example${count}.png` });

        await browser.close();

        count++

        main();
    } catch (error) {
        console.log('error', error)
        browser.close();
        count++
        main();
    }
}
main();

async function voteBtnClick (page) {
    const allResultsSelector = '.js_active_vote_btn';
    await page.waitForSelector(allResultsSelector)
    await page.click(allResultsSelector);
}

async function watchVoteApi (page, url) {
    const firstResponse = await page.waitForResponse(url);

    const resData = await firstResponse.json()
    // console.log(resData)
    if (resData.success === 0) {
        await voteBtnClick(page)
    }
}

/**
 * 模仿 delay 性能，提早肯定工夫，单位毫秒
 * Delay for a number of milliseconds
 */
 async function delay (time) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve()
        }, time)
    })
}


