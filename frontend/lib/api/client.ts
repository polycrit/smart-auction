import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// Custom error type for better error handling
export class ApiError extends Error {
    constructor(message: string, public status?: number, public code?: string, public details?: unknown) {
        super(message);
        this.name = 'ApiError';
    }
}

// Create axios instance for direct API calls
export const apiClient: AxiosInstance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL!,
    withCredentials: false,
    timeout: 20000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Create axios instance for admin API calls (goes through Next.js proxy)
export const adminClient: AxiosInstance = axios.create({
    baseURL: '/api/admin',
    timeout: 20000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Response interceptor for error handling
const errorInterceptor = (error: AxiosError) => {
    if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const data = error.response.data as { detail?: string; code?: string };

        let message = 'An error occurred';

        if (status === 404) {
            message = 'Resource not found';
        } else if (status === 400) {
            message = data?.detail || 'Invalid request';
        } else if (status === 401) {
            message = 'Unauthorized';
        } else if (status === 403) {
            message = 'Forbidden';
        } else if (status === 500) {
            message = 'Server error';
        } else if (data?.detail) {
            message = data.detail;
        }

        throw new ApiError(message, status, data?.code, data);
    } else if (error.request) {
        // Request made but no response
        throw new ApiError('Network error - no response from server');
    } else {
        // Error setting up request
        throw new ApiError(error.message || 'Request failed');
    }
};

// Add error interceptor to both clients
apiClient.interceptors.response.use((response) => response, errorInterceptor);

adminClient.interceptors.response.use((response) => response, errorInterceptor);

// Development logging
if (process.env.NODE_ENV === 'development') {
    const logRequest = (config: InternalAxiosRequestConfig) => {
        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
    };

    const logResponse = (response: AxiosResponse) => {
        console.log(`[API] ${response.status} ${response.config.url}`);
        return response;
    };

    apiClient.interceptors.request.use(logRequest);
    apiClient.interceptors.response.use(logResponse);

    adminClient.interceptors.request.use(logRequest);
    adminClient.interceptors.response.use(logResponse);
}
