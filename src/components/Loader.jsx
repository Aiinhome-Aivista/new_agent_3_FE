import React from 'react';
import { Loader2 } from 'lucide-react';

const Loader = ({ text = "Loading..." }) => {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full py-12">
      <Loader2 className="w-10 h-10 text-primary-orange animate-spin" />
      <p className="mt-4 text-sm font-medium text-secondary-text">{text}</p>
    </div>
  );
};

export default Loader;
