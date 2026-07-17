import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Users, BarChart3, ShieldCheck, Zap, CheckCircle2, FileText, ArrowDownRight, LayoutDashboard, FolderKanban, Settings, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LandingPage = () => {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-white font-sans text-slate-800">
      {/* Navbar */}
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center border-b border-slate-100">
        <div className="flex items-center space-x-2">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <BookOpen className="text-white h-6 w-6" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
            Virtual KT Manager
          </span>
        </div>
        <div className="space-x-4">
          <Link to={user ? "/dashboard" : "/login"} className="px-5 py-2.5 rounded-full text-indigo-600 font-medium hover:bg-indigo-50 transition-colors">
            Log In
          </Link>
          <Link to={user ? "/dashboard" : "/login"} className="px-5 py-2.5 rounded-full bg-indigo-600 text-white font-medium hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-indigo-50/80 to-white -z-10" />
        <div className="absolute top-20 -left-20 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
        <div className="absolute top-40 -right-20 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000" />

        <div className="container mx-auto px-6 pt-24 pb-20 text-center max-w-4xl">
          <div className="inline-flex items-center space-x-2 bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-8 border border-indigo-100 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <span>AI-Powered Knowledge Transfer</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-8 leading-tight">
            Seamless Knowledge Transition for your <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">Enterprise</span>
          </h1>
          
          <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Automate, track, and optimize your knowledge transfer processes with our intelligent platform. Ensure business continuity without skipping a beat.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Link to={user ? "/dashboard" : "/login"} className="group px-8 py-4 rounded-full bg-indigo-600 text-white font-bold text-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 flex items-center transition-all">
              Start Free Trial 
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="#features" className="px-8 py-4 rounded-full bg-white text-slate-700 font-bold text-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all">
              Learn More
            </Link>
          </div>
        </div>

        {/* Dashboard Preview Mockup */}
        <div className="container mx-auto px-6 pb-24">
          <div className="relative mx-auto max-w-5xl rounded-2xl bg-slate-900 shadow-2xl overflow-hidden ring-1 ring-white/10 ring-inset">
            {/* Window header */}
            <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <div className="w-3 h-3 rounded-full bg-amber-400"></div>
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
            </div>
            {/* App Mockup */}
            <div className="bg-slate-50 flex h-[450px] text-left">
              {/* Sidebar Mockup */}
              <div className="w-64 bg-white border-r border-slate-200 p-4 hidden md:block flex flex-col">
                <div className="flex items-center space-x-2 mb-8 px-2 mt-2">
                  <div className="bg-indigo-600 p-1.5 rounded-md">
                    <BookOpen className="text-white h-4 w-4" />
                  </div>
                  <span className="font-bold text-slate-800 text-sm">KT Manager</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-3 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg">
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="text-sm font-medium">Dashboard</span>
                  </div>
                  <div className="flex items-center space-x-3 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                    <FolderKanban className="h-4 w-4" />
                    <span className="text-sm font-medium">KT Plans</span>
                  </div>
                  <div className="flex items-center space-x-3 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                    <Users className="h-4 w-4" />
                    <span className="text-sm font-medium">Stakeholders</span>
                  </div>
                  <div className="flex items-center space-x-3 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                    <BarChart3 className="h-4 w-4" />
                    <span className="text-sm font-medium">Reports</span>
                  </div>
                </div>
                <div className="mt-24 pt-8">
                  <div className="flex items-center space-x-3 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                    <Settings className="h-4 w-4" />
                    <span className="text-sm font-medium">Settings</span>
                  </div>
                </div>
              </div>
              
              {/* Content Mockup */}
              <div className="flex-1 p-8 overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-slate-800">Project Overview</h3>
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-xs font-bold text-blue-700 z-30">JD</div>
                    <div className="w-8 h-8 rounded-full bg-purple-100 border-2 border-white flex items-center justify-center text-xs font-bold text-purple-700 z-20">AM</div>
                    <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-xs font-bold text-slate-600 z-10">+3</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-6 mb-6">
                  {/* Card 1 */}
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm font-medium text-slate-500">Active Plans</p>
                      <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md">
                        <FolderKanban className="h-4 w-4" />
                      </div>
                    </div>
                    <h4 className="text-2xl font-bold text-slate-800">12</h4>
                    <p className="text-xs text-green-600 font-medium flex items-center mt-1">
                      <TrendingUp className="h-3 w-3 mr-1" /> +2 this week
                    </p>
                  </div>
                  {/* Card 2 */}
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm font-medium text-slate-500">Pending Sign-offs</p>
                      <div className="p-1.5 bg-amber-50 text-amber-600 rounded-md">
                        <Clock className="h-4 w-4" />
                      </div>
                    </div>
                    <h4 className="text-2xl font-bold text-slate-800">5</h4>
                    <p className="text-xs text-amber-600 font-medium flex items-center mt-1">
                      Needs attention
                    </p>
                  </div>
                  {/* Card 3 */}
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm font-medium text-slate-500">Overall Progress</p>
                      <div className="p-1.5 bg-green-50 text-green-600 rounded-md">
                        <BarChart3 className="h-4 w-4" />
                      </div>
                    </div>
                    <h4 className="text-2xl font-bold text-slate-800">68%</h4>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                      <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '68%' }}></div>
                    </div>
                  </div>
                </div>
                
                {/* List Area */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex-1 p-5 flex flex-col">
                  <h4 className="text-sm font-bold text-slate-800 mb-4">Recent Activities</h4>
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">Database Migration Module</p>
                          <p className="text-xs text-slate-500">Signed off by Alex Morgan</p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-400">2h ago</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">API Documentation Generated</p>
                          <p className="text-xs text-slate-500">AI completed draft generation</p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-400">5h ago</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                          <AlertCircle className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">Authentication Risk Identified</p>
                          <p className="text-xs text-slate-500">Requires SME review</p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-400">1d ago</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4">Why choose Virtual KT Manager?</h2>
            <p className="text-slate-600">Our platform is designed to handle complex transitions, ensuring that critical knowledge is retained and organized efficiently.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-10 max-w-5xl mx-auto">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-slate-100 group">
              <div className="bg-blue-50 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="text-blue-600 h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">Stakeholder Alignment</h3>
              <p className="text-slate-600 leading-relaxed">Keep everyone on the same page. Easily manage roles, responsibilities, and sign-offs in one place.</p>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-slate-100 group">
              <div className="bg-purple-50 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="text-purple-600 h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">AI Generation</h3>
              <p className="text-slate-600 leading-relaxed">Let AI build your KT plans instantly. Analyze source code and generate documentation on the fly.</p>
            </div>
            
            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-slate-100 group">
              <div className="bg-green-50 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BarChart3 className="text-green-600 h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">Real-time Tracking</h3>
              <p className="text-slate-600 leading-relaxed">Monitor progress through dashboards and reports. Know exactly what has been completed and what's pending.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-slate-600">A simple, streamlined process to get your team transferring knowledge effectively.</p>
          </div>
          
          <div className="max-w-4xl mx-auto relative">
            <div className="absolute top-1/2 left-0 w-full h-1 bg-indigo-50 -translate-y-1/2 hidden md:block z-0"></div>
            <div className="grid md:grid-cols-3 gap-12 relative z-10">
              {/* Step 1 */}
              <div className="bg-white text-center">
                <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border-4 border-white">
                  <FileText className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">1. Define the Plan</h3>
                <p className="text-slate-600 text-sm">Input your project details and let our AI generate a comprehensive KT plan tailored to your needs.</p>
              </div>
              {/* Step 2 */}
              <div className="bg-white text-center">
                <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border-4 border-white">
                  <Users className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">2. Assign Stakeholders</h3>
                <p className="text-slate-600 text-sm">Allocate modules and sessions to specific SMEs and receivers. Ensure everyone knows their responsibilities.</p>
              </div>
              {/* Step 3 */}
              <div className="bg-white text-center">
                <div className="w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-md border-4 border-white">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">3. Track & Complete</h3>
                <p className="text-slate-600 text-sm">Monitor daily progress, resolve risks, and sign off on completed modules with full traceability.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-indigo-600 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 -translate-x-1/2 translate-y-1/2" />
        
        <div className="container mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl font-bold mb-6">Ready to streamline your transitions?</h2>
          <p className="text-indigo-100 text-xl mb-10 max-w-2xl mx-auto">
            Join thousands of enterprises that trust Virtual KT Manager to safeguard their critical operational knowledge.
          </p>
          <Link to={user ? "/dashboard" : "/login"} className="inline-flex items-center px-8 py-4 rounded-full bg-white text-indigo-600 font-bold text-lg hover:bg-indigo-50 shadow-lg transition-all">
            Get Started Now
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-12 border-t border-slate-800">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <BookOpen className="text-indigo-400 h-6 w-6" />
            <span className="text-xl font-bold text-white">Virtual KT Manager</span>
          </div>
          <div className="text-sm">
            &copy; {new Date().getFullYear()} Virtual KT Manager. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
