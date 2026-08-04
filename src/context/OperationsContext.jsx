import React, { createContext, useContext, useState } from 'react';

const OperationsContext = createContext(null);

export const OperationsProvider = ({ children }) => {
  const [activeOperations, setActiveOperations] = useState({});
  const [docExtractionState, setDocExtractionState] = useState({
    analyzingDoc: false,
    isDocExtracted: false,
    selectedFiles: [],
    docFormData: { application_name: '', scope_description: '', plan_type: 'KT', reverse_kt_focus: '' }
  });

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
    <OperationsContext.Provider value={{ 
      activeOperations, 
      startOperation, 
      endOperation,
      docExtractionState,
      setDocExtractionState
    }}>
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
