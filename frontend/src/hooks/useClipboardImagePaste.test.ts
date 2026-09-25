import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useClipboardImagePaste,
  validateImageFile,
  DEFAULT_MAX_SIZE_BYTES,
} from './useClipboardImagePaste';

describe('useClipboardImagePaste & validateImageFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateImageFile', () => {
    it('10MB 이하의 JPG, PNG, WebP 파일은 유효성 검사를 통과한다', () => {
      const validPng = new File(['dummy'], 'test.png', { type: 'image/png' });
      const validJpg = new File(['dummy'], 'test.jpg', { type: 'image/jpeg' });
      const validWebp = new File(['dummy'], 'test.webp', { type: 'image/webp' });

      expect(validateImageFile(validPng).valid).toBe(true);
      expect(validateImageFile(validJpg).valid).toBe(true);
      expect(validateImageFile(validWebp).valid).toBe(true);
    });

    it('10MB를 초과하는 파일은 유효성 검사에 실패한다', () => {
      const largeFile = new File([''], 'large.png', { type: 'image/png' });
      Object.defineProperty(largeFile, 'size', {
        value: DEFAULT_MAX_SIZE_BYTES + 1,
      });

      const result = validateImageFile(largeFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('10MB 이하');
    });

    it('허용되지 않는 형식(예: GIF, PDF)은 유효성 검사에 실패한다', () => {
      const gifFile = new File(['dummy'], 'test.gif', { type: 'image/gif' });
      const pdfFile = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });

      expect(validateImageFile(gifFile).valid).toBe(false);
      expect(validateImageFile(gifFile).error).toContain('JPG, PNG, WebP');
      expect(validateImageFile(pdfFile).valid).toBe(false);
    });
  });

  describe('useClipboardImagePaste Hook', () => {
    const createClipboardEvent = (items: Array<{ kind: string; type: string; file?: File }>) => {
      const preventDefault = vi.fn();
      const mockItems = items.map((item) => ({
        kind: item.kind,
        type: item.type,
        getAsFile: () => item.file || new File(['dummy'], 'test.png', { type: item.type }),
      }));

      const event = new Event('paste') as any;
      event.preventDefault = preventDefault;
      event.clipboardData = {
        items: mockItems,
        types: items.map((i) => i.type),
      };

      return { event, preventDefault };
    };

    it('클립보드에 이미지가 있을 때 preventDefault를 호출하고 onImagePasted를 실행한다', async () => {
      const onImagePasted = vi.fn();
      const onError = vi.fn();

      renderHook(() =>
        useClipboardImagePaste({
          onImagePasted,
          onError,
        })
      );

      const mockFile = new File(['image-bits'], 'screenshot.png', { type: 'image/png' });
      const { event, preventDefault } = createClipboardEvent([
        { kind: 'file', type: 'image/png', file: mockFile },
      ]);

      window.dispatchEvent(event);

      expect(preventDefault).toHaveBeenCalledTimes(1);
      expect(onImagePasted).toHaveBeenCalledTimes(1);
      expect(onImagePasted).toHaveBeenCalledWith(expect.any(File));
      expect(onError).not.toHaveBeenCalled();
    });

    it('순수 텍스트 붙여넣기 시 preventDefault를 호출하지 않고 onImagePasted도 호출하지 않는다', () => {
      const onImagePasted = vi.fn();
      const onError = vi.fn();

      renderHook(() =>
        useClipboardImagePaste({
          onImagePasted,
          onError,
        })
      );

      const { event, preventDefault } = createClipboardEvent([
        { kind: 'string', type: 'text/plain' },
      ]);

      window.dispatchEvent(event);

      expect(preventDefault).not.toHaveBeenCalled();
      expect(onImagePasted).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it('10MB 초과 이미지 붙여넣기 시 onError를 호출하고 onImagePasted를 호출하지 않는다', () => {
      const onImagePasted = vi.fn();
      const onError = vi.fn();

      renderHook(() =>
        useClipboardImagePaste({
          onImagePasted,
          onError,
        })
      );

      const largeFile = new File([''], 'huge.png', { type: 'image/png' });
      Object.defineProperty(largeFile, 'size', {
        value: 11 * 1024 * 1024,
      });

      const { event, preventDefault } = createClipboardEvent([
        { kind: 'file', type: 'image/png', file: largeFile },
      ]);

      window.dispatchEvent(event);

      expect(preventDefault).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(expect.stringContaining('10MB 이하'));
      expect(onImagePasted).not.toHaveBeenCalled();
    });

    it('지원하지 않는 형식(GIF 등) 붙여넣기 시 onError를 호출하고 onImagePasted를 호출하지 않는다', () => {
      const onImagePasted = vi.fn();
      const onError = vi.fn();

      renderHook(() =>
        useClipboardImagePaste({
          onImagePasted,
          onError,
        })
      );

      const gifFile = new File(['dummy'], 'animation.gif', { type: 'image/gif' });
      const { event, preventDefault } = createClipboardEvent([
        { kind: 'file', type: 'image/gif', file: gifFile },
      ]);

      window.dispatchEvent(event);

      expect(preventDefault).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(expect.stringContaining('JPG, PNG, WebP'));
      expect(onImagePasted).not.toHaveBeenCalled();
    });

    it('다중 이미지가 전달된 경우 안내 메시지를 전달하고 첫 번째 이미지를 처리한다', () => {
      const onImagePasted = vi.fn();
      const onError = vi.fn();

      renderHook(() =>
        useClipboardImagePaste({
          onImagePasted,
          onError,
        })
      );

      const file1 = new File(['1'], 'first.png', { type: 'image/png' });
      const file2 = new File(['2'], 'second.png', { type: 'image/png' });

      const { event } = createClipboardEvent([
        { kind: 'file', type: 'image/png', file: file1 },
        { kind: 'file', type: 'image/png', file: file2 },
      ]);

      window.dispatchEvent(event);

      expect(onError).toHaveBeenCalledWith(expect.stringContaining('사진은 1장만'));
      expect(onImagePasted).toHaveBeenCalledTimes(1);
    });

    it('기존 이미지가 있을 때 onConfirmReplace가 false를 반환하면 교체하지 않는다', async () => {
      const onImagePasted = vi.fn();
      const onConfirmReplace = vi.fn().mockResolvedValue(false);

      renderHook(() =>
        useClipboardImagePaste({
          onImagePasted,
          onConfirmReplace,
          hasExistingImage: true,
        })
      );

      const mockFile = new File(['new'], 'new.png', { type: 'image/png' });
      const { event } = createClipboardEvent([
        { kind: 'file', type: 'image/png', file: mockFile },
      ]);

      window.dispatchEvent(event);

      // async callback flush
      await vi.waitFor(() => {
        expect(onConfirmReplace).toHaveBeenCalledTimes(1);
      });
      expect(onImagePasted).not.toHaveBeenCalled();
    });

    it('기존 이미지가 있을 때 onConfirmReplace가 true를 반환하면 새 이미지로 교체한다', async () => {
      const onImagePasted = vi.fn();
      const onConfirmReplace = vi.fn().mockResolvedValue(true);

      renderHook(() =>
        useClipboardImagePaste({
          onImagePasted,
          onConfirmReplace,
          hasExistingImage: true,
        })
      );

      const mockFile = new File(['new'], 'new.png', { type: 'image/png' });
      const { event } = createClipboardEvent([
        { kind: 'file', type: 'image/png', file: mockFile },
      ]);

      window.dispatchEvent(event);

      await vi.waitFor(() => {
        expect(onConfirmReplace).toHaveBeenCalledTimes(1);
        expect(onImagePasted).toHaveBeenCalledTimes(1);
      });
    });

    it('enabled: false일 때는 클립보드 이벤트를 처리하지 않는다', () => {
      const onImagePasted = vi.fn();

      renderHook(() =>
        useClipboardImagePaste({
          onImagePasted,
          enabled: false,
        })
      );

      const { event, preventDefault } = createClipboardEvent([
        { kind: 'file', type: 'image/png' },
      ]);

      window.dispatchEvent(event);

      expect(preventDefault).not.toHaveBeenCalled();
      expect(onImagePasted).not.toHaveBeenCalled();
    });
  });
});
