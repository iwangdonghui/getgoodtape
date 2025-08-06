#!/usr/bin/env python3
"""
前端功能测试脚本
"""

import requests
import json
import time

def test_frontend_api():
    """测试前端 API 端点"""
    
    print("🧪 前端 API 测试")
    print("=" * 30)
    
    base_url = "http://localhost:3000/api"
    
    # 测试健康检查
    print("\n1️⃣ 测试健康检查...")
    try:
        response = requests.get(f"{base_url}/health", timeout=10)
        if response.status_code == 200:
            print("✅ 健康检查通过")
            print(f"   响应: {response.json()}")
        else:
            print(f"❌ 健康检查失败: {response.status_code}")
    except Exception as e:
        print(f"❌ 健康检查异常: {e}")
    
    # 测试 URL 验证
    print("\n2️⃣ 测试 URL 验证...")
    try:
        test_data = {"url": "https://www.youtube.com/watch?v=jNQXAC9IVRw"}
        response = requests.post(
            f"{base_url}/validate", 
            json=test_data,
            timeout=30
        )
        if response.status_code == 200:
            result = response.json()
            print("✅ URL 验证成功")
            print(f"   有效: {result.get('isValid', False)}")
            if result.get('metadata'):
                print(f"   标题: {result['metadata'].get('title', 'Unknown')}")
        else:
            print(f"❌ URL 验证失败: {response.status_code}")
            print(f"   响应: {response.text}")
    except Exception as e:
        print(f"❌ URL 验证异常: {e}")
    
    # 测试转换
    print("\n3️⃣ 测试转换...")
    try:
        convert_data = {
            "url": "https://www.youtube.com/watch?v=jNQXAC9IVRw",
            "format": "mp3",
            "quality": "low"
        }
        response = requests.post(
            f"{base_url}/convert",
            json=convert_data,
            timeout=120
        )
        if response.status_code == 200:
            result = response.json()
            print("✅ 转换请求成功")
            print(f"   成功: {result.get('success', False)}")
            if result.get('result'):
                print(f"   文件: {result['result'].get('filename', 'Unknown')}")
                print(f"   大小: {result['result'].get('file_size', 0)} bytes")
        else:
            print(f"❌ 转换失败: {response.status_code}")
            print(f"   响应: {response.text}")
    except Exception as e:
        print(f"❌ 转换异常: {e}")
    
    print("\n📊 测试完成")

if __name__ == "__main__":
    test_frontend_api()
