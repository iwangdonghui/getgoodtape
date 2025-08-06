#!/usr/bin/env python3
"""
前端功能演示脚本
"""

import requests
import json
import time

def demo_conversion_flow():
    """演示完整的转换流程"""
    
    print("🎬 GetGoodTape 前端功能演示")
    print("=" * 50)
    
    base_url = "http://localhost:3000/api"
    test_url = "https://www.youtube.com/watch?v=jNQXAC9IVRw"
    
    print(f"📺 测试视频: {test_url}")
    print("   (YouTube 第一个视频 - Me at the zoo)")
    
    # 步骤 1: URL 验证
    print("\n🔍 步骤 1: URL 验证")
    print("-" * 30)
    
    try:
        validation_data = {"url": test_url}
        response = requests.post(f"{base_url}/validate", json=validation_data, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            if result.get('isValid'):
                metadata = result.get('metadata', {})
                print("✅ URL 验证成功")
                print(f"   标题: {metadata.get('title', 'Unknown')}")
                print(f"   上传者: {metadata.get('uploader', 'Unknown')}")
                print(f"   时长: {metadata.get('duration', 0)} 秒")
                print(f"   平台: {result.get('platform', 'Unknown')}")
            else:
                print("❌ URL 验证失败")
                return
        else:
            print(f"❌ 验证请求失败: {response.status_code}")
            return
    except Exception as e:
        print(f"❌ 验证异常: {e}")
        return
    
    # 步骤 2: MP3 转换
    print("\n🎵 步骤 2: MP3 转换")
    print("-" * 30)
    
    try:
        mp3_data = {
            "url": test_url,
            "format": "mp3",
            "quality": "high"
        }
        
        print("⏳ 开始 MP3 转换...")
        start_time = time.time()
        
        response = requests.post(f"{base_url}/convert", json=mp3_data, timeout=120)
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                conversion_time = time.time() - start_time
                file_info = result.get('result', {})
                
                print("✅ MP3 转换成功")
                print(f"   文件名: {file_info.get('filename', 'Unknown')}")
                print(f"   文件大小: {file_info.get('file_size', 0):,} bytes")
                print(f"   转换时间: {conversion_time:.1f} 秒")
                print(f"   下载链接: http://localhost:3000{file_info.get('download_url', '')}")
            else:
                print(f"❌ MP3 转换失败: {result.get('error', 'Unknown error')}")
        else:
            print(f"❌ MP3 转换请求失败: {response.status_code}")
    except Exception as e:
        print(f"❌ MP3 转换异常: {e}")
    
    # 步骤 3: MP4 转换
    print("\n🎥 步骤 3: MP4 转换")
    print("-" * 30)
    
    try:
        mp4_data = {
            "url": test_url,
            "format": "mp4",
            "quality": "medium"
        }
        
        print("⏳ 开始 MP4 转换...")
        start_time = time.time()
        
        response = requests.post(f"{base_url}/convert", json=mp4_data, timeout=120)
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                conversion_time = time.time() - start_time
                file_info = result.get('result', {})
                
                print("✅ MP4 转换成功")
                print(f"   文件名: {file_info.get('filename', 'Unknown')}")
                print(f"   文件大小: {file_info.get('file_size', 0):,} bytes")
                print(f"   视频时长: {file_info.get('duration', 0)} 秒")
                print(f"   转换时间: {conversion_time:.1f} 秒")
                print(f"   下载链接: http://localhost:3000{file_info.get('download_url', '')}")
            else:
                print(f"❌ MP4 转换失败: {result.get('error', 'Unknown error')}")
        else:
            print(f"❌ MP4 转换请求失败: {response.status_code}")
    except Exception as e:
        print(f"❌ MP4 转换异常: {e}")
    
    # 演示总结
    print("\n" + "=" * 50)
    print("🎉 演示完成！")
    print("\n📊 功能总结:")
    print("✅ URL 验证 - 自动检测视频信息")
    print("✅ MP3 转换 - 提取音频文件")
    print("✅ MP4 转换 - 下载视频文件")
    print("✅ 文件下载 - 通过前端代理下载")
    
    print("\n🌐 前端界面:")
    print("   主页: http://localhost:3000")
    print("   应用: http://localhost:3000/app")
    
    print("\n🔧 技术架构:")
    print("   前端: Next.js (localhost:3000)")
    print("   后端: FastAPI (Fly.io)")
    print("   代理: 住宅代理 (Decodo)")
    print("   存储: 临时文件系统")

def demo_error_handling():
    """演示错误处理"""
    
    print("\n🚨 错误处理演示")
    print("=" * 30)
    
    base_url = "http://localhost:3000/api"
    
    # 测试无效 URL
    print("\n1️⃣ 测试无效 URL...")
    try:
        invalid_data = {"url": "not-a-valid-url"}
        response = requests.post(f"{base_url}/validate", json=invalid_data, timeout=10)
        result = response.json()
        
        if not result.get('isValid'):
            print("✅ 正确识别无效 URL")
            print(f"   错误信息: {result.get('error', {}).get('message', 'Unknown')}")
        else:
            print("❌ 未能识别无效 URL")
    except Exception as e:
        print(f"❌ 测试异常: {e}")
    
    # 测试不支持的平台
    print("\n2️⃣ 测试不支持的平台...")
    try:
        unsupported_data = {"url": "https://example.com/video"}
        response = requests.post(f"{base_url}/validate", json=unsupported_data, timeout=10)
        result = response.json()
        
        if not result.get('isValid'):
            print("✅ 正确识别不支持的平台")
            print(f"   错误信息: {result.get('error', {}).get('message', 'Unknown')}")
        else:
            print("❌ 未能识别不支持的平台")
    except Exception as e:
        print(f"❌ 测试异常: {e}")

def main():
    """主演示函数"""
    
    # 检查前端服务
    try:
        response = requests.get("http://localhost:3000/api/health", timeout=5)
        if response.status_code != 200:
            print("❌ 前端服务未运行，请先启动:")
            print("   cd app && npm run dev")
            return
    except:
        print("❌ 前端服务未运行，请先启动:")
        print("   cd app && npm run dev")
        return
    
    # 运行演示
    demo_conversion_flow()
    demo_error_handling()
    
    print("\n" + "=" * 50)
    print("🎊 演示结束！")
    print("\n💡 提示:")
    print("- 所有功能都通过前端 API 路由代理到后端")
    print("- 支持 YouTube 视频的 MP3 和 MP4 转换")
    print("- 具备完整的错误处理和用户反馈")
    print("- 前端界面友好，支持实时预览")

if __name__ == "__main__":
    main()