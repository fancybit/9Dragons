/**
 * QQ空间登录模块
 * 功能：实现扫码登录QQ空间
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * 登录QQ空间
 * @param {Object} options 配置选项
 * @param {string} [options.headless] 是否使用无头模式
 * @returns {Promise<import('puppeteer').Browser|null>} 登录成功返回浏览器实例，失败返回null
 */
async function login(options = {}) {
    let browser = null;
    try {
        // 启动浏览器
        browser = await puppeteer.launch({
            headless: options.headless || false, // 根据配置决定是否显示浏览器窗口
            defaultViewport: { width: 1200, height: 800 },
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        // 创建新页面
        const page = await browser.newPage();
        
        // 访问QQ空间登录页面
        await page.goto('https://qzone.qq.com/', { waitUntil: 'networkidle2' });
        
        // 点击登录按钮
        await page.waitForSelector('.login_btn');
        await page.click('.login_btn');
        
        // 等待扫码区域出现
        await page.waitForSelector('.qrcode-img', { timeout: 10000 });
        
        // 保存二维码图片（可选，方便用户扫码）
        const qrcodeElement = await page.$('.qrcode-img');
        if (qrcodeElement) {
            const qrcodePath = path.join(__dirname, '../qrcode.png');
            await qrcodeElement.screenshot({ path: qrcodePath });
            console.log(`请扫描二维码登录：${qrcodePath}`);
        }
        
        // 等待登录成功（检测是否跳转）
        await page.waitForNavigation({ timeout: 60000 });
        
        // 检查是否登录成功
        const currentUrl = page.url();
        if (currentUrl.includes('qzone.qq.com')) {
            console.log('登录成功！');
            return browser;
        } else {
            console.error('登录失败，页面跳转异常！');
            await browser.close();
            return null;
        }
    } catch (error) {
        console.error('登录过程中出现错误：', error);
        if (browser) {
            await browser.close();
        }
        return null;
    }
}

module.exports = { login };
