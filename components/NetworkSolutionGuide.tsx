'use client';

import { memo } from 'react';

const NetworkSolutionGuide = memo(function NetworkSolutionGuide() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        🌐 网络连接问题解决方案
      </h3>

      <div className="space-y-4">
        {/* 当前问题说明 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
          <div className="text-sm text-yellow-800">
            <div className="font-medium mb-2">🚨 当前检测到的问题:</div>
            <ul className="text-xs space-y-1">
              <li>
                • <strong>Failed to fetch</strong>: 无法连接到外部API
              </li>
              <li>
                • <strong>WebSocket 1006</strong>: WebSocket连接异常关闭
              </li>
              <li>
                • <strong>网络环境限制</strong>:
                可能是防火墙、代理或企业网络限制
              </li>
            </ul>
          </div>
        </div>

        {/* 立即可用的解决方案 */}
        <div className="bg-green-50 border border-green-200 rounded p-3">
          <div className="text-sm text-green-800">
            <div className="font-medium mb-2">✅ 立即可用的解决方案:</div>
            <ul className="text-xs space-y-1">
              <li>
                • <strong>使用本地模拟</strong>: 点击上方"🏠 本地模拟"按钮
              </li>
              <li>
                • <strong>功能完全可用</strong>:
                应用会自动使用HTTP轮询替代WebSocket
              </li>
              <li>
                • <strong>无需担心</strong>: 所有核心功能都不受影响
              </li>
            </ul>
          </div>
        </div>

        {/* 网络环境解决方案 */}
        <div className="space-y-3">
          <div className="font-medium text-gray-900">🔧 网络环境解决方案:</div>

          {/* 企业网络环境 */}
          <div className="border border-gray-200 rounded p-3">
            <div className="font-medium text-gray-800 mb-2">
              🏢 企业网络环境
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <div>
                <strong>问题</strong>: 企业防火墙阻止WebSocket连接
              </div>
              <div>
                <strong>解决方案</strong>:
              </div>
              <ul className="text-xs ml-4 space-y-1">
                <li>• 联系IT部门开放WebSocket协议 (端口443)</li>
                <li>• 请求开放域名: *.wangdonghuiibt-cloudflare.workers.dev</li>
                <li>• 使用企业VPN或代理白名单</li>
                <li>• 临时使用移动网络测试</li>
              </ul>
            </div>
          </div>

          {/* 家庭网络环境 */}
          <div className="border border-gray-200 rounded p-3">
            <div className="font-medium text-gray-800 mb-2">
              🏠 家庭网络环境
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <div>
                <strong>问题</strong>: 路由器或ISP限制
              </div>
              <div>
                <strong>解决方案</strong>:
              </div>
              <ul className="text-xs ml-4 space-y-1">
                <li>• 重启路由器和调制解调器</li>
                <li>• 检查路由器防火墙设置</li>
                <li>• 更新路由器固件</li>
                <li>• 联系ISP技术支持</li>
                <li>• 尝试使用手机热点</li>
              </ul>
            </div>
          </div>

          {/* 开发环境 */}
          <div className="border border-gray-200 rounded p-3">
            <div className="font-medium text-gray-800 mb-2">💻 开发环境</div>
            <div className="text-sm text-gray-600 space-y-1">
              <div>
                <strong>问题</strong>: 本地开发网络限制
              </div>
              <div>
                <strong>解决方案</strong>:
              </div>
              <ul className="text-xs ml-4 space-y-1">
                <li>
                  • 使用本地WebSocket服务器:{' '}
                  <code className="bg-gray-100 px-1 rounded">wrangler dev</code>
                </li>
                <li>• 修改hosts文件进行本地测试</li>
                <li>• 使用ngrok等隧道工具</li>
                <li>• 配置开发代理服务器</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 浏览器解决方案 */}
        <div className="space-y-3">
          <div className="font-medium text-gray-900">🌐 浏览器解决方案:</div>

          <div className="border border-gray-200 rounded p-3">
            <div className="text-sm text-gray-600 space-y-2">
              <div>
                <strong>清除浏览器数据</strong>:
              </div>
              <ul className="text-xs ml-4 space-y-1">
                <li>• 清除缓存和Cookie</li>
                <li>• 禁用浏览器扩展（特别是广告拦截器）</li>
                <li>• 尝试无痕/隐私模式</li>
                <li>• 检查浏览器安全设置</li>
              </ul>

              <div>
                <strong>尝试不同浏览器</strong>:
              </div>
              <ul className="text-xs ml-4 space-y-1">
                <li>• Chrome/Edge (推荐)</li>
                <li>• Firefox</li>
                <li>• Safari</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 技术说明 */}
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <div className="text-sm text-blue-800">
            <div className="font-medium mb-2">📚 技术说明:</div>
            <ul className="text-xs space-y-1">
              <li>
                • <strong>WebSocket vs HTTP</strong>:
                WebSocket提供实时通信，HTTP轮询是可靠的备选方案
              </li>
              <li>
                • <strong>自动降级</strong>: 应用会自动检测并切换到HTTP轮询
              </li>
              <li>
                • <strong>功能一致</strong>: 无论使用哪种方式，用户体验保持一致
              </li>
              <li>
                • <strong>生产环境</strong>: 在生产环境中WebSocket通常工作正常
              </li>
            </ul>
          </div>
        </div>

        {/* 联系支持 */}
        <div className="bg-gray-50 border border-gray-200 rounded p-3">
          <div className="text-sm text-gray-700">
            <div className="font-medium mb-2">📞 需要帮助?</div>
            <div className="text-xs space-y-1">
              <p>如果以上解决方案都无法解决问题，请:</p>
              <ul className="ml-4 space-y-1">
                <li>• 截图当前错误信息</li>
                <li>• 记录网络环境信息（企业网络/家庭网络/移动网络）</li>
                <li>• 提供浏览器类型和版本</li>
                <li>• 联系技术支持获取进一步帮助</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 快速操作 */}
        <div className="bg-purple-50 border border-purple-200 rounded p-3">
          <div className="text-sm text-purple-800">
            <div className="font-medium mb-2">⚡ 快速操作建议:</div>
            <ol className="text-xs space-y-1 list-decimal ml-4">
              <li>点击上方"🏠 本地模拟"测试基本功能</li>
              <li>尝试使用手机热点或不同网络</li>
              <li>检查浏览器是否有扩展阻止连接</li>
              <li>如果是企业网络，联系IT部门</li>
              <li>在生产环境中重新测试</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
});

export default NetworkSolutionGuide;
