/** The shared error seam keeps only a message, so a response body, token or health value can never
 * reach the log through it. */
import { reportError } from '@/shared/lib/reportError';

describe('reportError', () => {
  afterEach(() => jest.restoreAllMocks());

  it('logs the context and the message, nothing else', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = Object.assign(new Error('Could not reach the network.'), {
      details: { token: 'secret', steps: 9000 },
    });

    reportError(error, 'health-sync.run');

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith('[health-sync.run] Could not reach the network.');
  });

  it('does not print a thrown value that is not an Error', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    reportError({ token: 'secret' }, 'health-sync.run');

    expect(warn).toHaveBeenCalledWith('[health-sync.run] unknown error');
  });
});
