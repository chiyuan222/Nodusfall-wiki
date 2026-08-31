/**
 * RFC 7807 application/problem+json 错误模型。
 * 字段与 openapi.yaml 的 Error / ValidationIssue schema 一一对应，不自行发明字段。
 */

export interface ValidationIssue {
  field: string;
  code: string;
  message: string;
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  /** 稳定错误码，客户端分支处理依据，如 VALIDATION_ERROR / RATE_LIMITED */
  code?: string;
  requestId?: string;
  errors?: ValidationIssue[];
}

export class ApiError extends Error {
  readonly problem: ProblemDetails;
  /** 429 时来自 Retry-After 响应头的秒数 */
  readonly retryAfter?: number;

  constructor(problem: ProblemDetails, retryAfter?: number) {
    super(problem.detail ?? problem.title);
    this.name = "ApiError";
    this.problem = problem;
    this.retryAfter = retryAfter;
  }

  get code(): string | undefined {
    return this.problem.code;
  }

  get status(): number {
    return this.problem.status;
  }

  /** 校验错误按字段分组，供表单定位 */
  fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const issue of this.problem.errors ?? []) {
      out[issue.field] = issue.message;
    }
    return out;
  }
}

/** 服务端未按 RFC 7807 返回时的兜底包装（网络错误、非 JSON 响应等） */
export function fallbackProblem(status: number, detail: string): ProblemDetails {
  return {
    type: "about:blank",
    title: status === 0 ? "Network Error" : "Unexpected Error",
    status,
    detail,
    code: status === 0 ? "NETWORK_ERROR" : "UNEXPECTED_ERROR",
  };
}
