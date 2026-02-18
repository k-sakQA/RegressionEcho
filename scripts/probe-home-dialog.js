const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ storageState: 'storage/auth.json' });
  const page = await context.newPage();

  try {
    await page.goto('https://development.pocket-heroes.net/home', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.waitForTimeout(4000);

    const currentUrl = page.url();
    const dialogCount = await page.locator('dialog').count();
    const openDialogCount = await page.locator('dialog[open]').count();
    const crossImgCount = await page.locator('img[src*="cross.svg"]').count();
    const crossBtnCount = await page.locator('button:has(img[src*="cross.svg"])').count();

    console.log('URL=', currentUrl);
    console.log('DIALOG_COUNT=', dialogCount);
    console.log('OPEN_DIALOG_COUNT=', openDialogCount);
    console.log('CROSS_IMG_COUNT=', crossImgCount);
    console.log('CROSS_BTN_COUNT=', crossBtnCount);

    const dialogHtml = await page.locator('dialog').first().evaluate((el) => el.outerHTML).catch(() => null);
    if (dialogHtml) {
      console.log('DIALOG_HTML_START');
      console.log(dialogHtml.slice(0, 2000));
      console.log('DIALOG_HTML_END');
    }

    const buttonHtml = await page
      .locator('button:has(img[src*="cross.svg"])')
      .first()
      .evaluate((el) => el.outerHTML)
      .catch(() => null);
    if (buttonHtml) {
      console.log('BUTTON_HTML=', buttonHtml);
    }

    const clicked = await page
      .locator('button:has(img[src*="cross.svg"])')
      .first()
      .click({ timeout: 8000, force: true })
      .then(() => true)
      .catch(() => false);

    console.log('CLICKED=', clicked);
    await page.waitForTimeout(1500);
    console.log('AFTER_URL=', page.url());
    console.log('AFTER_OPEN_DIALOG_COUNT=', await page.locator('dialog[open]').count());

    await page.screenshot({ path: 'test-results/home-dialog-probe-after.png', fullPage: true });
    console.log('SCREENSHOT=test-results/home-dialog-probe-after.png');
  } catch (error) {
    console.error('PROBE_ERROR=', error && error.message ? error.message : error);
    await page.screenshot({ path: 'test-results/home-dialog-probe-error.png', fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }
})();
