import React from 'react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user } = useAuth();
  
  const displayName = user?.name || 'Guest User';
  const displayRole = user?.role || 'No Role';
  // create a short initials for avatar
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase() || 'GU';

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center">
        <h2 className="text-xl font-semibold text-gray-800">Virtual KT Manager</h2>
      </div>
      <div className="flex items-center">
        <div className="relative">
          <div className="flex items-center text-gray-500">
            <div className="flex flex-col text-right mr-3 hidden sm:block">
              {/* <span className="text-sm font-bold text-gray-800">{displayName}</span> */}
              <span className="text-sm font-medium text-blue-600">{displayRole}</span>
            </div>
            <img
              className="object-cover w-9 h-9 rounded-full border-2 border-blue-500 shadow-sm"
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0D8ABC&color=fff`}
              alt="Avatar"
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
