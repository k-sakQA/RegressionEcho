const fs = require('fs');
const path = require('path');

class TestGenerator {
  constructor(claudeClient, testsDir) {
    this.claudeClient = claudeClient;
    this.testsDir = testsDir;
  }

  async generate(testCases, testUrl, generationContext = {}) {
    fs.mkdirSync(this.testsDir, { recursive: true });

    const results = [];
    const hasContext = Object.keys(generationContext).length > 0;
    for (const testCase of testCases) {
      try {
        const code = hasContext
          ? await this.claudeClient.generateTestCode(testCase, testUrl, generationContext)
          : await this.claudeClient.generateTestCode(testCase, testUrl);
        const filePath = path.join(this.testsDir, `${testCase.testId}.spec.ts`);
        fs.writeFileSync(filePath, code);
        results.push({ testId: testCase.testId, success: true, filePath });
      } catch (error) {
        results.push({ testId: testCase.testId, success: false, error: error.message });
      }
    }

    return results;
  }
}

module.exports = { TestGenerator };
