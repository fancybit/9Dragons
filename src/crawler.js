/**
 * QQ空间内容抓取模块
 * 功能：从QQ空间抓取说说或文章内容
 */

/**
 * 抓取QQ空间说说内容
 * @param {import('puppeteer').Browser} browser 浏览器实例
 * @param {Object} options 配置选项
 * @param {string} [options.startDate] 开始日期
 * @param {string} [options.endDate] 结束日期
 * @returns {Promise<Array>} 说说列表
 */
async function crawlQQNotes(browser, options) {
    const noteList = [];
    
    try {
        // 获取当前页面
        const pages = await browser.pages();
        const page = pages[pages.length - 1];
        
        // 进入说说页面
        console.log('正在进入说说页面...');
        const qqNumber = options.qq || '148332727'; // 使用用户指定的QQ号，默认为148332727
        await page.goto(`https://user.qzone.qq.com/${qqNumber}/infocenter`, { waitUntil: 'networkidle2' });
        
        // 等待说说列表加载完成
        console.log('正在加载说说列表...');
        
        // 等待页面中的说说内容出现
        await page.waitForSelector('.feed', { timeout: 10000 });
        
        // 滚动加载更多说说
        let lastHeight = await page.evaluate(() => document.body.scrollHeight);
        let scrollCount = 0;
        const maxScroll = 10; // 最大滚动次数，避免无限滚动
        
        while (scrollCount < maxScroll) {
            // 滚动到页面底部
            await page.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight);
            });
            
            // 等待页面加载
            await page.waitForTimeout(2000);
            
            // 获取新的页面高度
            const newHeight = await page.evaluate(() => document.body.scrollHeight);
            
            // 如果页面高度没有变化，说明已经加载完所有内容
            if (newHeight === lastHeight) {
                break;
            }
            
            lastHeight = newHeight;
            scrollCount++;
            
            console.log(`已滚动 ${scrollCount} 次，继续加载...`);
        }
        
        // 提取说说内容
        console.log('正在提取说说内容...');
        
        // 获取所有说说元素
        const feedElements = await page.$$('.feed');
        
        // 遍历提取每个说说
        for (const feed of feedElements) {
            try {
                // 提取发布时间
                const timeElement = await feed.$('.ft .c_tx3');
                const publishTime = timeElement ? await page.evaluate(el => el.textContent.trim(), timeElement) : '';
                
                // 提取正文内容
                const contentElement = await feed.$('.content');
                const content = contentElement ? await page.evaluate(el => el.textContent.trim(), contentElement) : '';
                
                // 提取图片链接
                const imgElements = await feed.$$('.img-attachments img');
                const images = [];
                for (const img of imgElements) {
                    const src = await page.evaluate(el => el.src, img);
                    if (src) {
                        images.push(src);
                    }
                }
                
                // 提取点赞数
                const likeElement = await feed.$('.like-btn .ft');
                const likeCount = likeElement ? await page.evaluate(el => el.textContent.trim(), likeElement) : '';
                
                // 构建说说对象
                const note = {
                    publishTime,
                    content,
                    images,
                    likeCount,
                    extractedTime: new Date().toISOString()
                };
                
                // 添加到列表
                noteList.push(note);
                
            } catch (error) {
                console.error('提取说说时出错：', error);
                continue;
            }
        }
        
        console.log(`成功提取 ${noteList.length} 条说说！`);
        
        // 按日期范围筛选（如果指定了日期）
        if (options.startDate || options.endDate) {
            const filteredList = filterByDate(noteList, options.startDate, options.endDate);
            console.log(`按日期筛选后剩余 ${filteredList.length} 条说说！`);
            return filteredList;
        }
        
        return noteList;
        
    } catch (error) {
        console.error('抓取说说时出错：', error);
        return noteList;
    }
}

/**
 * 抓取QQ空间文章内容
 * @param {import('puppeteer').Browser} browser 浏览器实例
 * @param {Object} options 配置选项
 * @param {string} [options.startDate] 开始日期
 * @param {string} [options.endDate] 结束日期
 * @returns {Promise<Array>} 文章列表
 */
