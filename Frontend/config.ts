export type Config = {
  apiBaseUrl: string;
  appName: string;
  appVersion: string;
  appLang: 'fa-IR' | 'en-US';
  token: string;
};

export type Environment = 'LOCAL' | 'DEV' | 'STAGE' | 'PROD';

// Auto-detect production mode - if PROD build, use PROD config (relative URLs)
// Otherwise use explicit environment variable or default to LOCAL
const environment: Environment = import.meta.env.PROD 
  ? 'PROD' 
  : ((import.meta.env.PUBLIC_ENVIRONMENT as Environment) || 'LOCAL');

const token =
  'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJXeEp4Q1JrTkd5a3hmbkFZdWtTTXR2IiwiYXVkIjpbImluamFzdCJdLCJleHAiOjE3NDkzNzUzMDQsInVpZCI6IjE2ODg4MGE4LWFlOTctNDhmNy1iMWIzLTYxMmNiMWIyZTQyZSIsInJsZSI6ImFkbWluIiwibWJjIjoiOTgiLCJtYm4iOiI5MTI1Nzk5NDU1IiwicmZzIjpmYWxzZX0._nHZo4_xB0sgfahAINZucyKfQnZfFYeJdWvsNkZ4Lw5VdYAV6HmAIQe8lsfyEeaBYoUtGfZW-waVmUFdQz9pDA';

const configs: Record<Environment, Config> = {
  LOCAL: {
    apiBaseUrl: 'http://localhost:8000',
    appName: 'MyApp (Local)',
    appVersion: '0.0.1-local',
    appLang: 'fa-IR',
    token,
  },
  DEV: {
    apiBaseUrl: 'http://localhost:8000',
    appName: 'MyApp (Dev)',
    appVersion: '0.0.1-dev',
    appLang: 'fa-IR',
    token,
  },
  STAGE: {
    apiBaseUrl: 'http://localhost:8000',
    appName: 'MyApp (Stage)',
    appVersion: '0.0.1-stage',
    appLang: 'fa-IR',
    token,
  },
  PROD: {
    apiBaseUrl: '/cfowise',  // Endpoints already include /api prefix
    appName: 'CFOWise',
    appVersion: '1.0.0',
    appLang: 'fa-IR',
    token,
  },
};

export const config: Config = (() => {
  if (!['LOCAL', 'DEV', 'STAGE', 'PROD'].includes(environment)) {
    return configs.DEV;
  }
  return configs[environment];
})();

