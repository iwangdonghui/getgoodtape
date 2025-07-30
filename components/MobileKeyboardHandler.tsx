'use client';

import { useEffect, useState } from 'react';

interface MobileKeyboardHandlerProps {
  children: React.ReactNode;
}

export default function MobileKeyboardHandler({
  children,
}: MobileKeyboardHandlerProps) {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    // 检测是否为移动设备
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    if (!isMobile) return;

    let initialViewportHeight =
      window.visualViewport?.height || window.innerHeight;

    const handleViewportChange = () => {
      if (!window.visualViewport) return;

      const currentHeight = window.visualViewport.height;
      const heightDifference = initialViewportHeight - currentHeight;

      // 如果高度差超过150px，认为键盘打开了
      if (heightDifference > 150) {
        setKeyboardHeight(heightDifference);
        setIsKeyboardOpen(true);
      } else {
        setKeyboardHeight(0);
        setIsKeyboardOpen(false);
      }
    };

    const handleResize = () => {
      // 更新初始视窗高度（处理设备旋转）
      if (!isKeyboardOpen) {
        initialViewportHeight =
          window.visualViewport?.height || window.innerHeight;
      }
    };

    // 监听视窗变化
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      window.addEventListener('resize', handleResize);
    } else {
      // 降级方案：监听window resize
      window.addEventListener('resize', () => {
        const currentHeight = window.innerHeight;
        const heightDifference = initialViewportHeight - currentHeight;

        if (heightDifference > 150) {
          setKeyboardHeight(heightDifference);
          setIsKeyboardOpen(true);
        } else {
          setKeyboardHeight(0);
          setIsKeyboardOpen(false);
        }
      });
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener(
          'resize',
          handleViewportChange
        );
        window.removeEventListener('resize', handleResize);
      } else {
        window.removeEventListener('resize', handleViewportChange);
      }
    };
  }, [isKeyboardOpen]);

  return (
    <div
      className={`mobile-keyboard-adjust ${isKeyboardOpen ? 'keyboard-open' : ''}`}
      style={{
        marginBottom: isKeyboardOpen
          ? `${Math.max(0, keyboardHeight - 100)}px`
          : '0px',
      }}
    >
      {children}
    </div>
  );
}
