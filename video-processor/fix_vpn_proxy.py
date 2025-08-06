#!/usr/bin/env python3
"""
VPN + Proxy 冲突修复助手
帮助诊断和修复 VPN 与 Decodo 代理的冲突问题
"""

import os
import sys
import socket
import subprocess
import requests
from typing import Dict, List, Any

def test_dns_resolution() -> Dict[str, Any]:
    """测试 DNS 解析"""
    print("🔍 测试 DNS 解析...")
    results = {}
    
    test_domains = [
        'gate.decodo.com',
        'google.com',
        'youtube.com',
        'httpbin.org'
    ]
    
    for domain in test_domains:
        try:
            ip = socket.gethostbyname(domain)
            results[domain] = {'status': 'success', 'ip': ip}
            print(f"  ✅ {domain} -> {ip}")
        except Exception as e:
            results[domain] = {'status': 'failed', 'error': str(e)}
            print(f"  ❌ {domain} -> {e}")
    
    return results

def test_direct_connection() -> Dict[str, Any]:
    """测试直连"""
    print("\n🌐 测试直连...")
    
    try:
        response = requests.get('https://httpbin.org/ip', timeout=10)
        if response.status_code == 200:
            ip_info = response.json()
            print(f"  ✅ 直连成功，IP: {ip_info.get('origin', 'unknown')}")
            return {'status': 'success', 'ip': ip_info.get('origin')}
        else:
            print(f"  ❌ 直连失败，状态码: {response.status_code}")
            return {'status': 'failed', 'error': f'HTTP {response.status_code}'}
    except Exception as e:
        print(f"  ❌ 直连失败: {e}")
        return {'status': 'failed', 'error': str(e)}

def test_decodo_proxy() -> Dict[str, Any]:
    """测试 Decodo 代理"""
    print("\n🔄 测试 Decodo 代理...")
    
    user = os.getenv('RESIDENTIAL_PROXY_USER', 'spwd19mn8t')
    password = os.getenv('RESIDENTIAL_PROXY_PASS', 'VWo_9unscw6dpAl57T')
    
    if not user or not password:
        print("  ❌ 代理凭据未配置")
        return {'status': 'failed', 'error': 'Missing credentials'}
    
    # 测试多个端口
    ports = [10001, 10002, 10003, 10004]
    results = {}
    
    for port in ports:
        proxy_url = f"http://{user}:{password}@gate.decodo.com:{port}"
        
        try:
            response = requests.get(
                'https://httpbin.org/ip',
                proxies={'http': proxy_url, 'https': proxy_url},
                timeout=15
            )
            
            if response.status_code == 200:
                ip_info = response.json()
                results[f'port_{port}'] = {
                    'status': 'success', 
                    'ip': ip_info.get('origin'),
                    'response_time': response.elapsed.total_seconds()
                }
                print(f"  ✅ 端口 {port} 成功，IP: {ip_info.get('origin')}")
            else:
                results[f'port_{port}'] = {
                    'status': 'failed', 
                    'error': f'HTTP {response.status_code}'
                }
                print(f"  ❌ 端口 {port} 失败，状态码: {response.status_code}")
                
        except requests.exceptions.ProxyError as e:
            if '407' in str(e):
                results[f'port_{port}'] = {
                    'status': 'failed', 
                    'error': '407 Proxy Authentication Required (VPN 冲突)'
                }
                print(f"  ❌ 端口 {port} 失败: 407 认证错误 (VPN 冲突)")
            else:
                results[f'port_{port}'] = {
                    'status': 'failed', 
                    'error': str(e)
                }
                print(f"  ❌ 端口 {port} 失败: {e}")
        except Exception as e:
            results[f'port_{port}'] = {
                'status': 'failed', 
                'error': str(e)
            }
            print(f"  ❌ 端口 {port} 失败: {e}")
    
    return results

