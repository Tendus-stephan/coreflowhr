import React, { useEffect, useRef, useState, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { isMarkSeen, dismissMark } from '../utils/coachMarks';

interface CoachMarkProps {
  markId: string;
  targetRef: RefObject<HTMLElement>;
  text: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

interface Position {
  top: number;
  left: number;
}

const CoachMark: React.FC<CoachMarkProps> = ({
  markId,
  targetRef,
  text,
  side = 'bottom',
  delay = 500,
}) => {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<Position>({ top: 0, left: 0 });
  const [dismissed, setDismissed] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Show after delay, positioned relative to target
  useEffect(() => {
    if (dismissed) return;

    const timer = setTimeout(() => {
      if (!targetRef.current) return;
      const rect = targetRef.current.getBoundingClientRect();
      const popoverWidth = 220;
      const popoverHeight = 60; // approximate
      const gap = 10;
      const arrowSize = 8;

      let top = 0;
      let left = 0;

      switch (side) {
        case 'bottom':
          top = rect.bottom + gap + arrowSize;
          left = rect.left + rect.width / 2 - popoverWidth / 2;
          break;
        case 'top':
          top = rect.top - gap - arrowSize - popoverHeight;
          left = rect.left + rect.width / 2 - popoverWidth / 2;
          break;
        case 'right':
          top = rect.top + rect.height / 2 - popoverHeight / 2;
          left = rect.right + gap + arrowSize;
          break;
        case 'left':
          top = rect.top + rect.height / 2 - popoverHeight / 2;
          left = rect.left - gap - arrowSize - popoverWidth;
          break;
      }

      // Clamp to viewport
      left = Math.max(8, Math.min(left, window.innerWidth - popoverWidth - 8));
      top = Math.max(8, top);

      setPos({ top, left });
      setVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [dismissed, targetRef, side, delay]);

  const handleDismiss = () => {
    setDismissed(true);
    setVisible(false);
    dismissMark(markId);
  };

  if (dismissed || !visible) return null;

  const arrowClasses: Record<string, string> = {
    bottom: 'absolute -top-1 left-1/2 -translate-x-1/2',
    top: 'absolute -bottom-1 left-1/2 -translate-x-1/2',
    right: 'absolute -left-1 top-1/2 -translate-y-1/2',
    left: 'absolute -right-1 top-1/2 -translate-y-1/2',
  };

  return createPortal(
    <div
      ref={popoverRef}
      style={{ top: pos.top, left: pos.left }}
      className="fixed z-[200] max-w-[220px] transition-opacity duration-200"
    >
      <div className="relative bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
        {/* Arrow */}
        <span
          className={`${arrowClasses[side]} w-2 h-2 bg-gray-900 rotate-45 block`}
        />
        <div className="flex items-start gap-2 relative z-10">
          <span className="leading-snug flex-1">{text}</span>
          <button
            onClick={handleDismiss}
            className="text-white/60 hover:text-white flex-shrink-0 leading-none"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default CoachMark;

/**
 * Wrapper that only renders if the mark hasn't been seen yet.
 * Must be used after loadSeenMarks() has resolved.
 */
export function CoachMarkIfUnseen(props: CoachMarkProps) {
  if (isMarkSeen(props.markId)) return null;
  return <CoachMark {...props} />;
}
