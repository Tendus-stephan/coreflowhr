import React, { useEffect, useRef, useState, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { isMarkSeen, dismissMark } from '../utils/coachMarks';

export interface CoachMarkProps {
  markId: string;
  targetRef: RefObject<HTMLElement>;
  text: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  onDismiss?: () => void;
  /** Position in queue, 1-indexed. Shown as "1 / 3" when totalSteps > 1. */
  step?: number;
  totalSteps?: number;
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
  onDismiss,
  step,
  totalSteps,
}) => {
  const [visible, setVisible] = useState(false);
  const [faded, setFaded] = useState(false);
  const [pos, setPos] = useState<Position>({ top: 0, left: 0 });
  const [dismissed, setDismissed] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Show after delay, positioned relative to target
  useEffect(() => {
    if (dismissed) return;

    const timer = setTimeout(() => {
      if (!targetRef.current) return;
      const rect = targetRef.current.getBoundingClientRect();
      const popoverWidth = 230;
      const popoverHeight = 64;
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

      // Trigger fade-in on next frame
      requestAnimationFrame(() => setFaded(true));
    }, delay);

    return () => clearTimeout(timer);
  }, [dismissed, targetRef, side, delay]);

  const handleDismiss = () => {
    setDismissed(true);
    setVisible(false);
    setFaded(false);
    dismissMark(markId);
    onDismiss?.();
  };

  if (dismissed || !visible) return null;

  const arrowClasses: Record<string, string> = {
    bottom: 'absolute -top-1 left-1/2 -translate-x-1/2',
    top: 'absolute -bottom-1 left-1/2 -translate-x-1/2',
    right: 'absolute -left-1 top-1/2 -translate-y-1/2',
    left: 'absolute -right-1 top-1/2 -translate-y-1/2',
  };

  const showProgress = step !== undefined && totalSteps !== undefined && totalSteps > 1;

  return createPortal(
    <div
      ref={popoverRef}
      style={{
        top: pos.top,
        left: pos.left,
        opacity: faded ? 1 : 0,
        transform: faded ? 'translateY(0)' : 'translateY(4px)',
        transition: 'opacity 0.18s ease-out, transform 0.18s ease-out',
      }}
      className="fixed z-[200] max-w-[230px]"
    >
      <div className="relative bg-gray-900 text-white text-xs rounded-lg px-3 py-2.5 shadow-lg">
        {/* Arrow */}
        <span
          className={`${arrowClasses[side]} w-2 h-2 bg-gray-900 rotate-45 block`}
        />
        <div className="flex items-start gap-2 relative z-10">
          <span className="leading-snug flex-1">{text}</span>
          <button
            onClick={handleDismiss}
            className="text-white/50 hover:text-white flex-shrink-0 leading-none mt-0.5"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
        {showProgress && (
          <div className="mt-1.5 text-[10px] text-white/40 tabular-nums">
            {step} / {totalSteps}
          </div>
        )}
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

/**
 * Shows coach marks one at a time in order.
 * Filters already-seen marks on mount, then advances to the next
 * after a 500ms delay when the current one is dismissed.
 */
export function CoachMarkQueue({ marks }: { marks: Omit<CoachMarkProps, 'onDismiss'>[] }) {
  const queueRef = useRef(marks.filter(m => !isMarkSeen(m.markId)));
  const [activeIndex, setActiveIndex] = useState(0);

  const activeMark = queueRef.current[activeIndex];
  if (!activeMark) return null;

  const total = queueRef.current.length;

  return (
    <CoachMark
      key={activeMark.markId}
      {...activeMark}
      delay={activeIndex === 0 ? (activeMark.delay ?? 500) : 0}
      step={activeIndex + 1}
      totalSteps={total}
      onDismiss={() => setTimeout(() => setActiveIndex(i => i + 1), 500)}
    />
  );
}
