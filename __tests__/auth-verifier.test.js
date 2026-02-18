const { AuthVerifier } = require('../lib/auth-verifier');

describe('auth-verifier', () => {
  test('enabled=false の場合は検証をスキップ', async () => {
    const verifier = new AuthVerifier({ enabled: false });
    await expect(verifier.verify({})).resolves.toBeUndefined();
  });

  test('enabled=true かつ条件なしの場合はエラー', async () => {
    const verifier = new AuthVerifier({ enabled: true });
    await expect(verifier.verify({})).rejects.toThrow('認証検証が有効ですが、検証条件が未設定');
  });

  test('urlIncludes と visibleSelectors を順に検証する', async () => {
    const waitForURL = jest.fn().mockResolvedValue();
    const waitFor = jest.fn().mockResolvedValue();
    const first = jest.fn(() => ({ waitFor }));
    const locator = jest.fn(() => ({ first }));

    const page = { waitForURL, locator };
    const verifier = new AuthVerifier({
      enabled: true,
      urlIncludes: '/home',
      visibleSelectors: ['[data-testid="home"]'],
      timeoutMs: 1234,
    });

    await verifier.verify(page);

    expect(waitForURL).toHaveBeenCalledTimes(1);
    expect(locator).toHaveBeenCalledWith('[data-testid="home"]');
    expect(waitFor).toHaveBeenCalledWith({ state: 'visible', timeout: 1234 });
  });

  test('URL検証はポーリングで再試行する', async () => {
    const timeoutError = new Error('timeout');
    timeoutError.name = 'TimeoutError';

    const waitForURL = jest
      .fn()
      .mockRejectedValueOnce(timeoutError)
      .mockResolvedValueOnce();

    const page = { waitForURL, locator: jest.fn(() => ({ first: jest.fn() })) };
    const verifier = new AuthVerifier({
      enabled: true,
      urlIncludes: '/home',
      timeoutMs: 11000,
      pollIntervalMs: 5000,
    });

    await verifier.verify(page);

    expect(waitForURL).toHaveBeenCalledTimes(2);
  });
});
