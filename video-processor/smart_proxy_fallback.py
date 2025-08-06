#!/usr/bin/env python3
"""
智能代理回退系统
当检测到 VPN 冲突时，自动切换到最佳可用连接方式
"""

import os
import time
import requests
import logging
from typing import Optional, List, Dict, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class ConnectionTest:
    method: str
    proxy: Optional[str]
    success: bool
    response_time: float
    ip_address: Optional[str]
    error: Optional[str]

class SmartProxyManager:
    """智能代理管理器 - 自动检测和切换最佳连接方式"""
    
    def __init__(self):
        self.test_results: List[ConnectionTest] = []
        self.best_connection: Optional[ConnectionTest] = None
        self.vpn_detected = False
        self.last_test_time = 0
        self.test_interval = 300  # 5分钟重新测试一次
        
    def detect_vpn_environment(self) -> bool:
        """检测是否在 VPN 环境中"""
        try:
            # 测试直连获取 IP
            response = requests.get('https://api.ipify.org', timeout=10)
            if response.status_code == 200:
                ip = response.text.strip()
                
                # 检查是否是常见的 VPN IP 段
                vpn_indicators = [
                    ip.startswith('10.'),
                    ip.startswith('172.'),
                    ip.startswith('192.168.'),
                    'vpn' in ip.lower(),
                    len(ip.split('.')) != 4
                ]
                
                self.vpn_detected = any(vpn_indicators)
                logger.info(f"IP 检测: {ip}, VPN 环境: {self.vpn_detected}")
                return self.vpn_detected
                
        except Exception as e:
            logger.warning(f"VPN 检测失败: {e}")
            return False
    
    def test_connection_method(self, method: str, proxy: Optional[str] = None) -> ConnectionTest:
        """测试特定的连接方式"""
        start_time = time.time()
        
        try:
            proxies = {'http': proxy, 'https': proxy} if proxy else None
            
            response = requests.get(
                'https://httpbin.org/ip',
                proxies=proxies,
                timeout=15,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            )
            
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                ip_info = response.json()
                return ConnectionTest(
                    method=method,
                    proxy=proxy,
                    success=True,
                    response_time=response_time,
                    ip_address=ip_info.get('origin'),
                    error=None
                )
            else:
                return ConnectionTest(
                    method=method,
                    proxy=proxy,
                    success=False,
                    response_time=response_time,
                    ip_address=None,
                    error=f'HTTP {response.status_code}'
                )
                
        except requests.exceptions.ProxyError as e:
            response_time = time.time() - start_time
            error_msg = str(e)
            
            # 检测 VPN 冲突特征
            if '407' in error_msg:
                error_msg = 'VPN 冲突 - 代理认证失败'
            elif 'tunnel connection failed' in error_msg.lower():
                error_msg = 'VPN 冲突 - 隧道连接失败'
                
            return ConnectionTest(
                method=method,
                proxy=proxy,
                success=False,
                response_time=response_time,
                ip_address=None,
                error=error_msg
            )
            
        except Exception as e:
            response_time = time.time() - start_time
            return ConnectionTest(
                method=method,
                proxy=proxy,
                success=False,
                response_time=response_time,
                ip_address=None,
                error=str(e)
            )
    
    def run_comprehensive_test(self) -> List[ConnectionTest]:
        """运行全面的连接测试"""
        logger.info("🧪 开始全面连接测试...")
        
        test_methods = [
            ('直连', None),
            ('Decodo-10001', f"http://{os.getenv('RESIDENTIAL_PROXY_USER')}:{os.getenv('RESIDENTIAL_PROXY_PASS')}@gate.decodo.com:10001"),
            ('Decodo-10002', f"http://{os.getenv('RESIDENTIAL_PROXY_USER')}:{os.getenv('RESIDENTIAL_PROXY_PASS')}@gate.decodo.com:10002"),
            ('Decodo-10003', f"http://{os.getenv('RESIDENTIAL_PROXY_USER')}:{os.getenv('RESIDENTIAL_PROXY_PASS')}@gate.decodo.com:10003"),
        ]
        
        # 添加其他代理（如果配置了）
        if os.getenv('SMARTPROXY_USER'):
            test_methods.append(('Smartproxy', f"http://{os.getenv('SMARTPROXY_USER')}:{os.getenv('SMARTPROXY_PASS')}@gate.smartproxy.com:10000"))
        
        if os.getenv('BRIGHTDATA_USER'):
            test_methods.append(('BrightData', f"http://{os.getenv('BRIGHTDATA_USER')}:{os.getenv('BRIGHTDATA_PASS')}@zproxy.lum-superproxy.io:22225"))
        
        self.test_results = []
        
        for method, proxy in test_methods:
            if proxy and ('None' in proxy or ':None@' in proxy):
                continue  # 跳过未配置的代理
                
            logger.info(f"  测试 {method}...")
            result = self.test_connection_method(method, proxy)
            self.test_results.append(result)
            
            if result.success:
                logger.info(f"    ✅ 成功 - IP: {result.ip_address}, 耗时: {result.response_time:.2f}s")
            else:
                logger.warning(f"    ❌ 失败 - {result.error}")
        
        self.last_test_time = time.time()
        return self.test_results
    
    def select_best_connection(self) -> Optional[ConnectionTest]:
        """选择最佳连接方式"""
        if not self.test_results:
            self.run_comprehensive_test()
        
        # 筛选成功的连接
        successful_connections = [r for r in self.test_results if r.success]
        
        if not successful_connections:
            logger.error("❌ 没有可用的连接方式")
            return None
        
        # 优先级排序：
        # 1. 如果在 VPN 环境中，优先直连
        # 2. 否则优先代理（更好的匿名性）
        # 3. 响应时间作为次要因素
        
        if self.vpn_detected:
            # VPN 环境：直连 > 代理
            direct_connections = [r for r in successful_connections if r.proxy is None]
            if direct_connections:
                self.best_connection = min(direct_connections, key=lambda x: x.response_time)
            else:
                self.best_connection = min(successful_connections, key=lambda x: x.response_time)
        else:
            # 非 VPN 环境：代理 > 直连
            proxy_connections = [r for r in successful_connections if r.proxy is not None]
            if proxy_connections:
                self.best_connection = min(proxy_connections, key=lambda x: x.response_time)
            else:
                self.best_connection = min(successful_connections, key=lambda x: x.response_time)
        
        logger.info(f"🎯 选择最佳连接: {self.best_connection.method}")
        return self.best_connection
    
    def get_optimal_proxy(self) -> Optional[str]:
        """获取最优代理配置"""
        # 检查是否需要重新测试
        if time.time() - self.last_test_time > self.test_interval:
            logger.info("🔄 代理配置过期，重新测试...")
            self.run_comprehensive_test()
        
        if not self.best_connection:
            self.select_best_connection()
        
        return self.best_connection.proxy if self.best_connection else None
    
    def get_connection_report(self) -> Dict[str, Any]:
        """生成连接测试报告"""
        if not self.test_results:
            self.run_comprehensive_test()
        
        successful = [r for r in self.test_results if r.success]
        failed = [r for r in self.test_results if not r.success]
        
        report = {
            'vpn_detected': self.vpn_detected,
            'total_tests': len(self.test_results),
            'successful_connections': len(successful),
            'failed_connections': len(failed),
            'success_rate': len(successful) / len(self.test_results) if self.test_results else 0,
            'best_connection': {
                'method': self.best_connection.method if self.best_connection else None,
                'proxy': self.best_connection.proxy if self.best_connection else None,
                'response_time': self.best_connection.response_time if self.best_connection else None,
                'ip_address': self.best_connection.ip_address if self.best_connection else None,
            } if self.best_connection else None,
            'test_results': [
                {
                    'method': r.method,
                    'success': r.success,
                    'response_time': r.response_time,
                    'ip_address': r.ip_address,
                    'error': r.error
                }
                for r in self.test_results
            ],
            'recommendations': self._generate_recommendations()
        }
        
        return report
    
    def _generate_recommendations(self) -> List[str]:
        """生成改进建议"""
        recommendations = []
        
        successful = [r for r in self.test_results if r.success]
        failed = [r for r in self.test_results if not r.success]
        
        if not successful:
            recommendations.append("❌ 所有连接方式都失败了")
            recommendations.append("🔧 建议检查网络连接和代理配置")
            
        vpn_conflicts = [r for r in failed if r.error and 'VPN 冲突' in r.error]
        if vpn_conflicts:
            recommendations.append("⚠️ 检测到 VPN 冲突")
            recommendations.append("🔧 建议添加代理服务器到 VPN 直连列表")
            recommendations.append("📋 需要直连的域名: gate.decodo.com, *.decodo.com")
            recommendations.append("📋 需要直连的 IP 段: 149.88.96.0/20")
        
        if self.vpn_detected and successful:
            direct_success = any(r.proxy is None for r in successful)
            if direct_success:
                recommendations.append("✅ VPN 环境下直连工作正常")
            else:
                recommendations.append("⚠️ VPN 环境下只有代理工作，可能存在配置问题")
        
        if len(successful) < len(self.test_results) / 2:
            recommendations.append("⚠️ 超过一半的连接方式失败")
            recommendations.append("🔧 建议检查代理凭据和网络配置")
        
        return recommendations

