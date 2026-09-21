# dayuse

> **매일 습관을 인증하고 보증금을 정산하는 스마트한 소모임 챌린지 서비스**  
> 🌐 **공식 서비스 URL**: [https://dayuse.kr](https://dayuse.kr)

---

## 🏗 프로젝트 구조

```
dayuse/
├── .github/
│   └── copilot-instructions.md     # 학습 중심 협업 및 아키텍처 인스트럭션
├── AGENTS.md                       # AI 에이전트 작업 지침
├── docker-compose.yml              # 로컬 개발용 MySQL 8.0 컨테이너
├── backend/                        # Kotlin 1.9+ & Spring Boot 3.3.x API 서버
│   ├── gradlew, gradlew.bat
│   └── src/
└── frontend/                       # React (Vite, TypeScript, Tailwind CSS)
    ├── package.json
    └── src/
```

---

## 🚀 로컬 개발 환경 실행 가이드

### 1. 로컬 데이터베이스 (MySQL 8.0) 실행
```bash
docker compose up -d
```
- 포트: `3306`
- 데이터베이스명: `dayuse`
- 계정/비밀번호: `dayuse` / `dayuse` (root 비밀번호: `root`)

### 2. 백엔드 서버 실행
```bash
cd backend
./gradlew bootRun
```
- API 서버 포트: `http://localhost:8080`
- 테스트 실행: `./gradlew test`

### 3. 프론트엔드 개발 서버 실행
```bash
cd frontend
npm install
npm run dev
```
- 프론트엔드 주소: `http://localhost:5173`
- 빌드 검증: `npm run build`

> 💡 **로컬 테스트 팁**: 카카오 개발자 센터 키 설정 없이도 로그인 화면의 **"로컬 개발·테스트용 빠른 로그인"**을 통해 사용자 1(모임장), 사용자 2(초대 가입), 사용자 3(비회원 차단)으로 즉시 전환하며 테스트할 수 있습니다.
