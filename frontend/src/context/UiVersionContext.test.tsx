import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UiVersionProvider, useUiVersion, UiVersionSwitcherFloat } from './UiVersionContext';

const TestConsumer: React.FC = () => {
  const { uiVersion, setUiVersion, toggleUiVersion } = useUiVersion();
  return (
    <div>
      <span data-testid="version-display">{uiVersion}</span>
      <button onClick={() => setUiVersion('A')}>Set A</button>
      <button onClick={() => setUiVersion('B')}>Set B</button>
      <button onClick={toggleUiVersion}>Toggle</button>
    </div>
  );
};

describe('UiVersionContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('기본 UI 버전은 B(v0.8 신규 UI)이다', () => {
    render(
      <UiVersionProvider>
        <TestConsumer />
      </UiVersionProvider>
    );

    expect(screen.getByTestId('version-display').textContent).toBe('B');
  });

  it('localStorage에 저장된 버전을 우선 로드한다', () => {
    localStorage.setItem('dayuse_ui_version', 'A');

    render(
      <UiVersionProvider>
        <TestConsumer />
      </UiVersionProvider>
    );

    expect(screen.getByTestId('version-display').textContent).toBe('A');
  });

  it('버전 전환 및 토글이 정상 작동하며 localStorage에 동기화된다', () => {
    render(
      <UiVersionProvider>
        <TestConsumer />
        <UiVersionSwitcherFloat />
      </UiVersionProvider>
    );

    expect(screen.getByTestId('version-display').textContent).toBe('B');

    fireEvent.click(screen.getByText('Set A'));
    expect(screen.getByTestId('version-display').textContent).toBe('A');
    expect(localStorage.getItem('dayuse_ui_version')).toBe('A');

    fireEvent.click(screen.getByText('Toggle'));
    expect(screen.getByTestId('version-display').textContent).toBe('B');
    expect(localStorage.getItem('dayuse_ui_version')).toBe('B');
  });

});
