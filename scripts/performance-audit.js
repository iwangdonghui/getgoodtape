#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 GetGoodTape 性能审计工具');
console.log('==============================');

// 性能检查项目
const performanceChecks = {
  bundleSize: {
    name: '包大小分析',
    check: checkBundleSize,
  },
  imageOptimization: {
    name: '图片优化检查',
    check: checkImageOptimization,
  },
  codeOptimization: {
    name: '代码优化检查',
    check: checkCodeOptimization,
  },
  memoryLeaks: {
    name: '内存泄漏检查',
    check: checkMemoryLeaks,
  },
  renderOptimization: {
    name: '渲染优化检查',
    check: checkRenderOptimization,
  },
};

// 检查包大小
async function checkBundleSize() {
  const issues = [];
  const suggestions = [];

  try {
    // 检查 package.json 中的依赖
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    // 大型依赖包检查
    const largeDependencies = [
      'lodash',
      'moment',
      'jquery',
      'bootstrap',
      'material-ui',
    ];

    largeDependencies.forEach(dep => {
      if (dependencies[dep]) {
        issues.push(`发现大型依赖包: ${dep}`);
        suggestions.push(`考虑使用更轻量的替代方案替换 ${dep}`);
      }
    });

    // 检查是否有未使用的依赖
    const usedDependencies = new Set();
    const sourceFiles = getAllSourceFiles();

    sourceFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      Object.keys(dependencies).forEach(dep => {
        if (
          content.includes(`from '${dep}'`) ||
          content.includes(`require('${dep}')`)
        ) {
          usedDependencies.add(dep);
        }
      });
    });

    const unusedDeps = Object.keys(dependencies).filter(
      dep => !usedDependencies.has(dep)
    );
    if (unusedDeps.length > 0) {
      issues.push(`发现 ${unusedDeps.length} 个可能未使用的依赖`);
      suggestions.push(
        `移除未使用的依赖: ${unusedDeps.slice(0, 5).join(', ')}`
      );
    }
  } catch (error) {
    issues.push(`包大小检查失败: ${error.message}`);
  }

  return { issues, suggestions };
}

// 检查图片优化
async function checkImageOptimization() {
  const issues = [];
  const suggestions = [];

  try {
    const imageFiles = getAllImageFiles();
    let totalSize = 0;
    let largeImages = 0;

    imageFiles.forEach(file => {
      const stats = fs.statSync(file);
      const sizeKB = stats.size / 1024;
      totalSize += sizeKB;

      if (sizeKB > 500) {
        largeImages++;
        issues.push(
          `大型图片文件: ${path.basename(file)} (${Math.round(sizeKB)}KB)`
        );
      }
    });

    if (largeImages > 0) {
      suggestions.push('使用 WebP 或 AVIF 格式优化大型图片');
      suggestions.push('实施图片懒加载');
    }

    if (totalSize > 5000) {
      issues.push(`图片总大小过大: ${Math.round(totalSize)}KB`);
      suggestions.push('考虑使用 CDN 和图片压缩');
    }
  } catch (error) {
    issues.push(`图片优化检查失败: ${error.message}`);
  }

  return { issues, suggestions };
}

// 检查代码优化
async function checkCodeOptimization() {
  const issues = [];
  const suggestions = [];

  try {
    const sourceFiles = getAllSourceFiles();

    sourceFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      // 检查 console.log
      const consoleLogs = lines.filter(line =>
        line.includes('console.log')
      ).length;
      if (consoleLogs > 5) {
        issues.push(
          `${path.basename(file)}: 过多的 console.log (${consoleLogs})`
        );
      }

      // 检查大型函数
      const functionMatches =
        content.match(/function\s+\w+\s*\([^)]*\)\s*{/g) || [];
      if (functionMatches.length > 20) {
        issues.push(
          `${path.basename(file)}: 函数数量过多 (${functionMatches.length})`
        );
      }

      // 检查内联样式
      const inlineStyles = (content.match(/style\s*=\s*{/g) || []).length;
      if (inlineStyles > 10) {
        issues.push(`${path.basename(file)}: 过多内联样式 (${inlineStyles})`);
      }

      // 检查未优化的导入
      if (content.includes('import * as')) {
        issues.push(`${path.basename(file)}: 使用了 import * 导入`);
        suggestions.push('使用具名导入替代 import * 以支持 tree shaking');
      }
    });
  } catch (error) {
    issues.push(`代码优化检查失败: ${error.message}`);
  }

  return { issues, suggestions };
}

