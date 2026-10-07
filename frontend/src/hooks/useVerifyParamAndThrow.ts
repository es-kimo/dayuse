import { isIntegerString } from "../utils/validation";

export const useVerifyParamAndThrow = (param: string | undefined): number => {
  if (!isIntegerString(param)) {
    throw new Error("invalid url param");
  }

  return Number(param);
};
