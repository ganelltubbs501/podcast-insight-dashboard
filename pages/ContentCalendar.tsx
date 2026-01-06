import React, { useEffect, useState } from 'react';
import { getScheduledPosts, deleteScheduledPost } from '../services/backend';
import { ScheduledPost, Platform } from '../types';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Linkedin, Twitter, Video, Mail, FileType, Plus, Trash2, BarChart2, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const ContentCalendar: React.FC = () => {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    const data = await getScheduledPosts();
    setPosts(data);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this scheduled post?")) {
      await deleteScheduledPost(id);
      setSelectedPost(null);
      loadPosts();
    }
  };

  // Calendar Logic
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getPlatformIcon = (platform: Platform) => {
    switch (platform) {
      case 'linkedin': return <Linkedin className="h-3 w-3 text-[#0077b5]" />;
      case 'twitter': return <Twitter className="h-3 w-3 text-[#1DA1F2]" />;
      case 'tiktok': return <Video className="h-3 w-3 text-[#000000]" />; // Simplified TikTok icon
      case 'youtube': return <Video className="h-3 w-3 text-[#FF0000]" />; // Simplified YouTube icon
      case 'email': return <Mail className="h-3 w-3 text-orange-500" />;
      case 'medium': return <FileType className="h-3 w-3 text-black" />;
      default: return <CalendarIcon className="h-3 w-3 text-gray-500" />;
    }
  };

  const getPlatformColor = (platform: Platform) => {
     switch (platform) {
      case 'linkedin': return 'bg-[#0077b5]/10 text-[#0077b5] border-[#0077b5]/20';
      case 'twitter': return 'bg-[#1DA1F2]/10 text-[#1DA1F2] border-[#1DA1F2]/20';
      case 'email': return 'bg-orange-50 text-orange-600 border-orange-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
     }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-80px)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-primary" />
            Content Calendar
          </h1>
          <p className="text-gray-500">Schedule, publish, and track your content performance.</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
           <button onClick={prevMonth} className="p-2 hover:bg-gray-50 rounded-md transition"><ChevronLeft className="h-5 w-5 text-gray-600"/></button>
           <span className="font-bold text-gray-900 w-32 text-center select-none">
             {currentDate.toLocaleDateString('default', { month: 'long', year: 'numeric' })}
           </span>
           <button onClick={nextMonth} className="p-2 hover:bg-gray-50 rounded-md transition"><ChevronRight className="h-5 w-5 text-gray-600"/></button>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Calendar Grid */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col min-h-0">
           {/* Days Header */}
           <div className="grid grid-cols-7 border-b border-gray-200">
             {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
               <div key={day} className="py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wide bg-gray-50/50">
                 {day}
               </div>
             ))}
           </div>
           
           {/* Calendar Cells */}
           <div className="grid grid-cols-7 flex-1 auto-rows-fr">
             {/* Padding for previous month */}
             {Array.from({ length: firstDay }).map((_, i) => (
               <div key={`empty-${i}`} className="bg-gray-50/30 border-b border-r border-gray-100 min-h-[100px]"></div>
             ))}
             
             {/* Days */}
             {Array.from({ length: daysInMonth }).map((_, i) => {
               const day = i + 1;
               const dateStr = new Date(year, month, day).toDateString();
               const dayPosts = posts.filter(p => new Date(p.scheduledDate).toDateString() === dateStr);
               const isToday = new Date().toDateString() === dateStr;

               return (
                 <div key={day} className={`border-b border-r border-gray-100 p-2 min-h-[100px] relative hover:bg-gray-50 transition group ${isToday ? 'bg-accent-soft/30' : ''}`}>
                    <span className={`text-sm font-medium block mb-2 ${isToday ? 'text-primary bg-primary w-6 h-6 rounded-full flex items-center justify-center' : 'text-gray-700'}`}>{day}</span>
                    
                    <div className="space-y-1">
                       {dayPosts.map(post => (
                         <button 
                           key={post.id}
                           onClick={() => setSelectedPost(post)}
                           className={`w-full text-left text-xs p-1.5 rounded border flex items-center gap-1.5 truncate transition shadow-sm hover:shadow-md ${getPlatformColor(post.platform)}`}
                         >
                            {getPlatformIcon(post.platform)}
                            <span className="truncate font-medium">{post.status === 'Published' ? <CheckCircle className="inline h-3 w-3 mr-1"/> : null}{post.content}</span>
                         </button>
                       ))}
                    </div>
                 </div>
               );
             })}
             
             {/* Padding for end of grid (optional, filling remaining cells) */}
             {Array.from({ length: 42 - (daysInMonth + firstDay) }).map((_, i) => (
               <div key={`end-empty-${i}`} className="bg-gray-50/30 border-b border-r border-gray-100 min-h-[100px]"></div>
             ))}
           </div>
        </div>

        {/* Sidebar / Details Panel */}
        <div className="w-80 bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col overflow-y-auto">
           {selectedPost ? (
             <>
               <div className="flex justify-between items-start mb-6">
                 <h2 className="font-bold text-lg text-gray-900">Post Details</h2>
                 <button onClick={() => setSelectedPost(null)} className="text-gray-400 hover:text-gray-600 text-sm">Close</button>
               </div>

               <div className="mb-6">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide mb-3 ${selectedPost.status === 'Published' ? 'bg-accent-soft text-green-700' : selectedPost.status === 'Failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {selectedPost.status === 'Published' ? <CheckCircle className="h-3 w-3" /> : selectedPost.status === 'Scheduled' ? <Clock className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                    {selectedPost.status}
                  </span>
                  <div className="text-sm text-gray-500 mb-1">Scheduled for</div>
                  <div className="font-medium text-gray-900">{new Date(selectedPost.scheduledDate).toLocaleString()}</div>
               </div>

               <div className="mb-6">
                  <div className="text-xs font-bold text-gray-400 uppercase mb-2">Platform</div>
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 capitalize">
                    {getPlatformIcon(selectedPost.platform)}
                    {selectedPost.platform}
                  </div>
               </div>

               <div className="mb-6">
                  <div className="text-xs font-bold text-gray-400 uppercase mb-2">Content</div>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedPost.content}
                  </div>
               </div>

               {selectedPost.metrics && (
                 <div className="mb-6 bg-accent-soft p-4 rounded-lg border border-primary">
                    <h3 className="font-bold text-primary mb-3 flex items-center gap-2">
                      <BarChart2 className="h-4 w-4" /> Performance
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                         <div className="text-xs text-primary uppercase">Impressions</div>
                         <div className="text-lg font-bold text-primary">{selectedPost.metrics.impressions}</div>
                       </div>
                       <div>
                         <div className="text-xs text-primary uppercase">Clicks</div>
                         <div className="text-lg font-bold text-primary">{selectedPost.metrics.clicks}</div>
                       </div>
                       <div>
                         <div className="text-xs text-primary uppercase">Likes</div>
                         <div className="text-lg font-bold text-primary">{selectedPost.metrics.likes}</div>
                       </div>
                       <div>
                         <div className="text-xs text-primary uppercase">Shares</div>
                         <div className="text-lg font-bold text-primary">{selectedPost.metrics.shares}</div>
                       </div>
                    </div>
                 </div>
               )}

               <div className="mt-auto pt-6 border-t border-gray-100 flex gap-2">
                 <button 
                   onClick={() => handleDelete(selectedPost.id)}
                   className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition text-sm font-medium"
                 >
                   <Trash2 className="h-4 w-4" /> Delete
                 </button>
               </div>
             </>
           ) : (
             <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                <CalendarIcon className="h-12 w-12 mb-4 opacity-20" />
                <p>Select a post from the calendar to view details.</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default ContentCalendar;