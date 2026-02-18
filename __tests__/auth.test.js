const path = require('path');
const fs = require('fs');
const os = require('os');
const { AuthManager } = require('../lib/auth');

describe('auth', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auth-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('認証状態ファイルの存在確認 - 存在しない場合', () => {
    const auth = new AuthManager(path.join(tmpDir, 'storage'));
    expect(auth.hasStoredAuth()).toBe(false);
  });

  test('認証状態ファイルの存在確認 - 存在する場合', () => {
    const storageDir = path.join(tmpDir, 'storage');
    fs.mkdirSync(storageDir, { recursive: true });
    fs.writeFileSync(path.join(storageDir, 'auth.json'), JSON.stringify({ cookies: [], origins: [] }));

    const auth = new AuthManager(storageDir);
    expect(auth.hasStoredAuth()).toBe(true);
  });

  test('認証状態ファイルのパスを返す', () => {
    const storageDir = path.join(tmpDir, 'storage');
    const auth = new AuthManager(storageDir);
    expect(auth.getAuthPath()).toBe(path.join(storageDir, 'auth.json'));
  });

  test('認証状態を保存できる', () => {
    const storageDir = path.join(tmpDir, 'storage');
    const auth = new AuthManager(storageDir);

    const state = { cookies: [{ name: 'session', value: 'abc123' }], origins: [] };
    auth.saveAuthState(state);

    expect(fs.existsSync(path.join(storageDir, 'auth.json'))).toBe(true);
    const saved = JSON.parse(fs.readFileSync(path.join(storageDir, 'auth.json'), 'utf-8'));
    expect(saved.cookies[0].name).toBe('session');
  });

  test('認証状態を読み込める', () => {
    const storageDir = path.join(tmpDir, 'storage');
    fs.mkdirSync(storageDir, { recursive: true });
    const state = { cookies: [{ name: 'token', value: 'xyz' }], origins: [] };
    fs.writeFileSync(path.join(storageDir, 'auth.json'), JSON.stringify(state));

    const auth = new AuthManager(storageDir);
    const loaded = auth.loadAuthState();
    expect(loaded.cookies[0].value).toBe('xyz');
  });

  test('認証状態がない場合にloadするとエラー', () => {
    const auth = new AuthManager(path.join(tmpDir, 'storage'));
    expect(() => auth.loadAuthState()).toThrow('認証状態が見つかりません');
  });

  test('/home 初回ダイアログがある場合は閉じる', async () => {
    const waitFor = jest.fn().mockResolvedValue();
    const click = jest.fn().mockResolvedValue();
    const first = jest.fn(() => ({ waitFor, click }));
    const locator = jest.fn(() => ({ first }));

    const page = {
      url: jest.fn(() => 'https://development.pocket-heroes.net/home'),
      locator,
    };

    const auth = new AuthManager(path.join(tmpDir, 'storage'));
    await auth.dismissInitialHomeDialogIfPresent(page);

    expect(locator).toHaveBeenCalledWith('button:has(img[src="/images/ui/cross.svg"])');
    expect(waitFor).toHaveBeenCalledWith({ state: 'visible', timeout: 3000 });
    expect(click).toHaveBeenCalledTimes(1);
  });

  test('/home 以外では初回ダイアログを操作しない', async () => {
    const locator = jest.fn();
    const page = {
      url: jest.fn(() => 'https://development.pocket-heroes.net/shop'),
      locator,
    };

    const auth = new AuthManager(path.join(tmpDir, 'storage'));
    await auth.dismissInitialHomeDialogIfPresent(page);

    expect(locator).not.toHaveBeenCalled();
  });

  test('期待パスは testUrl から解決できる', () => {
    const auth = new AuthManager(path.join(tmpDir, 'storage'));
    const expectedPath = auth.resolveExpectedPath('https://development.pocket-heroes.net/home', {});
    expect(expectedPath).toBe('/home');
  });

  test('期待パスは check-url が優先される', () => {
    const auth = new AuthManager(path.join(tmpDir, 'storage'));
    const expectedPath = auth.resolveExpectedPath('https://development.pocket-heroes.net/home', { urlIncludes: '/custom' });
    expect(expectedPath).toBe('/custom');
  });

  test('認証完了待機はポーリングで到達を検知する', async () => {
    const urls = [
      'https://development.pocket-heroes.net/auth/callback',
      'https://development.pocket-heroes.net/home',
    ];
    let idx = 0;

    const page = {
      url: jest.fn(() => urls[Math.min(idx, urls.length - 1)]),
      waitForTimeout: jest.fn(async () => {
        idx += 1;
      }),
    };

    const auth = new AuthManager(path.join(tmpDir, 'storage'));
    await expect(auth.waitForExpectedUrlByPolling(page, '/home', 20000, 5000)).resolves.toBeUndefined();
    expect(page.waitForTimeout).toHaveBeenCalledTimes(1);
  });
});
