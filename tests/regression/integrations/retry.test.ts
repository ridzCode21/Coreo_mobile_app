/** Issue #55 — retry rules for the import mutation, and the single-flight guard that stops two
 * syncs (app open + background task) from running at once. */
import { retryDelay, shouldRetryImport } from '@/features/integrations/lib/retry';
import { createSingleFlight } from '@/features/integrations/lib/singleFlight';
import { ApiError } from '@/shared/api/errors';

describe('shouldRetryImport', () => {
  it('never retries a rejected session or an invalid payload', () => {
    expect(shouldRetryImport(0, new ApiError('x', 'unauthorized', 401))).toBe(false);
    expect(shouldRetryImport(0, new ApiError('x', 'validation', 400))).toBe(false);
  });

  it('retries network and server errors a few times, then gives up', () => {
    expect(shouldRetryImport(0, ApiError.network())).toBe(true);
    expect(shouldRetryImport(2, new ApiError('x', 'server', 503))).toBe(true);
    expect(shouldRetryImport(3, new ApiError('x', 'server', 503))).toBe(false);
  });
});

describe('retryDelay', () => {
  it('backs off and stays bounded', () => {
    expect(retryDelay(0)).toBeLessThan(retryDelay(1));
    expect(retryDelay(10)).toBeLessThanOrEqual(15_000);
  });
});

describe('createSingleFlight', () => {
  it('shares one run between callers that arrive while it is running', async () => {
    let resolve: (value: number) => void = () => undefined;
    const task = jest.fn(() => new Promise<number>((done) => (resolve = done)));
    const run = createSingleFlight(task);

    const first = run();
    const second = run();
    resolve(7);

    await expect(Promise.all([first, second])).resolves.toEqual([7, 7]);
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('allows a new run after the last one finished, even if it failed', async () => {
    const task = jest.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce('ok');
    const run = createSingleFlight(task);

    await expect(run()).rejects.toThrow('boom');
    await expect(run()).resolves.toBe('ok');
  });
});
