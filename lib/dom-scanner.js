const fs = require('fs');
const path = require('path');

function resolveUrl(baseUrl, targetPath) {
  if (/^https?:\/\//.test(targetPath)) {
    return targetPath;
  }
  return new URL(targetPath, baseUrl).toString();
}

class DomScanner {
  constructor(outputPath) {
    this.outputPath = outputPath;
  }

  async scan({ baseUrl, authPath, paths, timeout = 15000 }) {
    const { chromium } = require('playwright');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: authPath });
    const page = await context.newPage();
    const pages = [];

    try {
      for (const p of paths) {
        const url = resolveUrl(baseUrl, p);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout });

        const result = await page.evaluate(() => {
          const byTestId = Array.from(document.querySelectorAll('[data-testid]'))
            .slice(0, 80)
            .map((el) => {
              const testId = el.getAttribute('data-testid');
              return {
                kind: 'data-testid',
                selector: `[data-testid="${testId}"]`,
                sampleText: (el.textContent || '').trim().slice(0, 40),
              };
            });

          const buttons = Array.from(document.querySelectorAll('button, [role="button"]'))
            .slice(0, 50)
            .map((el) => ({
              kind: 'button-text',
              selector: `button:has-text("${(el.textContent || '').trim().replace(/"/g, '\\"').slice(0, 20)}")`,
              sampleText: (el.textContent || '').trim().slice(0, 40),
            }))
            .filter((item) => item.sampleText.length > 0);

          const links = Array.from(document.querySelectorAll('a[href]'))
            .slice(0, 50)
            .map((el) => ({
              kind: 'link-text',
              selector: `a:has-text("${(el.textContent || '').trim().replace(/"/g, '\\"').slice(0, 20)}")`,
              sampleText: (el.textContent || '').trim().slice(0, 40),
            }))
            .filter((item) => item.sampleText.length > 0);

          return [...byTestId, ...buttons, ...links];
        });

        pages.push({
          path: p,
          url,
          selectors: result,
        });
      }

      const catalog = {
        scannedAt: new Date().toISOString(),
        baseUrl,
        pages,
      };

      fs.mkdirSync(path.dirname(this.outputPath), { recursive: true });
      fs.writeFileSync(this.outputPath, JSON.stringify(catalog, null, 2));
      return catalog;
    } finally {
      await browser.close();
    }
  }
}

module.exports = { DomScanner };
