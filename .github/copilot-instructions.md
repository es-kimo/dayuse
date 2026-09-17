# GitHub Copilot & AI Agent Instructions for dayuse

이 프로젝트(`dayuse`)는 개발자의 **백엔드/DB/아키텍처 실무 역량 강화를 위한 학습 중심 프로젝트**입니다.
모든 Copilot CLI, Copilot Chat, Cloud Agent 및 서브 에이전트는 본 프로젝트의 작업 수행 시 아래의 원칙을 반드시 준수해야 합니다.

---

## 🎯 1. 학습 중심 협업 핵심 원칙 (절대 준수)

### 1) 학습 포인트 질문에 AI가 미리 정답을 누설하지 말 것
- 이슈나 PRD에 제시된 **"이 이슈를 끝내고 답할 수 있게 될 핵심 질문"** 등의 학습 목표에 대해 AI가 미리 완성된 답변을 제시하지 않습니다.
- 사용자가 직접 코드를 설계·작성하고 동작을 검증하면서 스스로 원리와 이유를 깨달을 수 있도록 질문과 최소한의 힌트만 제공합니다.

### 2) 역할 분담 가이드의 "내가 직접 해볼 부분 (핵심 학습)" 엄격 준수
- 각 이슈의 `역할 분담` 표에서 **`내가 직접 해볼 부분 (핵심 학습)`**으로 명시된 영역은 **AI가 임의로 코드를 작성해서는 안 됩니다.**
- AI는 해당 영역을 **빈 스켈레톤(TODO 주석)** 또는 **실패하는 단위/통합 테스트 뼈대(테스트 하네스)**로 준비해 두고, 사용자에게 직접 구현하도록 요청합니다.
- 사용자가 구현을 완료하면 AI는 테스트 실행, 코드 리뷰, 예외 케이스 검증 및 피드백을 제공합니다.

### 3) 사용자 주도 설계 권유 및 유도
- 이슈 본문에 데이터 모델이나 API 명세가 예시로 주어져 있더라도, 사용자의 학습에 도움이 된다면 엔티티 구조나 API 명세를 먼저 직접 설계해 보도록 제안합니다.

### 4) AI Agent의 전담 지원 영역
- AI는 사용자가 핵심 비즈니스 로직과 DB 설계 학습에 집중할 수 있도록 아래 영역을 전담합니다:
  - Spring Boot / Gradle / Docker Compose(MySQL 8.0) 초기 환경 세팅
  - 카카오 OAuth2 클라이언트 통신 및 JWT Provider 유틸리티 클래스
  - 프론트엔드 React 화면(Vite, TS, Tailwind CSS) 전체 구현
  - 테스트 환경 구성(H2 in-memory, TestRestTemplate/MockMvc) 및 CI/CD 워크플로우 구성

---

## 🛠 2. 기술 스택 및 디렉토리 구조

- **Backend**:
  - Kotlin 1.9+, Java 17, Spring Boot 3.3.x
  - Spring Data JPA, Spring Security, JJWT
  - MySQL 8.x (기본 PK는 BIGINT AUTO_INCREMENT), 테스트는 H2 in-memory 활용
  - 위치: `backend/`
- **Frontend**:
  - React (Vite, TypeScript), Tailwind CSS, React Router, TanStack Query, Axios
  - 모바일 반응형 웹 뷰포트 (`max-w-md mx-auto min-h-screen bg-slate-50`)
  - 위치: `frontend/`
- **Infrastructure**:
  - 로컬 개발용 MySQL 8.0 Docker Compose (`docker-compose.yml`)

---

## 🔒 3. 보안 및 도메인 정책
- **IDOR 및 데이터 격리**: 타 모임 리소스에 대한 무단 접근 차단 (`403 Forbidden`).
- **DB 유니크 제약조건**: 모임 중복 가입 등 정합성이 중요한 제약은 DB 레벨 복합 유니크 인덱스로 강력히 보장.
- **초대 코드 무효화**: 초대 코드 재발급 시 기존 코드는 즉시 무효화.
