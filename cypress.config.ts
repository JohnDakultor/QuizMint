import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000', // or your dev/test server
    setupNodeEvents(on, config) {
      config.env.TEST_EMAIL =
        config.env.TEST_EMAIL ||
        process.env.APP_REVIEWER_LOGIN_EMAIL ||
        'test@quizmint.ai';
      config.env.TEST_PASSWORD = config.env.TEST_PASSWORD || 'TestPassword123!';
      // implement node event listeners here if needed
      return config;
    },
  },
});
