"""
Proxy configuration for YouTube video downloading
Supports residential proxies, datacenter proxies, and free proxies
"""

import os
import random
import time
import hashlib
from typing import List, Optional, Dict, Any
import logging
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

logger = logging.getLogger(__name__)

def get_machine_id():
    """Get a unique machine identifier for session isolation"""
    try:
        # Try to get Fly.io machine ID from environment
        fly_machine_id = os.getenv('FLY_MACHINE_ID')
        if fly_machine_id:
            return fly_machine_id[-8:]  # Use last 8 chars for brevity

        # Fallback to hostname-based ID
        import socket
        hostname = socket.gethostname()
        return hashlib.md5(hostname.encode()).hexdigest()[:8]
    except:
        # Final fallback to random ID (but consistent per process)
        return str(random.randint(10000000, 99999999))

class ProxyManager:
    """Manages proxy rotation and configuration for YouTube downloads"""

    def __init__(self):
        self.machine_id = get_machine_id()
        self.residential_proxies = self._load_residential_proxies()
        self.datacenter_proxies = self._load_datacenter_proxies()
        self.free_proxies = self._load_free_proxies()
        self.proxy_stats = {}  # Track success rates
        self.vpn_conflict_detected = False  # Track VPN conflicts
        logger.info(f"ProxyManager initialized for machine: {self.machine_id}")
        
        # Test for VPN conflicts on initialization
        self._detect_vpn_conflicts()
        
    def _load_residential_proxies(self) -> List[str]:
        """Load residential proxy configurations from environment"""
        proxies = []

        # Primary residential proxy (推荐的8GB套餐服务商)
        primary_user = os.getenv('RESIDENTIAL_PROXY_USER')
        primary_pass = os.getenv('RESIDENTIAL_PROXY_PASS')
        primary_endpoint = os.getenv('RESIDENTIAL_PROXY_ENDPOINT')

        if primary_user and primary_pass and primary_endpoint:
            # Decodo支持多个端口，使用 IP 地址避免 DNS 问题
            # 这些是 Decodo 的实际 IP 地址，绕过 DNS 解析问题
            decodo_endpoints = [
                '149.102.253.91:10001',
                '149.102.253.91:10002', 
                '149.102.253.91:10003',
                '149.102.253.91:10004',
                '149.102.253.91:10005',
                '149.102.253.91:10006',
                '149.102.253.91:10007',
                '149.102.253.91:10008',
                '149.102.253.65:10001',
                '149.102.253.65:10002',
                '149.102.253.65:10003',
                '149.102.253.65:10004',
                '149.102.253.65:10005',
                '149.102.253.65:10006',
                '149.102.253.65:10007',
                '149.102.253.65:10008'
            ]

            # 为每个端点创建代理连接 (使用 IP 地址避免 DNS 问题)
            for endpoint in decodo_endpoints:
                # 使用基础格式，直接连接 IP 地址
                proxy_url = f'http://{primary_user}:{primary_pass}@{endpoint}'
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

        # Bright Data residential (推荐替换Decodo)
        brightdata_user = os.getenv('BRIGHTDATA_USER')
        brightdata_pass = os.getenv('BRIGHTDATA_PASS')
        brightdata_zone = os.getenv('BRIGHTDATA_ZONE', 'residential')
        if brightdata_user and brightdata_pass:
            # Bright Data 多端口配置，更好的YouTube兼容性
            brightdata_ports = [22225, 22226, 22227, 22228, 22229]
            countries = ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'NL', 'SE', 'JP', 'KR']

            for port in brightdata_ports:
                for i in range(3):  # 每个端口3个session
                    # Use machine ID to create unique sessions per machine
                    session_id = f"{self.machine_id}{i:02d}"
                    country = random.choice(countries)
                    # Bright Data 支持国家和会话轮换
                    proxy_url = f'http://{brightdata_user}-session-{session_id}-country-{country}:{brightdata_pass}@zproxy.lum-superproxy.io:{port}'
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
    
    def get_proxy_list(self, include_no_proxy: bool = True, prioritize_youtube: bool = True) -> List[Optional[str]]:
        """Get ordered list of proxies to try, optimized for YouTube"""
        proxy_list = []

        # For YouTube MP4 conversion, NEVER use direct connection
        if include_no_proxy and not prioritize_youtube:
            proxy_list.append(None)

        # Prioritize Decodo IP-based proxies for YouTube (better success rate with VPN)
        if prioritize_youtube:
            # IP-based Decodo proxies (should work with VPN split tunneling)
            decodo_ip_proxies = [p for p in self.residential_proxies if '149.102.253.' in p]
            # Domain-based Decodo proxies (fallback)
            decodo_domain_proxies = [p for p in self.residential_proxies if 'decodo.com' in p and '149.102.253.' not in p]
            # Other proxies
            brightdata_proxies = [p for p in self.residential_proxies if 'lum-superproxy.io' in p]
            other_residential = [p for p in self.residential_proxies 
                               if p not in decodo_ip_proxies 
                               and p not in decodo_domain_proxies 
                               and p not in brightdata_proxies]

            # Order: IP-based Decodo > Bright Data > Other > Domain-based Decodo
            random.shuffle(decodo_ip_proxies)
            random.shuffle(brightdata_proxies)
            random.shuffle(other_residential)
            random.shuffle(decodo_domain_proxies)

            proxy_list.extend(decodo_ip_proxies)
            proxy_list.extend(brightdata_proxies)
            proxy_list.extend(other_residential)
            proxy_list.extend(decodo_domain_proxies)
        else:
            # Normal priority order
            residential_shuffled = self.residential_proxies.copy()
            random.shuffle(residential_shuffled)
            proxy_list.extend(residential_shuffled)

        # Add datacenter proxies
        proxy_list.extend(self.datacenter_proxies)

        # Add free proxies as last resort
        proxy_list.extend(self.free_proxies)

        # For YouTube, only add direct connection as absolute last resort
        if include_no_proxy and prioritize_youtube:
            proxy_list.append(None)

        return proxy_list
    
    def get_proxy_with_session(self, base_proxy: str, session_id: str = None, country: str = None) -> str:
        """Add enhanced session rotation to proxy URL for better success rates"""
        if not base_proxy:
            return base_proxy

        if not session_id:
            # Use machine-specific session ID to avoid conflicts
            session_id = f"{self.machine_id}{random.randint(10, 99)}"

        # Handle different proxy formats with enhanced parameters
        if 'smartproxy.com' in base_proxy:
            # Smartproxy enhanced session format
            enhanced_session = f'-session-{session_id}'
            if country:
                enhanced_session += f'-country-{country}'
            return base_proxy.replace('@gate.smartproxy.com:', f'{enhanced_session}@gate.smartproxy.com:')

        elif 'lum-superproxy.io' in base_proxy:
            # Bright Data enhanced session format
            enhanced_session = f'-session-{session_id}'
            if country:
                enhanced_session += f'-country-{country}'
            # Find the username part and enhance it
            if '@' in base_proxy:
                protocol_auth, endpoint = base_proxy.split('@', 1)
                if ':' in protocol_auth:
                    protocol_user, password = protocol_auth.rsplit(':', 1)
                    return f"{protocol_user}{enhanced_session}:{password}@{endpoint}"
            return base_proxy

        elif 'oxylabs.io' in base_proxy:
            # Oxylabs enhanced session format
            enhanced_session = f'-session-{session_id}'
            if country:
                enhanced_session += f'-country-{country}'
            return base_proxy.replace('@pr.oxylabs.io:', f'{enhanced_session}@pr.oxylabs.io:')

        elif 'decodo.com' in base_proxy:
            # Decodo enhanced session format
            enhanced_session = f'-session-{session_id}'
            if country:
                enhanced_session += f'-country-{country}'
            # Add sticky session for better consistency
            sticky_id = random.randint(100, 999)
            enhanced_session += f'-sticky-{sticky_id}'

            if '@' in base_proxy:
                protocol_auth, endpoint = base_proxy.split('@', 1)
                if ':' in protocol_auth:
                    protocol_user, password = protocol_auth.rsplit(':', 1)
                    return f"{protocol_user}{enhanced_session}:{password}@{endpoint}"
            return base_proxy

        else:
            # Generic enhanced session parameter
            separator = '&' if '?' in base_proxy else '?'
            session_params = f"session={session_id}"
            if country:
                session_params += f"&country={country}"
            return f"{base_proxy}{separator}{session_params}"
    
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
    
    def _detect_vpn_conflicts(self):
        """Detect if VPN is interfering with proxy connections"""
        try:
            # Test direct connection to Decodo
            import requests
            import socket
            
            # Check if we can resolve Decodo directly
            try:
                socket.gethostbyname('149.102.253.91')
                logger.info("✅ Decodo DNS resolution successful")
            except socket.gaierror:
                logger.warning("⚠️ Decodo DNS resolution failed - possible VPN interference")
                self.vpn_conflict_detected = True
                return
            
            # Test a simple proxy connection
            test_proxy = f"http://{os.getenv('RESIDENTIAL_PROXY_USER')}:{os.getenv('RESIDENTIAL_PROXY_PASS')}@149.102.253.91:10001"
            
            try:
                response = requests.get(
                    'https://httpbin.org/ip', 
                    proxies={'http': test_proxy, 'https': test_proxy},
                    timeout=10
                )
                if response.status_code == 200:
                    logger.info("✅ Decodo proxy test successful")
                    self.vpn_conflict_detected = False
                else:
                    logger.warning(f"⚠️ Decodo proxy returned status {response.status_code}")
                    self.vpn_conflict_detected = True
            except requests.exceptions.ProxyError as e:
                if '407' in str(e):
                    logger.error("❌ 407 Proxy Authentication Required - VPN conflict detected!")
                    self.vpn_conflict_detected = True
                else:
                    logger.warning(f"⚠️ Proxy error: {e}")
                    self.vpn_conflict_detected = True
            except Exception as e:
                logger.warning(f"⚠️ Proxy test failed: {e}")
                self.vpn_conflict_detected = True
                
        except Exception as e:
            logger.error(f"VPN conflict detection failed: {e}")
            self.vpn_conflict_detected = True
    
    def get_proxy_list_smart(self, include_no_proxy: bool = True, prioritize_youtube: bool = True) -> List[Optional[str]]:
        """Smart proxy selection that adapts to VPN conflicts"""
        
        # If VPN conflict detected, prioritize no-proxy and non-Decodo proxies
        if self.vpn_conflict_detected:
            logger.info("🔄 VPN conflict detected, using alternative proxy strategy")
            proxy_list = []
            
            # Start with no proxy (direct connection through VPN)
            if include_no_proxy:
                proxy_list.append(None)
            
            # Use non-Decodo proxies first
            non_decodo_proxies = [p for p in self.residential_proxies if 'decodo.com' not in p]
            random.shuffle(non_decodo_proxies)
            proxy_list.extend(non_decodo_proxies)
            
            # Add datacenter and free proxies
            proxy_list.extend(self.datacenter_proxies)
            proxy_list.extend(self.free_proxies)
            
            # Add Decodo proxies last (they likely won't work)
            decodo_proxies = [p for p in self.residential_proxies if 'decodo.com' in p]
            proxy_list.extend(decodo_proxies)
            
            return proxy_list
        else:
            # Normal proxy selection
            return self.get_proxy_list(include_no_proxy, prioritize_youtube)
    
    def test_and_fix_vpn_conflict(self) -> Dict[str, Any]:
        """Test current proxy setup and provide VPN conflict solutions"""
        results = {
            'vpn_conflict_detected': False,
            'working_proxies': [],
            'failed_proxies': [],
            'recommendations': []
        }
        
        # Test a few key proxies
        test_proxies = [
            None,  # Direct connection
            f"http://{os.getenv('RESIDENTIAL_PROXY_USER')}:{os.getenv('RESIDENTIAL_PROXY_PASS')}@149.102.253.91:10001",
            f"http://{os.getenv('RESIDENTIAL_PROXY_USER')}:{os.getenv('RESIDENTIAL_PROXY_PASS')}@149.102.253.91:10002",
        ]
        
        for proxy in test_proxies:
            try:
                import requests
                proxies = {'http': proxy, 'https': proxy} if proxy else None
                
                response = requests.get(
                    'https://httpbin.org/ip',
                    proxies=proxies,
                    timeout=15
                )
                
                if response.status_code == 200:
                    results['working_proxies'].append({
                        'proxy': proxy or 'direct',
                        'ip': response.json().get('origin', 'unknown')
                    })
                else:
                    results['failed_proxies'].append({
                        'proxy': proxy or 'direct',
                        'error': f'HTTP {response.status_code}'
                    })
                    
            except requests.exceptions.ProxyError as e:
                if '407' in str(e):
                    results['vpn_conflict_detected'] = True
                    results['failed_proxies'].append({
                        'proxy': proxy or 'direct',
                        'error': '407 Proxy Authentication Required (VPN conflict)'
                    })
                else:
                    results['failed_proxies'].append({
                        'proxy': proxy or 'direct',
                        'error': str(e)
                    })
            except Exception as e:
                results['failed_proxies'].append({
                    'proxy': proxy or 'direct',
                    'error': str(e)
                })
        
        # Generate recommendations
        if results['vpn_conflict_detected']:
            results['recommendations'] = [
                "1. 添加 Decodo IP 段到 VPN 直连规则: 149.88.96.0/20, 149.102.253.91",
                "2. 在 VPN 客户端中添加域名分流: *.decodo.com",
                "3. 考虑使用其他代理服务商（如 Bright Data）",
                "4. 临时关闭 VPN 测试代理功能",
                "5. 使用环境变量: NO_PROXY=149.102.253.91"
            ]
        elif not results['working_proxies']:
            results['recommendations'] = [
                "1. 检查代理凭据是否正确",
                "2. 验证网络连接",
                "3. 尝试不同的代理端口"
            ]
        else:
            results['recommendations'] = [
                "代理配置正常工作"
            ]
        
        return results

# Global proxy manager instance
proxy_manager = ProxyManager()

def get_yt_dlp_proxy_options(proxy: Optional[str]) -> Dict[str, Any]:
    """Get yt-dlp options for a specific proxy"""
    options = {}

    if proxy:
        # yt-dlp expects proxy in specific format
        options['proxy'] = proxy

        # For HTTPS tunneling issues, add these options
        options['nocheckcertificate'] = True
        options['prefer_insecure'] = True

        # Add proxy-specific headers and settings
        if 'residential' in proxy.lower() or 'smartproxy' in proxy or 'brightdata' in proxy or 'decodo' in proxy:
            # Residential proxy settings
            options['socket_timeout'] = 45
            options['retries'] = 5
            # Force HTTP for residential proxies to avoid HTTPS tunnel issues
            options['force_generic_extractor'] = False
        else:
            # Datacenter/free proxy settings
            options['socket_timeout'] = 20
            options['retries'] = 3

        # Add specific headers for proxy authentication
        options['http_headers'] = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
        }

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
