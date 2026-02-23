const { generateImage } = require('./utils/image-generator');

/**
 * 生成朱常澜肖像插画
 */
async function generateZhuChangLanPortrait() {
    console.log('开始生成朱常澜肖像插画...');
    
    const prompt = '明朝王爷朱常澜的肖像插画，年轻男子，约二十岁左右，面容英俊，气质高贵，身穿华丽的明黄色龙袍，头戴王冠，眼神深邃，神态威严而不失温和，背景为王府宫殿，工笔画风格，细节丰富，色彩鲜艳';
    
    try {
        // 测试本地ComfyUI模式
        console.log('\n测试本地ComfyUI模式:');
        const localImagePath = await generateImage(prompt, {}, 'local');
        console.log('本地ComfyUI生成成功：', localImagePath);
        
        // 测试豆包API模式
        console.log('\n测试豆包API模式:');
        const apiImagePath = await generateImage(prompt, {}, 'api');
        console.log('豆包API生成成功：', apiImagePath);
        
        console.log('\n生成完成！朱常澜肖像插画已生成。');
    } catch (error) {
        console.error('生成失败：', error);
    }
}

// 运行生成
generateZhuChangLanPortrait();