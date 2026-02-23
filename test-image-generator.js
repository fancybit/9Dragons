const { generateImage } = require('./utils/image-generator');

/**
 * 测试图像生成功能
 */
async function testImageGenerator() {
    console.log('开始测试图像生成功能...');
    
    try {
        // 测试本地Stable Diffusion
        console.log('\n测试本地Stable Diffusion:');
        const localImagePath = await generateImage('明朝王爷穿着华丽的明黄色龙袍，坐在王府花园的凉亭中，手持折扇，神态悠闲，周围有仆人伺候', {}, 'local');
        console.log('本地Stable Diffusion生成成功：', localImagePath);
        
        // 测试豆包API
        console.log('\n测试豆包API:');
        const apiImagePath = await generateImage('赛博朋克风格的未来都市夜景，高楼大厦鳞次栉比，霓虹灯闪烁，空中有飞行汽车穿梭', {}, 'api');
        console.log('豆包API生成成功：', apiImagePath);
        
        console.log('\n测试完成！所有图像生成功能测试通过。');
    } catch (error) {
        console.error('测试失败：', error);
    }
}

// 运行测试
testImageGenerator();