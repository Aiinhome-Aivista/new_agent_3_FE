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
  LogOut,
  Database,
  CalendarDays,
  Upload
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
      { name: 'Projects', path: '/plans', icon: <FileText size={20} /> },
    { name: 'Stakeholders', path: '/stakeholders', icon: <Users size={20} /> },
    { name: 'Schedule', path: '/schedule', icon: <Calendar size={20} /> },
    { name: 'KT Calendar', path: '/calendar', icon: <Calendar size={20} /> },
    { name: 'Tracking', path: '/tracking', icon: <CheckSquare size={20} /> },
    { name: 'Risks', path: '/risks', icon: <AlertTriangle size={20} /> },
    { name: 'Knowledge Base', path: '/knowledge-base', icon: <Database size={20} /> },
    { name: 'SUD Document Upload', path: '/sud-upload', icon: <Upload size={20} /> },
    { name: 'Assessment', path: '/assessment', icon: <FileQuestion size={20} /> },
    { name: 'Reports', path: '/reports', icon: <BarChart3 size={20} /> },
    { name: 'Holidays', path: '/holidays', icon: <CalendarDays size={20} /> },
  
  
    { name: 'Chatbot', path: '/chatbot', icon: <MessageSquare size={20} /> },
  ];

  const roleAccess = {
    'Delivery / Engagement Manager': ['Dashboard', 'Stakeholders','Knowledge Base', 'Projects', 'Schedule', 'KT Calendar', 'Tracking', 'Risks', 'Assessment', 'Reports', 'Holidays', 'Chatbot'],
    'Outgoing SME (Knowledge Giver)': ['Dashboard', 'Assessment', 'Knowledge Base', 'Chatbot', 'Risks', 'KT Calendar'],
    'Incoming Team Member (Knowledge Receiver)': ['Dashboard', 'Schedule', 'SUD Document Upload', 'Assessment', 'Chatbot', 'Risks', 'KT Calendar'],
    'PwC Leadership': ['Dashboard', 'Stakeholders', 'Reports', 'Tracking', 'Risks', 'Assessment', 'KT Calendar', 'Chatbot'],
  };

  const userRole = user?.role || 'Incoming Team Member (Knowledge Receiver)';
  const allowedItems = roleAccess[userRole] || roleAccess['Incoming Team Member (Knowledge Receiver)'];
  const filteredNavItems = navItems.filter(item => allowedItems.includes(item.name));

  return (
    <div className="flex flex-col w-64 bg-sidebar text-white shadow-xl">
      <div className="flex items-center justify-center h-16 border-b border-light-border">
        <h1 className="text-2xl font-bold text-primary-orange">
          KT Manager
        </h1>
      </div>
      <div className="flex flex-col flex-1 overflow-y-auto scrollbar-hide">
        <nav className="flex-1 px-4 py-6 space-y-2">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  isActive
                    ? 'bg-primary-orange text-white'
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
      <div className="p-2 border-t border-light-border">
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
