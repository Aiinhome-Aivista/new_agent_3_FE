import React, { createContext, useContext, useState } from 'react';

const OperationsContext = createContext(null);

export const OperationsProvider = ({ children }) => {
  const [activeOperations, setActiveOperations] = useState({});

  const startOperation = (key, value = true) => {
    setActiveOperations((prev) => ({ ...prev, [key]: value }));
  };

  const endOperation = (key) => {
    setActiveOperations((prev) => {
      const newState = { ...prev };
      delete newState[key];
      return newState;
    });
  };

  return (
    <OperationsContext.Provider value={{ activeOperations, startOperation, endOperation }}>
      {children}
    </OperationsContext.Provider>
  );
};

export const useOperations = () => {
  const context = useContext(OperationsContext);
  if (!context) {
    throw new Error('useOperations must be used within an OperationsProvider');
  }
  return context;
};
