import React from 'react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user } = useAuth();
  
  const displayName = user?.name || 'Guest User';
  const displayRole = user?.role || 'No Role';
  // create a short initials for avatar
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase() || 'GU';

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-light-background border-b border-light-border shadow-sm">
      <div className="flex items-center">
        <h2 className="text-xl font-semibold text-primary-orange">Virtual KT Manager</h2>
      </div>
      <div className="flex items-center">
        <div className="relative">
          <div className="flex items-center text-secondary-text">
            <div className="flex flex-col text-right mr-3 hidden sm:block">
              {/* <span className="text-sm font-bold text-primary-text">{displayName}</span> */}
              <span className="text-sm font-medium text-primary-orange">{displayRole}</span>
            </div>
            <img
              className="object-cover w-9 h-9 rounded-full border-2 border-orange-border shadow-sm"
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
