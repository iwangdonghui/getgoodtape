#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 批量组件优化工具');
console.log('====================');

// 需要优化的组件列表
const componentsToOptimize = [
  'components/APIStatusMonitor.tsx',
  'components/APIHealthChecker.tsx',
  'components/PerformanceMonitor.tsx',
  'components/SystemDiagnostics.tsx',
  'components/NetworkMonitor.tsx',
  'components/DebugConsole.tsx',
  'components/FilePreviewCard.tsx',
  'components/ConversionError.tsx',
  'components/ThemeToggle.tsx',
  'components/SEOHead.tsx',
];

// 需要修复import *的组件
const importStarComponents = [
  'components/ui/badge.tsx',
  'components/ui/button.tsx',
  'components/ui/card.tsx',
  'components/ui/input.tsx',
  'components/ui/select.tsx',
];

// 添加React.memo的模板
function addReactMemo(content, componentName) {
  // 检查是否已经使用了memo
  if (content.includes('memo(') || content.includes('React.memo')) {
    return content;
  }

  // 添加memo导入
  if (content.includes('import { ') && !content.includes('memo')) {
    content = content.replace(
      /import { ([^}]+) } from 'react'/,
      "import { $1, memo } from 'react'"
    );
  } else if (content.includes('import React') && !content.includes('memo')) {
    content = content.replace(
      "import React from 'react'",
      "import React, { memo } from 'react'"
    );
  }

  // 查找export default function
  const exportDefaultMatch = content.match(/export default function (\w+)/);
  if (exportDefaultMatch) {
    const funcName = exportDefaultMatch[1];

    // 替换export default function为const + memo
    content = content.replace(
      `export default function ${funcName}`,
      `const ${funcName} = memo(function ${funcName}`
    );

    // 在文件末尾添加export default
    if (!content.includes(`export default ${funcName};`)) {
      content = content.replace(/}\s*$/, `});\n\nexport default ${funcName};`);
    }
  }

  return content;
}

// 修复import *问题
function fixImportStar(content) {
  // 查找import * as React模式
  const importStarMatch = content.match(
    /import \* as (\w+) from ['"]([^'"]+)['"]/g
  );

  if (importStarMatch) {
    importStarMatch.forEach(importLine => {
      const match = importLine.match(
        /import \* as (\w+) from ['"]([^'"]+)['"]/
      );
      if (match) {
        const alias = match[1];
        const moduleName = match[2];

        // 分析代码中实际使用的导出
        const usedExports = new Set();

        // 查找React.xxx模式
        const reactUsageRegex = new RegExp(`${alias}\\.(\\w+)`, 'g');
        let usageMatch;
        while ((usageMatch = reactUsageRegex.exec(content)) !== null) {
          usedExports.add(usageMatch[1]);
        }

        if (usedExports.size > 0) {
          const namedImports = Array.from(usedExports).join(', ');
          const newImport = `import { ${namedImports} } from '${moduleName}'`;

          // 替换import语句
          content = content.replace(importLine, newImport);

          // 替换使用处
          usedExports.forEach(exportName => {
            const regex = new RegExp(`${alias}\\.${exportName}`, 'g');
            content = content.replace(regex, exportName);
          });
        }
      }
    });
  }

  return content;
}

// 包装console.log
function wrapConsoleLogs(content) {
  // 查找所有console.log调用
  const consoleLogRegex = /console\.log\(/g;

  content = content.replace(consoleLogRegex, (match, offset) => {
    // 检查是否已经被包装
    const beforeMatch = content.substring(Math.max(0, offset - 50), offset);
    if (beforeMatch.includes("process.env.NODE_ENV === 'development'")) {
      return match;
    }

    return "if (process.env.NODE_ENV === 'development') console.log(";
  });

  // 修复括号匹配
  const lines = content.split('\n');
  const fixedLines = lines.map(line => {
    if (
      line.includes(
        "if (process.env.NODE_ENV === 'development') console.log("
      ) &&
      !line.includes(');')
    ) {
      // 查找对应的结束括号并添加额外的括号
      const openParens = (line.match(/\(/g) || []).length;
      const closeParens = (line.match(/\)/g) || []).length;
      if (openParens > closeParens) {
        return line + ')';
      }
    }
    return line;
  });

  return fixedLines.join('\n');
}

// 优化单个组件
async function optimizeComponent(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  文件不存在: ${filePath}`);
      return false;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    let optimizedContent = content;

    const componentName = path.basename(filePath, '.tsx');
    console.log(`🔧 优化组件: ${componentName}`);

    // 应用优化
    optimizedContent = addReactMemo(optimizedContent, componentName);
    optimizedContent = fixImportStar(optimizedContent);
    optimizedContent = wrapConsoleLogs(optimizedContent);

    // 如果内容有变化，写回文件
    if (optimizedContent !== content) {
      fs.writeFileSync(filePath, optimizedContent, 'utf8');
      console.log(`✅ ${componentName} 优化完成`);
      return true;
    } else {
      console.log(`ℹ️  ${componentName} 无需优化`);
      return false;
    }
  } catch (error) {
    console.error(`❌ 优化 ${filePath} 失败:`, error.message);
    return false;
  }
}

// 批量优化组件
async function optimizeComponents() {
  console.log('🔧 开始批量优化组件...\n');

  let optimizedCount = 0;
  const allComponents = [...componentsToOptimize, ...importStarComponents];

  for (const componentPath of allComponents) {
    const success = await optimizeComponent(componentPath);
    if (success) {
      optimizedCount++;
    }
    console.log(''); // 空行分隔
  }

  console.log('📊 优化总结');
  console.log('============');
  console.log(`总组件数: ${allComponents.length}`);
  console.log(`优化成功: ${optimizedCount}`);
  console.log(`跳过: ${allComponents.length - optimizedCount}`);

  if (optimizedCount > 0) {
    console.log('\n🎉 批量优化完成！建议运行以下命令验证：');
    console.log('npm run perf:audit');
    console.log('npm run build');
  } else {
    console.log('\n✨ 所有组件都已经是最优状态！');
  }

  return optimizedCount > 0;
}

// 运行优化
if (require.main === module) {
  optimizeComponents()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('批量优化失败:', error);
      process.exit(1);
    });
}

module.exports = { optimizeComponents, optimizeComponent };
