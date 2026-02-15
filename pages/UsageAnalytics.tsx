import React, { useEffect, useState } from 'react';
import { getUsageMetrics } from '../services/transcripts';
import { downloadAnalyticsReport } from '../services/downloadService';
import { UsageMetrics, User } from '../types';
import { PieChart, Download, Clock, Zap, TrendingUp, BarChart2, DollarSign, RefreshCw, FileText, CheckCircle, XCircle } from 'lucide-react';

interface UsageAnalyticsProps {
  user: User;
}

const PLAN_LABEL: Record<string, string> = {
  free: 'Free',
  beta: 'Beta',
  beta_grace: 'Beta (Grace)',
  starter: 'Starter',
  pro: 'Pro',
  growth: 'Growth',
};

const UsageAnalytics: React.FC<UsageAnalyticsProps> = ({ user }) => {
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

  if (loading || !metrics) return <div className="p-12 text-center text-textMuted">Loading analytics...</div>;

  const unlimited = metrics.isUnlimited ?? false;
  const usagePercent = unlimited ? 0 : Math.round((metrics.transcriptsUsed / metrics.transcriptQuota) * 100);
  const estimatedSavings = metrics.hoursSaved * hourlyRate;
  const isNearLimit = !unlimited && usagePercent >= 80;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary flex items-center gap-2">
            <PieChart className="h-6 w-6 text-primary" />
            Usage & ROI Analytics
          </h1>
          <p className="text-textMuted">Track your account usage and the value generated.</p>
        </div>
        <button 
          onClick={handleExport}
          className="flex items-center gap-2 bg-gray-100 border border-gray-300 text-textSecondary px-4 py-2 rounded-lg hover:bg-gray-100 transition font-medium shadow-sm"
        >
          <Download className="h-4 w-4" />
          Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Usage Gauge */}
          <div className="lg:col-span-2 bg-gray-100 p-8 rounded-xl border border-gray-300 shadow-sm flex flex-col md:flex-row items-center gap-8">
              <div className="relative w-48 h-48 shrink-0">
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
                    <span className="text-4xl font-extrabold text-textPrimary">{metrics.transcriptsUsed}</span>
                    <span className="text-textMuted text-sm font-medium">{unlimited ? 'Unlimited' : `of ${metrics.transcriptQuota} Used`}</span>
                 </div>
              </div>
              <div className="flex-1">
                  <h3 className="text-lg font-bold text-textPrimary mb-2">Monthly Quota</h3>
                  {unlimited ? (
                    <p className="text-textSecondary mb-2">
                      You've analyzed <strong>{metrics.transcriptsUsed}</strong> transcripts this cycle. Your plan has <strong>unlimited</strong> analyses.
                    </p>
                  ) : (
                    <p className="text-textSecondary mb-2">
                      You have used <strong>{usagePercent}%</strong> of your transcript quota for {metrics.period}.
                    </p>
                  )}
                  <p className="text-sm text-textMuted mb-6">Quota resets on <strong>{metrics.quotaResetDate}</strong>.</p>

                  {isNearLimit && (
                      <div className="bg-red-50 border border-red-100 p-4 rounded-lg mb-6">
                          <p className="text-red-700 font-bold text-sm mb-1">Quota Warning</p>
                          <p className="text-red-600 text-xs">
                              You are approaching your limit. Upgrade your plan to get more transcripts.
                          </p>
                      </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-100 p-3 rounded-lg">
                          <div className="text-xs text-textMuted uppercase font-bold mb-1">Words Processed</div>
                          <div className="text-xl font-bold text-textPrimary">{(metrics.totalWordsProcessed / 1000).toFixed(1)}k</div>
                      </div>
                      <div className="bg-gray-100 p-3 rounded-lg">
                          <div className="text-xs text-textMuted uppercase font-bold mb-1">Top Format</div>
                          <div className="text-xl font-bold text-textPrimary">{metrics.topPerformingType}</div>
                      </div>
                  </div>
              </div>
          </div>

          {/* ROI Calculator */}
          <div className="bg-primary text-white p-8 rounded-xl shadow-lg">
              <div className="flex items-center gap-2 mb-6">
                  <DollarSign className="h-6 w-6 text-yellow-300" />
                  <h3 className="text-lg font-bold">ROI Calculator</h3>
              </div>
              
              <div className="space-y-6">
                  <div>
                      <label className="block text-xs font-bold text-white/90 uppercase mb-2">Your Hourly Rate ($)</label>
                      <input 
                        type="number" 
                        value={hourlyRate} 
                        onChange={(e) => setHourlyRate(Number(e.target.value))}
                        className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder-indigo-300 outline-none focus:ring-2 focus:ring-white/50"
                      />
                  </div>

                  <div className="pt-4 border-t border-white/20">
                      <div className="flex justify-between items-end mb-2">
                          <span className="text-white/80 font-medium">Time Saved</span>
                          <span className="text-2xl font-bold">{metrics.hoursSaved} hrs</span>
                      </div>
                      <div className="flex justify-between items-end">
                          <span className="text-white/80 font-medium">Value Generated</span>
                          <span className="text-3xl font-bold text-yellow-300">${estimatedSavings.toLocaleString()}</span>
                      </div>
                  </div>
                  
                  <p className="text-xs text-white/70 mt-2 italic">
                      *Based on estimated manual effort of ~3.5hrs per episode analysis & content creation.
                  </p>
              </div>
          </div>

          {/* Content Distribution */}
          <div className="bg-gray-100 p-6 rounded-xl border border-gray-300 shadow-sm">
             <h3 className="font-bold text-textPrimary mb-6 flex items-center gap-2">
                 <FileText className="h-5 w-5 text-textMuted" /> Content Generated
             </h3>
             <div className="space-y-4">
                 {metrics.contentGenerated.map((item, i) => (
                     <div key={i}>
                         <div className="flex justify-between text-sm mb-1">
                             <span className="text-textSecondary font-medium">{item.type}</span>
                             <span className="text-textMuted">{item.count}</span>
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
          <div className="bg-gray-100 p-6 rounded-xl border border-gray-300 shadow-sm">
             <h3 className="font-bold text-textPrimary mb-6 flex items-center gap-2">
                 <TrendingUp className="h-5 w-5 text-textMuted" /> Daily Activity
             </h3>
             <div className="h-48 flex items-end justify-between gap-2">
                 {metrics.dailyUsage.map((day, i) => (
                     <div key={i} className="flex flex-col items-center flex-1 group">
                         <div 
                            className="w-full bg-accent-soft rounded-t-lg group-hover:bg-primary transition relative"
                            style={{ height: `${day.count > 0 ? (day.count / Math.max(...metrics.dailyUsage.map(d => d.count))) * 100 : 0}%` }}
                         >
                             <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                                 {day.count} uploads
                             </div>
                         </div>
                         <div className="text-xs text-textMuted mt-2 font-medium">{day.date}</div>
                     </div>
                 ))}
             </div>
          </div>

          {/* Plan Comparison */}
          <div className="lg:col-span-1 bg-gray-100 p-6 rounded-xl border border-gray-300 shadow-sm">
             <h3 className="font-bold text-textPrimary mb-6 flex items-center gap-2">
                 <Zap className="h-5 w-5 text-yellow-500" /> Your Plan
             </h3>
             <div className="space-y-4">
                 <div className="grid grid-cols-2 text-xs font-bold text-textMuted uppercase border-b border-gray-300 pb-2">
                     <div>Feature</div>
                     <div className="text-center text-primary">{PLAN_LABEL[user.plan] ?? user.plan}</div>
                 </div>

                 <div className="grid grid-cols-2 text-sm items-center py-2 border-b border-gray-50">
                     <div className="font-medium text-textSecondary">Analyses / cycle</div>
                     <div className="text-center font-bold text-primary">
                       {{ free: '3', starter: '10', pro: '30', growth: '150', beta: 'Unlimited', beta_grace: 'Unlimited' }[user.plan] ?? '3'}
                     </div>
                 </div>
                 <div className="grid grid-cols-2 text-sm items-center py-2 border-b border-gray-50">
                     <div className="font-medium text-textSecondary">Scheduled posts / cycle</div>
                     <div className="text-center font-bold text-primary">
                       {{ free: '5', starter: '20', pro: '75', growth: '400', beta: 'Unlimited', beta_grace: 'Unlimited' }[user.plan] ?? '5'}
                     </div>
                 </div>
                 <div className="grid grid-cols-2 text-sm items-center py-2 border-b border-gray-50">
                     <div className="font-medium text-textSecondary">Team Seats</div>
                     <div className="text-center font-bold text-primary">
                       {{ free: '1', starter: '1', pro: '3', growth: 'Expanded', beta: '1', beta_grace: '1' }[user.plan] ?? '1'}
                     </div>
                 </div>
                 <div className="grid grid-cols-2 text-sm items-center py-2 border-b border-gray-50">
                     <div className="font-medium text-textSecondary">SendGrid / Kit</div>
                     <div className="text-center">
                       {user.plan === 'pro' || user.plan === 'growth' ? <CheckCircle className="h-4 w-4 mx-auto text-primary"/> : <XCircle className="h-4 w-4 mx-auto text-gray-300"/>}
                     </div>
                 </div>
                 <div className="grid grid-cols-2 text-sm items-center py-2 border-b border-gray-50">
                     <div className="font-medium text-textSecondary">Priority Support</div>
                     <div className="text-center">
                       {user.plan === 'pro' || user.plan === 'growth' ? <CheckCircle className="h-4 w-4 mx-auto text-primary"/> : <XCircle className="h-4 w-4 mx-auto text-gray-300"/>}
                     </div>
                 </div>
                 <div className="grid grid-cols-2 text-sm items-center py-2 border-b border-gray-50">
                     <div className="font-medium text-textSecondary">Role Permissions</div>
                     <div className="text-center">
                       {user.plan === 'growth' ? <CheckCircle className="h-4 w-4 mx-auto text-primary"/> : <XCircle className="h-4 w-4 mx-auto text-gray-300"/>}
                     </div>
                 </div>

                 {user.plan !== 'growth' && user.plan !== 'beta' && (
                   <button
                     onClick={() => window.location.href = '/pricing'}
                     className="w-full mt-4 bg-primary text-white py-2 rounded-lg font-bold text-sm hover:bg-primary/90 transition"
                   >
                     Upgrade Plan
                   </button>
                 )}
             </div>
          </div>

      </div>
    </div>
  );
};

export default UsageAnalytics;