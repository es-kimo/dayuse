import { useParams } from "react-router-dom";
import { isPositiveIntegerString } from "../../../utils/validation";
import { InvalidGroupIdError } from "../error/GroupIdErrorBoundary";

/**
 * URL에서 양의 안전한 정수인 모임 ID를 반환한다.
 * @throws InvalidGroupIdError — 파라미터가 없거나 유효하지 않은 경우.
 */
export const useGroupIdOrThrow = (): number => {
  const { groupId: possibleGroupId } = useParams<{ groupId: string }>();

  if (!isPositiveIntegerString(possibleGroupId)) {
    throw new InvalidGroupIdError();
  }

  return Number(possibleGroupId);
};
