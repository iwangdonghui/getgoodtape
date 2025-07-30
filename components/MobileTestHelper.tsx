'use client';

import { useState, useEffect } from 'react';

interface DeviceInfo {
  userAgent: string;
  screenWidth: number;
  screenHeight: number;
  devicePixelRatio: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  orientation: string;
  touchSupport: boolean;
}

export default function MobileTestHelper() {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [showHelper, setShowHelper] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const updateDeviceInfo = () => {
      const info: DeviceInfo = {
        userAgent: navigator.userAgent,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        devicePixelRatio: window.devicePixelRatio,
        isMobile: window.innerWidth <= 768,
        isTablet: window.innerWidth > 768 && window.innerWidth <= 1024,
        isDesktop: window.innerWidth > 1024,
        orientation:
          window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
        touchSupport: 'ontouchstart' in window,
      };
      setDeviceInfo(info);
    };

    updateDeviceInfo();
    window.addEventListener('resize', updateDeviceInfo);
    window.addEventListener('orientationchange', updateDeviceInfo);

    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', updateDeviceInfo);
    };
  }, [isClient]);

  if (!isClient || !deviceInfo) return null;

  return (
    <>
      {/* 移动端测试按钮 */}
      <button
        onClick={() => setShowHelper(!showHelper)}
        className="fixed bottom-4 right-4 z-50 bg-warm-orange text-white p-3 rounded-full shadow-lg hover:bg-warm-orange/90 transition-colors"
        style={{
          display: process.env.NODE_ENV === 'development' ? 'block' : 'none',
        }}
      >
        📱
      </button>

      {/* 设备信息面板 */}
      {showHelper && (
        <div className="fixed bottom-16 right-4 z-50 bg-white border border-gray-300 rounded-lg shadow-xl p-4 max-w-xs text-xs">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-deep-brown">设备信息</h3>
            <button
              onClick={() => setShowHelper(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2">
            <div>
              <span className="font-medium">屏幕尺寸:</span>
              <br />
              {deviceInfo.screenWidth} × {deviceInfo.screenHeight}
            </div>

            <div>
              <span className="font-medium">视窗尺寸:</span>
              <br />
              {window.innerWidth} × {window.innerHeight}
            </div>

            <div>
              <span className="font-medium">设备类型:</span>
              <br />
              {deviceInfo.isMobile && '📱 移动端'}
              {deviceInfo.isTablet && '📱 平板'}
              {deviceInfo.isDesktop && '💻 桌面端'}
            </div>

            <div>
              <span className="font-medium">方向:</span>
              <br />
              {deviceInfo.orientation === 'portrait' ? '📱 竖屏' : '📱 横屏'}
            </div>

            <div>
              <span className="font-medium">触摸支持:</span>
              <br />
              {deviceInfo.touchSupport ? '✅ 支持' : '❌ 不支持'}
            </div>

            <div>
              <span className="font-medium">像素比:</span>
              <br />
              {deviceInfo.devicePixelRatio}x
            </div>

            <div className="pt-2 border-t">
              <span className="font-medium">Tailwind断点:</span>
              <br />
              <div className="flex flex-wrap gap-1 mt-1">
                <span className="block sm:hidden bg-red-100 text-red-800 px-1 rounded text-xs">
                  XS
                </span>
                <span className="hidden sm:block md:hidden bg-yellow-100 text-yellow-800 px-1 rounded text-xs">
                  SM
                </span>
                <span className="hidden md:block lg:hidden bg-green-100 text-green-800 px-1 rounded text-xs">
                  MD
                </span>
                <span className="hidden lg:block xl:hidden bg-blue-100 text-blue-800 px-1 rounded text-xs">
                  LG
                </span>
                <span className="hidden xl:block bg-purple-100 text-purple-800 px-1 rounded text-xs">
                  XL
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
