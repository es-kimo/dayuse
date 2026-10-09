import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  reportContractViolation,
  resetContractViolationReporter,
  setContractViolationSink,
  type ContractViolationReport,
} from './contractViolationReporter';

const report: ContractViolationReport = {
  api: 'GET /challenges/{id}',
  resourceId: 12,
  violations: [{ path: 'abortedAt', rule: 'required_when_aborted' }],
  fatal: false,
};

describe('reportContractViolation', () => {
  afterEach(() => {
    resetContractViolationReporter();
  });

  it('API·위반 항목·리소스 ID·앱 버전만 보낸다', () => {
    const sink = vi.fn();
    setContractViolationSink(sink);

    reportContractViolation(report);

    expect(sink).toHaveBeenCalledTimes(1);
    expect(Object.keys(sink.mock.calls[0][0]).sort()).toEqual(
      ['api', 'appVersion', 'fatal', 'resourceId', 'violations'].sort()
    );
  });

  it('같은 위반은 한 번만 보낸다', () => {
    const sink = vi.fn();
    setContractViolationSink(sink);

    reportContractViolation(report);
    reportContractViolation(report);

    expect(sink).toHaveBeenCalledTimes(1);
  });

  it('이미 보낸 위반은 빼고 새 위반만 보낸다', () => {
    const sink = vi.fn();
    setContractViolationSink(sink);

    reportContractViolation(report);
    reportContractViolation({
      ...report,
      violations: [...report.violations, { path: 'abortedBy', rule: 'required_when_aborted' }],
    });

    expect(sink).toHaveBeenCalledTimes(2);
    expect(sink.mock.calls[1][0].violations).toEqual([{ path: 'abortedBy', rule: 'required_when_aborted' }]);
  });

  it('리소스가 다르면 같은 위반도 따로 보낸다', () => {
    const sink = vi.fn();
    setContractViolationSink(sink);

    reportContractViolation(report);
    reportContractViolation({ ...report, resourceId: 13 });

    expect(sink).toHaveBeenCalledTimes(2);
  });

  it('전송 수단이 throw해도 호출자에게 전파하지 않는다', () => {
    setContractViolationSink(() => {
      throw new Error('network down');
    });

    expect(() => reportContractViolation(report)).not.toThrow();
  });

  it('전송 수단이 reject해도 rejection을 처리한다', () => {
    const rejected = Promise.reject(new Error('network down'));
    const catchSpy = vi.spyOn(rejected, 'catch');
    setContractViolationSink(() => rejected);

    reportContractViolation(report);

    expect(catchSpy).toHaveBeenCalledTimes(1);
  });
});
