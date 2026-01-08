import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import NewAnalysis from './pages/NewAnalysis';
import ResultsPage from './pages/ResultsPage';
import SeriesAnalytics from './pages/SeriesAnalytics';
import TeamWorkspace from './pages/TeamWorkspace';
import ContentCalendar from './pages/ContentCalendar';
import GuestOutreach from './pages/GuestOutreach';
import UsageAnalytics from './pages/UsageAnalytics';
import DeveloperSettings from './pages/DeveloperSettings';
import HelpPanel from './components/HelpPanel';
import LiveChatWidget from './components/LiveChatWidget';
import { ThemeToggle } from './components/ThemeToggle';
import { getStoredUser, loginUser, logoutUser } from './services/auth';
import { User } from './types';
import { LogOut, LayoutDashboard, BarChart3, Users, Calendar, UserPlus, Menu, X, Plus, PieChart, Terminal, CircleHelp } from 'lucide-react';
import { validateEnv } from './src/utils/env';
import { initSentry, ErrorBoundary, setUser as setSentryUser } from './src/utils/sentry';

// Validate environment variables on app startup
try {
  validateEnv();
} catch (error) {
  console.error('Environment validation failed:', error);
  // In production, you might want to show an error page instead
}

// Initialize error tracking
initSentry();

// Wrapper to provide navigation props to pages
const AppContent: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [helpPanelOpen, setHelpPanelOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
  (async () => {
    const storedUser = await getStoredUser();
    if (storedUser) {
      setUser(storedUser);
      setSentryUser(storedUser); // Track user in Sentry
    }
    setLoading(false);
  })();
}, []);


  const handleLogin = async () => {
    // Simulate login flow
    try {
      const newUser = await loginUser('test@test.com', 'Kaleb2022!');
      setUser(newUser);
      setSentryUser(newUser); // Track user in Sentry
      navigate('/dashboard');
    } catch (err) {
      console.error('Login failed:', err);
      alert('Login failed. If you are developing locally, ensure Supabase env vars are set or use a configured test account.');
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    setSentryUser(null); // Clear user from Sentry
    navigate('/');
    setMobileMenuOpen(false);
  };

  const handleNav = (path: string) => {
      navigate(path);
      setMobileMenuOpen(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-100">Loading...</div>;

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      {user && (
        <nav className="bg-gray-100 border-b border-gray-300 px-4 sm:px-6 py-3 flex justify-between items-center sticky top-0 z-50 shadow-sm md:shadow-none">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => setMobileMenuOpen(true)}
                    className="md:hidden text-gray-700 p-1 hover:bg-gray-300 rounded-lg"
                >
                    <Menu className="h-6 w-6" />
                </button>
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
                    <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-lg">LQ</div>
                    <span className="font-bold text-textPrimary text-lg hidden sm:block">LoquiHQ</span>
                </div>
                
                {/* Desktop Menu */}
                <div className="hidden md:flex space-x-1 ml-4">
                    <button
                      onClick={() => navigate('/dashboard')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${isActive('/dashboard') ? 'bg-indigo-50 text-primary' : 'text-textSecondary hover:bg-gray-300'}`}
                    >
                        <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </button>
                    <button
                      onClick={() => navigate('/analytics')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${isActive('/analytics') ? 'bg-indigo-50 text-primary' : 'text-textSecondary hover:bg-gray-300'}`}
                    >
                        <BarChart3 className="h-4 w-4" /> Insights
                    </button>
                    <button
                      onClick={() => navigate('/calendar')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${isActive('/calendar') ? 'bg-indigo-50 text-primary' : 'text-textSecondary hover:bg-gray-300'}`}
                    >
                        <Calendar className="h-4 w-4" /> Calendar
                    </button>
                    <button
                      onClick={() => navigate('/outreach')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${isActive('/outreach') ? 'bg-indigo-50 text-primary' : 'text-textSecondary hover:bg-gray-300'}`}
                    >
                        <UserPlus className="h-4 w-4" /> Outreach
                    </button>
                    <button
                      onClick={() => navigate('/team')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${isActive('/team') ? 'bg-indigo-50 text-primary' : 'text-textSecondary hover:bg-gray-300'}`}
                    >
                        <Users className="h-4 w-4" /> Team
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-4">
                 <button
                   onClick={() => navigate('/analysis')}
                   aria-label="Create new analysis"
                   style={{ backgroundColor: 'var(--color-primary)' }}
                   className="hidden md:inline-flex text-white px-4 py-2 rounded-lg shadow-sm hover:brightness-95 transition font-medium items-center gap-2"
                 >
                   <Plus className="h-4 w-4" />
                   New Analysis
                 </button>
                 <button 
                   onClick={() => navigate('/analysis')}
                   style={{ backgroundColor: 'var(--color-primary)' }}
                   className="md:hidden text-white p-2 rounded-full shadow-lg"
                 >
                   <Plus className="h-5 w-5" />
                 </button>
                 <span className="text-sm text-textSecondary hidden sm:block">Welcome, {user.name}</span>
                 <button
                   onClick={() => navigate('/developer')}
                   className={`transition hidden md:block ${isActive('/developer') ? 'text-primary' : 'text-textMuted hover:text-primary'}`}
                   title="Developer Settings"
                 >
                   <Terminal className="h-5 w-5" />
                 </button>

                 {/* Theme Toggle */}
                 <ThemeToggle />

                 {/* Help Button */}
                 <button
                   onClick={() => setHelpPanelOpen(true)}
                   className="text-textMuted hover:text-primary transition"
                   title="Help & Support"
                 >
                   <CircleHelp className="h-5 w-5" />
                 </button>

                 <button
                   onClick={handleLogout}
                   className="text-textMuted hover:text-red-500 transition hidden md:block"
                   title="Logout"
                 >
                   <LogOut className="h-5 w-5" />
                 </button>
            </div>
        </nav>
      )}

      {/* Mobile Drawer */}
      {user && mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex">
              <div className="fixed inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)}></div>
              <div className="relative bg-gray-100 w-64 max-w-[80%] h-full shadow-2xl flex flex-col p-4 animate-in slide-in-from-left duration-200">
                  <div className="flex justify-between items-center mb-8 border-b border-gray-300 pb-4">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">LQ</div>
                        <span className="font-bold text-textPrimary">LoquiHQ</span>
                      </div>
                      <button onClick={() => setMobileMenuOpen(false)} className="text-textMuted"><X className="h-6 w-6" /></button>
                  </div>

                  <div className="flex-1 space-y-2">
                     <button onClick={() => handleNav('/dashboard')} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 ${isActive('/dashboard') ? 'bg-indigo-50 text-primary' : 'text-textSecondary'}`}>
                         <LayoutDashboard className="h-5 w-5" /> Dashboard
                     </button>
                     <button onClick={() => handleNav('/analytics')} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 ${isActive('/analytics') ? 'bg-indigo-50 text-primary' : 'text-textSecondary'}`}>
                         <BarChart3 className="h-5 w-5" /> Insights
                     </button>
                     <button onClick={() => handleNav('/usage')} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 ${isActive('/usage') ? 'bg-indigo-50 text-primary' : 'text-textSecondary'}`}>
                         <PieChart className="h-5 w-5" /> Usage & ROI
                     </button>
                     <button onClick={() => handleNav('/calendar')} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 ${isActive('/calendar') ? 'bg-indigo-50 text-primary' : 'text-textSecondary'}`}>
                         <Calendar className="h-5 w-5" /> Calendar
                     </button>
                     <button onClick={() => handleNav('/outreach')} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 ${isActive('/outreach') ? 'bg-indigo-50 text-primary' : 'text-textSecondary'}`}>
                         <UserPlus className="h-5 w-5" /> Outreach
                     </button>
                     <button onClick={() => handleNav('/team')} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 ${isActive('/team') ? 'bg-indigo-50 text-primary' : 'text-textSecondary'}`}>
                         <Users className="h-5 w-5" /> Team Workspace
                     </button>
                     <button onClick={() => handleNav('/developer')} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 ${isActive('/developer') ? 'bg-indigo-50 text-primary' : 'text-textSecondary'}`}>
                         <Terminal className="h-5 w-5" /> Developer
                     </button>
                     <button onClick={() => { setHelpPanelOpen(true); setMobileMenuOpen(false); }} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 text-gray-600`}>
                         <CircleHelp className="h-5 w-5" /> Help & Support
                     </button>
                  </div>

                  <div className="border-t border-gray-300 pt-4">
                      <div className="flex items-center gap-3 px-4 py-2 mb-2">
                          <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center text-textMuted font-bold">
                              {user.name.charAt(0)}
                          </div>
                          <div className="overflow-hidden">
                              <p className="text-sm font-bold text-textPrimary truncate">{user.name}</p>
                              <p className="text-xs text-textMuted truncate">{user.email}</p>
                          </div>
                      </div>
                      <button onClick={handleLogout} className="w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 text-red-500 hover:bg-red-50">
                          <LogOut className="h-5 w-5" /> Log Out
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Help Components */}
      {user && (
        <>
          <HelpPanel isOpen={helpPanelOpen} onClose={() => setHelpPanelOpen(false)} />
          <LiveChatWidget />
        </>
      )}

      <Routes>
        <Route path="/" element={!user ? <LandingPage onLogin={handleLogin} /> : <Navigate to="/dashboard" />} />
        
        <Route path="/dashboard" element={
          user ? (
            <Dashboard 
              onNewAnalysis={() => navigate('/analysis')} 
              onViewResults={(id) => navigate(`/results/${id}`)}
            />
          ) : <Navigate to="/" />
        } />
        
        <Route path="/analytics" element={
          user ? <SeriesAnalytics /> : <Navigate to="/" />
        } />

        <Route path="/usage" element={
          user ? <UsageAnalytics /> : <Navigate to="/" />
        } />

        <Route path="/calendar" element={
          user ? <ContentCalendar /> : <Navigate to="/" />
        } />

        <Route path="/outreach" element={
          user ? <GuestOutreach /> : <Navigate to="/" />
        } />

        <Route path="/team" element={
          user ? <TeamWorkspace /> : <Navigate to="/" />
        } />


        <Route path="/developer" element={
          user ? <DeveloperSettings /> : <Navigate to="/" />
        } />
        
        <Route path="/analysis" element={
          user ? (
            <NewAnalysis 
              onBack={() => navigate('/dashboard')}
              onComplete={(id) => navigate(`/results/${id}`)}
            />
          ) : <Navigate to="/" />
        } />
        
        <Route path="/results/:id" element={
          user ? (
            <ResultsPageWrapper onBack={() => navigate('/dashboard')} />
          ) : <Navigate to="/" />
        } />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
};

// Wrapper for ResultsPage to extract params
const ResultsPageWrapper: React.FC<{onBack: () => void}> = ({onBack}) => {
  const { id } = useParams();
  if (!id) return <Navigate to="/dashboard" />;
  return <ResultsPage id={id} onBack={onBack} />;
};

const App: React.FC = () => {
  return (
    <ErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-lg w-full border border-gray-200">
            <div className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h1 className="text-2xl font-bold text-textPrimary mb-2">Something went wrong</h1>
              <p className="text-textSecondary mb-6">
                An unexpected error occurred. Our team has been notified.
              </p>
              <details className="text-left mb-6 bg-gray-100 p-4 rounded border border-gray-300">
                <summary className="cursor-pointer font-medium text-textBody mb-2">
                  Error Details
                </summary>
                <pre className="text-sm text-error whitespace-pre-wrap overflow-auto">
                  {error?.toString()}
                </pre>
              </details>
              <div className="flex gap-3">
                <button
                  onClick={resetError}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition font-medium"
                >
                  Try Again
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="flex-1 px-4 py-2 bg-gray-100 border border-gray-300 text-textBody rounded-lg hover:bg-gray-200 transition font-medium"
                >
                  Go Home
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    >
      <HashRouter>
        <AppContent />
      </HashRouter>
    </ErrorBoundary>
  );
};

export default App;