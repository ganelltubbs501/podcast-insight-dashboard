import React, { useEffect, useState } from 'react';
import { getTranscripts } from '../services/mockBackend';
import { Transcript } from '../types';
import { BarChart3, TrendingUp, Users, Clock, Calendar, ArrowUpRight, ArrowDownRight, FileText } from 'lucide-react';

const SeriesAnalytics: React.FC = () => {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const data = await getTranscripts();
      // Filter only completed transcripts for analysis
      setTranscripts(data.filter(t => t.status === 'Completed' && t.result?.sentiment));
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) return <div className="p-12 text-center text-gray-500">Loading analytics...</div>;

  if (transcripts.length < 2) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <BarChart3 className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Not Enough Data</h2>
        <p className="text-gray-500 max-w-md mx-auto mb-6">
          Upload at least 2 transcripts to unlock Series Analytics, showing trends in sentiment, growth, and topics over time.
        </p>
      </div>
    );
  }

  // Calculate Metrics
  const sortedTranscripts = [...transcripts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const avgSentiment = Math.round(transcripts.reduce((acc, t) => acc + (t.result?.sentiment?.score || 0), 0) / transcripts.length);
  const totalWords = transcripts.reduce((acc, t) => acc + (t.content.split(' ').length), 0);
  const avgDuration = Math.round((totalWords / 150) / transcripts.length); // approx 150 wpm
  
  // Topic Frequency
  const topicMap: Record<string, number> = {};
  transcripts.forEach(t => {
    t.result?.seo?.keywords.forEach(kw => {
      topicMap[kw] = (topicMap[kw] || 0) + 1;
    });
  });
  const topTopics = Object.entries(topicMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Sentiment Trend Calculation
  const sentimentTrend = sortedTranscripts.map(t => ({
      date: new Date(t.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}),
      score: t.result?.sentiment?.score || 0
  }));

  const lastScore = sentimentTrend[sentimentTrend.length - 1].score;
  const firstScore = sentimentTrend[0].score;
  const growth = lastScore - firstScore;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Series Analytics</h1>
        <p className="text-gray-500">Insights across {transcripts.length} episodes</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500 text-sm font-medium">Avg Sentiment</span>
            <TrendingUp className={`h-5 w-5 ${avgSentiment >= 60 ? 'text-green-500' : 'text-yellow-500'}`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">{avgSentiment}</span>
            <span className="text-sm text-gray-400">/ 100</span>
          </div>
          <div className={`text-xs mt-2 flex items-center ${growth > 0 ? 'text-green-600' : 'text-red-500'}`}>
            {growth > 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
            {Math.abs(growth)} pts since first ep
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500 text-sm font-medium">Est. Avg Duration</span>
            <Clock className="h-5 w-5 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">{avgDuration}</span>
            <span className="text-sm text-gray-400">mins</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">Based on word count</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500 text-sm font-medium">Total Episodes</span>
            <FileText className="h-5 w-5 text-purple-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">{transcripts.length}</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">Last uploaded: {sentimentTrend[sentimentTrend.length-1].date}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500 text-sm font-medium">Top Topic</span>
            <Hash className="h-5 w-5 text-pink-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-gray-900 truncate">{topTopics[0]?.[0] || "N/A"}</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">Mentioned in {Math.round((topTopics[0]?.[1] || 0) / transcripts.length * 100)}% of eps</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Sentiment Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-6">Sentiment Trend</h3>
          <div className="h-64 w-full relative">
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
               {/* Grid lines */}
               {[0, 25, 50, 75, 100].map((y) => (
                 <line key={y} x1="0" y1={`${100-y}%`} x2="100%" y2={`${100-y}%`} stroke="#f3f4f6" strokeWidth="1" />
               ))}
               
               {/* Trend Line */}
               {(() => {
                 if (sentimentTrend.length < 2) return null;
                 const points = sentimentTrend.map((t, i) => {
                   const x = (i / (sentimentTrend.length - 1)) * 100;
                   const y = 100 - t.score;
                   return `${x}%,${y}%`;
                 }).join(' ');
                 
                 return (
                   <polyline points={points} fill="none" stroke="#6366F1" strokeWidth="3" vectorEffect="non-scaling-stroke" />
                 );
               })()}

               {/* Dots */}
               {sentimentTrend.map((t, i) => {
                  const x = (i / (sentimentTrend.length - 1)) * 100;
                  const y = 100 - t.score;
                  return (
                    <circle key={i} cx={`${x}%`} cy={`${y}%`} r="4" fill="#fff" stroke="#6366F1" strokeWidth="2" />
                  );
               })}
            </svg>
            
            {/* X-Axis Labels */}
            <div className="flex justify-between mt-4 text-xs text-gray-400">
              {sentimentTrend.map((t, i) => (
                <span key={i}>{t.date}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Topic Consistency */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
           <h3 className="font-bold text-gray-900 mb-6">Topic Consistency</h3>
           <div className="space-y-4">
             {topTopics.map((topic, i) => (
               <div key={i}>
                 <div className="flex justify-between text-sm mb-1">
                   <span className="font-medium text-gray-700 capitalize">{topic[0]}</span>
                   <span className="text-gray-500">{topic[1]} eps</span>
                 </div>
                 <div className="w-full bg-gray-100 rounded-full h-2">
                   <div 
                     className="bg-secondary h-2 rounded-full" 
                     style={{ width: `${(topic[1] / transcripts.length) * 100}%` }}
                   ></div>
                 </div>
               </div>
             ))}
           </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-bold text-gray-900">Episode Comparison</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Episode</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sentiment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Speakers</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedTranscripts.slice().reverse().map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">{t.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(t.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                     <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                       (t.result?.sentiment?.score || 0) > 60 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                     }`}>
                       {t.result?.sentiment?.score || "N/A"}
                     </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">{t.result?.sentiment?.tone || "-"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.result?.speakers.length || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Simple Hash Icon component for this file
const Hash: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>
);

export default SeriesAnalytics;