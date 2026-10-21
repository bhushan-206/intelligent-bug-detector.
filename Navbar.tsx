import React from 'react';
import { 
  Bug, 
  Code2, 
  History, 
  BarChart3, 
  CheckCircle2, 
  Download, 
  Cpu, 
  Sparkles, 
  User, 
  Lock, 
  Compass, 
  Table, 
  ShieldCheck,
  LogOut 
} from 'lucide-react';
import { UserProfile } from '../types';

export type MainTabType = 'analyzer' | 'history' | 'analytics' | 'testsuite' | 'export' | 'login';

interface NavbarProps {
  activeTab: MainTabType;
  setActiveTab: (tab: MainTabType) => void;
  historyCount: number;
  isAiEnabled: boolean;
  currentUser: UserProfile | null;
  onOpenLogin: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  historyCount,
  isAiEnabled,
  currentUser,
  onOpenLogin,
  onLogout
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 sm:px-6 py-2.5">
        {/* Brand Logo & Name */}
        <div 
          onClick={() => setActiveTab('analyzer')} 
          className="flex items-center space-x-3 cursor-pointer select-none group"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 via-sky-500 to-indigo-600 shadow-md shadow-cyan-500/20 text-slate-950 group-hover:scale-105 transition-transform">
            <Bug className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Intelligent Bug Detector
              </h1>
              <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-xs font-semibold text-cyan-400 border border-cyan-500/30">
                v2.0
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium hidden sm:block">
              Multi-Language Static & AI Code Analysis
            </p>
          </div>
        </div>

        {/* Engine Status Indicators */}
        <div className="hidden lg:flex items-center space-x-2 text-xs">
          <div className="flex items-center space-x-1.5 rounded-lg bg-slate-900/90 px-2.5 py-1 text-slate-300 border border-slate-800">
            <Cpu className="h-3.5 w-3.5 text-emerald-400" />
            <span className="font-medium">Static AST: Active</span>
          </div>
          <div className={`flex items-center space-x-1.5 rounded-lg px-2.5 py-1 border ${
            isAiEnabled
              ? 'bg-violet-950/40 text-violet-300 border-violet-800/50'
              : 'bg-amber-950/40 text-amber-300 border-amber-800/50'
          }`}>
            <Sparkles className="h-3.5 w-3.5" />
            <span className="font-medium">{isAiEnabled ? 'Gemini AI' : 'Fallback'}</span>
          </div>
        </div>

        {/* Navigation Tabs & User Profile */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          <nav className="flex items-center space-x-1 overflow-x-auto">
            <button
              id="nav-tab-analyzer"
              onClick={() => setActiveTab('analyzer')}
              className={`flex items-center space-x-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'analyzer'
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent'
              }`}
            >
              <Code2 className="h-4 w-4" />
              <span>Analyzer</span>
            </button>

            <button
              id="nav-tab-history"
              onClick={() => setActiveTab('history')}
              className={`flex items-center space-x-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'history'
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent'
              }`}
            >
              <History className="h-4 w-4" />
              <span>History</span>
              {historyCount > 0 && (
                <span className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  activeTab === 'history' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}>
                  {historyCount}
                </span>
              )}
            </button>

            <button
              id="nav-tab-analytics"
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center space-x-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'analytics'
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Analytics & BI</span>
            </button>

            <button
              id="nav-tab-testsuite"
              onClick={() => setActiveTab('testsuite')}
              className={`flex items-center space-x-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'testsuite'
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent'
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span className="hidden md:inline">Test Suite</span>
              <span className="md:hidden">Tests</span>
            </button>

            <button
              id="nav-tab-export"
              onClick={() => setActiveTab('export')}
              className={`flex items-center space-x-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'export'
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent'
              }`}
            >
              <Download className="h-4 w-4" />
              <span className="hidden md:inline">Export</span>
              <span className="md:hidden">ZIP</span>
            </button>
          </nav>

          {/* User Profile & Logout Area */}
          <div className="pl-1.5 border-l border-slate-800 flex items-center space-x-1.5">
            {currentUser ? (
              <>
                <button
                  id="nav-user-profile-btn"
                  onClick={() => setActiveTab('login')}
                  className={`flex items-center space-x-2 rounded-xl p-1 sm:px-2.5 sm:py-1 border transition-all ${
                    activeTab === 'login'
                      ? 'border-cyan-500 bg-cyan-950/40 text-white'
                      : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
                  }`}
                  title={`Signed in as ${currentUser.name} (${currentUser.role})`}
                >
                  <img
                    src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                    alt={currentUser.name}
                    className="h-6 w-6 rounded-lg object-cover border border-cyan-500/50"
                  />
                  <span className="text-xs font-semibold hidden sm:inline max-w-[100px] truncate">
                    {currentUser.name}
                  </span>
                </button>

                {onLogout && (
                  <button
                    id="nav-btn-logout"
                    onClick={onLogout}
                    title="Sign Out / Logout"
                    className="flex items-center space-x-1 rounded-xl p-1.5 sm:px-2 sm:py-1 border border-slate-800 bg-slate-900/90 text-slate-400 hover:text-rose-300 hover:border-rose-500/40 hover:bg-rose-950/30 transition-all text-xs font-semibold"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                )}
              </>
            ) : (
              <button
                id="nav-btn-signin"
                onClick={onOpenLogin}
                className={`flex items-center space-x-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  activeTab === 'login'
                    ? 'bg-gradient-to-r from-cyan-400 to-indigo-500 text-slate-950 shadow-md shadow-cyan-500/30 ring-2 ring-cyan-400/50'
                    : 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 hover:from-cyan-400 hover:to-indigo-500 shadow-md shadow-cyan-500/20 active:scale-95'
                }`}
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
