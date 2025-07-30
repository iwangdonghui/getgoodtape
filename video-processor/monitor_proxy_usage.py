#!/usr/bin/env python3
"""
代理使用监控脚本
用于查看代理使用情况和成本分析
"""

import sys
import argparse
from datetime import datetime, timedelta
from proxy_monitor import ProxyMonitor

def main():
    parser = argparse.ArgumentParser(description='代理使用监控工具')
    parser.add_argument('--daily', action='store_true', help='显示今日统计')
    parser.add_argument('--monthly', action='store_true', help='显示本月统计')
    parser.add_argument('--date', type=str, help='指定日期 (YYYY-MM-DD)')
    parser.add_argument('--month', type=str, help='指定月份 (YYYY-MM)')
    parser.add_argument('--simulate', action='store_true', help='模拟一些使用数据')
    
    args = parser.parse_args()
    
    monitor = ProxyMonitor()
    
    # 模拟数据（用于演示）
    if args.simulate:
        print("🔄 模拟代理使用数据...")
        import random
        from datetime import datetime, timedelta
        
        # 模拟过去7天的使用数据
        for i in range(7):
            date = datetime.now() - timedelta(days=i)
            
            # 每天模拟几次使用
            for j in range(random.randint(5, 20)):
                monitor.record_usage(
                    proxy_type="residential",
                    operation=random.choice(["metadata", "download", "convert"]),
                    url=f"https://youtube.com/watch?v=example{j}",
                    success=random.choice([True, True, True, False]),  # 75% 成功率
                    response_size_mb=random.uniform(0.05, 150),  # 50KB到150MB
                    response_time_ms=random.randint(500, 5000),
                    error_message=None if random.random() > 0.25 else "Connection timeout"
                )
        
        print("✅ 模拟数据已生成")
    
    # 显示统计信息
    if args.daily or (not args.monthly and not args.date and not args.month):
        date = args.date if args.date else None
        monitor.print_daily_report(date)
    
    if args.monthly or args.month:
        month = args.month if args.month else None
        monitor.print_monthly_report(month)
    
    # 显示成本建议
    print("\n💡 代理方案建议:")
    print("=" * 50)
    
    monthly_stats = monitor.get_monthly_stats()
    total_gb = monthly_stats['total_data_gb']
    
    print(f"本月使用量: {total_gb:.3f} GB")
    print()
    
    # 方案对比
    plans = [
        {"name": "2GB套餐", "price": 6, "limit": 2, "per_gb": 3.0},
        {"name": "8GB套餐", "price": 22, "limit": 8, "per_gb": 2.75},
        {"name": "25GB套餐", "price": 65, "limit": 25, "per_gb": 2.6},
        {"name": "按需付费", "price": total_gb * 3.5, "limit": float('inf'), "per_gb": 3.5}
    ]
    
    print("方案对比:")
    for plan in plans:
        if total_gb <= plan['limit']:
            status = "✅ 适合"
            cost = plan['price']
        else:
            status = "❌ 超限"
            cost = f"超出 ({total_gb:.1f}GB > {plan['limit']}GB)"
        
        print(f"  {plan['name']}: ${plan['price']:.2f}/月 (${plan['per_gb']:.2f}/GB) - {status}")
    
    # 推荐最佳方案
    print()
    best_plan = None
    min_cost = float('inf')
    
    for plan in plans:
        if total_gb <= plan['limit'] and plan['price'] < min_cost:
            min_cost = plan['price']
            best_plan = plan
    
    if best_plan:
        print(f"🏆 推荐方案: {best_plan['name']} (${best_plan['price']:.2f}/月)")
        
        # 计算节省
        payg_cost = total_gb * 3.5
        if best_plan['name'] != '按需付费' and payg_cost > best_plan['price']:
            savings = payg_cost - best_plan['price']
            print(f"💰 相比按需付费节省: ${savings:.2f}/月")
    
    print()
    print("📊 使用优化建议:")
    print("- 优先使用YouTube API获取元数据（免费）")
    print("- 仅在必要时使用代理下载")
    print("- 实施缓存机制避免重复请求")
    print("- 监控使用量，及时调整套餐")

if __name__ == "__main__":
    main()
