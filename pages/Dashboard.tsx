import React, { useEffect, useState } from 'react';
import { Plus, Clock, FileText, ChevronRight, Trash2, ExternalLink, Archive, AlertTriangle, Zap, Check } from 'lucide-react';
import { Transcript, UsageMetrics } from '../types';
import { getTranscripts, deleteTranscript, getUsageMetrics } from '../services/mockBackend';
import { bulkExportZIP } from '../services/downloadService';
import { useNavigate } from 'react-router-dom';

interface DashboardProps {
  onNewAnalysis: () => void;
  onViewResults: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNewAnalysis, onViewResults }) => {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [metrics, setMetrics] = useState<UsageMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const tData = await getTranscripts();
    const mData = await getUsageMetrics();
    setTranscripts(tData);
    setMetrics(mData);
    setLoading(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this transcript?")) {
      await deleteTranscript(id);
      loadData();
    }
  };

  const handleBulkExport = async () => {
      if (transcripts.length === 0) return;
      if (window.confirm(`Download ZIP archive of ${transcripts.length} transcripts?`)) {
          setIsExporting(true);
          await bulkExportZIP(transcripts);
          setIsExporting(false);
      }
  };

  const usagePercent = metrics ? Math.round((metrics.transcriptsUsed / metrics.transcriptQuota) * 100) : 0;
  const isNearLimit = usagePercent >= 80;
  const remaining = metrics ? metrics.transcriptQuota - metrics.transcriptsUsed : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage your podcast transcripts and insights.</p>
        </div>
        <div className="flex gap-3">
            {transcripts.length > 0 && (
                <button 
                    onClick={handleBulkExport}
                    disabled={isExporting}
                    className="flex items-center gap-2 bg-white text-gray-700 border border-gray-300 px-4 py-2.5 rounded-lg hover:bg-gray-50 transition font-medium shadow-sm disabled:opacity-50"
                >
                    <Archive className="h-5 w-5" />
                    {isExporting ? "Zipping..." : "Bulk Export"}
                </button>
            )}
            <button 
              onClick={onNewAnalysis}
              className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition font-medium shadow-sm"
            >
              <Plus className="h-5 w-5" />
              New Analysis
            </button>
        </div>
      </div>

      {/* Usage & Quota Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        
        {/* Usage Gauge Card */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between relative overflow-hidden">
           <div className="z-10">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Monthly Usage</h3>
              <p className="text-3xl font-bold text-gray-900">
                 {metrics?.transcriptsUsed || 0} <span className="text-lg text-gray-400 font-normal">/ {metrics?.transcriptQuota || 0}</span>
              </p>
              <p className={`text-xs font-medium mt-2 ${isNearLimit ? 'text-red-500' : 'text-green-600'}`}>
                 {remaining} transcripts remaining
              </p>
              <p className="text-[10px] text-gray-400 mt-1">Resets on {metrics?.quotaResetDate}</p>
           </div>
           
           <div className="relative w-20 h-20">
              <svg className="w-full h-full transform -rotate-90">
                 <circle cx="40" cy="40" r="36" stroke="#f3f4f6" strokeWidth="8" fill="transparent" />
                 <circle 
                    cx="40" cy="40" r="36" 
                    stroke={isNearLimit ? '#EF4444' : '#6366F1'} 
                    strokeWidth="8" 
                    fill="transparent" 
                    strokeDasharray={226} 
                    strokeDashoffset={226 - (226 * usagePercent / 100)} 
                    strokeLinecap="round"
                 />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center font-bold text-sm text-gray-700">
                 {usagePercent}%
              </div>
           </div>
        </div>

        {/* Upgrade / Plan Status */}
        {isNearLimit ? (
           <div className="bg-gradient-to-br from-indigo-900 to-purple-900 p-6 rounded-xl border border-indigo-700 shadow-sm text-white flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>
              <div className="z-10">
                 <div className="flex items-center gap-2 mb-2 text-yellow-300 font-bold uppercase text-xs tracking-wider">
                    <AlertTriangle className="h-4 w-4" /> Running Low
                 </div>
                 <h3 className="text-lg font-bold">Unlock Unlimited</h3>
                 <p className="text-indigo-200 text-sm mt-1">You've used over 80% of your quota. Avoid overage charges ($5/transcript).</p>
              </div>
              <button 
                 onClick={() => navigate('/usage')}
                 className="mt-4 w-full py-2 bg-white text-indigo-900 font-bold rounded-lg hover:bg-indigo-50 transition text-sm flex items-center justify-center gap-2"
              >
                 <Zap className="h-4 w-4 text-yellow-500" /> Upgrade Plan
              </button>
           </div>
        ) : (
           <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 shadow-sm flex flex-col justify-between">
              <div>
                 <h3 className="text-sm font-medium text-indigo-800 mb-1">Current Plan</h3>
                 <p className="text-2xl font-bold text-indigo-900">Pro Creator</p>
                 <p className="text-xs text-indigo-600 mt-2">Includes Blog Generation, Social Clips, and Priority Support.</p>
              </div>
              <button 
                 onClick={() => navigate('/usage')}
                 className="mt-4 text-indigo-700 text-sm font-medium hover:text-indigo-900 flex items-center gap-1"
              >
                 View Plan Details <ChevronRight className="h-4 w-4" />
              </button>
           </div>
        )}

        {/* Quick Action */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center items-center text-center">
           <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-3">
              <Clock className="h-6 w-6 text-green-600" />
           </div>
           <h3 className="text-gray-900 font-bold">Time Saved</h3>
           <p className="text-2xl font-bold text-green-600 mt-1">{metrics?.hoursSaved || 0}h</p>
           <p className="text-xs text-gray-500 mt-1">This month alone</p>
        </div>

      </div>

      {/* Transcripts List */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="font-semibold text-gray-800">Recent Analyses</h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading...</div>
        ) : transcripts.length === 0 ? (
          <div className="p-16 text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No transcripts yet</h3>
            <p className="text-gray-500 mb-6">Upload your first transcript to get started.</p>
            <button 
              onClick={onNewAnalysis}
              className="text-primary font-medium hover:text-indigo-700"
            >
              Create New Analysis
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {transcripts.map((transcript) => (
              <li 
                key={transcript.id} 
                className="hover:bg-gray-50 transition cursor-pointer"
                onClick={() => onViewResults(transcript.id)}
              >
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center min-w-0 flex-1">
                    <div className="flex-shrink-0 bg-indigo-50 p-2 rounded-lg">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div className="ml-4 min-w-0 flex-1 pr-4">
                      <p className="text-sm font-medium text-primary truncate">{transcript.title || "Untitled Episode"}</p>
                      <div className="flex items-center mt-1 text-xs text-gray-500 space-x-4">
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(transcript.date).toLocaleDateString()}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          transcript.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {transcript.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={(e) => handleDelete(e, transcript.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition"
                      title="Delete"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                    <ChevronRight className="h-5 w-5 text-gray-300" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Dashboard;