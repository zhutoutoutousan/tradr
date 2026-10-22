import { useState, useRef, useCallback, TouchEvent } from 'react';

interface SwipeDismissOptions {
  threshold?: number; // Distance threshold for dismiss (default: 100px)
  onDismiss?: () => void;
}

export function useSwipeDismiss({ threshold = 100, onDismiss }: SwipeDismissOptions = {}) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const currentTranslateX = useRef<number>(0);

  const dismiss = useCallback(() => {
    setTranslateX(400); // Slide out to the right
    setTimeout(() => {
      setIsDismissed(true);
      onDismiss?.();
    }, 300);
  }, [onDismiss]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setIsSwiping(true);
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isSwiping) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartX.current;
    const diffY = currentY - touchStartY.current;

    // Only allow horizontal swipes (not vertical scrolling)
    if (Math.abs(diffY) > Math.abs(diffX)) {
      return;
    }

    // Prevent default to avoid scroll
    if (Math.abs(diffX) > 10) {
      e.preventDefault();
    }

    currentTranslateX.current = diffX;
    setTranslateX(diffX);
  }, [isSwiping]);

  const handleTouchEnd = useCallback(() => {
    setIsSwiping(false);

    // Check if swipe distance exceeds threshold
    if (Math.abs(currentTranslateX.current) > threshold) {
      // Dismiss animation
      setTranslateX(currentTranslateX.current > 0 ? 400 : -400);
      setTimeout(() => {
        setIsDismissed(true);
        onDismiss?.();
      }, 300);
    } else {
      // Snap back
      setTranslateX(0);
    }

    currentTranslateX.current = 0;
  }, [threshold, onDismiss]);

  const handlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };

  const style = {
    transform: `translateX(${translateX}px)`,
    transition: isSwiping ? 'none' : 'transform 0.3s ease-out',
    opacity: Math.max(0, 1 - Math.abs(translateX) / 200),
  };

  return {
    isDismissed,
    handlers,
    style,
    dismiss,
  };
}
