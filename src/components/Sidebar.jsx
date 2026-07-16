import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Calendar, 
  CheckSquare, 
  AlertTriangle, 
  FileQuestion, 
  BarChart3, 
  MessageSquare,
  LogOut
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Stakeholders', path: '/stakeholders', icon: <Users size={20} /> },
    { name: 'KT Plan', path: '/plans', icon: <FileText size={20} /> },
    { name: 'Schedule', path: '/schedule', icon: <Calendar size={20} /> },
    { name: 'Tracking', path: '/tracking', icon: <CheckSquare size={20} /> },
    { name: 'Risks', path: '/risks', icon: <AlertTriangle size={20} /> },
    { name: 'Assessment', path: '/assessment', icon: <FileQuestion size={20} /> },
    { name: 'Reports', path: '/reports', icon: <BarChart3 size={20} /> },
    { name: 'Chatbot', path: '/chatbot', icon: <MessageSquare size={20} /> },
  ];

  const roleAccess = {
    'Delivery / Engagement Manager': ['Dashboard', 'Stakeholders', 'KT Plan', 'Tracking', 'Risks', 'Assessment', 'Reports', 'Chatbot'],
    'Outgoing SME (Knowledge Giver)': ['Dashboard', 'KT Plan', 'Schedule', 'Tracking', 'Assessment', 'Chatbot'],
    'Incoming Team Member (Knowledge Receiver)': ['Dashboard', 'Schedule', 'Assessment', 'Chatbot'],
    'PwC Leadership': ['Dashboard', 'Reports', 'Assessment', 'Chatbot'],
  };

  const userRole = user?.role || 'Incoming Team Member (Knowledge Receiver)';
  const allowedItems = roleAccess[userRole] || roleAccess['Incoming Team Member (Knowledge Receiver)'];
  const filteredNavItems = navItems.filter(item => allowedItems.includes(item.name));

  return (
    <div className="flex flex-col w-64 bg-gray-900 text-white shadow-xl">
      <div className="flex items-center justify-center h-20 border-b border-gray-800">
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
          KT Manager
        </h1>
      </div>
      <div className="flex flex-col flex-1 overflow-y-auto">
        <nav className="flex-1 px-4 py-6 space-y-2">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <span className="mr-3">{item.icon}</span>
              {item.name}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="p-4 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-300 rounded-lg hover:bg-red-600 hover:text-white transition-colors duration-200 w-full text-left"
        >
          <span className="mr-3">
            <LogOut size={20} />
          </span>
          Log out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
