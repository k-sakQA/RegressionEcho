const fs = require('fs');
const { parse } = require('csv-parse/sync');

async function readTestCases(csvPath, filterIds) {
  if (!fs.existsSync(csvPath)) {
    const fileName = require('path').basename(csvPath);
    throw new Error(`エラー: ${fileName} が見つかりません\nファイルパスを確認してください`);
  }

  const content = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  });

  let testCases = records.map((row) => ({
    testId: row['テストID'],
    purpose: row['テスト目的'],
    precondition: row['前提条件'],
    expected: row['期待結果'],
  }));

  if (filterIds && filterIds.length > 0) {
    testCases = testCases.filter((tc) => filterIds.includes(tc.testId));
  }

  return testCases;
}

module.exports = { readTestCases };