async function crawlQQArticles(browser, options) {
    const articleList = [];
    
    try {
        // 获取当前页面
        const pages = await browser.pages();
        const page = pages[pages.length - 1];
        
        // 进入文章页面
        console.log('正在进入文章页面...');
        const qqNumber = options.qq || '148332727'; // 使用用户指定的QQ号，默认为148332727
        await page.goto(`https://user.qzone.qq.com/${qqNumber}/blog`, { waitUntil: 'networkidle2' });
        
        // 等待文章列表加载完成
        console.log('正在加载文章列表...');
        
        // 等待页面中的文章内容出现
        await page.waitForSelector('.article-item', { timeout: 10000 });
        
        // 滚动加载更多文章
        let lastHeight = await page.evaluate(() => document.body.scrollHeight);
        let scrollCount = 0;
        const maxScroll = 10; // 最大滚动次数，避免无限滚动
        
        while (scrollCount < maxScroll) {
            // 滚动到页面底部
            await page.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight);
            });
            
            // 等待页面加载
            await page.waitForTimeout(2000);
            
            // 获取新的页面高度
            const newHeight = await page.evaluate(() => document.body.scrollHeight);
            
            // 如果页面高度没有变化，说明已经加载完所有内容
            if (newHeight === lastHeight) {
                break;
            }
            
            lastHeight = newHeight;
            scrollCount++;
            
            console.log(`已滚动 ${scrollCount} 次，继续加载...`);
        }
        
        // 提取文章列表
        console.log('正在提取文章列表...');
        
        // 获取所有文章元素
        const articleElements = await page.$$('.article-item');
        
        // 遍历提取每篇文章
        for (const articleEl of articleElements) {
            try {
                // 提取文章标题
                const titleElement = await articleEl.$('.article-title');
                const title = titleElement ? await page.evaluate(el => el.textContent.trim(), titleElement) : '';
                
                // 提取发布时间
                const timeElement = await articleEl.$('.article-time');
                const publishTime = timeElement ? await page.evaluate(el => el.textContent.trim(), timeElement) : '';
                
                // 提取文章摘要
                const summaryElement = await articleEl.$('.article-summary');
                const summary = summaryElement ? await page.evaluate(el => el.textContent.trim(), summaryElement) : '';
                
                // 提取文章链接
                const linkElement = await articleEl.$('.article-title a');
                const link = linkElement ? await page.evaluate(el => el.href, linkElement) : '';
                
                // 进入文章详情页提取完整内容
                const articleDetail = await getArticleDetail(browser, link);
                
                // 构建文章对象
                const article = {
                    title,
                    publishTime,
                    summary,
                    content: articleDetail.content,
                    images: articleDetail.images,
                    link,
                    extractedTime: new Date().toISOString()
                };
                
                // 添加到列表
                articleList.push(article);
                
            } catch (error) {
                console.error('提取文章时出错：', error);
                continue;
            }
        }
        
        console.log(`成功提取 ${articleList.length} 篇文章！`);
        
        // 按日期范围筛选（如果指定了日期）
        if (options.startDate || options.endDate) {
            const filteredList = filterByDate(articleList, options.startDate, options.endDate);
            console.log(`按日期筛选后剩余 ${filteredList.length} 篇文章！`);
            return filteredList;
        }
        
        return articleList;
        
    } catch (error) {
        console.error('抓取文章时出错：', error);
        return articleList;
    }
}

/**
 * 获取文章详情
 * @param {import('puppeteer').Browser} browser 浏览器实例
 * @param {string} link 文章链接
 * @returns {Promise<Object>} 文章详情
 */
async function getArticleDetail(browser, link) {
    if (!link) {
        return { content: '', images: [] };
    }
    
    let detailPage = null;
    try {
        // 创建新页面访问文章详情
        detailPage = await browser.newPage();
        await detailPage.goto(link, { waitUntil: 'networkidle2' });
        
        // 等待文章内容加载
        await detailPage.waitForSelector('.article-content', { timeout: 5000 });
        
        // 提取文章内容
        const contentElement = await detailPage.$('.article-content');
        const content = contentElement ? await detailPage.evaluate(el => el.textContent.trim(), contentElement) : '';
        
        // 提取文章图片
        const imgElements = await detailPage.$$('.article-content img');
        const images = [];
        for (const img of imgElements) {
            const src = await detailPage.evaluate(el => el.src, img);
            if (src) {
                images.push(src);
            }
        }
        
        // 关闭详情页
        await detailPage.close();
        
        return { content, images };
        
    } catch (error) {
        console.error('获取文章详情时出错：', error);
        if (detailPage) {
            await detailPage.close();
        }
        return { content: '', images: [] };
    }
}

/**
 * 按日期范围筛选内容
 * @param {Array} contentList 内容列表
 * @param {string} startDate 开始日期（YYYY-MM-DD）
 * @param {string} endDate 结束日期（YYYY-MM-DD）
 * @returns {Array} 筛选后的内容列表
 */
function filterByDate(contentList, startDate, endDate) {
    return contentList.filter(item => {
        const itemDate = new Date(item.publishTime);
        
        let isValid = true;
        
        if (startDate) {
            const start = new Date(startDate);
            isValid = isValid && itemDate >= start;
        }
        
        if (endDate) {
            const end = new Date(endDate);
            // 设置结束日期为当天的23:59:59
            end.setHours(23, 59, 59, 999);
            isValid = isValid && itemDate <= end;
        }
        
        return isValid;
    });
}

/**
 * 根据类型抓取QQ空间内容
 * @param {import('puppeteer').Browser} browser 浏览器实例
 * @param {Object} options 配置选项
 * @param {string} options.type 提取类型：notes（说说）、articles（文章）
 * @returns {Promise<Array>} 内容列表
 */
async function crawlQQSpace(browser, options) {
    if (options.type === 'articles') {
        return await crawlQQArticles(browser, options);
    } else {
        return await crawlQQNotes(browser, options);
    }
}

module.exports = { crawlQQSpace, crawlQQNotes, crawlQQArticles };
