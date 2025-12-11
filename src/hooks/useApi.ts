'use client';

import { useState, useCallback } from 'react';

interface ApiState<T> {
  data:  T | null;
  isLoading: boolean;
  error: string | null;
}

interface UseApiOptions {
  onSuccess?: (data:  any) => void;
  onError?: (error: string) => void;
}

export function useApi<T = any>(options: UseApiOptions = {}) {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    isLoading: false,
    error:  null,
  });

  const execute = useCallback(
    async (
      url: string,
      fetchOptions: RequestInit = {}
    ): Promise<{ success: boolean; data?:  T; error?: string }> => {
      setState((prev) => ({ ...prev, isLoading: true, error:  null }));

      try {
        const response = await fetch(url, {
          ...fetchOptions,
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...fetchOptions.headers,
          },
        });

        const result = await response. json();

        if (! response.ok || !result.success) {
          const errorMsg = result.error || 'Request failed';
          setState({ data: null, isLoading: false, error: errorMsg });
          options.onError?.(errorMsg);
          return { success: false, error: errorMsg };
        }

        setState({ data: result. data, isLoading: false, error: null });
        options.onSuccess?.(result.data);
        return { success: true, data: result.data };
      } catch (error) {
        const errorMsg = 'Network error.  Please try again.';
        setState({ data: null, isLoading:  false, error: errorMsg });
        options.onError?.(errorMsg);
        return { success: false, error: errorMsg };
      }
    },
    [options]
  );

  const get = useCallback((url: string) => execute(url, { method: 'GET' }), [execute]);

  const post = useCallback(
    (url: string, body: any) =>
      execute(url, { method: 'POST', body: JSON. stringify(body) }),
    [execute]
  );

  const put = useCallback(
    (url: string, body:  any) =>
      execute(url, { method: 'PUT', body: JSON. stringify(body) }),
    [execute]
  );

  const del = useCallback(
    (url: string) => execute(url, { method: 'DELETE' }),
    [execute]
  );

  const reset = useCallback(() => {
    setState({ data: null, isLoading: false, error: null });
  }, []);

  return {
    ... state,
    execute,
    get,
    post,
    put,
    delete:  del,
    reset,
  };
}

// File upload hook
export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = async (
    url: string,
    file: File,
    additionalData:  Record<string, string> = {}
  ): Promise<{ success: boolean; data?: any; error?:  string }> => {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });

      const response = await fetch(url, {
        method:  'POST',
        credentials: 'include',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMsg = result.error || 'Upload failed';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }

      setProgress(100);
      return { success: true, data: result. data };
    } catch (err) {
      const errorMsg = 'Upload failed. Please try again.';
      setError(errorMsg);
      return { success: false, error:  errorMsg };
    } finally {
      setIsUploading(false);
    }
  };

  return { upload, isUploading, progress, error };
}