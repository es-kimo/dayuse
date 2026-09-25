import { useEffect, useCallback } from 'react';

export interface UseClipboardImagePasteOptions {
  onImagePasted: (file: File) => void;
  onError?: (message: string) => void;
  onConfirmReplace?: (newFile: File) => void | boolean | Promise<boolean>;
  hasExistingImage?: boolean;
  enabled?: boolean;
  maxSizeBytes?: number;
  allowedTypes?: string[];
  targetRef?: React.RefObject<HTMLElement | null>;
}

export const DEFAULT_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const DEFAULT_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * 이미지 파일의 크기(10MB 이하) 및 형식(JPG, PNG, WebP) 검증 유틸리티
 */
export function validateImageFile(
  file: File,
  maxSizeBytes: number = DEFAULT_MAX_SIZE_BYTES,
  allowedTypes: string[] = DEFAULT_ALLOWED_TYPES
): { valid: boolean; error?: string } {
  if (file.size > maxSizeBytes) {
    return { valid: false, error: '파일 크기는 최대 10MB 이하만 가능합니다.' };
  }
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'JPG, PNG, WebP 형식의 이미지만 업로드할 수 있습니다.' };
  }
  return { valid: true };
}

/**
 * 클립보드(Ctrl+V / Cmd+V)로부터 이미지 복사 데이터를 감지하여 File 객체로 추출하고 검증하는 커스텀 훅
 */
export function useClipboardImagePaste({
  onImagePasted,
  onError,
  onConfirmReplace,
  hasExistingImage = false,
  enabled = true,
  maxSizeBytes = DEFAULT_MAX_SIZE_BYTES,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  targetRef,
}: UseClipboardImagePasteOptions) {
  const handlePaste = useCallback(
    async (event: ClipboardEvent) => {
      if (!enabled) return;

      const clipboardData = event.clipboardData;
      if (!clipboardData) return;

      // 1. clipboardData.items에서 이미지 파일 탐색
      const items = Array.from(clipboardData.items || []);
      const imageItems = items.filter(
        (item) => item.kind === 'file' && item.type.startsWith('image/')
      );

      // 이미지가 없으면 기본 브라우저 동작 유지 (한마디 textarea 텍스트 붙여넣기 등 정상 보장)
      if (imageItems.length === 0) {
        return;
      }

      // 이미지가 존재하므로 브라우저 기본 동작 차단
      event.preventDefault();

      // 다중 이미지 방어: 2장 이상일 경우 경고 노출 및 첫 번째 이미지만 처리
      if (imageItems.length > 1) {
        onError?.('사진은 1장만 등록 가능합니다. 첫 번째 사진이 첨부됩니다.');
      }

      const primaryItem = imageItems[0];
      const rawFile = primaryItem.getAsFile();
      if (!rawFile) {
        onError?.('클립보드에서 이미지 파일을 읽어올 수 없습니다.');
        return;
      }

      // 파일명이 없거나 기본 이름인 경우 타임스탬프 기반 파일명 부여
      let file = rawFile;
      if (!file.name || file.name === 'image.png' || file.name === 'blob') {
        const ext = file.type.split('/')[1] || 'png';
        file = new File([rawFile], `clipboard-${Date.now()}.${ext}`, {
          type: file.type,
          lastModified: Date.now(),
        });
      }

      // 2. 파일 형식 및 용량 유효성 검사
      const validation = validateImageFile(file, maxSizeBytes, allowedTypes);
      if (!validation.valid) {
        onError?.(validation.error || '유효하지 않은 이미지 파일입니다.');
        return;
      }

      // 3. 기존 첨부 파일 존재 시 교체 확인 흐름
      if (hasExistingImage && onConfirmReplace) {
        const result = await onConfirmReplace(file);
        // onConfirmReplace가 boolean을 직접 반환하는 경우 false이면 교체 중단
        if (result === false) {
          return;
        }
        // onConfirmReplace가 커스텀 모달을 띄우는 용도(void 반환)인 경우,
        // 모달에서 사용자가 확정할 때 onImagePasted를 호출하도록 위임
        if (result === undefined) {
          return;
        }
      }

      onImagePasted(file);
    },
    [
      enabled,
      hasExistingImage,
      onImagePasted,
      onError,
      onConfirmReplace,
      maxSizeBytes,
      allowedTypes,
    ]
  );

  useEffect(() => {
    if (!enabled) return;

    const target = targetRef?.current || window;
    const listener = (e: Event) => {
      handlePaste(e as ClipboardEvent);
    };

    target.addEventListener('paste', listener);

    return () => {
      target.removeEventListener('paste', listener);
    };
  }, [enabled, targetRef, handlePaste]);
}
