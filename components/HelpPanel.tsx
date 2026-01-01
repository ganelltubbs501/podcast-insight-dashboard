import React, { useState, useEffect } from 'react';
import { X, Search, BookOpen, PlayCircle, MessageCircle, ChevronDown, ChevronRight, Mail, ExternalLink, Send, Check } from 'lucide-react';
import { getHelpArticles, getTutorials, sendSupportTicket } from '../services/backend';
import { HelpArticle, Tutorial } from '../types';

interface HelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpPanel: React.FC<HelpPanelProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'knowledge' | 'tutorials' | 'support'>('knowledge');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);

  // Support Form
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    const a = await getHelpArticles();
    const t = await getTutorials();
    setArticles(a);
    setTutorials(t);
  };

  const handleSendTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportSubject || !supportMessage) return;
    
    setIsSending(true);
    await sendSupportTicket(supportSubject, supportMessage);
    setIsSending(false);
    setSentSuccess(true);
    
    // Reset after delay
    setTimeout(() => {
        setSentSuccess(false);
        setSupportSubject('');
        setSupportMessage('');
    }, 3000);
  };

  const filteredArticles = articles.filter(a => 
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div 
      className={`fixed inset-y-0 right-0 w-full sm:w-[450px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
    >
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
        <h2 className="text-xl font-bold text-gray-900">Help & Support</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-200 rounded-full transition">
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button 
          onClick={() => setActiveTab('knowledge')}
          className={`flex-1 py-3 text-sm font-medium transition flex items-center justify-center gap-2 ${activeTab === 'knowledge' ? 'text-primary border-b-2 border-primary bg-indigo-50/30' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
        >
          <BookOpen className="h-4 w-4" /> FAQ
        </button>
        <button 
          onClick={() => setActiveTab('tutorials')}
          className={`flex-1 py-3 text-sm font-medium transition flex items-center justify-center gap-2 ${activeTab === 'tutorials' ? 'text-primary border-b-2 border-primary bg-indigo-50/30' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
        >
          <PlayCircle className="h-4 w-4" /> Academy
        </button>
        <button 
          onClick={() => setActiveTab('support')}
          className={`flex-1 py-3 text-sm font-medium transition flex items-center justify-center gap-2 ${activeTab === 'support' ? 'text-primary border-b-2 border-primary bg-indigo-50/30' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
        >
          <MessageCircle className="h-4 w-4" /> Contact
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-white">
        
        {/* Knowledge Base Tab */}
        {activeTab === 'knowledge' && (
          <div className="space-y-6">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search articles..." 
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              {filteredArticles.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No articles found matching "{searchQuery}"</div>
              ) : (
                filteredArticles.map(article => (
                  <div key={article.id} className="border border-gray-200 rounded-lg overflow-hidden transition-all hover:border-indigo-100">
                    <button 
                      onClick={() => setExpandedArticleId(expandedArticleId === article.id ? null : article.id)}
                      className="w-full flex items-center justify-between p-4 text-left bg-white hover:bg-gray-50 transition"
                    >
                      <div>
                        <span className="text-xs font-bold text-primary bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wide mb-1 inline-block">{article.category}</span>
                        <h3 className="font-bold text-gray-800 text-sm">{article.title}</h3>
                      </div>
                      {expandedArticleId === article.id ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
                    </button>
                    {expandedArticleId === article.id && (
                      <div className="p-4 pt-0 text-sm text-gray-600 bg-white border-t border-gray-100 leading-relaxed">
                        {article.content}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            
            <div className="pt-6 border-t border-gray-100">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" /> Best Practices Guide
                </h4>
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-100">
                    <p className="text-sm text-gray-700 mb-2">Want to create viral-worthy content? Learn the secrets of top podcasters.</p>
                    <a href="#" className="text-sm font-bold text-primary hover:underline">Read the Full Guide &rarr;</a>
                </div>
            </div>
          </div>
        )}

        {/* Tutorials Tab */}
        {activeTab === 'tutorials' && (
          <div className="space-y-6">
            <p className="text-sm text-gray-500">Video guides to help you master the dashboard.</p>
            <div className="space-y-4">
              {tutorials.map(tutorial => (
                <div key={tutorial.id} className="group cursor-pointer">
                  <div className="relative rounded-xl overflow-hidden aspect-video bg-gray-100 mb-2 shadow-sm border border-gray-200">
                    <img src={tutorial.thumbnailUrl} alt={tutorial.title} className="w-full h-full object-cover transition transform group-hover:scale-105" />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition flex items-center justify-center">
                      <div className="bg-white/90 rounded-full p-3 shadow-lg transform group-hover:scale-110 transition">
                        <PlayCircle className="h-8 w-8 text-primary" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded font-medium">
                      {tutorial.duration}
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 group-hover:text-primary transition">{tutorial.title}</h3>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Support Tab */}
        {activeTab === 'support' && (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
               <h4 className="text-blue-900 font-bold flex items-center gap-2 mb-1">
                  <MessageCircle className="h-4 w-4" /> Live Chat
               </h4>
               <p className="text-xs text-blue-800">
                  Premium users get priority live support. Use the chat widget in the bottom right corner for instant help during business hours.
               </p>
            </div>

            <div>
               <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Mail className="h-5 w-5 text-gray-500" /> Email Support
               </h3>
               {sentSuccess ? (
                   <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                       <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                           <Check className="h-6 w-6 text-green-600" />
                       </div>
                       <h4 className="font-bold text-green-800 mb-2">Message Sent!</h4>
                       <p className="text-sm text-green-700">We'll get back to you within 24 hours.</p>
                   </div>
               ) : (
                   <form onSubmit={handleSendTicket} className="space-y-4">
                      <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                         <select 
                            className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                            value={supportSubject}
                            onChange={(e) => setSupportSubject(e.target.value)}
                            required
                         >
                            <option value="">Select a topic...</option>
                            <option value="Bug Report">Bug Report</option>
                            <option value="Feature Request">Feature Request</option>
                            <option value="Billing">Billing Inquiry</option>
                            <option value="Other">Other</option>
                         </select>
                      </div>
                      <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                         <textarea 
                            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary outline-none h-32"
                            placeholder="Describe your issue..."
                            value={supportMessage}
                            onChange={(e) => setSupportMessage(e.target.value)}
                            required
                         ></textarea>
                      </div>
                      <button 
                         type="submit" 
                         disabled={isSending}
                         className="w-full bg-primary text-white py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-70"
                      >
                         {isSending ? "Sending..." : <>Send Message <Send className="h-4 w-4" /></>}
                      </button>
                   </form>
               )}
            </div>

            <div className="pt-6 border-t border-gray-100">
               <h4 className="font-bold text-gray-900 mb-3">Community</h4>
               <a href="#" className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-gray-50 transition group">
                  <div>
                     <p className="font-bold text-gray-800 text-sm">Join our Discord</p>
                     <p className="text-xs text-gray-500">Connect with other creators</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-primary" />
               </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HelpPanel;