import { useParams } from "react-router-dom";
import { isPositiveIntegerString } from "../../../utils/validation";

export const useGroupIdFromUrl = (): number => {
  const { groupId: possibleGroupId } = useParams<{ groupId: string }>();

  if (!isPositiveIntegerString(possibleGroupId)) {
    throw new Error("invalid group id from url");
  }

  return Number(possibleGroupId);
};
