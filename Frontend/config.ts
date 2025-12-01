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
  
  // Production uses relative URL based on base path
  if (env === 'PROD') {
    // If PUBLIC_BASE_PATH is set, use it for API base URL
    // Otherwise default to /PRS for backward compatibility
    const basePath = import.meta.env.PUBLIC_BASE_PATH || '/PRS';
    // Remove trailing slash and add /api
    const cleanBasePath = basePath.replace(/\/$/, '');
    return cleanBasePath === '/' ? '/api' : `${cleanBasePath}/api`;
  }
  
  // Development environments use environment variable or default
  const defaultDevUrl = import.meta.env.PUBLIC_DEV_API_URL || 'http://localhost:8000';
  return defaultDevUrl;
};

const configs: Record<Environment, Config> = {
  LOCAL: {
    apiBaseUrl: getApiBaseUrl('LOCAL'),
    appName: 'PRS (Local)',
    appVersion: '0.0.1-local',
    appLang: 'fa-IR',
  },
  DEV: {
    apiBaseUrl: getApiBaseUrl('DEV'),
    appName: 'PRS (Dev)',
    appVersion: '0.0.1-dev',
    appLang: 'fa-IR',
  },
  STAGE: {
    apiBaseUrl: getApiBaseUrl('STAGE'),
    appName: 'PRS (Stage)',
    appVersion: '0.0.1-stage',
    appLang: 'fa-IR',
  },
  PROD: {
    // PRS can be deployed at root (/) or subpath (/PRS/)
    // Base path is controlled by PUBLIC_BASE_PATH environment variable
    // Endpoints already include /api prefix
    apiBaseUrl: getApiBaseUrl('PROD'),
    appName: 'PRS',
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

