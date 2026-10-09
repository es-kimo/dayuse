import { APP_VERSION } from '../constants/appVersion';

/** 계약 위반 한 건. 응답 값은 담지 않고 위치(path)와 어긴 규칙(rule)만 담는다. */
export interface ContractViolation {
  path: string;
  rule: string;
}

export interface ContractViolationReport {
  /** 예: 'GET /challenges/{id}' */
  api: string;
  resourceId: number;
  violations: ContractViolation[];
  /** true면 응답을 처리하지 못해 조회 실패로 끝났다. */
  fatal: boolean;
}

export type ContractViolationPayload = ContractViolationReport & { appVersion: string };

/** 보고 전송 수단. 전송 경로가 정해지면 이 함수만 바꾼다. */
export type ContractViolationSink = (payload: ContractViolationPayload) => void | Promise<unknown>;

const defaultSink: ContractViolationSink = (payload) => {
  console.warn('[contract-violation]', payload);
};

let sink: ContractViolationSink = defaultSink;

/** 앱이 살아 있는 동안 이미 보고한 위반. 재렌더링·재조회로 같은 위반이 반복 전송되지 않게 한다. */
const reportedKeys = new Set<string>();

/**
 * 서버 응답의 계약 위반을 보고한다. 절대 throw하지 않는다.
 * 보고 실패가 화면 처리를 막으면 안 되기 때문이다.
 */
export function reportContractViolation(report: ContractViolationReport): void {
  const fresh = report.violations.filter((violation) => {
    const key = `${report.api}:${report.resourceId}:${violation.path}:${violation.rule}`;
    if (reportedKeys.has(key)) return false;
    reportedKeys.add(key);
    return true;
  });
  if (fresh.length === 0) return;

  try {
    const result = sink({ ...report, violations: fresh, appVersion: APP_VERSION });
    if (result instanceof Promise) result.catch(() => {});
  } catch {
    // 보고 실패는 무시한다. 재시도하면 같은 실패가 반복될 뿐이다.
  }
}

export function setContractViolationSink(next: ContractViolationSink): void {
  sink = next;
}

/** 테스트 전용: 보고 이력과 전송 수단을 초기 상태로 되돌린다. */
export function resetContractViolationReporter(): void {
  reportedKeys.clear();
  sink = defaultSink;
}
