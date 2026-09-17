# 🎯 사용자 핵심 학습 미션 가이드 (Issue #1)

이 문서는 사용자가 직접 구현하고 고민해 보아야 하는 **3가지 핵심 학습 미션** 안내서입니다.
구현 후 `cd backend && ./gradlew test`를 실행하면 본인의 코드가 올바르게 동작하는지 즉시 검증할 수 있습니다.

---

## 📌 미션 1: `GroupMember` 복합 유니크 제약조건 추가
- **파일**: `backend/src/main/kotlin/com/dayuse/domain/group/GroupMember.kt`
- **목표**: 동일한 사용자가 같은 모임에 2번 이상 중복 가입되지 않도록 DB 레벨에서 방어합니다.
- **작업 내용**:
  `@Table` 어노테이션에 `(groupId, userId)`를 묶는 복합 유니크 제약조건을 추가하세요.
  ```kotlin
  @Table(
      name = "group_members",
      uniqueConstraints = [
          UniqueConstraint(name = "uk_group_user", columnNames = ["groupId", "userId"])
      ]
  )
  ```
- **검증 테스트**: `EntityAndRelationshipTest`의 `GroupMember (groupId, userId) 복합 유니크 제약조건 위반 시 DataIntegrityViolationException 발생` 테스트

---

## 📌 미션 2: 비회원 접근 차단 인가(Authorization) 가드
- **파일**: `backend/src/main/kotlin/com/dayuse/domain/group/service/GroupService.kt`의 `getGroupDetail` 메서드
- **목표**: 비회원 또는 해당 모임의 멤버가 아닌 사용자가 `GET /api/v1/groups/{groupId}`를 호출했을 때 `403 Forbidden`을 반환하도록 차단합니다.
- **작업 내용**:
  `groupMemberRepository.findByGroupIdAndUserId(groupId, userId)`로 멤버십을 조회하고, 존재하지 않으면 `ForbiddenException`을 던지도록 완성하세요.
  ```kotlin
  val membership = groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
      ?: throw ForbiddenException("해당 모임의 멤버만 접근할 수 있습니다. (403 Forbidden)")
  ```
- **검증 테스트**: `GroupAndInviteIntegrationTest`의 `DoD 5 모임에 가입되지 않은 사용자가 해당 모임에 직접 접근할 경우 403 Forbidden 차단된다` 테스트

---

## 📌 미션 3: 모임 중복 가입 방어 및 예외 처리
- **파일**: `backend/src/main/kotlin/com/dayuse/domain/group/service/InviteService.kt`의 `joinGroupByInviteCode` 메서드
- **목표**: 초대 코드를 통해 가입할 때, 이미 가입된 회원의 재가입이나 동시 가입 요청을 안전하게 처리합니다.
- **작업 내용**:
  1. `groupMemberRepository.existsByGroupIdAndUserId(group.id, userId)`로 1차 확인
  2. 동시 요청에 의해 `save()` 시 `DataIntegrityViolationException`이 발생할 경우를 `try-catch`로 방어
  ```kotlin
  if (groupMemberRepository.existsByGroupIdAndUserId(group.id, userId)) {
      return JoinGroupResponse(groupId = group.id, message = "이미 참여 중인 모임입니다.")
  }

  try {
      groupMemberRepository.save(
          GroupMember(groupId = group.id, userId = userId, role = GroupRole.MEMBER)
      )
  } catch (e: DataIntegrityViolationException) {
      return JoinGroupResponse(groupId = group.id, message = "이미 참여 중인 모임입니다.")
  }

  return JoinGroupResponse(groupId = group.id, message = "모임에 성공적으로 가입하였습니다.")
  ```
- **검증 테스트**: `GroupAndInviteIntegrationTest`의 `DoD 3 다른 사용자가 초대 링크를 통해 동일한 모임에 MEMBER로 가입할 수 있다` 테스트

---

## 🧪 전체 테스트 검증 방법
```bash
cd backend
./gradlew test
```
위 3가지 미션을 완성하면 모든 단위 및 통합 테스트가 **SUCCESS**로 통과하게 됩니다!
