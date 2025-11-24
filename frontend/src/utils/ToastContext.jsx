// T114: Toast notification system for successful rule updates
import { createContext, useContext, useState, useCallback } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';

const ToastContext = createContext();

/**
 * Hook to use toast notifications
 * @returns {Object} Toast functions: showToast, showSuccess, showError, showInfo, showWarning
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

/**
 * Toast Provider component
 * Wrap your app or specific pages with this to enable toast notifications
 */
export const ToastProvider = ({ children }) => {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, variant = 'success', duration = 3000) => {
    const id = Date.now();
    const newToast = {
      id,
      message,
      variant,
      duration,
      show: true
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto-hide after duration
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const hideToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showSuccess = useCallback((message, duration) => {
    showToast(message, 'success', duration);
  }, [showToast]);

  const showError = useCallback((message, duration) => {
    showToast(message, 'danger', duration);
  }, [showToast]);

  const showInfo = useCallback((message, duration) => {
    showToast(message, 'info', duration);
  }, [showToast]);

  const showWarning = useCallback((message, duration) => {
    showToast(message, 'warning', duration);
  }, [showToast]);

  return (
    <ToastContext.Provider
      value={{
        showToast,
        showSuccess,
        showError,
        showInfo,
        showWarning
      }}
    >
      {children}

      {/* Toast Container - positioned at top-right */}
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999 }}>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            onClose={() => hideToast(toast.id)}
            show={toast.show}
            delay={toast.duration}
            autohide={toast.duration > 0}
            bg={toast.variant}
          >
            <Toast.Header>
              <strong className="me-auto">
                {toast.variant === 'success' && t('common.success')}
                {toast.variant === 'danger' && t('common.error')}
                {toast.variant === 'info' && t('common.info')}
                {toast.variant === 'warning' && t('common.warning')}
              </strong>
            </Toast.Header>
            <Toast.Body className={toast.variant === 'danger' || toast.variant === 'dark' ? 'text-white' : ''}>
              {toast.message}
            </Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  );
};

ToastProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export default ToastContext;