def test_network_route() -> Dict[str, Any]:
    """测试网络路由"""
    print("\n🛣️  测试网络路由...")
    
    try:
        # 测试到 Decodo 的路由
        result = subprocess.run(
            ['traceroute', '-m', '8', 'gate.decodo.com'],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            print("  ✅ 路由追踪成功")
            print("  路由信息:")
            for line in result.stdout.split('\n')[:8]:  # 只显示前8跳
                if line.strip():
                    print(f"    {line}")
            return {'status': 'success', 'route': result.stdout}
        else:
            print(f"  ❌ 路由追踪失败: {result.stderr}")
            return {'status': 'failed', 'error': result.stderr}
            
    except subprocess.TimeoutExpired:
        print("  ⏰ 路由追踪超时")
        return {'status': 'timeout', 'error': 'Timeout'}
    except FileNotFoundError:
        print("  ⚠️ traceroute 命令不可用")
        return {'status': 'unavailable', 'error': 'traceroute not found'}
    except Exception as e:
        print(f"  ❌ 路由追踪失败: {e}")
        return {'status': 'failed', 'error': str(e)}

def generate_vpn_rules() -> List[str]:
    """生成 VPN 分流规则"""
    print("\n📋 生成 VPN 分流规则...")
    
    rules = [
        "# Decodo 代理服务器直连规则",
        "# 添加到你的 VPN 客户端的直连列表中",
        "",
        "# 域名规则",
        "gate.decodo.com",
        "*.decodo.com",
        "decodo.com",
        "",
        "# IP 段规则",
        "149.88.96.0/20",
        "",
        "# DNS 服务器（可选）",
        "8.8.8.8",
        "8.8.4.4",
        "1.1.1.1",
        "1.0.0.1",
        "",
        "# 测试服务（用于验证）",
        "httpbin.org",
        "api.ipify.org"
    ]
    
    for rule in rules:
        print(f"  {rule}")
    
    return rules

def provide_solutions(test_results: Dict[str, Any]) -> List[str]:
    """根据测试结果提供解决方案"""
    print("\n💡 解决方案建议:")
    
    solutions = []
    
    # 检查是否有 VPN 冲突
    vpn_conflict = False
    for port_result in test_results.get('decodo_proxy', {}).values():
        if isinstance(port_result, dict) and '407' in str(port_result.get('error', '')):
            vpn_conflict = True
            break
    
    if vpn_conflict:
        solutions.extend([
            "🔧 检测到 VPN 冲突，建议解决方案:",
            "",
            "1. 【推荐】完善 VPN 分流规则:",
            "   - 将上面生成的规则添加到 VPN 客户端的直连列表",
            "   - 确保 gate.decodo.com 和 149.88.96.0/20 走直连",
            "",
            "2. 临时解决方案:",
            "   - 在测试时暂时关闭 VPN",
            "   - 或使用环境变量: export NO_PROXY=gate.decodo.com",
            "",
            "3. 长期解决方案:",
            "   - 考虑更换代理服务商（如 Bright Data）",
            "   - 使用支持更好分流的 VPN 客户端",
        ])
    
    # 检查 DNS 问题
    dns_failed = any(
        result.get('status') == 'failed' 
        for result in test_results.get('dns_resolution', {}).values()
    )
    
    if dns_failed:
        solutions.extend([
            "",
            "4. DNS 解析问题:",
            "   - 检查 DNS 设置",
            "   - 尝试使用公共 DNS (8.8.8.8, 1.1.1.1)",
            "   - 确保 VPN 不拦截 DNS 查询"
        ])
    
    # 检查直连问题
    if test_results.get('direct_connection', {}).get('status') == 'failed':
        solutions.extend([
            "",
            "5. 网络连接问题:",
            "   - 检查网络连接",
            "   - 确认防火墙设置",
            "   - 验证 VPN 配置"
        ])
    
    if not solutions:
        solutions = [
            "✅ 网络配置看起来正常！",
            "如果仍有问题，请检查:",
            "- 代理凭据是否正确",
            "- 服务器时间是否同步",
            "- 是否有其他网络限制"
        ]
    
    for solution in solutions:
        print(f"  {solution}")
    
    return solutions

def main():
    """主函数"""
    print("🚀 VPN + Proxy 冲突诊断工具")
    print("=" * 50)
    
    # 运行所有测试
    test_results = {
        'dns_resolution': test_dns_resolution(),
        'direct_connection': test_direct_connection(),
        'decodo_proxy': test_decodo_proxy(),
        'network_route': test_network_route()
    }
    
    # 生成 VPN 规则
    vpn_rules = generate_vpn_rules()
    
    # 提供解决方案
    solutions = provide_solutions(test_results)
    
    print("\n" + "=" * 50)
    print("📊 诊断完成！")
    
    # 保存结果到文件
    try:
        import json
        with open('vpn_proxy_diagnosis.json', 'w', encoding='utf-8') as f:
            json.dump({
                'test_results': test_results,
                'vpn_rules': vpn_rules,
                'solutions': solutions
            }, f, indent=2, ensure_ascii=False)
        print("📄 详细结果已保存到 vpn_proxy_diagnosis.json")
    except Exception as e:
        print(f"⚠️ 无法保存结果文件: {e}")

if __name__ == "__main__":
    main()