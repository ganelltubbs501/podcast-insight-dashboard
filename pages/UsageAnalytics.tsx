import React, { useEffect, useState } from 'react';
import { getUsageMetrics } from '../services/mockBackend';
import { downloadAnalyticsReport } from '../services/downloadService';
import { UsageMetrics } from '../types';
import { PieChart, Download, Clock, Zap, TrendingUp, BarChart2, DollarSign, RefreshCw, FileText, CheckCircle, XCircle } from 'lucide-react';

const UsageAnalytics: React.FC = () => {
  const [metrics, setMetrics] = useState<UsageMetrics | null>(null);
  const [hourlyRate, setHourlyRate] = useState(50);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await getUsageMetrics();
    setMetrics(data);
    setLoading(false);
  };

  const handleExport = () => {
      if(metrics) downloadAnalyticsReport(metrics);
  };

  if (loading || !metrics) return <div className="p-12 text-center text-gray-500">Loading analytics...</div>;

  const usagePercent = Math.round((metrics.transcriptsUsed / metrics.transcriptQuota) * 100);
  const estimatedSavings = metrics.hoursSaved * hourlyRate;
  const isNearLimit = usagePercent >= 80;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <PieChart className="h-6 w-6 text-primary" />
            Usage & ROI Analytics
          </h1>
          <p className="text-gray-500">Track your account usage and the value generated.</p>
        </div>
        <button 
          onClick={handleExport}
          className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition font-medium shadow-sm"
        >
          <Download className="h-4 w-4" />
          Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Usage Gauge */}
          <div className="lg:col-span-2 bg-white p-8 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center gap-8">
              <div className="relative w-48 h-48 flex-shrink-0">
                 <svg className="w-full h-full transform -rotate-90">
                    <circle cx="96" cy="96" r="88" stroke="#f3f4f6" strokeWidth="12" fill="transparent" />
                    <circle 
                        cx="96" cy="96" r="88" 
                        stroke={usagePercent > 90 ? '#EF4444' : '#6366F1'} 
                        strokeWidth="12" 
                        fill="transparent" 
                        strokeDasharray={552} 
                        strokeDashoffset={552 - (552 * usagePercent / 100)} 
                        strokeLinecap="round"
                    />
                 </svg>
                 <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-extrabold text-gray-900">{metrics.transcriptsUsed}</span>
                    <span className="text-gray-400 text-sm font-medium">of {metrics.transcriptQuota} Used</span>
                 </div>
              </div>
              <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Monthly Quota</h3>
                  <p className="text-gray-600 mb-2">
                      You have used <strong>{usagePercent}%</strong> of your transcript quota for {metrics.period}. 
                  </p>
                  <p className="text-sm text-gray-500 mb-6">Quota resets on <strong>{metrics.quotaResetDate}</strong>.</p>
                  
                  {isNearLimit && (
                      <div className="bg-red-50 border border-red-100 p-4 rounded-lg mb-6">
                          <p className="text-red-700 font-bold text-sm mb-1">Quota Warning</p>
                          <p className="text-red-600 text-xs">
                              You are approaching your limit. Overage charges are <strong>$5 per transcript</strong> beyond {metrics.transcriptQuota}.
                          </p>
                      </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="text-xs text-gray-500 uppercase font-bold mb-1">Words Processed</div>
                          <div className="text-xl font-bold text-gray-900">{(metrics.totalWordsProcessed / 1000).toFixed(1)}k</div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="text-xs text-gray-500 uppercase font-bold mb-1">Top Format</div>
                          <div className="text-xl font-bold text-gray-900">{metrics.topPerformingType}</div>
                      </div>
                  </div>
              </div>
          </div>

          {/* ROI Calculator */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-8 rounded-xl shadow-lg">
              <div className="flex items-center gap-2 mb-6">
                  <DollarSign className="h-6 w-6 text-yellow-300" />
                  <h3 className="text-lg font-bold">ROI Calculator</h3>
              </div>
              
              <div className="space-y-6">
                  <div>
                      <label className="block text-xs font-bold text-indigo-200 uppercase mb-2">Your Hourly Rate ($)</label>
                      <input 
                        type="number" 
                        value={hourlyRate} 
                        onChange={(e) => setHourlyRate(Number(e.target.value))}
                        className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder-indigo-300 outline-none focus:ring-2 focus:ring-white/50"
                      />
                  </div>

                  <div className="pt-4 border-t border-white/20">
                      <div className="flex justify-between items-end mb-2">
                          <span className="text-indigo-200 font-medium">Time Saved</span>
                          <span className="text-2xl font-bold">{metrics.hoursSaved} hrs</span>
                      </div>
                      <div className="flex justify-between items-end">
                          <span className="text-indigo-200 font-medium">Value Generated</span>
                          <span className="text-3xl font-bold text-yellow-300">${estimatedSavings.toLocaleString()}</span>
                      </div>
                  </div>
                  
                  <p className="text-xs text-indigo-200 mt-2 italic opacity-80">
                      *Based on estimated manual effort of ~3.5hrs per episode analysis & content creation.
                  </p>
              </div>
          </div>

          {/* Content Distribution */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
             <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                 <FileText className="h-5 w-5 text-gray-500" /> Content Generated
             </h3>
             <div className="space-y-4">
                 {metrics.contentGenerated.map((item, i) => (
                     <div key={i}>
                         <div className="flex justify-between text-sm mb-1">
                             <span className="text-gray-700 font-medium">{item.type}</span>
                             <span className="text-gray-500">{item.count}</span>
                         </div>
                         <div className="w-full bg-gray-100 rounded-full h-2">
                             <div 
                                className="bg-primary h-2 rounded-full" 
                                style={{ width: `${(item.count / Math.max(...metrics.contentGenerated.map(c => c.count))) * 100}%` }}
                             ></div>
                         </div>
                     </div>
                 ))}
             </div>
          </div>

          {/* Activity Trend */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
             <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                 <TrendingUp className="h-5 w-5 text-gray-500" /> Daily Activity
             </h3>
             <div className="h-48 flex items-end justify-between gap-2">
                 {metrics.dailyUsage.map((day, i) => (
                     <div key={i} className="flex flex-col items-center flex-1 group">
                         <div 
                            className="w-full bg-indigo-50 rounded-t-lg group-hover:bg-indigo-100 transition relative"
                            style={{ height: `${day.count > 0 ? (day.count / Math.max(...metrics.dailyUsage.map(d => d.count))) * 100 : 0}%` }}
                         >
                             <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                                 {day.count} uploads
                             </div>
                         </div>
                         <div className="text-xs text-gray-500 mt-2 font-medium">{day.date}</div>
                     </div>
                 ))}
             </div>
          </div>

          {/* Plan Comparison */}
          <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
             <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                 <Zap className="h-5 w-5 text-yellow-500" /> Plan Comparison
             </h3>
             <div className="space-y-4">
                 <div className="grid grid-cols-3 text-xs font-bold text-gray-500 uppercase border-b border-gray-100 pb-2">
                     <div>Feature</div>
                     <div className="text-center text-primary">Pro (You)</div>
                     <div className="text-center">Business</div>
                 </div>
                 
                 <div className="grid grid-cols-3 text-sm items-center py-2 border-b border-gray-50">
                     <div className="font-medium text-gray-700">Quota</div>
                     <div className="text-center font-bold text-primary">50 / mo</div>
                     <div className="text-center text-gray-600">Unlimited</div>
                 </div>
                 <div className="grid grid-cols-3 text-sm items-center py-2 border-b border-gray-50">
                     <div className="font-medium text-gray-700">Team Seats</div>
                     <div className="text-center font-bold text-primary">3</div>
                     <div className="text-center text-gray-600">10+</div>
                 </div>
                 <div className="grid grid-cols-3 text-sm items-center py-2 border-b border-gray-50">
                     <div className="font-medium text-gray-700">Support</div>
                     <div className="text-center font-bold text-primary">Standard</div>
                     <div className="text-center text-gray-600">Priority</div>
                 </div>
                 <div className="grid grid-cols-3 text-sm items-center py-2 border-b border-gray-50">
                     <div className="font-medium text-gray-700">Custom Brand</div>
                     <div className="text-center text-primary"><CheckCircle className="h-4 w-4 mx-auto"/></div>
                     <div className="text-center text-gray-600"><CheckCircle className="h-4 w-4 mx-auto"/></div>
                 </div>
                 <div className="grid grid-cols-3 text-sm items-center py-2 border-b border-gray-50">
                     <div className="font-medium text-gray-700">API Access</div>
                     <div className="text-center text-gray-300"><XCircle className="h-4 w-4 mx-auto"/></div>
                     <div className="text-center text-gray-600"><CheckCircle className="h-4 w-4 mx-auto"/></div>
                 </div>

                 <button className="w-full mt-4 bg-gray-900 text-white py-2 rounded-lg font-bold text-sm hover:bg-gray-800 transition">
                     Upgrade to Business ($79/mo)
                 </button>
             </div>
          </div>

      </div>
    </div>
  );
};

export default UsageAnalytics;