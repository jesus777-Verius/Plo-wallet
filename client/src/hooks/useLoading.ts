import { useState, useCallback, useRef } from 'react';

interface LoadingState {
  show: boolean;
  message: string;
  progress?: number;
  timeout?: number;
}

export function useLoading() {
  const [loading, setLoading] = useState<LoadingState>({
    show: false,
    message: 'Cargando...',
    progress: undefined,
    timeout: 30000
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showLoading = useCallback((
    message: string = 'Cargando...', 
    options?: { 
      progress?: number; 
      timeout?: number;
    }
  ) => {
    setLoading({
      show: true,
      message,
      progress: options?.progress,
      timeout: options?.timeout || 30000
    });

    // Auto-hide después del timeout si no se oculta manualmente
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      hideLoading();
    }, options?.timeout || 30000);
  }, []);

  const updateLoading = useCallback((
    message?: string, 
    progress?: number
  ) => {
    setLoading(prev => ({
      ...prev,
      message: message || prev.message,
      progress: progress !== undefined ? progress : prev.progress
    }));
  }, []);

  const hideLoading = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setLoading(prev => ({
      ...prev,
      show: false
    }));
  }, []);

  const withLoading = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    message: string = 'Procesando...',
    options?: { timeout?: number }
  ): Promise<T> => {
    try {
      showLoading(message, options);
      const result = await asyncFn();
      hideLoading();
      return result;
    } catch (error) {
      hideLoading();
      throw error;
    }
  }, [showLoading, hideLoading]);

  return {
    loading,
    showLoading,
    updateLoading,
    hideLoading,
    withLoading
  };
}