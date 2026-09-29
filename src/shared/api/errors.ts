/**
 * Normalized error shape for anything that crosses the network boundary — UI code branches on
 * this, never on raw fetch/axios errors. See docs/architecture.md §4.
 */
export type ApiErrorKind = 'network' | 'unauthorized' | 'validation' | 'server' | 'unknown';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly details?: unknown;

  constructor(message: string, kind: ApiErrorKind, status?: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.details = details;
  }

  static fromResponse(status: number, body: unknown): ApiError {
    if (status === 401 || status === 403) {
      return new ApiError('Your session expired.', 'unauthorized', status, body);
    }
    if (status === 422 || status === 400) {
      return new ApiError('That request could not be validated.', 'validation', status, body);
    }
    if (status >= 500) {
      return new ApiError('Something went wrong on our side.', 'server', status, body);
    }
    return new ApiError('Something went wrong.', 'unknown', status, body);
  }

  static network(cause?: unknown): ApiError {
    return new ApiError('Could not reach the network.', 'network', undefined, cause);
  }
}
