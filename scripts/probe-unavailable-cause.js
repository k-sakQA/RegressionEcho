const { chromium } = require('playwright');

async function isUnavailable(page) {
  return page.locator('text=現在このページはご利用いただけません').first().isVisible().catch(() => false);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: 'storage/auth.json' });
  const page = await context.newPage();

  const events = [];
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) {
      events.push({ type: 'navigated', url: frame.url(), at: Date.now() });
    }
  });

  try {
    for (let i = 1; i <= 8; i += 1) {
      const row = { round: i, before: '', afterHome: '', afterShopClick: '', unavailableAfterHome: false, unavailableAfterShop: false };

      row.before = page.url();
      await page.goto('https://development.pocket-heroes.net/home', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(1200);
      row.afterHome = page.url();
      row.unavailableAfterHome = await isUnavailable(page);

      if (!row.unavailableAfterHome) {
        const shop = page.locator('a:has-text("SHOPショップ")').first();
        if (await shop.count()) {
          await shop.click({ timeout: 10000 }).catch(() => {});
          await page.waitForTimeout(1800);
        }
      }

      row.afterShopClick = page.url();
      row.unavailableAfterShop = await isUnavailable(page);

      console.log(JSON.stringify(row));

      const backHome = page.locator('a:has-text("ホーム画面に戻る")').first();
      if (await backHome.count()) {
        await backHome.click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(800);
      }
    }

    console.log('---- main-frame navigations ----');
    for (const event of events) {
      console.log(event.url);
    }
  } finally {
    await browser.close();
  }
})();
