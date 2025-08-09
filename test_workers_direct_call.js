// 直接测试Workers调用Fly.io的脚本
// 模拟Workers环境

const WORKERS_URL =
  'https://getgoodtape-api-production.wangdonghuiibt-cloudflare.workers.dev';

async function testDirectCall() {
  console.log('🧪 测试Workers直接调用...');

  try {
    // 直接调用Workers的转换端点，看看是否有详细错误信息
    const response = await fetch(`${WORKERS_URL}/api/convert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        format: 'mp3',
        quality: '128',
      }),
    });

    console.log(`响应状态: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      console.log('转换响应:', JSON.stringify(data, null, 2));

      if (data.jobId) {
        console.log('\n监控任务进度...');

        // 监控5分钟
        for (let i = 0; i < 30; i++) {
          await new Promise(resolve => setTimeout(resolve, 10000)); // 等待10秒

          const statusResponse = await fetch(
            `${WORKERS_URL}/api/status/${data.jobId}`
          );
          const statusData = await statusResponse.json();

          console.log(
            `进度 ${i + 1}/30: ${statusData.progress}%, 状态: ${statusData.status}`
          );

          if (statusData.status === 'completed') {
            console.log('✅ 转换完成!');
            console.log('最终结果:', JSON.stringify(statusData, null, 2));
            break;
          } else if (statusData.status === 'failed') {
            console.log('❌ 转换失败!');
            console.log('错误信息:', statusData.error);
            break;
          }
        }
      }
    } else {
      const errorText = await response.text();
      console.error('Workers调用失败:', errorText);
    }
  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

testDirectCall();
