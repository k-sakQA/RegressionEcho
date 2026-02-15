const path = require('path');
const fs = require('fs');
const os = require('os');
const { readTestCases } = require('../lib/csv-reader');

describe('csv-reader', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'csv-reader-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('CSVファイルを正しくパースできる', async () => {
    const csvPath = path.join(tmpDir, 'test.csv');
    fs.writeFileSync(csvPath, [
      'テストID,テスト目的,前提条件,期待結果',
      'TC001,ガチャ購入確認,ログイン済み,通貨が増加すること',
      'TC002,演出確認,ログイン済み,演出が表示されること',
    ].join('\n'));

    const results = await readTestCases(csvPath);

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      testId: 'TC001',
      purpose: 'ガチャ購入確認',
      precondition: 'ログイン済み',
      expected: '通貨が増加すること',
    });
    expect(results[1]).toEqual({
      testId: 'TC002',
      purpose: '演出確認',
      precondition: 'ログイン済み',
      expected: '演出が表示されること',
    });
  });

  test('存在しないファイルでエラーを返す', async () => {
    await expect(readTestCases('/nonexistent/file.csv'))
      .rejects
      .toThrow('が見つかりません');
  });

  test('空のCSVファイル（ヘッダーのみ）では空配列を返す', async () => {
    const csvPath = path.join(tmpDir, 'empty.csv');
    fs.writeFileSync(csvPath, 'テストID,テスト目的,前提条件,期待結果\n');

    const results = await readTestCases(csvPath);
    expect(results).toHaveLength(0);
  });

  test('--only オプション用にフィルタリングできる', async () => {
    const csvPath = path.join(tmpDir, 'test.csv');
    fs.writeFileSync(csvPath, [
      'テストID,テスト目的,前提条件,期待結果',
      'TC001,目的1,前提1,期待1',
      'TC002,目的2,前提2,期待2',
      'TC003,目的3,前提3,期待3',
    ].join('\n'));

    const results = await readTestCases(csvPath, ['TC001', 'TC003']);

    expect(results).toHaveLength(2);
    expect(results[0].testId).toBe('TC001');
    expect(results[1].testId).toBe('TC003');
  });
});
