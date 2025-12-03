import { createApiRequest } from 'injast-core/libs';
import { config } from 'src/config';
import { getAccessToken, getRefreshToken, setAccessToken, clearTokens } from 'src/client/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

// Custom response rejected handler to prevent default redirect to /auth/login
// This allows our custom interceptor to handle 401 errors instead
const onResponseRejected = (error: any) => {
  // Return the error to prevent the default redirect behavior
  // Our custom interceptor below will handle 401 errors appropriately
  return error;
};

// Create base API request instance
// Pass disableAuthHeader=true to prevent createApiRequest from using localStorage tokens
const apiRequest = createApiRequest(
  {
    baseURL: config.apiBaseUrl,
    withCredentials: false,
    headers: {
      'Accept-Language': config.appLang,
    },
  },
  undefined, // onRequestFulfilled
  undefined, // onRequestRejected
  undefined, // onResponseFulfilled
  onResponseRejected, // onResponseRejected - prevents default /auth/login redirect
  true // disableAuthHeader - prevents default localStorage token usage
);

// Add request interceptor to include JWT token from sessionStorage
// This interceptor runs after createApiRequest's default interceptor
apiRequest.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      // Ensure headers object exists
      if (!config.headers) {
        config.headers = {} as any;
      }
      // Set Authorization header with Bearer token
      // This will override any default Authorization header
      (config.headers as any)['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiRequest.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiRequest(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();
      try {
        if (!refreshToken) {
          // No refresh token: session is clearly expired
          clearTokens();
          processQueue(error, null);
          toast({
            title: 'پایان جلسه کاربری',
            description: 'زمان جلسه شما به پایان رسیده است. لطفاً دوباره وارد شوید.',
            variant: 'destructive',
          });
          isRefreshing = false;
          return Promise.reject(error);
        }

        // Direct API call to avoid circular dependency
        // config.apiBaseUrl is the base (e.g., '/cfowise' or 'http://localhost:8000')
        // Endpoints include /api prefix, so we append '/api/auth/token/refresh/'
        const refreshUrl = config.apiBaseUrl.endsWith('/') 
          ? `${config.apiBaseUrl}api/auth/token/refresh/`
          : `${config.apiBaseUrl}/api/auth/token/refresh/`;
        const refreshResponse = await fetch(refreshUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh: refreshToken }),
        });
        
        if (!refreshResponse.ok) {
          throw new Error('Token refresh failed');
        }
        
        const refreshData = await refreshResponse.json();
        const newAccessToken = refreshData.access;
        setAccessToken(newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        processQueue(null, newAccessToken);
        isRefreshing = false;
        return apiRequest(originalRequest);
      } catch (refreshError: any) {
        clearTokens();
        processQueue(refreshError, null);
        // Show a clear session-expired message instead of a silent logout
        toast({
          title: 'پایان جلسه کاربری',
          description: 'جلسه شما منقضی شده است. لطفاً دوباره وارد شوید.',
          variant: 'destructive',
        });
        isRefreshing = false;
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export { apiRequest };

