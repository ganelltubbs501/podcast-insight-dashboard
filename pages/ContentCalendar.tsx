import React, { useEffect, useState } from 'react';
import { getScheduledPosts, deleteScheduledPost, updateScheduledPost } from '../services/transcripts';
import { ScheduledPost, Platform } from '../types';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Linkedin, Twitter, Video, Mail, FileType, Plus, Trash2, BarChart2, CheckCircle, Clock, AlertCircle, Edit2, Filter, RotateCcw, Facebook } from 'lucide-react';
import MetricsTracker from '../components/MetricsTracker';

const ContentCalendar: React.FC = () => {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editStatus, setEditStatus] = useState<'Scheduled' | 'Published' | 'Failed'>('Scheduled');
  const [showMetricsTracker, setShowMetricsTracker] = useState(false);

  // Filters
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Drag state
  const [draggedPost, setDraggedPost] = useState<ScheduledPost | null>(null);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const data = await getScheduledPosts();
      console.log('[ContentCalendar] Loaded posts:', data.length, 'posts', data.map(p => ({ id: p.id, scheduledDate: p.scheduledDate, status: p.status })));
      setPosts(data);
    } catch (err) {
      console.error('[ContentCalendar] Failed to load posts:', err);
    }
  };

  // Filter posts (case-insensitive status comparison)
  const filteredPosts = posts.filter(post => {
    if (filterPlatform !== 'all' && post.platform !== filterPlatform) return false;
    if (filterStatus !== 'all' && (post.status || '').toLowerCase() !== filterStatus.toLowerCase()) return false;
    return true;
  });

  // Retry failed post
  const handleRetry = async (post: ScheduledPost) => {
    try {
      await updateScheduledPost(post.id, { status: 'Scheduled' });
      loadPosts();
      if (selectedPost?.id === post.id) {
        setSelectedPost({ ...post, status: 'Scheduled' });
      }
    } catch (e) {
      console.error('Failed to retry post:', e);
      alert('Failed to retry post');
    }
  };

  // Drag handlers for reschedule
  const handleDragStart = (e: React.DragEvent, post: ScheduledPost) => {
    setDraggedPost(post);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, day: number) => {
    e.preventDefault();
    if (!draggedPost) return;

    const newDate = new Date(year, month, day);
    const oldDate = new Date(draggedPost.scheduledDate);
    // Preserve time, only change date
    newDate.setHours(oldDate.getHours(), oldDate.getMinutes(), oldDate.getSeconds());

    try {
      await updateScheduledPost(draggedPost.id, { scheduledDate: newDate.toISOString() });
      loadPosts();
    } catch (e) {
      console.error('Failed to reschedule:', e);
      alert('Failed to reschedule post');
    }

    setDraggedPost(null);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this scheduled post?")) {
      await deleteScheduledPost(id);
      setSelectedPost(null);
      loadPosts();
    }
  };

  const handleEditClick = () => {
    if (!selectedPost) return;
    const postDate = new Date(selectedPost.scheduledDate);
    setEditContent(selectedPost.content);
    setEditDate(postDate.toISOString().split('T')[0]);
    setEditTime(postDate.toTimeString().slice(0, 5));
    setEditStatus(selectedPost.status);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedPost || !editDate || !editTime) return;

    try {
      const dateTime = new Date(`${editDate}T${editTime}`);
      await updateScheduledPost(selectedPost.id, {
        content: editContent,
        scheduledDate: dateTime.toISOString(),
        status: editStatus
      });

      setIsEditing(false);
      loadPosts();
      // Update selected post with new data
      setSelectedPost({
        ...selectedPost,
        content: editContent,
        scheduledDate: dateTime.toISOString(),
        status: editStatus
      });
    } catch (e) {
      console.error(e);
      alert("Failed to update post.");
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent('');
    setEditDate('');
    setEditTime('');
    setEditStatus('Scheduled');
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
      case 'facebook': return <Facebook className="h-3 w-3 text-[#1877F2]" />;
      case 'tiktok': return <Video className="h-3 w-3 text-[#000000]" />; // Simplified TikTok icon
      case 'youtube': return <Video className="h-3 w-3 text-[#FF0000]" />; // Simplified YouTube icon
      case 'email': return <Mail className="h-3 w-3 text-orange-500" />;
      case 'medium': return <FileType className="h-3 w-3 text-black" />;
      default: return <CalendarIcon className="h-3 w-3 text-textMuted" />;
    }
  };

  const getPlatformColor = (platform: Platform) => {
     switch (platform) {
      case 'linkedin': return 'bg-[#0077b5]/10 text-[#0077b5] border-[#0077b5]/20';
      case 'twitter': return 'bg-[#1DA1F2]/10 text-[#1DA1F2] border-[#1DA1F2]/20';
      case 'facebook': return 'bg-[#1877F2]/10 text-[#1877F2] border-[#1877F2]/20';
      case 'medium': return 'bg-gray-900/10 text-gray-900 border-gray-900/20';
      case 'email': return 'bg-orange-50 text-orange-600 border-orange-200';
      default: return 'bg-gray-100 text-textSecondary border-gray-300';
     }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-80px)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-primary" />
            Content Calendar
          </h1>
          <p className="text-textMuted">Schedule, publish, and track your content performance.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Filters */}
          <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-lg border border-gray-300">
            <Filter className="h-4 w-4 text-textMuted ml-1" />
            <select
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
              className="bg-transparent border-none text-sm text-textSecondary focus:outline-none cursor-pointer"
            >
              <option value="all">All Platforms</option>
              <option value="linkedin">LinkedIn</option>
              <option value="twitter">Twitter</option>
              <option value="facebook">Facebook</option>
              <option value="email">Email</option>
              <option value="tiktok">TikTok</option>
              <option value="youtube">YouTube</option>
              <option value="medium">Medium</option>
              <option value="teaser">Newsletter Teaser</option>
            </select>
          </div>
          <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-lg border border-gray-300">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent border-none text-sm text-textSecondary focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Published">Published</option>
              <option value="Failed">Failed</option>
            </select>
          </div>
          {/* Month Navigation */}
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg border border-gray-300 shadow-sm">
             <button onClick={prevMonth} className="p-2 hover:bg-gray-200 rounded-md transition"><ChevronLeft className="h-5 w-5 text-textSecondary"/></button>
             <span className="font-bold text-textPrimary w-32 text-center select-none">
               {currentDate.toLocaleDateString('default', { month: 'long', year: 'numeric' })}
             </span>
             <button onClick={nextMonth} className="p-2 hover:bg-gray-200 rounded-md transition"><ChevronRight className="h-5 w-5 text-textSecondary"/></button>
          </div>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Calendar Grid */}
        <div className="flex-1 bg-gray-100 rounded-xl shadow-sm border border-gray-300 flex flex-col min-h-0">
           {/* Days Header */}
           <div className="grid grid-cols-7 border-b border-gray-300">
             {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
               <div key={day} className="py-3 text-center text-xs font-bold text-textMuted uppercase tracking-wide bg-gray-50/50">
                 {day}
               </div>
             ))}
           </div>
           
           {/* Calendar Cells */}
           <div className="grid grid-cols-7 flex-1 auto-rows-fr">
             {/* Padding for previous month */}
             {Array.from({ length: firstDay }).map((_, i) => (
               <div key={`empty-${i}`} className="bg-gray-50/30 border-b border-r border-gray-300 min-h-25"></div>
             ))}
             
             {/* Days */}
             {Array.from({ length: daysInMonth }).map((_, i) => {
               const day = i + 1;
               const dateStr = new Date(year, month, day).toDateString();
               const dayPosts = filteredPosts.filter(p => {
                 if (!p.scheduledDate) {
                   console.warn('[ContentCalendar] Post missing scheduledDate:', p.id);
                   return false;
                 }
                 return new Date(p.scheduledDate).toDateString() === dateStr;
               });
               const isToday = new Date().toDateString() === dateStr;

               return (
                 <div
                   key={day}
                   className={`border-b border-r border-gray-300 p-2 min-h-25 relative hover:bg-gray-100 transition group ${isToday ? 'bg-accent-soft/30' : ''} ${draggedPost ? 'hover:bg-blue-50' : ''}`}
                   onDragOver={handleDragOver}
                   onDrop={(e) => handleDrop(e, day)}
                 >
                    <span className={`text-sm font-medium block mb-2 ${isToday ? 'text-primary bg-primary w-6 h-6 rounded-full flex items-center justify-center' : 'text-textSecondary'}`}>{day}</span>

                    <div className="space-y-1">
                       {dayPosts.map(post => (
                         <button
                           key={post.id}
                           onClick={() => setSelectedPost(post)}
                           draggable
                           onDragStart={(e) => handleDragStart(e, post)}
                           className={`w-full text-left text-xs p-1.5 rounded border flex items-center gap-1.5 truncate transition shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing ${getPlatformColor(post.platform)} ${(post.status || '').toLowerCase() === 'failed' ? 'border-red-300 bg-red-50' : ''}`}
                         >
                            {getPlatformIcon(post.platform)}
                            <span className="truncate font-medium">
                              {(post.status || '').toLowerCase() === 'published' && <CheckCircle className="inline h-3 w-3 mr-1 text-green-600"/>}
                              {(post.status || '').toLowerCase() === 'failed' && <AlertCircle className="inline h-3 w-3 mr-1 text-red-600"/>}
                              {post.content}
                            </span>
                         </button>
                       ))}
                    </div>
                 </div>
               );
             })}
             
             {/* Padding for end of grid (optional, filling remaining cells) */}
             {Array.from({ length: 42 - (daysInMonth + firstDay) }).map((_, i) => (
               <div key={`end-empty-${i}`} className="bg-gray-50/30 border-b border-r border-gray-300 min-h-25"></div>
             ))}
           </div>
        </div>

        {/* Sidebar / Details Panel */}
        <div className="w-80 bg-gray-100 rounded-xl shadow-sm border border-gray-300 p-6 flex flex-col overflow-y-auto">
           {selectedPost ? (
             <>
               <div className="flex justify-between items-start mb-6">
                 <h2 className="font-bold text-lg text-textPrimary">{isEditing ? 'Edit Post' : 'Post Details'}</h2>
                 <button onClick={() => { setSelectedPost(null); setIsEditing(false); }} className="text-textMuted hover:text-textSecondary text-sm">Close</button>
               </div>

               {!isEditing ? (
                 <>
                   <div className="mb-6">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide mb-3 ${(selectedPost.status || '').toLowerCase() === 'published' ? 'bg-accent-soft text-green-700' : (selectedPost.status || '').toLowerCase() === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {(selectedPost.status || '').toLowerCase() === 'published' ? <CheckCircle className="h-3 w-3" /> : (selectedPost.status || '').toLowerCase() === 'scheduled' ? <Clock className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                        {selectedPost.status}
                      </span>
                      <div className="text-sm text-textMuted mb-1">Scheduled for</div>
                      <div className="font-medium text-textPrimary">{new Date(selectedPost.scheduledDate).toLocaleString()}</div>
                   </div>

                   <div className="mb-6">
                      <div className="text-xs font-bold text-textMuted uppercase mb-2">Platform</div>
                      <div className="flex items-center gap-2 text-sm font-medium text-textSecondary capitalize">
                        {getPlatformIcon(selectedPost.platform)}
                        {selectedPost.platform}
                      </div>
                   </div>

                   <div className="mb-6">
                      <div className="text-xs font-bold text-textMuted uppercase mb-2">Content</div>
                      <div className="bg-gray-100 p-3 rounded-lg border border-gray-300 text-sm text-textSecondary whitespace-pre-wrap">
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

                   <div className="mt-auto pt-6 border-t border-gray-300 space-y-2">
                     {(selectedPost.status || '').toLowerCase() === 'failed' && (
                       <button
                         onClick={() => handleRetry(selectedPost)}
                         className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition text-sm font-medium"
                       >
                         <RotateCcw className="h-4 w-4" /> Retry Post
                       </button>
                     )}
                     <button
                       onClick={() => setShowMetricsTracker(true)}
                       className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                     >
                       <BarChart2 className="h-4 w-4" /> Track Metrics
                     </button>
                     <div className="flex gap-2">
                       <button
                         onClick={handleEditClick}
                         className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition text-sm font-medium"
                       >
                         <Edit2 className="h-4 w-4" /> Edit
                       </button>
                       <button
                         onClick={() => handleDelete(selectedPost.id)}
                         className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition text-sm font-medium"
                       >
                         <Trash2 className="h-4 w-4" /> Delete
                       </button>
                     </div>
                   </div>
                 </>
               ) : (
                 <>
                   {/* Edit Form */}
                   <div className="mb-4">
                      <div className="text-xs font-bold text-textMuted uppercase mb-2">Platform</div>
                      <div className="flex items-center gap-2 text-sm font-medium text-textSecondary capitalize">
                        {getPlatformIcon(selectedPost.platform)}
                        {selectedPost.platform}
                      </div>
                   </div>

                   <div className="mb-4">
                      <label className="text-xs font-bold text-textMuted uppercase mb-2 block">Status</label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as 'Scheduled' | 'Published' | 'Failed')}
                        className="w-full bg-gray-100 border border-gray-300 rounded-lg p-2 text-sm text-textBody"
                      >
                        <option value="Scheduled">Scheduled</option>
                        <option value="Published">Published</option>
                        <option value="Failed">Failed</option>
                      </select>
                   </div>

                   <div className="mb-4">
                      <label className="text-xs font-bold text-textMuted uppercase mb-2 block">Date</label>
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="w-full bg-gray-100 border border-gray-300 rounded-lg p-2 text-sm text-textBody"
                      />
                   </div>

                   <div className="mb-4">
                      <label className="text-xs font-bold text-textMuted uppercase mb-2 block">Time</label>
                      <input
                        type="time"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        className="w-full bg-gray-100 border border-gray-300 rounded-lg p-2 text-sm text-textBody"
                      />
                   </div>

                   <div className="mb-6">
                      <label className="text-xs font-bold text-textMuted uppercase mb-2 block">Content</label>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={8}
                        className="w-full bg-gray-100 border border-gray-300 rounded-lg p-3 text-sm text-textBody whitespace-pre-wrap resize-none"
                      />
                   </div>

                   <div className="mt-auto pt-4 border-t border-gray-300 flex gap-2">
                     <button
                       onClick={handleSaveEdit}
                       className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition text-sm font-medium"
                     >
                       <CheckCircle className="h-4 w-4" /> Save
                     </button>
                     <button
                       onClick={handleCancelEdit}
                       className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 border border-gray-300 text-textSecondary rounded-lg hover:bg-gray-200 transition text-sm font-medium"
                     >
                       Cancel
                     </button>
                   </div>
                 </>
               )}
             </>
           ) : (
             <div className="flex flex-col items-center justify-center h-full text-center text-textMuted">
                <CalendarIcon className="h-12 w-12 mb-4 opacity-20" />
                <p>Select a post from the calendar to view details.</p>
             </div>
           )}
        </div>
      </div>

      {/* Metrics Tracker Modal */}
      {showMetricsTracker && selectedPost && (
        <MetricsTracker
          post={selectedPost}
          onClose={() => setShowMetricsTracker(false)}
          onUpdate={() => {
            loadPosts();
            // Update selected post to show new metrics
            const updatedPost = posts.find(p => p.id === selectedPost.id);
            if (updatedPost) setSelectedPost(updatedPost);
          }}
        />
      )}
    </div>
  );
};

export default ContentCalendar;