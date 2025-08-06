#!/usr/bin/env python3
"""
更新前端 API 路由，指向 Fly.io 后端
"""

import os
import glob

def update_api_routes():
    """更新所有 API 路由文件"""
    
    print("🔧 更新前端 API 路由配置...")
    
    # Fly.io 后端 URL
    flyio_url = "https://getgoodtape-video-proc.fly.dev"
    
    # 需要更新的文件列表
    api_files = [
        "app/api/convert/route.ts",
        "app/api/validate/route.ts", 
        "app/api/status/[jobId]/route.ts",
        "app/api/download/[fileName]/route.ts",
        "app/api/health/route.ts",
        "app/api/platforms/route.ts"
    ]
    
    updated_files = []
    
    for file_path in api_files:
        if os.path.exists(file_path):
            try:
                # 读取文件
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # 替换 Cloudflare Workers URL 为 Fly.io URL
                old_patterns = [
                    'https://getgoodtape-api-production.wangdonghuiibt-cloudflare.workers.dev',
                    'http://localhost:8787'
                ]
                
                modified = False
                for old_pattern in old_patterns:
                    if old_pattern in content:
                        content = content.replace(old_pattern, flyio_url)
                        modified = True
                
                # 如果有修改，写回文件
                if modified:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    updated_files.append(file_path)
                    print(f"✅ 已更新: {file_path}")
                else:
                    print(f"⏭️ 跳过: {file_path} (无需更新)")
                    
            except Exception as e:
                print(f"❌ 更新失败: {file_path} - {e}")
        else:
            print(f"⚠️ 文件不存在: {file_path}")
    
    return updated_files

def create_test_script():
    """创建前端测试脚本"""
    
    test_script = '''#!/usr/bin/env python3
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
    print("\\n1️⃣ 测试健康检查...")
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
    print("\\n2️⃣ 测试 URL 验证...")
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
    print("\\n3️⃣ 测试转换...")
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
    
    print("\\n📊 测试完成")

if __name__ == "__main__":
    test_frontend_api()
'''
    
    with open('test_frontend.py', 'w', encoding='utf-8') as f:
        f.write(test_script)
    
    os.chmod('test_frontend.py', 0o755)
    print("✅ 已创建前端测试脚本: test_frontend.py")

def main():
    """主函数"""
    
    print("🚀 前端 API 配置更新")
    print("=" * 40)
    
    # 更新 API 路由
    updated_files = update_api_routes()
    
    # 创建测试脚本
    create_test_script()
    
    print(f"\\n📊 总结:")
    print(f"✅ 已更新 {len(updated_files)} 个文件")
    
    if updated_files:
        print("\\n📋 更新的文件:")
        for file_path in updated_files:
            print(f"  - {file_path}")
    
    print("\\n🧪 下一步:")
    print("1. 启动前端开发服务器: npm run dev")
    print("2. 运行测试: python3 test_frontend.py")
    print("3. 在浏览器中访问: http://localhost:3000/app")

if __name__ == "__main__":
    main()