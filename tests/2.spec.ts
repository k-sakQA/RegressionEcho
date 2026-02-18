import { test, expect } from '@playwright/test';
import { getBamosCount, goToShop, setScenarioValue } from './flow-helpers';

test('テストID-2 - 購入前のバモス数を取得する', async ({ page }) => {
  await goToShop(page);

  const beforeBamos = await getBamosCount(page);
  console.log(`購入前バモス数: ${beforeBamos}`);

  // 数値として取得できたことを確認（0以上）
  expect(beforeBamos).not.toBeNull();
  expect(beforeBamos as number).toBeGreaterThanOrEqual(0);

  setScenarioValue('beforeBamos', beforeBamos);
});