#!/usr/bin/env node

// 使用内置的 fetch (Node.js 18+)
const fetch = globalThis.fetch;

console.log('🧪 GetGoodTape API 健康测试');
console.log('==========================');

const BASE_URL = 'http://localhost:3001';

const endpoints = [
  {
    name: '前端健康检查',
    url: `${BASE_URL}/api/health`,
    method: 'GET',
    expected: 200,
  },
  {
    name: '平台信息',
    url: `${BASE_URL}/api/platforms`,
    method: 'GET',
    expected: 200,
  },
  {
    name: 'URL验证',
    url: `${BASE_URL}/api/validate`,
    method: 'POST',
    body: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    expected: 200,
  },
  {
    name: 'Workers API',
    url: 'https://getgoodtape-api-production.wangdonghuiibt-cloudflare.workers.dev/health',
    method: 'GET',
    expected: 200,
  },
];

async function testEndpoint(endpoint) {
  const startTime = Date.now();

  try {
    const options = {
      method: endpoint.method,
      headers: endpoint.body ? { 'Content-Type': 'application/json' } : {},
    };

    if (endpoint.body) {
      options.body = JSON.stringify(endpoint.body);
    }

    const response = await fetch(endpoint.url, options);
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    const status = response.status === endpoint.expected ? '✅' : '❌';
    const timeColor =
      responseTime < 1000 ? '🟢' : responseTime < 3000 ? '🟡' : '🔴';

    console.log(`${status} ${endpoint.name}`);
    console.log(`   状态: ${response.status} (期望: ${endpoint.expected})`);
    console.log(`   响应时间: ${timeColor} ${responseTime}ms`);

    if (response.ok) {
      try {
        const data = await response.json();
        console.log(
          `   响应数据: ${JSON.stringify(data).substring(0, 100)}...`
        );
      } catch (e) {
        console.log(`   响应: 非JSON格式`);
      }
    } else {
      const errorText = await response.text();
      console.log(`   错误: ${errorText.substring(0, 100)}...`);
    }

    console.log('');

    return {
      name: endpoint.name,
      success: response.status === endpoint.expected,
      responseTime,
      status: response.status,
    };
  } catch (error) {
    console.log(`❌ ${endpoint.name}`);
    console.log(`   错误: ${error.message}`);
    console.log('');

    return {
      name: endpoint.name,
      success: false,
      responseTime: Date.now() - startTime,
      error: error.message,
    };
  }
}

async function runTests() {
  console.log('🚀 开始测试...\n');

  const results = [];

  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);

    // 避免请求过快
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('📊 测试结果汇总');
  console.log('================');

  const successful = results.filter(r => r.success).length;
  const total = results.length;
  const avgResponseTime = Math.round(
    results.reduce((sum, r) => sum + r.responseTime, 0) / total
  );

  console.log(`✅ 成功: ${successful}/${total} 个端点`);
  console.log(`⏱️  平均响应时间: ${avgResponseTime}ms`);

  if (successful === total) {
    console.log('\n🎉 所有API端点正常工作！');
  } else {
    console.log('\n⚠️  部分API端点存在问题，请检查调试页面');
  }

  console.log('\n💡 提示:');
  console.log('   - 访问 http://localhost:3001/debug 查看详细诊断');
  console.log('   - 使用API健康检查器进行深度分析');
  console.log('   - 查看网络监控了解请求详情');

  return successful === total;
}

// 运行测试
if (require.main === module) {
  runTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('测试运行失败:', error);
      process.exit(1);
    });
}

module.exports = { runTests, testEndpoint };
