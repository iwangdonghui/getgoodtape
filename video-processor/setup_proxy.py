#!/usr/bin/env python3
"""
代理设置助手脚本
帮助配置推荐的代理服务
"""

import os
import sys
from pathlib import Path

def main():
    print("🚀 GetGoodTape 代理设置助手")
    print("=" * 50)
    
    print("\n📊 推荐代理方案分析:")
    print("基于你提供的代理服务定价，我们推荐以下方案：")
    print()
    
    # 显示方案对比
    plans = [
        {
            "name": "2GB套餐",
            "price": "$6/月",
            "per_gb": "$3.0/GB", 
            "suitable": "轻度使用",
            "description": "每天处理10个视频元数据 + 2个音频下载"
        },
        {
            "name": "8GB套餐 🏆",
            "price": "$22/月", 
            "per_gb": "$2.75/GB",
            "suitable": "中度使用 (推荐)",
            "description": "每天处理20个视频元数据 + 3个完整视频下载"
        },
        {
            "name": "25GB套餐",
            "price": "$65/月",
            "per_gb": "$2.6/GB",
            "suitable": "重度使用", 
            "description": "每天处理50个视频元数据 + 8个完整视频下载"
        },
        {
            "name": "按需付费",
            "price": "变动",
            "per_gb": "$3.5/GB",
            "suitable": "不确定使用量",
            "description": "用多少付多少，无月度承诺"
        }
    ]
    
    for i, plan in enumerate(plans, 1):
        print(f"{i}. {plan['name']}")
        print(f"   价格: {plan['price']} ({plan['per_gb']})")
        print(f"   适合: {plan['suitable']}")
        print(f"   说明: {plan['description']}")
        print()
    
    print("💡 为什么推荐8GB套餐？")
    print("✅ 最佳性价比: $2.75/GB vs $3.5/GB (按需付费)")
    print("✅ 50%折扣优惠")
    print("✅ 流量充足，适合中等使用量")
    print("✅ 可随时调整套餐")
    print()
    
    # 获取用户输入
    while True:
        choice = input("请选择你的套餐 (1-4): ").strip()
        if choice in ['1', '2', '3', '4']:
            selected_plan = plans[int(choice) - 1]
            break
        print("❌ 请输入有效选择 (1-4)")
    
    print(f"\n✅ 你选择了: {selected_plan['name']}")
    print()
    
    # 获取代理配置信息
    print("🔧 请提供代理服务配置信息:")
    print("(这些信息将用于配置环境变量)")
    print()
    
    proxy_user = input("代理用户名: ").strip()
    proxy_pass = input("代理密码: ").strip()
    proxy_endpoint = input("代理端点 (例如: proxy.example.com:10000): ").strip()
    
    # 可选的YouTube API配置
    print("\n🎯 YouTube API配置 (可选，作为备用):")
    youtube_api_key = input("YouTube API Key (可选，直接回车跳过): ").strip()
    
    # 生成环境变量配置
    print("\n📝 生成的环境变量配置:")
    print("=" * 50)
    
    env_config = f"""
# 代理配置 - {selected_plan['name']}
RESIDENTIAL_PROXY_USER={proxy_user}
RESIDENTIAL_PROXY_PASS={proxy_pass}
RESIDENTIAL_PROXY_ENDPOINT={proxy_endpoint}

# YouTube API (可选备用)
YOUTUBE_API_KEY={youtube_api_key if youtube_api_key else 'your_youtube_api_key_here'}

# 服务配置
PORT=8000
PYTHONUNBUFFERED=1
"""
    
    print(env_config)
    
    # 保存到.env文件
    save_env = input("\n💾 是否保存到 .env 文件? (y/n): ").strip().lower()
    if save_env == 'y':
        env_file = Path('.env')
        with open(env_file, 'w') as f:
            f.write(env_config.strip())
        print(f"✅ 配置已保存到 {env_file.absolute()}")
    
    # 显示部署指导
    print("\n🚀 下一步部署指导:")
    print("=" * 50)
    
    print("1. **Railway部署** (推荐):")
    print("   - 登录 https://railway.app")
    print("   - 创建新项目，连接GitHub仓库")
    print("   - 在环境变量中添加上述配置")
    print("   - 部署完成后测试: /health 端点")
    print()
    
    print("2. **监控使用量:**")
    print("   - 访问: /proxy-stats 查看使用统计")
    print("   - 运行: python monitor_proxy_usage.py --daily")
    print("   - 运行: python monitor_proxy_usage.py --monthly")
    print()
    
    print("3. **成本优化建议:**")
    print("   - 优先使用YouTube API获取元数据（免费）")
    print("   - 仅在必要时使用代理下载")
    print("   - 实施缓存机制避免重复请求")
    print("   - 定期检查使用量，调整套餐")
    print()
    
    print("4. **测试代理功能:**")
    print("   ```bash")
    print("   curl -X POST https://your-deployment-url/extract-metadata \\")
    print("     -H 'Content-Type: application/json' \\")
    print("     -d '{\"url\": \"https://www.youtube.com/watch?v=dQw4w9WgXcQ\"}'")
    print("   ```")
    print()
    
    print("📊 流量使用估算:")
    print("- 视频元数据: ~50KB/次")
    print("- 音频下载(10分钟): ~10MB/次") 
    print("- 视频下载(10分钟720p): ~100MB/次")
    print("- 视频下载(10分钟1080p): ~200MB/次")
    print()
    
    print(f"💰 你选择的 {selected_plan['name']} 预计可以:")
    if choice == '1':  # 2GB
        print("- 每月处理约 300个视频元数据")
        print("- 或下载约 60个音频文件")
        print("- 或下载约 20个720p视频")
    elif choice == '2':  # 8GB
        print("- 每月处理约 1600个视频元数据")
        print("- 或下载约 800个音频文件") 
        print("- 或下载约 80个720p视频")
    elif choice == '3':  # 25GB
        print("- 每月处理约 5000个视频元数据")
        print("- 或下载约 2500个音频文件")
        print("- 或下载约 250个720p视频")
    else:  # 按需付费
        print("- 根据实际使用量付费")
        print("- 适合不确定使用量的场景")
    
    print("\n🎉 设置完成！祝你使用愉快！")
    print("如有问题，请查看 PROXY_COST_ANALYSIS.md 获取详细分析")

if __name__ == "__main__":
    main()
