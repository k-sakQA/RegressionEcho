import type { Page } from '@playwright/test';

export const HOME_URL = 'https://development.pocket-heroes.net/home';
const SCENARIO_FLAG = 'PW_TEST_REUSE_CONTEXT';
const VISITED_KEY = '__regressionEchoHomeVisited__';

/**
 * 「現在このページはご利用いただけません」が表示されているか判定
 */
export async function isUnavailablePage(page: Page): Promise<boolean> {
  return page
    .locator('text=現在このページはご利用いただけません')
    .first()
    .isVisible({ timeout: 1000 })
    .catch(() => false);
}

/**
 * ホーム画面に遷移する。Unavailableページの場合はリトライする。
 * シナリオモード時でも、ページが実際にサイト上にない場合は遷移する。
 * （Playwright は各テストに新しい page オブジェクトを渡すため、
 *  globalThis のフラグだけでスキップすると空白ページのままになる）
 */
export async function gotoHomeForScenario(page: Page): Promise<void> {
  const isScenarioMode = process.env[SCENARIO_FLAG] === '1';
  const globalState = globalThis as unknown as Record<string, unknown>;

  // シナリオモードでも、ページが実際にサイト上にあるかチェック
  if (isScenarioMode && globalState[VISITED_KEY]) {
    const currentUrl = page.url();
    if (currentUrl.includes('pocket-heroes.net')) {
      // 同じサイト上にいる → ダイアログだけ閉じてスキップ
      await dismissAllDialogs(page);
      return;
    }
    // ページが空白や別サイト → 再ナビゲーション必要
    console.log('シナリオモード: ページが空白/別サイトのため再遷移します');
  }

  // ホームへ遷移（リトライ付き）
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.goto(HOME_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    if (await isUnavailablePage(page)) {
      console.log(`ホーム画面が利用不可 (attempt ${attempt + 1}/5)、リトライします...`);
      await page.waitForTimeout(3000 * (attempt + 1));
      continue;
    }

    // 正常にホーム画面が表示された → ダイアログを閉じる
    await dismissAllDialogs(page);
    if (isScenarioMode) {
      globalState[VISITED_KEY] = true;
    }
    return;
  }

  throw new Error('ホーム画面を5回リトライしても表示できませんでした');
}

/**
 * ページ上のブロッキングダイアログ（アプリ追加促進等）を閉じる。
 * ※ display:none や remove() は React を壊すので使わない。
 * ※ 代わりにボタンクリックで正規に閉じ、残ったものは close() + removeAttribute('open') のみ。
 * ※ 購入確認ダイアログ等は閉じないように、ModalDialogBox クラスのみ対象にする。
 */
export async function dismissAllDialogs(page: Page): Promise<void> {
  await page.waitForTimeout(500);

  // 1. ModalDialogBox のダイアログ内のボタンをクリックして閉じる（最大10回）
  for (let i = 0; i < 10; i += 1) {
    const blockingDialog = page.locator('dialog[open][class*="ModalDialogBox"]').first();
    if ((await blockingDialog.count()) === 0) break;

    const btn = blockingDialog.locator('button').first();
    if ((await btn.count()) === 0) break;

    try {
      await btn.click({ timeout: 2000, force: true });
      await page.waitForTimeout(300);
    } catch {
      break;
    }
  }

  // 2. JS で ModalDialogBox ダイアログを close() する（display:none は使わない）
  await page.evaluate(() => {
    document.querySelectorAll('dialog[open][class*="ModalDialogBox"]').forEach((d) => {
      try {
        if (typeof (d as HTMLDialogElement).close === 'function') {
          (d as HTMLDialogElement).close();
        }
      } catch { /* ignore */ }
      d.removeAttribute('open');
    });

    // オーバーレイは remove() してもOK（独立コンポーネント）
    document.querySelectorAll('[class*="TapAreaOverlay"], [class*="blockingOverlay"]').forEach((el) => {
      el.remove();
    });
  });

  await page.waitForTimeout(300);
}
