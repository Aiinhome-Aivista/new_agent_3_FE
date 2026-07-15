import React from 'react';

const Navbar = () => {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center">
        <h2 className="text-xl font-semibold text-gray-800">Virtual KT Manager</h2>
      </div>
      <div className="flex items-center">
        <div className="relative">
          <button className="flex items-center text-gray-500 hover:text-gray-700 focus:outline-none">
            <img
              className="object-cover w-8 h-8 rounded-full border-2 border-blue-500"
              src="https://ui-avatars.com/api/?name=Admin+User&background=0D8ABC&color=fff"
              alt="Avatar"
            />
            <span className="ml-2 text-sm font-medium text-gray-700">Admin</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