// 检查内存泄漏
async function checkMemoryLeaks() {
  const issues = [];
  const suggestions = [];

  try {
    const sourceFiles = getAllSourceFiles();

    sourceFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');

      // 检查未清理的事件监听器
      const addEventListeners = (content.match(/addEventListener/g) || [])
        .length;
      const removeEventListeners = (content.match(/removeEventListener/g) || [])
        .length;

      if (addEventListeners > removeEventListeners && addEventListeners > 2) {
        issues.push(`${path.basename(file)}: 可能存在未清理的事件监听器`);
        suggestions.push('确保在组件卸载时清理所有事件监听器');
      }

      // 检查未清理的定时器
      const setIntervals = (content.match(/setInterval/g) || []).length;
      const clearIntervals = (content.match(/clearInterval/g) || []).length;

      if (setIntervals > clearIntervals && setIntervals > 0) {
        issues.push(`${path.basename(file)}: 可能存在未清理的定时器`);
        suggestions.push('确保在组件卸载时清理所有定时器');
      }

      // 检查大型对象创建
      if (
        content.includes('new Array(') &&
        content.includes('new Array(1000')
      ) {
        issues.push(`${path.basename(file)}: 创建了大型数组`);
        suggestions.push('考虑使用虚拟化或分页来处理大型数据集');
      }
    });
  } catch (error) {
    issues.push(`内存泄漏检查失败: ${error.message}`);
  }

  return { issues, suggestions };
}

// 检查渲染优化
async function checkRenderOptimization() {
  const issues = [];
  const suggestions = [];

  try {
    const sourceFiles = getAllSourceFiles();

    sourceFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');

      // 检查是否使用了 React.memo
      if (
        content.includes('export default function') &&
        !content.includes('React.memo') &&
        !content.includes('memo(')
      ) {
        const componentName = path.basename(file, '.tsx');
        if (componentName !== 'page' && componentName !== 'layout') {
          issues.push(`${componentName}: 未使用 React.memo 优化`);
        }
      }

      // 检查是否有内联对象创建
      const inlineObjects = (content.match(/\{\s*\w+:/g) || []).length;
      if (inlineObjects > 10) {
        issues.push(
          `${path.basename(file)}: 过多内联对象创建 (${inlineObjects})`
        );
        suggestions.push('将对象创建移到组件外部或使用 useMemo');
      }

      // 检查是否有内联函数
      const inlineFunctions = (content.match(/\(\) => /g) || []).length;
      if (inlineFunctions > 15) {
        issues.push(
          `${path.basename(file)}: 过多内联函数 (${inlineFunctions})`
        );
        suggestions.push('使用 useCallback 优化内联函数');
      }
    });
  } catch (error) {
    issues.push(`渲染优化检查失败: ${error.message}`);
  }

  return { issues, suggestions };
}

// 获取所有源文件
function getAllSourceFiles() {
  const files = [];
  const extensions = ['.ts', '.tsx', '.js', '.jsx'];

  function scanDirectory(dir) {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (
        stat.isDirectory() &&
        !item.startsWith('.') &&
        item !== 'node_modules'
      ) {
        scanDirectory(fullPath);
      } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    });
  }

  scanDirectory('app');
  scanDirectory('components');
  scanDirectory('hooks');
  scanDirectory('lib');

  return files;
}

// 获取所有图片文件
function getAllImageFiles() {
  const files = [];
  const extensions = [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.webp',
    '.avif',
    '.svg',
  ];

  function scanDirectory(dir) {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.startsWith('.')) {
        scanDirectory(fullPath);
      } else if (
        stat.isFile() &&
        extensions.some(ext => item.toLowerCase().endsWith(ext))
      ) {
        files.push(fullPath);
      }
    });
  }

  scanDirectory('public');
  scanDirectory('app');

  return files;
}

// 运行所有检查
async function runAudit() {
  console.log('🔍 开始性能审计...\n');

  let totalIssues = 0;
  const allSuggestions = [];

  for (const [key, check] of Object.entries(performanceChecks)) {
    console.log(`📊 ${check.name}...`);

    try {
      const result = await check.check();

      if (result.issues.length > 0) {
        console.log(`  ❌ 发现 ${result.issues.length} 个问题:`);
        result.issues.forEach(issue => console.log(`     - ${issue}`));
        totalIssues += result.issues.length;
      } else {
        console.log(`  ✅ 无问题`);
      }

      if (result.suggestions.length > 0) {
        allSuggestions.push(...result.suggestions);
      }
    } catch (error) {
      console.log(`  ❌ 检查失败: ${error.message}`);
      totalIssues++;
    }

    console.log('');
  }

  // 总结
  console.log('📋 审计总结');
  console.log('============');
  console.log(`总问题数: ${totalIssues}`);

  if (allSuggestions.length > 0) {
    console.log('\n💡 优化建议:');
    [...new Set(allSuggestions)].forEach((suggestion, index) => {
      console.log(`${index + 1}. ${suggestion}`);
    });
  }

  if (totalIssues === 0) {
    console.log('\n🎉 恭喜！未发现性能问题。');
  } else if (totalIssues < 10) {
    console.log('\n⚠️  发现少量性能问题，建议优化。');
  } else {
    console.log('\n🚨 发现较多性能问题，强烈建议立即优化。');
  }

  return totalIssues === 0;
}

// 运行审计
if (require.main === module) {
  runAudit()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('审计运行失败:', error);
      process.exit(1);
    });
}

module.exports = { runAudit, performanceChecks };
