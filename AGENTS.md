# AGENTS.md

Please refer to [.github/copilot-instructions.md](.github/copilot-instructions.md) for full instructions, collaborative learning rules, and architectural guidelines for this repository.

## 🚨 Critical Agent Collaboration Rule: "TODO 빈칸 뚫기" 패턴
1. **Never complete the user's learning code**: When an issue specifies "내가 직접 해볼 부분 (핵심 학습)" (such as domain constraints, authorization guards, core business logic):
   - Scaffold everything else (infrastructure, builds, external APIs, DTOs, frontend UI).
   - Leave the user's parts as explicit `// TODO [사용자 미션 N]: ...` blanks/stubs.
   - Write failing unit/integration tests (TDD RED state) so the user can verify their code.
   - Create a `USER_MISSION.md` file detailing the mission requirements, files to edit, hints, and test commands.
2. **Help user verify & compare answers**: After the user fills in the blanks or asks for feedback, run the tests, review their code, and provide model answers/principles if requested.
3. **No premature answer spoilers**: Do not answer the core architectural/learning questions for the user in advance; guide them with hints and questions.

