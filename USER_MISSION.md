# 🎓 사용자 핵심 학습 미션: 클립보드 인증 이미지 첨부 (Issue #26, F02)

본 이슈(GitHub Issue #26)는 **"웹 브라우저의 `paste` 이벤트에서 이미지 Blob 데이터와 일반 텍스트 데이터를 어떻게 충돌 없이 분기 처리하고, 폼의 다른 입력 필드(인증 한마디)의 포커스를 안전하게 보호할 것인가?"**, **"파일 탐색기(File Input)와 클립보드(Blob)를 하나의 통일된 파일 검증/미리보기/업로드 상태 머신으로 어떻게 구조화할 것인가?"**를 직접 고민하고 구현해보는 프론트엔드 핵심 UX/이벤트 아키텍처 학습 단계입니다.

AI Agent가 프론트엔드 단위 테스트 환경(`vitest`, `@testing-library/react`), 브라우저 클립보드 이벤트 시뮬레이션 단위 테스트 스위트(`useClipboardImagePaste.test.ts`), `VerificationModal` 내 단축키 힌트 뱃지, 기존 사진 교체 다이얼로그 모달, 삭제/교체 액션 UI를 모두 완성해 두었습니다.  
이제 아래의 3가지 핵심 미션을 직접 완성하여 **RED 상태인 9개의 단위 테스트를 모두 GREEN으로 전환**해보세요!

---

## 🎯 핵심 학습 질문 (미션을 완료하고 나면 답할 수 있게 됩니다)

1. **"웹 브라우저의 `paste` 이벤트에서 이미지 Blob 데이터와 일반 텍스트 데이터를 어떻게 충돌 없이 분기 처리하고, 폼의 다른 입력 필드(인증 한마디)의 포커스를 안전하게 보호했나요?"**
2. **"파일 탐색기를 통한 파일 선택(File Input)과 클립보드 붙여넣기(Blob)를 하나의 통일된 파일 검증/미리보기/업로드 상태 머신으로 어떻게 구조화했나요?"**
3. **"네트워크 불안정으로 이미지 업로드가 실패했을 때, 사용자가 작성 중이던 텍스트와 첨부 상태가 유실되지 않도록 보존하고 재시도를 유도하는 안전장치는 무엇인가요?"**

---

## 🧭 미션 목록 및 구현 가이드

- **대상 파일**: [`frontend/src/hooks/useClipboardImagePaste.ts`](frontend/src/hooks/useClipboardImagePaste.ts)

---

### 📍 [미션 1] `validateImageFile` 유틸리티 함수 구현
- **목표**: 파일 크기 및 지원하는 이미지 확장자(MIME type)를 엄격히 검증합니다.
- **요구사항**:
  1. `file.size > maxSizeBytes` (기본 10MB)인 경우:
     - `{ valid: false, error: '파일 크기는 최대 10MB 이하만 가능합니다.' }` 반환
  2. `!allowedTypes.includes(file.type)` (기본: `image/jpeg`, `image/png`, `image/webp`)인 경우:
     - `{ valid: false, error: 'JPG, PNG, WebP 형식의 이미지만 업로드할 수 있습니다.' }` 반환
  3. 모든 검증을 통과한 경우:
     - `{ valid: true }` 반환

---

### 📍 [미션 2] `useClipboardImagePaste` 클립보드 이벤트 파싱 & 텍스트 충돌 방지 분기 처리
- **목표**: 클립보드 이벤트에서 이미지 Blob을 안전하게 감지·추출하고, 일반 텍스트 붙여넣기와의 충돌을 완벽히 방지합니다.
- **요구사항**:
  1. `event.clipboardData?.items`를 배열로 순회하며 `item.kind === 'file'` 이고 `item.type.startsWith('image/')`인 이미지 항목을 필터링합니다.
  2. **순수 텍스트 붙여넣기 처리**:
     - 필터링된 이미지 항목이 없다면(0개) **아무런 동작도 하지 않고 즉시 return** 합니다.
     - ⚠️ **주의**: 이때 절대 `event.preventDefault()`를 호출하면 안 됩니다! 브라우저 기본 동작이 유지되어야만 사용자가 '인증 한마디' `textarea`나 다른 텍스트 필드에 포커스한 상태에서 텍스트를 붙여넣을 때 정상 작동합니다.
  3. **이미지가 감지된 경우**:
     - `event.preventDefault()`를 호출하여 브라우저의 기본 붙여넣기 동작(파일 경로 텍스트 삽입 등)을 차단합니다.
  4. **다중 이미지 방어**:
     - 클립보드에 감지된 이미지가 2개 이상인 경우 `onError?.('사진은 1장만 등록 가능합니다. 첫 번째 사진이 첨부됩니다.')`를 호출합니다.
  5. **File 객체 추출 & 파일명 정규화**:
     - 첫 번째 이미지 아이템에서 `item.getAsFile()`로 `File` 객체를 추출합니다. (없을 시 `onError` 호출 후 return)
     - 파일명이 없거나 브라우저 기본값(`image.png`, `blob`)인 경우, 타임스탬프와 확장자를 활용하여 `clipboard-${Date.now()}.${ext}` 형태의 명확한 파일명을 부여한 새 `File` 객체를 생성합니다.

---

### 📍 [미션 3] `useClipboardImagePaste` 유효성 검사, 기존 사진 교체 확인 및 파일 적용 흐름
- **목표**: 미션 1에서 작성한 검증 유틸리티를 적용하고, 기존 첨부 사진이 있을 때의 교체 확인 파이프라인을 완성합니다.
- **요구사항**:
  1. 미션 1의 `validateImageFile(file, maxSizeBytes, allowedTypes)`를 호출합니다.
     - 유효하지 않은 경우 `onError?.(validation.error || '유효하지 않은 이미지 파일입니다.')`를 호출하고 즉시 return 합니다.
  2. **기존 첨부 파일 존재 시 교체 확인 흐름**:
     - `hasExistingImage && onConfirmReplace` 조건인 경우:
       - `await onConfirmReplace(file)`을 실행합니다.
       - 반환값이 `false`인 경우 (사용자가 취소함): 즉시 return 합니다.
       - 반환값이 `undefined`인 경우 (커스텀 다이얼로그 모달 등으로 상태 위임): 모달의 사용자 입력에 따라 위임되므로 즉시 return 합니다.
  3. 모든 검증과 교체 확인을 거친 후 최종적으로 `onImagePasted(file)`를 호출합니다.

---

## 🧪 테스트 실행 및 검증 명령어

아래 명령어를 터미널에서 실행하여 작성한 코드의 통과 여부를 검증하세요:

```bash
# 1. 프론트엔드 디렉토리로 이동
cd frontend

# 2. 클립보드 붙여넣기 단위 테스트 실행 (9개 테스트 실패 RED ➡️ 통과 GREEN 전환 목표)
npm test

# 3. TypeScript 타입 체크 및 프로덕션 빌드 검증
npm run build
```

---

## 💡 정답 비교 및 힌트 확인 방법

작업을 완료하여 테스트를 모두 `GREEN`으로 만드신 후(또는 풀이 도중 막힐 때), 아래 명령어를 통해 Agent가 직전에 작성해 둔 모범 답안과 손쉽게 비교해 볼 수 있습니다:

```bash
# 직전 완성본 커밋(feat: ...)과 현재 작성 코드의 차이점 한눈에 비교하기
git diff HEAD~1
```
