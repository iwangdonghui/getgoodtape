"""
代理使用监控工具
监控流量使用、成功率和成本
"""

import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
import os
from pathlib import Path

@dataclass
class ProxyUsageRecord:
    """代理使用记录"""
    timestamp: str
    proxy_type: str  # 'residential', 'datacenter', 'free'
    operation: str   # 'metadata', 'download', 'convert'
    url: str
    success: bool
    response_size_mb: float
    response_time_ms: int
    error_message: Optional[str] = None

class ProxyMonitor:
    """代理使用监控器"""
    
    def __init__(self, log_file: str = "proxy_usage.json"):
        self.log_file = Path(log_file)
        self.usage_records: List[ProxyUsageRecord] = []
        self._load_records()
    
    def _load_records(self):
        """加载历史记录"""
        if self.log_file.exists():
            try:
                with open(self.log_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.usage_records = [
                        ProxyUsageRecord(**record) for record in data
                    ]
            except Exception as e:
                print(f"加载代理使用记录失败: {e}")
                self.usage_records = []
    
    def _save_records(self):
        """保存记录到文件"""
        try:
            with open(self.log_file, 'w', encoding='utf-8') as f:
                json.dump([asdict(record) for record in self.usage_records], f, indent=2)
        except Exception as e:
            print(f"保存代理使用记录失败: {e}")
    
    def record_usage(
        self,
        proxy_type: str,
        operation: str,
        url: str,
        success: bool,
        response_size_mb: float,
        response_time_ms: int,
        error_message: Optional[str] = None
    ):
        """记录代理使用"""
        record = ProxyUsageRecord(
            timestamp=datetime.now().isoformat(),
            proxy_type=proxy_type,
            operation=operation,
            url=url,
            success=success,
            response_size_mb=response_size_mb,
            response_time_ms=response_time_ms,
            error_message=error_message
        )
        
        self.usage_records.append(record)
        self._save_records()
    
    def get_daily_stats(self, date: Optional[str] = None) -> Dict:
        """获取指定日期的统计信息"""
        if date is None:
            date = datetime.now().strftime('%Y-%m-%d')
        
        daily_records = [
            record for record in self.usage_records
            if record.timestamp.startswith(date)
        ]
        
        if not daily_records:
            return {
                'date': date,
                'total_requests': 0,
                'successful_requests': 0,
                'success_rate': 0,
                'total_data_mb': 0,
                'avg_response_time_ms': 0,
                'operations': {},
                'proxy_types': {}
            }
        
        total_requests = len(daily_records)
        successful_requests = sum(1 for r in daily_records if r.success)
        total_data_mb = sum(r.response_size_mb for r in daily_records)
        avg_response_time = sum(r.response_time_ms for r in daily_records) / total_requests
        
        # 按操作类型统计
        operations = {}
        for record in daily_records:
            op = record.operation
            if op not in operations:
                operations[op] = {'count': 0, 'data_mb': 0, 'success_count': 0}
            operations[op]['count'] += 1
            operations[op]['data_mb'] += record.response_size_mb
            if record.success:
                operations[op]['success_count'] += 1
        
        # 按代理类型统计
        proxy_types = {}
        for record in daily_records:
            ptype = record.proxy_type
            if ptype not in proxy_types:
                proxy_types[ptype] = {'count': 0, 'data_mb': 0, 'success_count': 0}
            proxy_types[ptype]['count'] += 1
            proxy_types[ptype]['data_mb'] += record.response_size_mb
            if record.success:
                proxy_types[ptype]['success_count'] += 1
        
        return {
            'date': date,
            'total_requests': total_requests,
            'successful_requests': successful_requests,
            'success_rate': successful_requests / total_requests * 100,
            'total_data_mb': round(total_data_mb, 2),
            'avg_response_time_ms': round(avg_response_time, 2),
            'operations': operations,
            'proxy_types': proxy_types
        }
    
    def get_monthly_stats(self, year_month: Optional[str] = None) -> Dict:
        """获取月度统计信息"""
        if year_month is None:
            year_month = datetime.now().strftime('%Y-%m')
        
        monthly_records = [
            record for record in self.usage_records
            if record.timestamp.startswith(year_month)
        ]
        
        if not monthly_records:
            return {
                'month': year_month,
                'total_data_gb': 0,
                'estimated_cost_8gb_plan': 0,
                'estimated_cost_payg': 0,
                'daily_breakdown': {}
            }
        
        total_data_mb = sum(r.response_size_mb for r in monthly_records)
        total_data_gb = total_data_mb / 1024
        
        # 成本估算
        cost_8gb_plan = 22  # $22/月 for 8GB
        cost_payg = total_data_gb * 3.5  # $3.5/GB 按需付费
        
        # 按日分解
        daily_breakdown = {}
        for record in monthly_records:
            date = record.timestamp[:10]
            if date not in daily_breakdown:
                daily_breakdown[date] = {'requests': 0, 'data_mb': 0, 'success_count': 0}
            daily_breakdown[date]['requests'] += 1
            daily_breakdown[date]['data_mb'] += record.response_size_mb
            if record.success:
                daily_breakdown[date]['success_count'] += 1
        
        return {
            'month': year_month,
            'total_data_gb': round(total_data_gb, 3),
            'estimated_cost_8gb_plan': cost_8gb_plan if total_data_gb <= 8 else f"超出限制 ({total_data_gb:.1f}GB)",
            'estimated_cost_payg': round(cost_payg, 2),
            'daily_breakdown': daily_breakdown,
            'recommendation': self._get_plan_recommendation(total_data_gb)
        }
    
    def _get_plan_recommendation(self, monthly_gb: float) -> str:
        """根据使用量推荐套餐"""
        if monthly_gb <= 2:
            return "推荐: 2GB套餐 ($6/月) - 轻度使用"
        elif monthly_gb <= 8:
            return "推荐: 8GB套餐 ($22/月) - 最佳性价比 🏆"
        elif monthly_gb <= 25:
            return "推荐: 25GB套餐 ($65/月) - 重度使用"
        else:
            return f"推荐: 按需付费 (${monthly_gb * 3.5:.2f}/月) - 超大使用量"
    
    def print_daily_report(self, date: Optional[str] = None):
        """打印日报告"""
        stats = self.get_daily_stats(date)
        
        print(f"\n📊 代理使用日报告 - {stats['date']}")
        print("=" * 50)
        print(f"总请求数: {stats['total_requests']}")
        print(f"成功请求: {stats['successful_requests']}")
        print(f"成功率: {stats['success_rate']:.1f}%")
        print(f"总流量: {stats['total_data_mb']:.2f} MB")
        print(f"平均响应时间: {stats['avg_response_time_ms']:.0f} ms")
        
        if stats['operations']:
            print("\n📈 按操作类型:")
            for op, data in stats['operations'].items():
                success_rate = data['success_count'] / data['count'] * 100
                print(f"  {op}: {data['count']}次, {data['data_mb']:.2f}MB, 成功率{success_rate:.1f}%")
        
        if stats['proxy_types']:
            print("\n🌐 按代理类型:")
            for ptype, data in stats['proxy_types'].items():
                success_rate = data['success_count'] / data['count'] * 100
                print(f"  {ptype}: {data['count']}次, {data['data_mb']:.2f}MB, 成功率{success_rate:.1f}%")
    
    def print_monthly_report(self, year_month: Optional[str] = None):
        """打印月报告"""
        stats = self.get_monthly_stats(year_month)
        
        print(f"\n📊 代理使用月报告 - {stats['month']}")
        print("=" * 50)
        print(f"总流量: {stats['total_data_gb']:.3f} GB")
        print(f"8GB套餐成本: {stats['estimated_cost_8gb_plan']}")
        print(f"按需付费成本: ${stats['estimated_cost_payg']}")
        print(f"💡 {stats['recommendation']}")
        
        print(f"\n📅 日使用量分布:")
        for date, data in sorted(stats['daily_breakdown'].items()):
            success_rate = data['success_count'] / data['requests'] * 100 if data['requests'] > 0 else 0
            print(f"  {date}: {data['requests']}次, {data['data_mb']:.1f}MB, 成功率{success_rate:.1f}%")

# 全局监控实例
proxy_monitor = ProxyMonitor()

def record_proxy_usage(proxy_type: str, operation: str, url: str, success: bool, 
                      response_size_mb: float, response_time_ms: int, 
                      error_message: Optional[str] = None):
    """记录代理使用的便捷函数"""
    proxy_monitor.record_usage(
        proxy_type=proxy_type,
        operation=operation,
        url=url,
        success=success,
        response_size_mb=response_size_mb,
        response_time_ms=response_time_ms,
        error_message=error_message
    )

if __name__ == "__main__":
    # 示例使用
    monitor = ProxyMonitor()
    
    # 模拟一些使用记录
    monitor.record_usage(
        proxy_type="residential",
        operation="metadata",
        url="https://youtube.com/watch?v=example",
        success=True,
        response_size_mb=0.05,
        response_time_ms=1200
    )
    
    # 打印报告
    monitor.print_daily_report()
    monitor.print_monthly_report()
