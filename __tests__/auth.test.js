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
});
