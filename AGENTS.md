# AGENTS.md

Please refer to [.github/copilot-instructions.md](.github/copilot-instructions.md) for full instructions, collaborative learning rules, and architectural guidelines for this repository.

## 🚨 Critical Agent Collaboration Rule: "2단계 커밋 기반 빈칸 뚫기" 패턴
1. **Step 1: First implement everything completely & commit (`feat: ...`)**:
   - Implement infrastructure, builds, external APIs, frontend UI, tests, AND the working backend solution.
   - Verify all tests pass (`GREEN`).
   - Commit this complete version so that git history stores the working reference/answer.
2. **Step 2: Punch out TODO blanks & commit (`docs: 사용자 핵심 학습 미션 분리`)**:
   - Revert the user's learning target code into explicit `// TODO [사용자 미션 N]: ...` blanks/stubs.
   - Ensure target tests are now failing (`RED`).
   - Create `USER_MISSION.md` with requirements, hints, and test commands.
   - Commit this blank-stubbed state.
3. **User Experience & Verification**:
   - The user checks `git diff HEAD~1` to instantly see which files and lines need to be filled in.
   - After solving and passing tests (`GREEN`), the user can easily compare their solution with the previous commit (`git diff HEAD~1`) as the reference answer.
4. **No premature answer spoilers**: Do not answer the core architectural/learning questions in advance; guide with hints and review upon completion.

## ⚡ Token Efficiency & Frontend Testing Policy (절대 준수)
1. **프론트엔드 화면/렌더링 단위 테스트 일절 금지**:
   - 컴포넌트 단순 렌더링, 픽셀/배치, DOM 트리/텍스트 존재 여부(`getByText`, `toBeInTheDocument`), 모달/헤더 오픈 확인 등 화면 UI 단위 테스트는 **작성하지 않습니다**.
   - 기획/스타일 변경 시 깨지기 쉬워 에이전트의 불필요한 토큰 소모(UI 수정 + 테스트 수정 루프)를 유발합니다.
2. **허용되는 프론트엔드 테스트**:
   - **순수 비즈니스 로직/유틸 함수** (스트릭 계산, 포맷터, 환경 감지)
   - **Empty State & 엣지 케이스 방어 로직** (크래시 방지 및 null 처리)
   - **핵심 커스텀 훅 로직**
3. **토큰 최적화 행동 지침**:
   - 대규모 TSX 파일 전체를 무분별하게 읽지 않고, 수정 대상 영역(라인 범위)만 정밀하게 타겟팅하여 수정합니다.
   - 프론트엔드 테스트 실행 시에는 항상 콘솔 프로그레스 출력을 최소화하는 간결한 리포터(`--reporter=dot`)를 사용합니다.
   - 프로젝트의 본질인 **백엔드/DB/동시성/보안(IDOR)** 학습 및 검증에 토큰을 집중합니다.

