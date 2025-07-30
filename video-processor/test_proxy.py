#!/usr/bin/env python3
"""
测试Decodo代理连接
"""
import os
import requests
import time
from dotenv import load_dotenv
from proxy_config import proxy_manager

# 加载环境变量
load_dotenv()

def test_proxy_connection(proxy_url, timeout=10):
    """测试单个代理连接"""
    try:
        # 隐藏密码用于显示
        safe_proxy = proxy_url.split('@')[0].split(':')[:-1] + ['***'] + ['@'] + proxy_url.split('@')[1:]
        safe_proxy_str = ':'.join(safe_proxy)
        
        print(f"🔄 Testing: {safe_proxy_str}")
        
        # 测试获取IP地址
        proxies = {
            'http': proxy_url,
            'https': proxy_url
        }
        
        start_time = time.time()
        response = requests.get(
            'http://httpbin.org/ip', 
            proxies=proxies, 
            timeout=timeout,
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        )
        end_time = time.time()
        
        if response.status_code == 200:
            ip_info = response.json()
            response_time = round((end_time - start_time) * 1000, 2)
            print(f"✅ Success: IP={ip_info.get('origin', 'unknown')}, Time={response_time}ms")
            return True, ip_info.get('origin'), response_time
        else:
            print(f"❌ Failed: HTTP {response.status_code}")
            return False, None, None
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False, None, None

def main():
    print("=== Decodo Proxy Connection Test ===\n")
    
    # 检查环境变量
    user = os.getenv('RESIDENTIAL_PROXY_USER')
    password = os.getenv('RESIDENTIAL_PROXY_PASS')
    endpoint = os.getenv('RESIDENTIAL_PROXY_ENDPOINT')
    
    print(f"User: {user}")
    print(f"Password: {'*' * len(password) if password else 'Not set'}")
    print(f"Endpoint: {endpoint}")
    print()
    
    if not all([user, password, endpoint]):
        print("❌ Missing proxy credentials in environment variables")
        return
    
    # 获取代理列表
    proxies = proxy_manager.get_proxy_list(include_no_proxy=False)
    print(f"📋 Found {len(proxies)} proxy configurations\n")
    
    # 测试前5个代理
    successful_proxies = []
    failed_proxies = []
    
    for i, proxy in enumerate(proxies[:10]):  # 测试前10个
        if proxy:
            print(f"--- Test {i+1}/{min(10, len(proxies))} ---")
            success, ip, response_time = test_proxy_connection(proxy)
            if success:
                successful_proxies.append((proxy, ip, response_time))
            else:
                failed_proxies.append(proxy)
            print()
            time.sleep(1)  # 避免请求过快
    
    # 总结
    print("=== Test Summary ===")
    print(f"✅ Successful: {len(successful_proxies)}")
    print(f"❌ Failed: {len(failed_proxies)}")
    print(f"📊 Success Rate: {len(successful_proxies)/(len(successful_proxies)+len(failed_proxies))*100:.1f}%")
    
    if successful_proxies:
        print("\n🎯 Working Proxies:")
        for proxy, ip, response_time in successful_proxies:
            safe_proxy = proxy.split('@')[1] if '@' in proxy else proxy
            print(f"  • {safe_proxy} -> {ip} ({response_time}ms)")
    
    if failed_proxies:
        print(f"\n⚠️  {len(failed_proxies)} proxies failed to connect")

if __name__ == "__main__":
    main()
