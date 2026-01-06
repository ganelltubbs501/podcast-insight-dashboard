import React from 'react';
import { Mic, Zap, FileText, Share2, CheckCircle } from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  return (
    <div className="min-h-screen bg-bgLight">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Mic className="h-8 w-8 text-primary" />
              <span className="ml-2 text-xl font-bold text-gray-900">Podcast Insight</span>
            </div>
            <div className="flex items-center space-x-4">
              <button onClick={onLogin} className="text-gray-600 hover:text-gray-900 font-medium">Log in</button>
              <button onClick={onLogin} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary transition font-medium">
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden pt-16 pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight mb-8 leading-tight">
              Turn Podcast Transcripts into <span className="text-primary">Viral Content</span>
            </h1>
            <p className="text-xl text-gray-600 mb-10">
              Automatically generate summaries, quotes, social media clips, and blog posts from your episodes in seconds using advanced AI.
            </p>
            <div className="flex justify-center gap-4">
              <button onClick={onLogin} className="px-8 py-4 bg-primary text-white rounded-xl text-lg font-bold shadow-lg hover:bg-primary hover:-translate-y-1 transition transform">
                Start for Free
              </button>
              <a href="#features" className="px-8 py-4 bg-white text-gray-700 border border-gray-200 rounded-xl text-lg font-bold shadow-sm hover:bg-gray-50 transition">
                See How It Works
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-primary font-semibold tracking-wide uppercase">Features</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to grow your audience
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-lg transition">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Instant Summaries</h3>
              <p className="text-gray-600">Get the key takeaways and highlights from an hour-long episode in seconds.</p>
            </div>
            
            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-lg transition">
              <div className="w-12 h-12 bg-accent-soft rounded-lg flex items-center justify-center mb-4">
                <Share2 className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Social Clips</h3>
              <p className="text-gray-600">Perfectly formatted tweets, LinkedIn posts, and captions ready to copy & paste.</p>
            </div>

            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-lg transition">
              <div className="w-12 h-12 bg-accent-soft rounded-lg flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-accent-violet" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">SEO Blog Posts</h3>
              <p className="text-gray-600">Turn audio into searchable text content with structured blog outlines.</p>
            </div>

            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-lg transition">
               <div className="w-12 h-12 bg-accent-soft rounded-lg flex items-center justify-center mb-4">
                <Mic className="h-6 w-6 text-accent-violet" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Speaker Identification</h3>
              <p className="text-gray-600">Automatically highlight key contributions from each speaker.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="py-24 bg-bgLight">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-gray-900">Simple, Transparent Pricing</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
             {/* Free Tier */}
             <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
               <h3 className="text-xl font-bold text-gray-900">Free</h3>
               <p className="text-4xl font-extrabold text-gray-900 mt-4">$0<span className="text-base font-normal text-gray-500">/mo</span></p>
               <ul className="mt-6 space-y-4">
                 <li className="flex items-center text-gray-600"><CheckCircle className="h-5 w-5 text-green-500 mr-2"/> 3 Transcripts / mo</li>
                 <li className="flex items-center text-gray-600"><CheckCircle className="h-5 w-5 text-green-500 mr-2"/> Basic Summaries</li>
               </ul>
               <button onClick={onLogin} className="mt-8 w-full py-3 bg-gray-100 text-gray-900 font-bold rounded-lg hover:bg-gray-200 transition">Get Started</button>
             </div>
             
             {/* Pro Tier */}
             <div className="bg-white p-8 rounded-2xl shadow-xl border-2 border-primary relative transform md:-translate-y-4">
               <div className="absolute top-0 right-0 bg-primary text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">POPULAR</div>
               <h3 className="text-xl font-bold text-gray-900">Pro Creator</h3>
               <p className="text-4xl font-extrabold text-gray-900 mt-4">$29<span className="text-base font-normal text-gray-500">/mo</span></p>
               <ul className="mt-6 space-y-4">
                 <li className="flex items-center text-gray-600"><CheckCircle className="h-5 w-5 text-primary mr-2"/> 50 Transcripts / mo</li>
                 <li className="flex items-center text-gray-600"><CheckCircle className="h-5 w-5 text-primary mr-2"/> All AI Features</li>
                 <li className="flex items-center text-gray-600"><CheckCircle className="h-5 w-5 text-primary mr-2"/> Blog Generation</li>
               </ul>
               <button onClick={onLogin} className="mt-8 w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary transition">Start Free Trial</button>
             </div>

             {/* Business Tier */}
             <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
               <h3 className="text-xl font-bold text-gray-900">Business</h3>
               <p className="text-4xl font-extrabold text-gray-900 mt-4">$79<span className="text-base font-normal text-gray-500">/mo</span></p>
               <ul className="mt-6 space-y-4">
                 <li className="flex items-center text-gray-600"><CheckCircle className="h-5 w-5 text-green-500 mr-2"/> Unlimited Transcripts</li>
                 <li className="flex items-center text-gray-600"><CheckCircle className="h-5 w-5 text-green-500 mr-2"/> Priority Support</li>
               </ul>
               <button onClick={onLogin} className="mt-8 w-full py-3 bg-gray-100 text-gray-900 font-bold rounded-lg hover:bg-gray-200 transition">Contact Sales</button>
             </div>
          </div>
        </div>
      </div>
      
      <footer className="bg-gray-900 py-12 text-center">
        <p className="text-gray-400">© 2024 Podcast Insight Dashboard. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;