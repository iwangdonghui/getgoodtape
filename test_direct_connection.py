#!/usr/bin/env python3
"""
测试完全不使用代理的直连版本
"""

import yt_dlp
import sys
import os

def test_direct_youtube():
    """测试直连 YouTube"""
    
    print("🧪 测试直连 YouTube（不使用任何代理）")
    print("=" * 40)
    
    test_url = "https://www.youtube.com/watch?v=jNQXAC9IVRw"
    
    # 完全不使用代理的配置
    ydl_opts = {
        'quiet': False,
        'no_warnings': False,
        'extract_flat': False,
        'proxy': None,  # 明确不使用代理
    }
    
    try:
        print(f"🔍 尝试提取视频信息: {test_url}")
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(test_url, download=False)
            
        print("✅ 成功！")
        print(f"   标题: {info.get('title', 'Unknown')}")
        print(f"   时长: {info.get('duration', 0)} 秒")
        print(f"   上传者: {info.get('uploader', 'Unknown')}")
        
        return True
        
    except Exception as e:
        print(f"❌ 失败: {e}")
        return False

def test_with_different_user_agent():
    """测试使用不同的 User-Agent"""
    
    print("\n🔄 测试使用不同的 User-Agent")
    print("=" * 40)
    
    test_url = "https://www.youtube.com/watch?v=jNQXAC9IVRw"
    
    # 使用不同的 User-Agent
    ydl_opts = {
        'quiet': False,
        'no_warnings': False,
        'proxy': None,
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    }
    
    try:
        print(f"🔍 尝试提取视频信息: {test_url}")
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(test_url, download=False)
            
        print("✅ 成功！")
        print(f"   标题: {info.get('title', 'Unknown')}")
        print(f"   时长: {info.get('duration', 0)} 秒")
        
        return True
        
    except Exception as e:
        print(f"❌ 失败: {e}")
        return False

def main():
    """主测试函数"""
    
    print("🧪 YouTube 直连测试")
    print("=" * 50)
    
    # 检查网络连接
    print("📋 网络环境检查:")
    os.system("curl -s https://www.youtube.com > /dev/null && echo '✅ YouTube 可访问' || echo '❌ YouTube 不可访问'")
    
    # 测试直连
    success1 = test_direct_youtube()
    
    # 如果直连失败，尝试不同的 User-Agent
    if not success1:
        success2 = test_with_different_user_agent()
    else:
        success2 = True
    
    print("\n" + "=" * 50)
    print("📊 测试结果:")
    
    if success1 or success2:
        print("🎉 至少一种方法成功！")
        print("💡 建议: 修改本地服务配置，完全禁用代理功能")
        print("\n🛠️ 下一步:")
        print("1. 修改服务配置，添加 'no_proxy' 选项")
        print("2. 或者暂时关闭 VPN 进行测试")
        print("3. 或者使用生产环境进行测试")
    else:
        print("❌ 所有方法都失败了")
        print("🔧 可能的原因:")
        print("1. VPN 阻止了 YouTube 访问")
        print("2. 网络连接问题")
        print("3. YouTube 地区限制")
        
        print("\n💡 建议:")
        print("1. 暂时关闭 VPN 测试")
        print("2. 使用生产环境: https://getgoodtape-video-proc.fly.dev")
        print("3. 检查网络连接")

if __name__ == "__main__":
    main()