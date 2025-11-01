import { createContext, useContext, useState, useCallback } from 'react';

const ModalContext = createContext();

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

export const ModalProvider = ({ children }) => {
  const [activeModal, setActiveModal] = useState(null); // 'login', 'register', or null

  // Use useCallback to stabilize function references and prevent unnecessary re-renders
  const openLoginModal = useCallback(() => {
    setActiveModal('login');
  }, []);

  const openRegisterModal = useCallback(() => {
    setActiveModal('register');
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
  }, []); // No dependencies - function reference never changes

  const value = {
    activeModal,
    openLoginModal,
    openRegisterModal,
    closeModal
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
};
