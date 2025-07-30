'use client';

import { useState, useRef, useCallback } from 'react';

interface TouchFeedbackProps {
  children: React.ReactNode;
  className?: string;
  onTap?: () => void;
  disabled?: boolean;
  hapticFeedback?: boolean;
}

export default function MobileTouchFeedback({
  children,
  className = '',
  onTap,
  disabled = false,
  hapticFeedback = true,
}: TouchFeedbackProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState<
    Array<{ id: number; x: number; y: number }>
  >([]);
  const elementRef = useRef<HTMLDivElement>(null);
  const rippleIdRef = useRef(0);

  const triggerHapticFeedback = useCallback(() => {
    if (!hapticFeedback) return;

    // 尝试触发触觉反馈
    if ('vibrate' in navigator) {
      navigator.vibrate(10); // 轻微震动10ms
    }

    // iOS Safari的触觉反馈API（如果可用）
    if ('hapticFeedback' in window) {
      try {
        (window as any).hapticFeedback.impact('light');
      } catch (e) {
        // 忽略错误
      }
    }
  }, [hapticFeedback]);

  const createRipple = useCallback(
    (event: React.TouchEvent | React.MouseEvent) => {
      if (disabled || !elementRef.current) return;

      const rect = elementRef.current.getBoundingClientRect();
      const x =
        ('touches' in event ? event.touches[0].clientX : event.clientX) -
        rect.left;
      const y =
        ('touches' in event ? event.touches[0].clientY : event.clientY) -
        rect.top;

      const newRipple = {
        id: rippleIdRef.current++,
        x,
        y,
      };

      setRipples(prev => [...prev, newRipple]);

      // 移除涟漪效果
      setTimeout(() => {
        setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
      }, 600);
    },
    [disabled]
  );

  const handleTouchStart = useCallback(
    (event: React.TouchEvent) => {
      if (disabled) return;

      setIsPressed(true);
      createRipple(event);
      triggerHapticFeedback();
    },
    [disabled, createRipple, triggerHapticFeedback]
  );

  const handleTouchEnd = useCallback(() => {
    if (disabled) return;

    setIsPressed(false);
    if (onTap) {
      onTap();
    }
  }, [disabled, onTap]);

  const handleTouchCancel = useCallback(() => {
    setIsPressed(false);
  }, []);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (disabled) return;

      setIsPressed(true);
      createRipple(event);
    },
    [disabled, createRipple]
  );

  const handleMouseUp = useCallback(() => {
    if (disabled) return;

    setIsPressed(false);
    if (onTap) {
      onTap();
    }
  }, [disabled, onTap]);

  const handleMouseLeave = useCallback(() => {
    setIsPressed(false);
  }, []);

  return (
    <div
      ref={elementRef}
      className={`
        relative overflow-hidden select-none
        ${isPressed ? 'scale-95' : 'scale-100'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        transition-transform duration-150 ease-out
        ${className}
      `}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      style={{
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
      }}
    >
      {children}

      {/* 涟漪效果 */}
      {ripples.map(ripple => (
        <div
          key={ripple.id}
          className="absolute pointer-events-none"
          style={{
            left: ripple.x - 20,
            top: ripple.y - 20,
            width: 40,
            height: 40,
          }}
        >
          <div className="w-full h-full bg-white/30 rounded-full animate-ping" />
        </div>
      ))}
    </div>
  );
}
