import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

const seenNotices = new Set<string>();
const storageKey = 'dayuse:seen-notice-motion:';
function hasSeen(key: string) {
  try { return seenNotices.has(key) || sessionStorage.getItem(storageKey + key) === '1'; }
  catch { return seenNotices.has(key); }
}
function remember(key: string) {
  seenNotices.add(key);
  try { sessionStorage.setItem(storageKey + key, '1'); } catch { /* Memory fallback for restricted storage. */ }
}

/** Always mount the slot. Only a newly arriving notice animates, once per tab. */
export function NoticeTransition({ children, noticeKey, gap = 14 }: {
  children: ReactNode;
  noticeKey: string;
  gap?: number;
}) {
  const present = Boolean(children);
  const [content, setContent] = useState(children);
  // Content available on the initial render belongs to the page, not an entrance.
  const [expanded, setExpanded] = useState(present);
  const [immediate, setImmediate] = useState(present);
  const visibleKey = useRef(present ? noticeKey : null);

  useLayoutEffect(() => {
    let frame = 0;
    let nextFrame = 0;
    let removal: ReturnType<typeof setTimeout> | undefined;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const synchronize = () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(nextFrame);
      clearTimeout(removal);
      if (children) {
        setContent(children);
        if (visibleKey.current === noticeKey) {
          remember(noticeKey);
          return;
        }
        const skip = reduced.matches || hasSeen(noticeKey) || visibleKey.current !== null;
        setImmediate(skip);
        if (skip) {
          setExpanded(true);
          visibleKey.current = noticeKey;
          remember(noticeKey);
        } else {
          frame = requestAnimationFrame(() => {
            nextFrame = requestAnimationFrame(() => {
              setExpanded(true);
              visibleKey.current = noticeKey;
              remember(noticeKey);
            });
          });
        }
      } else {
        visibleKey.current = null;
        setImmediate(reduced.matches);
        setExpanded(false);
        if (reduced.matches) setContent(null);
        else removal = setTimeout(() => setContent(null), 260);
      }
    };
    synchronize();
    reduced.addEventListener('change', synchronize);
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(nextFrame);
      clearTimeout(removal);
      reduced.removeEventListener('change', synchronize);
    };
  }, [children, noticeKey]);

  return (
    <div
      className="notice-transition"
      data-expanded={expanded}
      data-immediate={immediate}
      style={{ '--notice-gap': `${gap}px` } as CSSProperties}
      inert={!present || !expanded}
      aria-hidden={!present || !expanded}
    >
      <div className="notice-transition-clip">
        <div className="notice-transition-content">{content}</div>
      </div>
    </div>
  );
}
