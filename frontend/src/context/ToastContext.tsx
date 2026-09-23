import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X, RefreshCw } from 'lucide-react';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  action?: ToastAction;
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, action?: ToastAction, duration?: number) => void;
  showErrorToast: (message: string, onRetry?: () => void) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// 전역 비-React 영역(Axios 인터셉터 등)에서 토스트를 호출할 수 있는 이벤트 버스
type ToastEventListener = (toast: Omit<ToastItem, 'id'>) => void;
const toastListeners: Set<ToastEventListener> = new Set();

export const triggerGlobalToast = (toast: Omit<ToastItem, 'id'>) => {
  toastListeners.forEach((listener) => listener(toast));
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', action?: ToastAction, duration: number = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast: ToastItem = { id, message, type, action, duration };

      setToasts((prev) => [...prev.slice(-2), newToast]); // 최대 3개까지만 표시

      if (duration > 0) {
        setTimeout(() => {
          hideToast(id);
        }, duration);
      }
    },
    [hideToast]
  );

  const showErrorToast = useCallback(
    (message: string, onRetry?: () => void) => {
      showToast(
        message,
        'error',
        onRetry ? { label: '다시 시도', onClick: onRetry } : undefined,
        5000
      );
    },
    [showToast]
  );

  useEffect(() => {
    const handleGlobalToast: ToastEventListener = (t) => {
      showToast(t.message, t.type, t.action, t.duration);
    };
    toastListeners.add(handleGlobalToast);
    return () => {
      toastListeners.delete(handleGlobalToast);
    };
  }, [showToast]);

  /*
   * 모달은 document.body로 Portal되므로 #root 바깥 스택에 놓인다.
   * 토스트를 #root 안에 두면 모달 뒤로 숨기 때문에 같은 곳으로 보낸다.
   * 겹침 순서는 tailwind.config.js의 zIndex 스케일이 정한다.
   */
  const toastLayer = (
    <div
      className="fixed bottom-[max(1.5rem,calc(1rem+env(safe-area-inset-bottom)))] left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-toast pointer-events-none flex flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const typeStyles = {
          success: 'bg-slate-900/95 text-white border-emerald-500/40',
          error: 'bg-red-950/95 text-white border-red-500/40',
          warning: 'bg-amber-950/95 text-white border-amber-500/40',
          info: 'bg-slate-900/95 text-white border-slate-700/60',
        }[toast.type];

        const Icon = {
          success: CheckCircle2,
          error: AlertCircle,
          warning: AlertTriangle,
          info: Info,
        }[toast.type];

        const iconColor = {
          success: 'text-emerald-400',
          error: 'text-red-400',
          warning: 'text-amber-400',
          info: 'text-blue-400',
        }[toast.type];

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl p-3.5 shadow-xl border backdrop-blur-md flex items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-bottom-2 duration-200 ${typeStyles}`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />
              <span className="font-medium text-[11px] leading-snug break-words">
                {toast.message}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    toast.action?.onClick();
                    hideToast(toast.id);
                  }}
                  className="min-h-[36px] px-2.5 py-1 bg-white/15 hover:bg-white/25 active:bg-white/30 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{toast.action.label}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => hideToast(toast.id)}
                className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white rounded-lg transition"
                aria-label="닫기"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <ToastContext.Provider value={{ showToast, showErrorToast, hideToast }}>
      {children}
      {createPortal(toastLayer, document.body)}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
