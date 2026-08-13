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
        label: opt.text,
        disabled: opt.disabled,
        isHeader: opt.getAttribute('data-header') === 'true',
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

  const selectedOption = options.find(o => String(o.value) === String(value));
  const selectedLabel = selectedOption ? selectedOption.label : (options[0]?.label || 'Select...');

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
        className={`w-full h-full min-h-[38px] flex items-center justify-between cursor-pointer px-3 py-2 bg-white border border-light-border rounded-lg ${disabled ? 'opacity-50 cursor-not-allowed' : ''} focus:outline-none focus:ring-2 focus:ring-primary-orange/20`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!disabled) setIsOpen(!isOpen);
          }
        }}
      >
         <span className={`truncate pr-6 text-sm ${!value ? 'text-slate-400' : 'text-slate-700 font-medium'}`}>
           {selectedLabel}
         </span>
         <ChevronDown size={16} className="text-secondary-text absolute right-3 pointer-events-none" />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-[100] w-full mt-1 bg-white border border-light-border rounded-lg shadow-xl max-h-64 overflow-y-auto custom-scrollbar left-0 py-1">
          {options.map((opt, i) => {
            if (opt.isHeader) {
              return (
                <div 
                  key={i}
                  className="px-3 py-1.5 text-[11px] font-extrabold text-slate-400 bg-slate-100/80 uppercase tracking-wider select-none border-y border-slate-200/60 my-1"
                >
                  {opt.label}
                </div>
              );
            }

            const isSelected = String(value) === String(opt.value);

            return (
              <div 
                key={i}
                className={`px-3 py-2.5 cursor-pointer text-sm transition-all ${
                  isSelected 
                    ? 'bg-orange-50 text-primary-orange font-bold border-l-4 border-primary-orange' 
                    : !opt.value 
                    ? 'text-slate-400 hover:bg-slate-50' 
                    : 'text-slate-700 hover:bg-primary-orange hover:text-white'
                }`}
                onClick={() => {
                  if (!opt.disabled && onChange) {
                    onChange({ target: { value: opt.value } });
                  }
                  setIsOpen(false);
                }}
              >
                <span className="truncate">{opt.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
