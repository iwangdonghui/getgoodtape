#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 GetGoodTape API 配置修复工具');
console.log('================================');

// 正确的API配置
const CORRECT_WORKERS_URL =
  'https://getgoodtape-api-production.wangdonghuiibt-cloudflare.workers.dev';
const CORRECT_PROCESSOR_URL = 'https://getgoodtape-video-proc.fly.dev';

// 需要修复的文件列表
const apiFiles = [
  'app/api/platforms/route.ts',
  'app/api/convert/route.ts',
  'app/api/validate/route.ts',
  'app/api/status/[jobId]/route.ts',
  'app/api/download/[fileName]/route.ts',
];

function fixAPIFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  文件不存在: ${filePath}`);
    return false;
  }

  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    let modified = false;

    // 修复 Workers URL 配置
    const oldWorkersPattern = /const WORKERS_URL\s*=\s*[\s\S]*?;/;
    if (oldWorkersPattern.test(content)) {
      content = content.replace(
        oldWorkersPattern,
        `const WORKERS_URL = '${CORRECT_WORKERS_URL}';`
      );
      modified = true;
      console.log(`✅ 修复 Workers URL: ${filePath}`);
    }

    // 修复开发环境配置
    const devConfigPattern =
      /process\.env\.NODE_ENV\s*===\s*['"]development['"][\s\S]*?:/g;
    if (devConfigPattern.test(content)) {
      content = content.replace(
        devConfigPattern,
        '// 统一使用生产环境配置\n  false ? '
      );
      modified = true;
      console.log(`✅ 修复开发环境配置: ${filePath}`);
    }

    // 修复错误的URL
    const wrongUrls = [
      'http://localhost:8000',
      'http://localhost:8787',
      'https://getgoodtape-video-proc.fly.dev/api',
    ];

    wrongUrls.forEach(wrongUrl => {
      if (content.includes(wrongUrl)) {
        if (wrongUrl.includes('fly.dev')) {
          content = content.replace(
            new RegExp(wrongUrl, 'g'),
            CORRECT_PROCESSOR_URL
          );
        } else {
          content = content.replace(
            new RegExp(wrongUrl, 'g'),
            CORRECT_WORKERS_URL
          );
        }
        modified = true;
        console.log(`✅ 修复错误URL (${wrongUrl}): ${filePath}`);
      }
    });

    // 添加错误处理改进
    if (
      !content.includes('console.error') &&
      content.includes('catch (error)')
    ) {
      content = content.replace(
        /catch \(error\) \{[\s\S]*?\}/g,
        `catch (error) {
    console.error('API Error:', error);
    return Response.json({ 
      error: 'API request failed', 
      details: error.message 
    }, { status: 500 });
  }`
      );
      modified = true;
      console.log(`✅ 改进错误处理: ${filePath}`);
    }

    if (modified) {
      fs.writeFileSync(fullPath, content, 'utf8');
      return true;
    } else {
      console.log(`ℹ️  无需修改: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ 修复失败 ${filePath}:`, error.message);
    return false;
  }
}

function createBackup(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  const backupPath = fullPath + '.backup';

  if (fs.existsSync(fullPath) && !fs.existsSync(backupPath)) {
    fs.copyFileSync(fullPath, backupPath);
    console.log(`📁 创建备份: ${filePath}.backup`);
  }
}

function validateAPIConfig() {
  console.log('\n🔍 验证API配置...');

  const issues = [];

  apiFiles.forEach(filePath => {
    const fullPath = path.join(process.cwd(), filePath);

    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');

      // 检查是否使用了正确的URL
      if (
        !content.includes(CORRECT_WORKERS_URL) &&
        !content.includes(CORRECT_PROCESSOR_URL)
      ) {
        issues.push(`${filePath}: 未使用正确的API URL`);
      }

      // 检查是否有开发环境特殊配置
      if (content.includes('NODE_ENV') && content.includes('development')) {
        issues.push(`${filePath}: 仍有开发环境特殊配置`);
      }

      // 检查错误处理
      if (content.includes('catch') && !content.includes('console.error')) {
        issues.push(`${filePath}: 缺少错误日志`);
      }
    }
  });

  if (issues.length === 0) {
    console.log('✅ 所有API配置正确！');
  } else {
    console.log('⚠️  发现以下问题:');
    issues.forEach(issue => console.log(`   - ${issue}`));
  }

  return issues.length === 0;
}

function main() {
  console.log('\n📁 创建备份文件...');
  apiFiles.forEach(createBackup);

  console.log('\n🔧 开始修复API配置...');
  let fixedCount = 0;

  apiFiles.forEach(filePath => {
    if (fixAPIFile(filePath)) {
      fixedCount++;
    }
  });

  console.log(`\n📊 修复完成: ${fixedCount}/${apiFiles.length} 个文件被修改`);

  // 验证修复结果
  const isValid = validateAPIConfig();

  if (isValid) {
    console.log('\n🎉 API配置修复成功！');
    console.log('💡 建议重启开发服务器以应用更改');
  } else {
    console.log('\n⚠️  部分问题仍需手动修复');
  }

  console.log('\n📝 修复摘要:');
  console.log(`   - Workers API: ${CORRECT_WORKERS_URL}`);
  console.log(`   - 视频处理: ${CORRECT_PROCESSOR_URL}`);
  console.log('   - 统一配置，移除开发环境特殊处理');
  console.log('   - 改进错误处理和日志记录');
}

// 运行修复
if (require.main === module) {
  main();
}

module.exports = {
  fixAPIFile,
  validateAPIConfig,
  CORRECT_WORKERS_URL,
  CORRECT_PROCESSOR_URL,
};
