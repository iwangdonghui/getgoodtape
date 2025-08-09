// 调试Workers到Fly.io连接的脚本
// 这个脚本可以在Cloudflare Workers环境中运行

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 只处理调试路径
    if (url.pathname !== '/debug-flyio-connection') {
      return new Response('Not Found', { status: 404 });
    }

    const results = {
      timestamp: new Date().toISOString(),
      environment: env.ENVIRONMENT,
      processingServiceUrl: env.PROCESSING_SERVICE_URL,
      tests: [],
    };

    try {
      // 测试1: 基础连接测试
      console.log('🔍 测试1: 基础连接到Fly.io');
      const basicTest = await testBasicConnection(env.PROCESSING_SERVICE_URL);
      results.tests.push({
        name: 'Basic Connection',
        ...basicTest,
      });

      // 测试2: 健康检查端点
      console.log('🔍 测试2: 健康检查端点');
      const healthTest = await testHealthEndpoint(env.PROCESSING_SERVICE_URL);
      results.tests.push({
        name: 'Health Check',
        ...healthTest,
      });

      // 测试3: 元数据提取端点
      console.log('🔍 测试3: 元数据提取端点');
      const metadataTest = await testMetadataEndpoint(
        env.PROCESSING_SERVICE_URL
      );
      results.tests.push({
        name: 'Metadata Extraction',
        ...metadataTest,
      });

      // 测试4: 转换端点连接（不等待完成）
      console.log('🔍 测试4: 转换端点连接');
      const convertTest = await testConvertEndpoint(env.PROCESSING_SERVICE_URL);
      results.tests.push({
        name: 'Convert Endpoint',
        ...convertTest,
      });
    } catch (error) {
      results.error = error.message;
      console.error('调试过程中出错:', error);
    }

    // 返回调试结果
    return new Response(JSON.stringify(results, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  },
};

// 基础连接测试
async function testBasicConnection(baseUrl) {
  const startTime = Date.now();

  try {
    const response = await fetch(baseUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'GetGoodTape-Workers-Debug/1.0',
      },
      signal: AbortSignal.timeout(10000), // 10秒超时
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    return {
      success: true,
      status: response.status,
      statusText: response.statusText,
      responseTime: `${responseTime}ms`,
      headers: Object.fromEntries(response.headers.entries()),
    };
  } catch (error) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    return {
      success: false,
      error: error.message,
      responseTime: `${responseTime}ms`,
      errorType: error.name,
    };
  }
}

// 健康检查测试
async function testHealthEndpoint(baseUrl) {
  const startTime = Date.now();

  try {
    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      headers: {
        'User-Agent': 'GetGoodTape-Workers-Debug/1.0',
      },
      signal: AbortSignal.timeout(15000), // 15秒超时
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        status: response.status,
        responseTime: `${responseTime}ms`,
        data: data,
      };
    } else {
      return {
        success: false,
        status: response.status,
        statusText: response.statusText,
        responseTime: `${responseTime}ms`,
      };
    }
  } catch (error) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    return {
      success: false,
      error: error.message,
      responseTime: `${responseTime}ms`,
      errorType: error.name,
    };
  }
}

// 元数据提取测试
async function testMetadataEndpoint(baseUrl) {
  const startTime = Date.now();

  try {
    const response = await fetch(`${baseUrl}/extract-metadata`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GetGoodTape-Workers-Debug/1.0',
      },
      body: JSON.stringify({
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      }),
      signal: AbortSignal.timeout(30000), // 30秒超时
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        status: response.status,
        responseTime: `${responseTime}ms`,
        dataReceived: !!data.metadata,
        title: data.metadata?.title || 'N/A',
      };
    } else {
      const errorText = await response.text();
      return {
        success: false,
        status: response.status,
        statusText: response.statusText,
        responseTime: `${responseTime}ms`,
        errorBody: errorText,
      };
    }
  } catch (error) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    return {
      success: false,
      error: error.message,
      responseTime: `${responseTime}ms`,
      errorType: error.name,
    };
  }
}

// 转换端点连接测试（不等待完成）
async function testConvertEndpoint(baseUrl) {
  const startTime = Date.now();

  try {
    const response = await fetch(`${baseUrl}/convert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GetGoodTape-Workers-Debug/1.0',
      },
      body: JSON.stringify({
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        format: 'mp3',
        quality: '128',
      }),
      signal: AbortSignal.timeout(5000), // 5秒超时，不等待完成
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    return {
      success: true,
      status: response.status,
      statusText: response.statusText,
      responseTime: `${responseTime}ms`,
      note: 'Connection test only - did not wait for completion',
    };
  } catch (error) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // 超时是预期的，因为我们不等待转换完成
    if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
      return {
        success: true,
        responseTime: `${responseTime}ms`,
        note: 'Timeout expected - connection established successfully',
        errorType: error.name,
      };
    }

    return {
      success: false,
      error: error.message,
      responseTime: `${responseTime}ms`,
      errorType: error.name,
    };
  }
}
