import React, { useState, useEffect } from 'react';
import { getStoredUser, updateBrandingSettings } from '../services/mockBackend';
import { BrandingSettings } from '../types';
import { Palette, Upload, Globe, Mail, Save, Layout, Smartphone, Check } from 'lucide-react';

const BrandingSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<BrandingSettings>({
    primaryColor: '#6366F1',
    secondaryColor: '#EC4899',
    customDomain: '',
    emailFooter: '',
    logoUrl: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const user = getStoredUser();
    if (user?.branding) {
      setSettings(user.branding);
    }
  }, []);

  const handleChange = (field: keyof BrandingSettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    // Live preview of colors
    if (field === 'primaryColor') {
      document.documentElement.style.setProperty('--color-primary', value);
    }
    if (field === 'secondaryColor') {
      document.documentElement.style.setProperty('--color-secondary', value);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        handleChange('logoUrl', url);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    await updateBrandingSettings(settings);
    
    // Ensure CSS vars are set globally
    document.documentElement.style.setProperty('--color-primary', settings.primaryColor);
    document.documentElement.style.setProperty('--color-secondary', settings.secondaryColor);
    
    setIsSaving(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Palette className="h-6 w-6 text-primary" />
            Custom Branding
          </h1>
          <p className="text-gray-500">Customize the look and feel of your dashboard and reports.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg hover:opacity-90 transition font-medium shadow-sm disabled:opacity-50"
        >
          {savedSuccess ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {isSaving ? "Saving..." : savedSuccess ? "Saved!" : "Save Changes"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Settings Form */}
        <div className="space-y-8">
          
          {/* Visual Identity */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Layout className="h-5 w-5 text-gray-500" /> Visual Identity
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Logo</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50">
                    {settings.logoUrl ? (
                      <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-xs text-gray-400">No Logo</span>
                    )}
                  </div>
                  <label className="cursor-pointer bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Upload Image
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={settings.primaryColor}
                      onChange={(e) => handleChange('primaryColor', e.target.value)}
                      className="h-10 w-10 p-1 rounded border border-gray-300 cursor-pointer"
                    />
                    <input 
                      type="text" 
                      value={settings.primaryColor}
                      onChange={(e) => handleChange('primaryColor', e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary uppercase"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={settings.secondaryColor}
                      onChange={(e) => handleChange('secondaryColor', e.target.value)}
                      className="h-10 w-10 p-1 rounded border border-gray-300 cursor-pointer"
                    />
                    <input 
                      type="text" 
                      value={settings.secondaryColor}
                      onChange={(e) => handleChange('secondaryColor', e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary uppercase"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* White Labeling */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Globe className="h-5 w-5 text-gray-500" /> White-Labeling
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Custom Domain</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                    https://
                  </span>
                  <input 
                    type="text" 
                    value={settings.customDomain || ''}
                    onChange={(e) => handleChange('customDomain', e.target.value)}
                    placeholder="insights.yourcompany.com"
                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-r-lg border border-gray-300 focus:ring-primary focus:border-primary outline-none"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Requires CNAME configuration.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Footer Text</label>
                <textarea 
                  value={settings.emailFooter || ''}
                  onChange={(e) => handleChange('emailFooter', e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. Generated by Your Company for internal use only."
                ></textarea>
                <p className="text-xs text-gray-500 mt-1">Added to the bottom of PDF reports and newsletters.</p>
              </div>
            </div>
          </div>

        </div>

        {/* Live Preview */}
        <div className="space-y-6">
           <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-gray-500" /> Live Preview
           </h2>
           
           <div className="bg-gray-100 p-8 rounded-xl border border-gray-200 flex justify-center">
              {/* Mock Dashboard Card */}
              <div className="bg-white rounded-xl shadow-lg w-full max-w-sm overflow-hidden transform transition hover:scale-[1.02]">
                 <div 
                   className="h-32 flex items-center justify-center"
                   style={{ background: `linear-gradient(135deg, ${settings.primaryColor} 0%, ${settings.secondaryColor} 100%)` }}
                 >
                    {settings.logoUrl ? (
                      <img src={settings.logoUrl} alt="Logo" className="h-16 w-auto object-contain bg-white/20 p-2 rounded-lg backdrop-blur-sm" />
                    ) : (
                      <div className="text-white font-bold text-2xl opacity-50">Your Logo</div>
                    )}
                 </div>
                 
                 <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                       <span className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: settings.primaryColor }}>A</span>
                       <div>
                          <div className="text-sm font-bold text-gray-900">Analysis Ready</div>
                          <div className="text-xs text-gray-500">Just now</div>
                       </div>
                    </div>
                    
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Q3 Marketing Trends</h3>
                    <p className="text-sm text-gray-600 mb-4">
                       Here are the key takeaways from your latest upload. The sentiment is predominantly positive.
                    </p>
                    
                    <button 
                      className="w-full py-2 rounded-lg text-white font-medium text-sm transition"
                      style={{ backgroundColor: settings.primaryColor }}
                    >
                       View Report
                    </button>
                 </div>
                 
                 {settings.emailFooter && (
                    <div className="bg-gray-50 p-3 text-[10px] text-center text-gray-400 border-t border-gray-100">
                       {settings.emailFooter}
                    </div>
                 )}
              </div>
           </div>

           <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="text-sm font-bold text-yellow-800 mb-1">Note on White-Labeling</h4>
              <p className="text-xs text-yellow-700">
                 Custom branding applies to your dashboard, all generated PDF reports, and the shared view for clients. 
                 Color changes are applied immediately across the application.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default BrandingSettingsPage;