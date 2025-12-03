export type Config = {
  apiBaseUrl: string;
  appName: string;
  appVersion: string;
  appLang: 'fa-IR' | 'en-US';
};

export type Environment = 'LOCAL' | 'DEV' | 'STAGE' | 'PROD';

// Auto-detect production mode - if PROD build, use PROD config (relative URLs)
// Otherwise use explicit environment variable or default to LOCAL
const environment: Environment = import.meta.env.PROD 
  ? 'PROD' 
  : ((import.meta.env.PUBLIC_ENVIRONMENT as Environment) || 'LOCAL');

// Get API base URL from environment variable, with fallbacks
const getApiBaseUrl = (env: Environment): string => {
  // Check for explicit API URL in environment
  const envApiUrl = import.meta.env.PUBLIC_API_BASE_URL;
  if (envApiUrl) {
    return envApiUrl;
  }
  
  // Production uses relative URL based on base path.
  // IMPORTANT: Endpoints in the code already include the `/api` prefix
  // (e.g. `/api/auth/token/`), so the base URL MUST NOT also end with `/api`,
  // otherwise we'll end up with `/api/api/...`.
  //
  // Examples:
  // - PUBLIC_BASE_PATH = '/'      => apiBaseUrl = '/'
  //   Final URL: '/api/auth/token/'
  // - PUBLIC_BASE_PATH = '/PRS'   => apiBaseUrl = '/PRS'
  //   Final URL: '/PRS/api/auth/token/'
  if (env === 'PROD') {
    const basePath = import.meta.env.PUBLIC_BASE_PATH || '/';
    const cleanBasePath = basePath.replace(/\/$/, '');
    // If cleanBasePath is empty, we're at root, so use '/'
    return cleanBasePath || '/';
  }
  
  // Development environments use environment variable or default
  const defaultDevUrl = import.meta.env.PUBLIC_DEV_API_URL || 'http://localhost:8000';
  return defaultDevUrl;
};

const configs: Record<Environment, Config> = {
  LOCAL: {
    apiBaseUrl: getApiBaseUrl('LOCAL'),
    appName: 'bpms (Local)',
    appVersion: '0.0.1-local',
    appLang: 'fa-IR',
  },
  DEV: {
    apiBaseUrl: getApiBaseUrl('DEV'),
    appName: 'bpms (Dev)',
    appVersion: '0.0.1-dev',
    appLang: 'fa-IR',
  },
  STAGE: {
    apiBaseUrl: getApiBaseUrl('STAGE'),
    appName: 'bpms (Stage)',
    appVersion: '0.0.1-stage',
    appLang: 'fa-IR',
  },
  PROD: {
    // PRS is deployed at root (/)
    // Base path can be overridden via PUBLIC_BASE_PATH environment variable
    // Endpoints already include /api prefix
    apiBaseUrl: getApiBaseUrl('PROD'),
    appName: 'bpms',
    appVersion: '1.0.0',
    appLang: 'fa-IR',
  },
};

export const config: Config = (() => {
  if (!['LOCAL', 'DEV', 'STAGE', 'PROD'].includes(environment)) {
    return configs.DEV;
  }
  return configs[environment];
})();

