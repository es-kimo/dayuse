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
 * [사용자 미션 1] 이미지 파일의 크기(10MB 이하) 및 형식(JPG, PNG, WebP) 검증 유틸리티
 *
 * 요구사항:
 * 1. file.size가 maxSizeBytes(기본 10MB)를 초과하면 { valid: false, error: '파일 크기는 최대 10MB 이하만 가능합니다.' } 반환
 * 2. file.type이 allowedTypes(기본 JPG, PNG, WebP)에 포함되지 않으면 { valid: false, error: 'JPG, PNG, WebP 형식의 이미지만 업로드할 수 있습니다.' } 반환
 * 3. 모든 검증을 통과하면 { valid: true } 반환
 */
export function validateImageFile(
  file: File,
  maxSizeBytes: number = DEFAULT_MAX_SIZE_BYTES,
  allowedTypes: string[] = DEFAULT_ALLOWED_TYPES
): { valid: boolean; error?: string } {
  // TODO [사용자 미션 1]: 파일 크기 및 MIME type 유효성 검사 로직을 구현하세요.
  void file;
  void maxSizeBytes;
  void allowedTypes;
  return { valid: false, error: '미구현 상태' };
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

      // TODO [사용자 미션 2]: 클립보드 이벤트에서 이미지 탐색 및 텍스트 충돌 방지 분기 처리
      // 1. clipboardData.items 배열에서 kind === 'file' 이고 type.startsWith('image/')인 아이템을 탐색합니다.
      // 2. 이미지가 없다면 (순수 텍스트 붙여넣기인 경우) 아무 동작도 하지 않고 즉시 return 합니다.
      //    (중요: event.preventDefault()를 호출하지 않아야 textarea/input의 일반 텍스트 붙여넣기가 정상 보장됩니다!)
      // 3. 이미지가 존재하는 경우 event.preventDefault()를 호출하여 브라우저 기본 동작을 차단합니다.
      // 4. 이미지가 2개 이상 들어온 경우 다중 이미지 방어: onError 콜백으로 경고 메시지를 노출합니다.
      // 5. 첫 번째 이미지 아이템에서 getAsFile()로 rawFile을 추출합니다. (없으면 onError 호출 후 return)
      // 6. 파일명이 없거나 blob/image.png인 경우 타임스탬프 기반 이름(clipboard-${Date.now()}.${ext})을 가진 File 객체로 정규화합니다.

      // TODO [사용자 미션 3]: 유효성 검사, 기존 사진 교체 확인 및 최종 파일 적용 흐름 구현
      // 1. validateImageFile()을 호출하여 크기 및 확장자를 검증하고, 유효하지 않으면 onError 호출 후 return 합니다.
      // 2. hasExistingImage가 true이고 onConfirmReplace 콜백이 제공된 경우:
      //    - await onConfirmReplace(file)을 실행합니다.
      //    - 결과가 false이면 (사용자가 교체 취소) 즉시 return 합니다.
      //    - 결과가 undefined이면 (외부 커스텀 다이얼로그 모달 등으로 위임된 경우) return 합니다.
      // 3. 모든 검증과 확인을 마쳤다면 onImagePasted(file)을 호출합니다.
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
