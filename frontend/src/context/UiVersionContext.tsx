import React, { createContext, useContext, useState, useEffect } from 'react';

export type UiVersion = 'A' | 'B';

interface UiVersionContextType {
  uiVersion: UiVersion;
  setUiVersion: (version: UiVersion) => void;
  toggleUiVersion: () => void;
}

const STORAGE_KEY = 'dayuse_ui_version';

function getInitialUiVersion(): UiVersion {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const queryVersion = params.get('ui')?.toUpperCase();
    if (queryVersion === 'A' || queryVersion === 'B') {
      return queryVersion as UiVersion;
    }
    const stored = localStorage.getItem(STORAGE_KEY)?.toUpperCase();
    if (stored === 'A' || stored === 'B') {
      return stored as UiVersion;
    }
  }
  return 'B'; // v0.8 신규 UI가 기본값
}

const UiVersionContext = createContext<UiVersionContextType | undefined>(undefined);

export const UiVersionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [uiVersion, setUiVersionState] = useState<UiVersion>(getInitialUiVersion);

  const setUiVersion = (version: UiVersion) => {
    setUiVersionState(version);
    localStorage.setItem(STORAGE_KEY, version);
  };

  const toggleUiVersion = () => {
    setUiVersion(uiVersion === 'A' ? 'B' : 'A');
  };

  useEffect(() => {
    // 쿼리 파라미터가 있으면 동기화
    const params = new URLSearchParams(window.location.search);
    const queryVersion = params.get('ui')?.toUpperCase();
    if (queryVersion === 'A' || queryVersion === 'B') {
      setUiVersion(queryVersion as UiVersion);
    }
  }, []);

  return (
    <UiVersionContext.Provider value={{ uiVersion, setUiVersion, toggleUiVersion }}>
      {children}
    </UiVersionContext.Provider>
  );
};

export const useUiVersion = (): UiVersionContextType => {
  const context = useContext(UiVersionContext);
  if (!context) {
    throw new Error('useUiVersion must be used within a UiVersionProvider');
  }
  return context;
};

/**
 * 개발/실험 환경 및 심사 검증용 UI 버전 전환 버튼
 * 사용자 유도 라벨 없이 A/B 전환 토글 기능 제공
 */
export const UiVersionSwitcherFloat: React.FC = () => {
  const { uiVersion, toggleUiVersion } = useUiVersion();

  return (
    <div
      className="fixed bottom-20 right-4 z-toast flex items-center shadow-lg rounded-full bg-slate-900/90 text-white text-xs font-semibold px-3 py-1.5 backdrop-blur-xs cursor-pointer select-none active:scale-95 transition"
      onClick={toggleUiVersion}
      role="button"
      tabIndex={0}
      aria-label={`UI 모드 전환 (현재 UI-${uiVersion})`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleUiVersion();
        }
      }}
    >
      <span className="opacity-70 mr-1.5 text-[10px]">UI</span>
      <span className={uiVersion === 'B' ? 'text-blue-400 font-bold' : 'text-slate-400'}>B</span>
      <span className="opacity-40 mx-1">/</span>
      <span className={uiVersion === 'A' ? 'text-amber-400 font-bold' : 'text-slate-400'}>A</span>
    </div>
  );
};
