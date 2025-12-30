import React, { useState, useEffect } from 'react';
import { getApiKeys, generateApiKey, revokeApiKey, getWebhooks, addWebhook, deleteWebhook, testWebhook } from '../services/mockBackend';
import { ApiKey, Webhook } from '../types';
import { Terminal, Webhook as WebhookIcon, Zap, FileJson, Plus, Copy, Trash2, Check, RefreshCw, AlertCircle, Play } from 'lucide-react';

const DeveloperSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'api' | 'webhooks' | 'zapier' | 'docs'>('api');
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  
  // Webhook form
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [webhookEvents, setWebhookEvents] = useState<string[]>(['analysis.completed']);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const keys = await getApiKeys();
    const hooks = await getWebhooks();
    setApiKeys(keys);
    setWebhooks(hooks);
  };

  const handleCreateKey = async () => {
    if (!newKeyName) return;
    const key = await generateApiKey(newKeyName);
    setGeneratedKey(key.key);
    setNewKeyName('');
    loadData();
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRevokeKey = async (id: string) => {
    if (window.confirm("Are you sure you want to revoke this API key? This cannot be undone.")) {
      await revokeApiKey(id);
      loadData();
    }
  };

  const handleAddWebhook = async () => {
    if (!newWebhookUrl) return;
    await addWebhook(newWebhookUrl, webhookEvents);
    setNewWebhookUrl('');
    setShowWebhookModal(false);
    loadData();
  };

  const handleTestWebhook = async (id: string) => {
    setTestingWebhookId(id);
    await testWebhook(id);
    setTestingWebhookId(null);
    loadData();
  };

  const handleDeleteWebhook = async (id: string) => {
    if (window.confirm("Delete this webhook?")) {
      await deleteWebhook(id);
      loadData();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Terminal className="h-6 w-6 text-primary" />
            Developer Settings
          </h1>
          <p className="text-gray-500">Manage API access, webhooks, and integrations.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-8 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('api')}
          className={`px-6 py-4 text-sm font-medium transition whitespace-nowrap border-b-2 flex items-center gap-2 ${activeTab === 'api' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Terminal className="h-4 w-4" /> API Keys
        </button>
        <button 
          onClick={() => setActiveTab('webhooks')}
          className={`px-6 py-4 text-sm font-medium transition whitespace-nowrap border-b-2 flex items-center gap-2 ${activeTab === 'webhooks' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <WebhookIcon className="h-4 w-4" /> Webhooks
        </button>
        <button 
          onClick={() => setActiveTab('zapier')}
          className={`px-6 py-4 text-sm font-medium transition whitespace-nowrap border-b-2 flex items-center gap-2 ${activeTab === 'zapier' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Zap className="h-4 w-4" /> Zapier
        </button>
        <button 
          onClick={() => setActiveTab('docs')}
          className={`px-6 py-4 text-sm font-medium transition whitespace-nowrap border-b-2 flex items-center gap-2 ${activeTab === 'docs' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <FileJson className="h-4 w-4" /> Documentation
        </button>
      </div>

      {/* API Keys Content */}
      {activeTab === 'api' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-900">Your API Keys</h2>
              <button 
                onClick={() => setShowKeyModal(true)}
                className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition flex items-center gap-2 text-sm"
              >
                <Plus className="h-4 w-4" /> Generate New Key
              </button>
            </div>

            {apiKeys.length === 0 ? (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                No API keys generated yet. Create one to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Key Prefix</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {apiKeys.map(key => (
                      <tr key={key.id}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{key.name}</td>
                        <td className="px-6 py-4 text-sm font-mono text-gray-500">{key.key.substring(0, 12)}...</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{new Date(key.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleRevokeKey(key.id)}
                            className="text-red-500 hover:text-red-700 text-sm font-medium"
                          >
                            Revoke
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Webhooks Content */}
      {activeTab === 'webhooks' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-900">Webhook Endpoints</h2>
              <button 
                onClick={() => setShowWebhookModal(true)}
                className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition flex items-center gap-2 text-sm"
              >
                <Plus className="h-4 w-4" /> Add Endpoint
              </button>
            </div>

            {webhooks.length === 0 ? (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                No webhooks configured. Add one to receive real-time updates.
              </div>
            ) : (
              <div className="space-y-4">
                {webhooks.map(hook => (
                  <div key={hook.id} className="border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-mono font-medium text-gray-900">{hook.url}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                          hook.status === 'Healthy' ? 'bg-green-100 text-green-700' :
                          hook.status === 'Failing' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {hook.status}
                        </span>
                      </div>
                      <div className="flex gap-2 text-xs text-gray-500">
                        {hook.events.map(e => <span key={e} className="bg-gray-100 px-1.5 rounded">{e}</span>)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => handleTestWebhook(hook.id)}
                        disabled={testingWebhookId === hook.id}
                        className="text-gray-600 hover:text-primary flex items-center gap-1 text-sm font-medium disabled:opacity-50"
                      >
                        {testingWebhookId === hook.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                        Test
                      </button>
                      <button 
                        onClick={() => handleDeleteWebhook(hook.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Zapier Content */}
      {activeTab === 'zapier' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
           <div className="bg-gradient-to-r from-[#FF4F00] to-[#FF8C00] p-8 text-white">
              <div className="flex items-center gap-4 mb-4">
                 <div className="bg-white p-2 rounded-lg">
                    <Zap className="h-8 w-8 text-[#FF4F00]" />
                 </div>
                 <h2 className="text-2xl font-bold">Podcast Insight + Zapier</h2>
              </div>
              <p className="max-w-xl text-orange-50 mb-6">
                 Connect Podcast Insight to 5,000+ apps without writing a single line of code. Automatically send new insights to Slack, Notion, Google Sheets, and more.
              </p>
              <button className="bg-white text-[#FF4F00] px-6 py-3 rounded-lg font-bold hover:bg-orange-50 transition shadow-lg">
                 Connect Zapier
              </button>
           </div>
           
           <div className="p-8">
              <h3 className="font-bold text-gray-900 mb-6">Popular Automations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="border border-gray-200 p-4 rounded-lg flex items-center gap-4 hover:bg-gray-50 cursor-pointer transition">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg" className="h-8 w-8" alt="Slack" />
                    <div>
                       <p className="font-bold text-gray-900 text-sm">Send analysis to Slack channel</p>
                       <p className="text-xs text-gray-500">Instant notification when ready</p>
                    </div>
                 </div>
                 <div className="border border-gray-200 p-4 rounded-lg flex items-center gap-4 hover:bg-gray-50 cursor-pointer transition">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/e/e9/Notion-logo.svg" className="h-8 w-8" alt="Notion" />
                    <div>
                       <p className="font-bold text-gray-900 text-sm">Create database item in Notion</p>
                       <p className="text-xs text-gray-500">Save summaries automatically</p>
                    </div>
                 </div>
                 <div className="border border-gray-200 p-4 rounded-lg flex items-center gap-4 hover:bg-gray-50 cursor-pointer transition">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png" className="h-8 w-8" alt="Instagram" />
                    <div>
                       <p className="font-bold text-gray-900 text-sm">Draft post for Instagram</p>
                       <p className="text-xs text-gray-500">Using generated social clips</p>
                    </div>
                 </div>
                 <div className="border border-gray-200 p-4 rounded-lg flex items-center gap-4 hover:bg-gray-50 cursor-pointer transition">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/3/34/Microsoft_Office_Excel_%282019%E2%80%93present%29.svg" className="h-8 w-8" alt="Excel" />
                    <div>
                       <p className="font-bold text-gray-900 text-sm">Add row to Excel / Sheets</p>
                       <p className="text-xs text-gray-500">Log episode stats</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Docs Content */}
      {activeTab === 'docs' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
           <h2 className="text-xl font-bold text-gray-900 mb-6">API Documentation</h2>
           
           <div className="space-y-8">
              <div>
                 <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">Base URL</h3>
                 <code className="bg-gray-800 text-green-400 px-4 py-2 rounded-lg block">https://api.podcastinsight.com/v1</code>
              </div>

              <div>
                 <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">Authentication</h3>
                 <p className="text-gray-600 mb-2">Include your API key in the header of requests:</p>
                 <code className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg block border border-gray-200">
                    Authorization: Bearer {'<YOUR_API_KEY>'}
                 </code>
              </div>

              <div>
                 <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">Endpoints</h3>
                 
                 <div className="space-y-4">
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                       <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center gap-3">
                          <span className="bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded text-xs">GET</span>
                          <span className="font-mono text-sm">/transcripts</span>
                       </div>
                       <div className="p-4 text-sm text-gray-600">List all processed transcripts.</div>
                    </div>

                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                       <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center gap-3">
                          <span className="bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded text-xs">POST</span>
                          <span className="font-mono text-sm">/transcripts/analyze</span>
                       </div>
                       <div className="p-4 text-sm text-gray-600">Submit a new text or file for analysis.</div>
                    </div>

                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                       <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center gap-3">
                          <span className="bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded text-xs">GET</span>
                          <span className="font-mono text-sm">/transcripts/{'{id}'}</span>
                       </div>
                       <div className="p-4 text-sm text-gray-600">Retrieve results for a specific transcript.</div>
                    </div>
                 </div>
              </div>
              
              <div className="pt-4">
                 <a href="#" className="text-primary hover:underline font-medium flex items-center gap-1">
                    View Full API Reference <ArrowRight className="h-4 w-4" />
                 </a>
              </div>
           </div>
        </div>
      )}

      {/* Generate Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              {generatedKey ? (
                 <div className="text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                       <Check className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">API Key Generated</h3>
                    <p className="text-sm text-gray-500 mb-4">Copy this key now. You won't be able to see it again.</p>
                    
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center gap-2 mb-6">
                       <code className="flex-1 font-mono text-sm break-all text-left">{generatedKey}</code>
                       <button 
                          onClick={() => handleCopy(generatedKey, 'new-key')}
                          className="text-gray-500 hover:text-primary"
                       >
                          {copiedId === 'new-key' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                       </button>
                    </div>

                    <button 
                       onClick={() => { setShowKeyModal(false); setGeneratedKey(null); }}
                       className="w-full bg-primary text-white py-2 rounded-lg font-medium hover:bg-indigo-700"
                    >
                       Done
                    </button>
                 </div>
              ) : (
                 <>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Create New API Key</h3>
                    <div className="mb-6">
                       <label className="block text-sm font-medium text-gray-700 mb-1">Key Name</label>
                       <input 
                          type="text" 
                          placeholder="e.g. Zapier Integration"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                       />
                    </div>
                    <div className="flex justify-end gap-3">
                       <button 
                          onClick={() => setShowKeyModal(false)}
                          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                       >
                          Cancel
                       </button>
                       <button 
                          onClick={handleCreateKey}
                          disabled={!newKeyName}
                          className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
                       >
                          Create Key
                       </button>
                    </div>
                 </>
              )}
           </div>
        </div>
      )}

      {/* Add Webhook Modal */}
      {showWebhookModal && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
               <h3 className="text-lg font-bold text-gray-900 mb-4">Add Webhook Endpoint</h3>
               
               <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint URL</label>
                  <input 
                     type="url" 
                     placeholder="https://api.yoursite.com/webhooks"
                     className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                     value={newWebhookUrl}
                     onChange={(e) => setNewWebhookUrl(e.target.value)}
                  />
               </div>

               <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Events to send</label>
                  <div className="space-y-2">
                     <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input type="checkbox" checked disabled className="text-primary rounded" />
                        analysis.completed
                     </label>
                     <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input type="checkbox" className="text-primary rounded" />
                        analysis.failed
                     </label>
                  </div>
               </div>

               <div className="flex justify-end gap-3">
                  <button 
                     onClick={() => setShowWebhookModal(false)}
                     className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                  >
                     Cancel
                  </button>
                  <button 
                     onClick={handleAddWebhook}
                     disabled={!newWebhookUrl}
                     className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
                  >
                     Add Endpoint
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

// Helper Icon
const ArrowRight: React.FC<{className?: string}> = ({className}) => (
   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
);

export default DeveloperSettings;