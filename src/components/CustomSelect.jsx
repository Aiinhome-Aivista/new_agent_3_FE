import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

const CustomSelect = ({ value, onChange, children, className = '', disabled, ...props }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const selectRef = useRef(null);
  const containerRef = useRef(null);

  // Parse native options from the hidden select element
  useEffect(() => {
    if (selectRef.current) {
      const opts = Array.from(selectRef.current.options).map(opt => ({
        value: opt.value,
        label: opt.text
      }));
      setOptions(opts);
    }
  }, [children]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLabel = options.find(o => String(o.value) === String(value))?.label || options[0]?.label || 'Select...';

  // Because the original select had px-3 py-2, we remove padding from the wrapper inline style 
  // and force overflow visible so the absolute dropdown isn't clipped by truncate or overflow-hidden classes.
  return (
    <div className={`relative ${className} select-none`} ref={containerRef} style={{ padding: 0, overflow: 'visible' }}>
      {/* Hidden native select to maintain form behavior and easily parse options */}
      <select 
        ref={selectRef}
        value={value} 
        onChange={onChange} 
        className="hidden" 
        disabled={disabled}
        {...props}
      >
        {children}
      </select>
      
      {/* Custom Trigger */}
      <div 
        className={`w-full h-full min-h-[38px] flex items-center justify-between cursor-pointer px-3 py-2 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} focus:outline-none focus:ring-2 focus:ring-orange-border`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!disabled) setIsOpen(!isOpen);
          }
        }}
      >
         <span className="truncate pr-6 text-sm">{selectedLabel}</span>
         <ChevronDown size={16} className="text-secondary-text absolute right-3 pointer-events-none" />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-[100] w-full mt-1 bg-white border border-light-border rounded-md shadow-lg max-h-60 overflow-y-auto custom-scrollbar left-0">
          {options.map((opt, i) => (
             <div 
               key={i}
               className={`px-3 py-2 cursor-pointer text-sm transition-colors ${String(value) === String(opt.value) ? 'bg-input-background text-primary-orange font-semibold' : 'text-gray-700 hover:bg-primary-orange hover:text-white'}`}
               onClick={() => {
                 if (onChange) {
                   // Mimic React synthetic event for native select onChange
                   onChange({ target: { value: opt.value } });
                 }
                 setIsOpen(false);
               }}
             >
               {opt.label}
             </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
