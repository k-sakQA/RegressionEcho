const fs = require('fs');
const path = require('path');

class TestGenerator {
  constructor(claudeClient, testsDir) {
    this.claudeClient = claudeClient;
    this.testsDir = testsDir;
  }

  async generate(testCases) {
    fs.mkdirSync(this.testsDir, { recursive: true });

    const results = [];
    for (const testCase of testCases) {
      try {
        const code = await this.claudeClient.generateTestCode(testCase);
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
