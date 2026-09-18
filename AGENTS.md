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

