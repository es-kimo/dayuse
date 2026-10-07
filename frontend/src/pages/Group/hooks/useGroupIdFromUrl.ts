import { useParams } from "react-router-dom";
import { isPositiveIntegerString } from "../../../utils/validation";
import { InvalidGroupIdError } from "../error/GroupIdErrorBoundary";

export const useGroupIdFromUrl = (): number => {
  const { groupId: possibleGroupId } = useParams<{ groupId: string }>();

  if (!isPositiveIntegerString(possibleGroupId)) {
    throw new InvalidGroupIdError();
  }

  return Number(possibleGroupId);
};
