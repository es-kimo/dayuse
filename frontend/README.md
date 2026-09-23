# dayuse frontend

React (Vite, TypeScript) + Tailwind CSS. 모바일 반응형 웹 뷰포트 기준으로 만든다.

```bash
npm install
npm run dev      # http://localhost:5173 (/api 는 localhost:8080 으로 프록시)
npm run build    # tsc -b && vite build
npm run lint     # oxlint
```

## 환경 변수

`.env.example`을 `.env.local`로 복사해 채운다. 배포 시에는 GitHub Secrets로 주입한다
(`.github/workflows/deploy.yml`의 Build Frontend step).

| 변수 | 용도 | 없으면 |
| --- | --- | --- |
| `VITE_KAKAO_CLIENT_ID` | 카카오 로그인(OAuth 인가 요청)용 **REST API 키** | 카카오 로그인 버튼 동작 불가 |
| `VITE_KAKAO_JAVASCRIPT_KEY` | 카카오톡 공유(JS SDK)용 **JavaScript 키** | 카톡 공유가 공유 시트/링크 복사로만 동작 |
| `VITE_API_BASE_URL` | 백엔드 API 베이스 URL | Vite 개발 프록시(`/api/v1`) 사용 |

> 두 카카오 키는 **서로 다른 값**이다. 콘솔 > 내 애플리케이션 > 앱 키에서 REST API 키와
> JavaScript 키를 각각 가져온다. 한쪽 값을 양쪽에 넣으면 로그인이나 공유 중 하나가 조용히 실패한다.

## 공유 카드 기능의 환경 요구사항

`ShareCardModal`의 이미지 저장 / 카카오톡 공유 / 링크 복사는 아래 인프라 설정에 의존한다.
코드만으로는 충족되지 않으니 배포 환경에서 함께 확인한다.

### 1. 카카오 개발자 콘솔
- 플랫폼 > Web > **사이트 도메인**에 서비스 도메인(`https://dayuse.kr`)을 등록한다.
- 도구 > **카카오톡 공유**(메시지)를 활성화한다.
- SDK 버전을 올릴 때는 SRI 해시를 함께 갱신한다. 해시가 어긋나면 브라우저가 스크립트를
  차단해 공유가 전부 실패하므로, 갱신 후 아래로 검증한다.
  ```bash
  npm run verify:kakao-sdk
  ```

### 2. S3 버킷 CORS
인증 사진은 presigned URL로 내려오고, 카드 캡처 전에 프론트가 `fetch`로 받아 data URL로
심는다. 버킷에 CORS 규칙이 없으면 **사진이 빠진 카드가 저장된다**
(html-to-image는 이미지 fetch 실패를 예외 없이 빈 값으로 대체한다).
서비스 도메인과 로컬 개발 오리진에 대해 `GET`을 허용한다.

```json
[
  {
    "AllowedOrigins": ["https://dayuse.kr", "http://localhost:5173"],
    "AllowedMethods": ["GET"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }
]
```

### 3. 알려진 환경별 동작
| 환경 | 이미지 저장 | 카톡 공유 | 링크 복사 |
| --- | --- | --- | --- |
| iOS Safari / Chrome | 공유 시트 → 실패 시 길게 눌러 저장 | SDK → 공유 시트 → 복사 | `ClipboardItem` 지연 복사 |
| Android Chrome | 공유 시트 | SDK → 공유 시트 → 복사 | `navigator.clipboard` |
| 카카오톡 인앱 브라우저 | 공유 시트 또는 길게 눌러 저장 | SDK | 실패 시 수동 복사 창 |
| 데스크톱 | 파일 다운로드 | SDK 팝업 → 복사 | `navigator.clipboard` |

공유 링크(`/shares/:token`)의 OG 프리뷰는 아직 미구현이다. SPA가 정적 `index.html`을
그대로 내려주기 때문에 카카오톡·슬랙 등의 링크 미리보기에는 공유 카드가 아니라 서비스
공통 설명이 표시된다. 크롤러 대응은 별도 작업으로 남아 있다.
