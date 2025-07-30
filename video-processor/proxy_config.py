"""
Proxy configuration for YouTube video downloading
Supports residential proxies, datacenter proxies, and free proxies
"""

import os
import random
import time
from typing import List, Optional, Dict, Any
import logging
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

logger = logging.getLogger(__name__)

class ProxyManager:
    """Manages proxy rotation and configuration for YouTube downloads"""
    
    def __init__(self):
        self.residential_proxies = self._load_residential_proxies()
        self.datacenter_proxies = self._load_datacenter_proxies()
        self.free_proxies = self._load_free_proxies()
        self.proxy_stats = {}  # Track success rates
        
    def _load_residential_proxies(self) -> List[str]:
        """Load residential proxy configurations from environment"""
        proxies = []

        # Primary residential proxy (推荐的8GB套餐服务商)
        primary_user = os.getenv('RESIDENTIAL_PROXY_USER')
        primary_pass = os.getenv('RESIDENTIAL_PROXY_PASS')
        primary_endpoint = os.getenv('RESIDENTIAL_PROXY_ENDPOINT')

        if primary_user and primary_pass and primary_endpoint:
            # Decodo支持多个端口，添加更多端口以提高成功率
            decodo_ports = [
                'gate.decodo.com:10001',
                'gate.decodo.com:10002',
                'gate.decodo.com:10003',
                'gate.decodo.com:10004',
                'gate.decodo.com:10005',
                'gate.decodo.com:10006',
                'gate.decodo.com:10007',
                'gate.decodo.com:10008'
            ]

            # 为每个端口创建多个session
            for port in decodo_ports:
                for i in range(2):  # 每个端口2个session
                    session_id = random.randint(10000, 99999)
                    proxy_url = f'http://{primary_user}-session-{session_id}:{primary_pass}@{port}'
                    proxies.append(proxy_url)

        # Smartproxy residential (备用)
        smartproxy_user = os.getenv('SMARTPROXY_USER')
        smartproxy_pass = os.getenv('SMARTPROXY_PASS')
        if smartproxy_user and smartproxy_pass:
            # Smartproxy residential endpoints
            endpoints = [
                'gate.smartproxy.com:10000',
                'gate.smartproxy.com:10001',
                'gate.smartproxy.com:10002',
            ]
            for endpoint in endpoints:
                proxies.append(f'http://{smartproxy_user}:{smartproxy_pass}@{endpoint}')

        # Bright Data residential (备用)
        brightdata_user = os.getenv('BRIGHTDATA_USER')
        brightdata_pass = os.getenv('BRIGHTDATA_PASS')
        brightdata_zone = os.getenv('BRIGHTDATA_ZONE', 'residential')
        if brightdata_user and brightdata_pass:
            proxy_url = f'http://{brightdata_user}-session-{random.randint(1000,9999)}:{brightdata_pass}@zproxy.lum-superproxy.io:22225'
            proxies.append(proxy_url)

        return proxies
    
    def _load_datacenter_proxies(self) -> List[str]:
        """Load datacenter proxy configurations"""
        proxies = []
        
        # Custom datacenter proxy
        datacenter_proxy = os.getenv('DATACENTER_PROXY_URL')
        if datacenter_proxy:
            proxies.append(datacenter_proxy)
            
        return proxies
    
    def _load_free_proxies(self) -> List[str]:
        """Load free/public proxy configurations"""
        return [
            'http://proxy-server.scraperapi.com:8001',
            'http://rotating-residential.scraperapi.com:8001',
            # Add more free proxies as needed
        ]
    
    def get_proxy_list(self, include_no_proxy: bool = True) -> List[Optional[str]]:
        """Get ordered list of proxies to try"""
        proxy_list = []
        
        # Start with no proxy if requested
        if include_no_proxy:
            proxy_list.append(None)
        
        # Add residential proxies (highest priority)
        proxy_list.extend(self.residential_proxies)
        
        # Add datacenter proxies
        proxy_list.extend(self.datacenter_proxies)
        
        # Add free proxies as last resort
        proxy_list.extend(self.free_proxies)
        
        # Shuffle residential proxies to distribute load
        if len(self.residential_proxies) > 1:
            residential_shuffled = self.residential_proxies.copy()
            random.shuffle(residential_shuffled)
            # Replace residential section with shuffled version
            start_idx = 1 if include_no_proxy else 0
            end_idx = start_idx + len(self.residential_proxies)
            proxy_list[start_idx:end_idx] = residential_shuffled
        
        return proxy_list
    
    def get_proxy_with_session(self, base_proxy: str) -> str:
        """Add session rotation to proxy URL for better success rates"""
        if not base_proxy:
            return base_proxy
            
        session_id = random.randint(10000, 99999)
        
        # Handle different proxy formats
        if 'smartproxy.com' in base_proxy:
            # Smartproxy session format
            return base_proxy.replace('@gate.smartproxy.com:', f'-session-{session_id}@gate.smartproxy.com:')
        elif 'lum-superproxy.io' in base_proxy:
            # Bright Data session format (already handled in _load_residential_proxies)
            return base_proxy
        elif 'oxylabs.io' in base_proxy:
            # Oxylabs session format
            return base_proxy.replace('@pr.oxylabs.io:', f'-session-{session_id}@pr.oxylabs.io:')
        else:
            # Generic session parameter
            separator = '&' if '?' in base_proxy else '?'
            return f"{base_proxy}{separator}session={session_id}"
    
    def record_proxy_result(self, proxy: Optional[str], success: bool):
        """Record proxy success/failure for statistics"""
        proxy_key = proxy or 'no_proxy'
        if proxy_key not in self.proxy_stats:
            self.proxy_stats[proxy_key] = {'success': 0, 'failure': 0}
        
        if success:
            self.proxy_stats[proxy_key]['success'] += 1
        else:
            self.proxy_stats[proxy_key]['failure'] += 1
    
    def get_proxy_stats(self) -> Dict[str, Dict[str, Any]]:
        """Get proxy performance statistics"""
        stats = {}
        for proxy, counts in self.proxy_stats.items():
            total = counts['success'] + counts['failure']
            success_rate = counts['success'] / total if total > 0 else 0
            stats[proxy] = {
                'success_rate': success_rate,
                'total_attempts': total,
                **counts
            }
        return stats
    
    def get_best_proxies(self, min_attempts: int = 5) -> List[str]:
        """Get proxies sorted by success rate (minimum attempts required)"""
        stats = self.get_proxy_stats()
        qualified_proxies = [
            (proxy, data['success_rate']) 
            for proxy, data in stats.items() 
            if data['total_attempts'] >= min_attempts
        ]
        
        # Sort by success rate descending
        qualified_proxies.sort(key=lambda x: x[1], reverse=True)
        return [proxy for proxy, _ in qualified_proxies]

# Global proxy manager instance
proxy_manager = ProxyManager()

def get_yt_dlp_proxy_options(proxy: Optional[str]) -> Dict[str, Any]:
    """Get yt-dlp options for a specific proxy"""
    options = {}
    
    if proxy:
        options['proxy'] = proxy
        
        # Add proxy-specific headers and settings
        if 'residential' in proxy.lower() or 'smartproxy' in proxy or 'brightdata' in proxy:
            # Residential proxy settings
            options['socket_timeout'] = 30
            options['retries'] = 3
        else:
            # Datacenter/free proxy settings
            options['socket_timeout'] = 15
            options['retries'] = 2
    
    return options

def test_proxy(proxy: Optional[str], test_url: str = "https://httpbin.org/ip") -> bool:
    """Test if a proxy is working"""
    try:
        import requests
        
        proxies = {'http': proxy, 'https': proxy} if proxy else None
        response = requests.get(test_url, proxies=proxies, timeout=10)
        return response.status_code == 200
    except Exception as e:
        logger.debug(f"Proxy test failed for {proxy}: {e}")
        return False
