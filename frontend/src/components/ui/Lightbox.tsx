import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog as BaseDialog } from '@base-ui/react';
import { X, ZoomIn, ZoomOut, RotateCcw, Loader2 } from 'lucide-react';

export interface LightboxProps {
  open: boolean;
  onClose: () => void;
  src: string;
  alt?: string;
}

export const Lightbox: React.FC<LightboxProps> = ({
  open,
  onClose,
  src,
  alt = '인증 사진 확대 보기',
}) => {
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const positionStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialTouchDistanceRef = useRef<number | null>(null);
  const initialTouchScaleRef = useRef<number>(1);
  const lastTapTimeRef = useRef<number>(0);

  // 모달이 열리거나 이미지가 바뀔 때 상태 초기화
  useEffect(() => {
    if (open) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setIsLoaded(false);
      setIsDragging(false);
    }
  }, [open, src]);

  // 배경 스크롤 차단
  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  // 줌 범위 제한 (1x ~ 4x)
  const clampScale = (newScale: number) => {
    return Math.min(4, Math.max(1, Math.round(newScale * 100) / 100));
  };

  const handleZoomIn = () => {
    setScale((prev) => clampScale(prev + 0.5));
  };

  const handleZoomOut = () => {
    setScale((prev) => {
      const next = clampScale(prev - 0.5);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // 마우스 휠 줌
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 0.2 : -0.2;
    setScale((prev) => {
      const next = clampScale(prev + zoomFactor);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  }, []);

  // 마우스 드래그 시작
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    positionStartRef.current = { ...position };
  };

  // 마우스 드래그 중
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    e.preventDefault();
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPosition({
      x: positionStartRef.current.x + dx,
      y: positionStartRef.current.y + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 모바일 터치 제스처
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // 핀치 줌 시작
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      initialTouchDistanceRef.current = Math.hypot(dx, dy);
      initialTouchScaleRef.current = scale;
    } else if (e.touches.length === 1) {
      // 더블 탭 감지
      const now = Date.now();
      if (now - lastTapTimeRef.current < 300) {
        // 더블 탭: 1x면 2x로, 확대 상태면 1x로 리셋
        if (scale > 1) {
          handleResetZoom();
        } else {
          setScale(2);
        }
        lastTapTimeRef.current = 0;
        return;
      }
      lastTapTimeRef.current = now;

      // 패닝 시작
      if (scale > 1) {
        setIsDragging(true);
        dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        positionStartRef.current = { ...position };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialTouchDistanceRef.current) {
      // 핀치 줌 진행
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.hypot(dx, dy);
      const scaleFactor = distance / initialTouchDistanceRef.current;
      setScale(clampScale(initialTouchScaleRef.current * scaleFactor));
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      // 드래그 패닝 진행
      const dx = e.touches[0].clientX - dragStartRef.current.x;
      const dy = e.touches[0].clientY - dragStartRef.current.y;
      setPosition({
        x: positionStartRef.current.x + dx,
        y: positionStartRef.current.y + dy,
      });
    }
  };

  const handleTouchEnd = () => {
    initialTouchDistanceRef.current = null;
    setIsDragging(false);
  };

  // 키보드 조작
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case '+':
        case '=':
          e.preventDefault();
          handleZoomIn();
          break;
        case '-':
        case '_':
          e.preventDefault();
          handleZoomOut();
          break;
        case '0':
          e.preventDefault();
          handleResetZoom();
          break;
        case 'ArrowUp':
          if (scale > 1) {
            e.preventDefault();
            setPosition((prev) => ({ ...prev, y: prev.y + 40 }));
          }
          break;
        case 'ArrowDown':
          if (scale > 1) {
            e.preventDefault();
            setPosition((prev) => ({ ...prev, y: prev.y - 40 }));
          }
          break;
        case 'ArrowLeft':
          if (scale > 1) {
            e.preventDefault();
            setPosition((prev) => ({ ...prev, x: prev.x + 40 }));
          }
          break;
        case 'ArrowRight':
          if (scale > 1) {
            e.preventDefault();
            setPosition((prev) => ({ ...prev, x: prev.x - 40 }));
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, scale]);

  return (
    <BaseDialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <BaseDialog.Portal>
        {/* 전체 화면 어두운 백드롭 */}
        <BaseDialog.Backdrop
          className="fixed inset-0 z-modal-top bg-black/95 backdrop-blur-md transition-opacity duration-200"
          onClick={onClose}
        />

        <div className="fixed inset-0 z-modal-top flex flex-col items-center justify-between p-4 pointer-events-none select-none">
          {/* 상단 툴바: 닫기 버튼 */}
          <div className="w-full flex items-center justify-between pointer-events-auto z-10 px-2 py-1">
            <span className="text-xs text-slate-400 font-medium truncate max-w-[200px]">
              {alt}
            </span>
            <BaseDialog.Close
              aria-label="닫기"
              className="p-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-full transition cursor-pointer focus-ring"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </BaseDialog.Close>
          </div>

          {/* 중앙 뷰어 영역 */}
          <div
            ref={containerRef}
            className={`flex-1 w-full flex items-center justify-center pointer-events-auto overflow-hidden relative ${
              scale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
            }`}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={(e) => {
              // 배경 빈 곳을 클릭했을 때만 닫기 (scale이 1일 때)
              if (e.target === containerRef.current && scale === 1) {
                onClose();
              }
            }}
          >
            {/* 로딩 스피너 */}
            {!isLoaded && (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            )}

            {/* 원본 비율 보존 이미지 */}
            <img
              src={src}
              alt={alt}
              draggable={false}
              onLoad={() => setIsLoaded(true)}
              style={{
                transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
                transition: isDragging ? 'none' : 'transform 0.15s ease-out',
              }}
              className={`max-w-[95dvw] max-h-[80dvh] object-contain rounded-lg shadow-2xl transition-opacity duration-200 ${
                isLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
          </div>

          {/* 하단 플로팅 줌 컨트롤 바 */}
          <div className="pointer-events-auto z-10 flex items-center gap-1 bg-slate-900/90 border border-slate-700/80 rounded-full px-3 py-1.5 shadow-xl text-slate-200 mb-2">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={scale <= 1}
              aria-label="축소"
              className="p-1.5 hover:text-white hover:bg-slate-800 rounded-full transition disabled:opacity-30 disabled:pointer-events-none"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <span className="text-xs font-mono font-medium px-2 min-w-[48px] text-center text-slate-300">
              {Math.round(scale * 100)}%
            </span>

            <button
              type="button"
              onClick={handleZoomIn}
              disabled={scale >= 4}
              aria-label="확대"
              className="p-1.5 hover:text-white hover:bg-slate-800 rounded-full transition disabled:opacity-30 disabled:pointer-events-none"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <div className="w-px h-4 bg-slate-700 mx-1" />

            <button
              type="button"
              onClick={handleResetZoom}
              disabled={scale === 1 && position.x === 0 && position.y === 0}
              aria-label="줌 초기화"
              title="초기화 (0)"
              className="p-1.5 hover:text-white hover:bg-slate-800 rounded-full transition disabled:opacity-30 disabled:pointer-events-none"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
};