# 全局实例
smart_proxy_manager = SmartProxyManager()

def get_smart_proxy() -> Optional[str]:
    """获取智能选择的代理"""
    return smart_proxy_manager.get_optimal_proxy()

def get_connection_report() -> Dict[str, Any]:
    """获取连接测试报告"""
    return smart_proxy_manager.get_connection_report()

if __name__ == "__main__":
    # 命令行测试
    manager = SmartProxyManager()
    manager.detect_vpn_environment()
    manager.run_comprehensive_test()
    best = manager.select_best_connection()
    
    print("\n📊 连接测试报告")
    print("=" * 50)
    
    report = manager.get_connection_report()
    print(f"VPN 环境: {'是' if report['vpn_detected'] else '否'}")
    print(f"测试总数: {report['total_tests']}")
    print(f"成功连接: {report['successful_connections']}")
    print(f"失败连接: {report['failed_connections']}")
    print(f"成功率: {report['success_rate']:.1%}")
    
    if report['best_connection']:
        best = report['best_connection']
        print(f"\n🎯 最佳连接: {best['method']}")
        print(f"响应时间: {best['response_time']:.2f}s")
        print(f"IP 地址: {best['ip_address']}")
    
    print("\n💡 建议:")
    for rec in report['recommendations']:
        print(f"  {rec}")