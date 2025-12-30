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
import BrandingSettingsPage from './pages/BrandingSettings';
import DeveloperSettings from './pages/DeveloperSettings';
import HelpPanel from './components/HelpPanel';
import LiveChatWidget from './components/LiveChatWidget';
import { getStoredUser, loginUser, logoutUser } from './services/auth';
import { User } from './types';
import { LogOut, LayoutDashboard, BarChart3, Users, Calendar, UserPlus, Menu, X, Plus, PieChart, Palette, Terminal, CircleHelp } from 'lucide-react';

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
      // Apply branding if exists
      if ((storedUser as any).branding) {
        document.documentElement.style.setProperty('--color-primary', (storedUser as any).branding.primaryColor);
        document.documentElement.style.setProperty('--color-secondary', (storedUser as any).branding.secondaryColor);
      }
    }
    setLoading(false);
  })();
}, []);


  const handleLogin = async () => {
    // Simulate login flow
const newUser = await loginUser('test@test.com', 'Kaleb2022!');
    setUser(newUser);
    // Apply branding on login if exists
    if (newUser.branding) {
      document.documentElement.style.setProperty('--color-primary', newUser.branding.primaryColor);
      document.documentElement.style.setProperty('--color-secondary', newUser.branding.secondaryColor);
    }
    navigate('/dashboard');
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    // Reset branding to default
    document.documentElement.style.setProperty('--color-primary', '#6366F1');
    document.documentElement.style.setProperty('--color-secondary', '#EC4899');
    navigate('/');
    setMobileMenuOpen(false);
  };

  const handleNav = (path: string) => {
      navigate(path);
      setMobileMenuOpen(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50">Loading...</div>;

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-bgLight">
      {/* Navbar */}
      {user && (
        <nav className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex justify-between items-center sticky top-0 z-50 shadow-sm md:shadow-none">
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => setMobileMenuOpen(true)}
                    className="md:hidden text-gray-600 p-1 hover:bg-gray-100 rounded-lg"
                >
                    <Menu className="h-6 w-6" />
                </button>
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
                    {user.branding?.logoUrl ? (
                        <img src={user.branding.logoUrl} alt="Logo" className="h-8 w-auto object-contain" />
                    ) : (
                        <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-lg">PI</div>
                    )}
                    <span className="font-bold text-gray-900 text-lg hidden sm:block">Podcast Insight</span>
                </div>
                
                {/* Desktop Menu */}
                <div className="hidden md:flex space-x-1 ml-4">
                    <button 
                      onClick={() => navigate('/dashboard')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${isActive('/dashboard') ? 'bg-indigo-50 text-primary' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </button>
                    <button 
                      onClick={() => navigate('/analytics')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${isActive('/analytics') ? 'bg-indigo-50 text-primary' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <BarChart3 className="h-4 w-4" /> Insights
                    </button>
                    <button 
                      onClick={() => navigate('/calendar')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${isActive('/calendar') ? 'bg-indigo-50 text-primary' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Calendar className="h-4 w-4" /> Calendar
                    </button>
                    <button 
                      onClick={() => navigate('/outreach')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${isActive('/outreach') ? 'bg-indigo-50 text-primary' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <UserPlus className="h-4 w-4" /> Outreach
                    </button>
                    <button 
                      onClick={() => navigate('/team')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${isActive('/team') ? 'bg-indigo-50 text-primary' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Users className="h-4 w-4" /> Team
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-4">
                 <button 
                   onClick={() => navigate('/analysis')}
                   className="md:hidden bg-primary text-white p-2 rounded-full shadow-lg"
                 >
                   <Plus className="h-5 w-5" />
                 </button>
                 <span className="text-sm text-gray-600 hidden sm:block">Welcome, {user.name}</span>
                 <button
                   onClick={() => navigate('/developer')}
                   className={`transition hidden md:block ${isActive('/developer') ? 'text-primary' : 'text-gray-500 hover:text-primary'}`}
                   title="Developer Settings"
                 >
                   <Terminal className="h-5 w-5" />
                 </button>
                 <button
                   onClick={() => navigate('/branding')}
                   className={`transition hidden md:block ${isActive('/branding') ? 'text-primary' : 'text-gray-500 hover:text-primary'}`}
                   title="Branding Settings"
                 >
                   <Palette className="h-5 w-5" />
                 </button>
                 
                 {/* Help Button */}
                 <button
                   onClick={() => setHelpPanelOpen(true)}
                   className="text-gray-500 hover:text-primary transition"
                   title="Help & Support"
                 >
                   <CircleHelp className="h-5 w-5" />
                 </button>

                 <button 
                   onClick={handleLogout}
                   className="text-gray-500 hover:text-red-500 transition hidden md:block"
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
              <div className="relative bg-white w-64 max-w-[80%] h-full shadow-2xl flex flex-col p-4 animate-in slide-in-from-left duration-200">
                  <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">PI</div>
                        <span className="font-bold text-gray-900">Podcast Insight</span>
                      </div>
                      <button onClick={() => setMobileMenuOpen(false)} className="text-gray-500"><X className="h-6 w-6" /></button>
                  </div>
                  
                  <div className="flex-1 space-y-2">
                     <button onClick={() => handleNav('/dashboard')} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 ${isActive('/dashboard') ? 'bg-indigo-50 text-primary' : 'text-gray-600'}`}>
                         <LayoutDashboard className="h-5 w-5" /> Dashboard
                     </button>
                     <button onClick={() => handleNav('/analytics')} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 ${isActive('/analytics') ? 'bg-indigo-50 text-primary' : 'text-gray-600'}`}>
                         <BarChart3 className="h-5 w-5" /> Insights
                     </button>
                     <button onClick={() => handleNav('/usage')} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 ${isActive('/usage') ? 'bg-indigo-50 text-primary' : 'text-gray-600'}`}>
                         <PieChart className="h-5 w-5" /> Usage & ROI
                     </button>
                     <button onClick={() => handleNav('/calendar')} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 ${isActive('/calendar') ? 'bg-indigo-50 text-primary' : 'text-gray-600'}`}>
                         <Calendar className="h-5 w-5" /> Calendar
                     </button>
                     <button onClick={() => handleNav('/outreach')} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 ${isActive('/outreach') ? 'bg-indigo-50 text-primary' : 'text-gray-600'}`}>
                         <UserPlus className="h-5 w-5" /> Outreach
                     </button>
                     <button onClick={() => handleNav('/team')} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 ${isActive('/team') ? 'bg-indigo-50 text-primary' : 'text-gray-600'}`}>
                         <Users className="h-5 w-5" /> Team Workspace
                     </button>
                     <button onClick={() => handleNav('/branding')} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 ${isActive('/branding') ? 'bg-indigo-50 text-primary' : 'text-gray-600'}`}>
                         <Palette className="h-5 w-5" /> Branding
                     </button>
                     <button onClick={() => handleNav('/developer')} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 ${isActive('/developer') ? 'bg-indigo-50 text-primary' : 'text-gray-600'}`}>
                         <Terminal className="h-5 w-5" /> Developer
                     </button>
                     <button onClick={() => { setHelpPanelOpen(true); setMobileMenuOpen(false); }} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 text-gray-600`}>
                         <CircleHelp className="h-5 w-5" /> Help & Support
                     </button>
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                      <div className="flex items-center gap-3 px-4 py-2 mb-2">
                          <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold">
                              {user.name.charAt(0)}
                          </div>
                          <div className="overflow-hidden">
                              <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
                              <p className="text-xs text-gray-500 truncate">{user.email}</p>
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

        <Route path="/branding" element={
          user ? <BrandingSettingsPage /> : <Navigate to="/" />
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
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
};

export default App;