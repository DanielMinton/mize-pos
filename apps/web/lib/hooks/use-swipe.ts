"use client";

import { useRef, useState, useCallback } from "react";
import { useDrag } from "@use-gesture/react";

interface UseSwipeOptions {
  threshold?: number; // Minimum distance to trigger swipe (default: 50px)
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  enabled?: boolean;
}

interface SwipeState {
  offset: number;
  direction: "left" | "right" | null;
  swiping: boolean;
}

export function useSwipe({
  threshold = 50,
  onSwipeLeft,
  onSwipeRight,
  enabled = true,
}: UseSwipeOptions = {}) {
  const [state, setState] = useState<SwipeState>({
    offset: 0,
    direction: null,
    swiping: false,
  });

  const bind = useDrag(
    ({ movement: [mx], active, cancel }) => {
      if (!enabled) {
        cancel();
        return;
      }

      const direction = mx < 0 ? "left" : mx > 0 ? "right" : null;

      if (active) {
        // Limit the offset to a reasonable range
        const limitedOffset = Math.max(-150, Math.min(150, mx));
        setState({
          offset: limitedOffset,
          direction,
          swiping: true,
        });
      } else {
        // Gesture ended
        if (Math.abs(mx) > threshold) {
          if (mx < -threshold && onSwipeLeft) {
            onSwipeLeft();
          } else if (mx > threshold && onSwipeRight) {
            onSwipeRight();
          }
        }

        // Reset state
        setState({
          offset: 0,
          direction: null,
          swiping: false,
        });
      }
    },
    {
      axis: "x",
      filterTaps: true,
      pointer: { touch: true },
    }
  );

  const style = {
    transform: `translateX(${state.offset}px)`,
    transition: state.swiping ? "none" : "transform 0.2s ease-out",
  };

  return {
    bind,
    style,
    ...state,
  };
}

// Simple hook for detecting swipe direction without visual feedback
export function useSwipeDetect({
  threshold = 50,
  onSwipeLeft,
  onSwipeRight,
  enabled = true,
}: UseSwipeOptions = {}) {
  const bind = useDrag(
    ({ movement: [mx], active, cancel }) => {
      if (!enabled) {
        cancel();
        return;
      }

      if (!active && Math.abs(mx) > threshold) {
        if (mx < -threshold && onSwipeLeft) {
          onSwipeLeft();
        } else if (mx > threshold && onSwipeRight) {
          onSwipeRight();
        }
      }
    },
    {
      axis: "x",
      filterTaps: true,
      pointer: { touch: true },
    }
  );

  return { bind };
}
