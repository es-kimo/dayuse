---
name: "🐛 버그 리포트 (Bug Report)"
description: "기능 오류, 타임존 불일치, UI 깨짐 등 버그 제보 및 수정 계획"
title: "fix: 버그 간략 설명"
labels: ["bug"]
assignees: ""
---

## 🐛 버그 설명 (Bug Description)
어떤 문제가 발생했는지 명확하고 간결하게 설명해 주세요.

---

## 🔄 재현 경로 (Steps to Reproduce)
1. '...' 페이지로 이동
2. '...' 버튼 클릭
3. '....' 상태 확인
4. 오류 발생

---

## ⚖️ 기대 동작 vs 실제 동작 (Expected vs Actual)
- **기대했던 정상 동작**: 
- **실제 발생한 오류 동작**: 

---

## 📱 환경 및 재현 데이터 (Context)
- **발생 시각 (KST)**: 예) 2026-09-22 07:45 KST
- **기기 / 브라우저**: 예) 모바일 Safari / Chrome Desktop
- **관련 리소스 ID**: 모임 ID: ``, 챌린지 ID: ``, 유저 ID: ``

---

## 📸 스크린샷 및 로그 (Screenshots & Logs)
(가능한 경우 스크린샷이나 백엔드/프론트엔드 에러 로그를 첨부해 주세요)

```
// 에러 로그 또는 API 응답 에러 JSON
```

---

## 🔍 원인 분석 및 수정 계획 (Root Cause & Plan)
- **추정 원인**: 
- **수정 대상 파일**: 
  - `backend/...`
  - `frontend/...`

---

## ✅ 해결 체크리스트
- [ ] 문제 재현 및 원인 규명
- [ ] 백엔드/프론트엔드 버그 픽스
- [ ] 회귀 방지 단위/통합 테스트 작성
- [ ] 전체 빌드 및 테스트 통과 확인 (`./gradlew test`, `npm run build`)
