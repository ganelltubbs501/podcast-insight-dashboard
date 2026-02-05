import React, { useState, useMemo } from 'react';
import { Copy, Check, Calendar, Clock, Loader2, ChevronDown, ChevronUp, Linkedin, Twitter, Facebook, Instagram } from 'lucide-react';
import { schedulePost } from '../services/transcripts';
import { SocialCalendarItem, RepurposedContent, Transcript } from '../types';

interface SocialCalendarViewProps {
  repurposed: RepurposedContent;
  transcript: Transcript | null;
  copiedSection: string | null;
  handleCopyJSON: (obj: any, label: string) => void;
  setActiveRepurposeView: (view: 'hub' | 'email' | 'calendar' | 'article' | 'images') => void;
  scheduleNotification: { message: string; type: 'success' | 'error' } | null;
  setScheduleNotification: (notification: { message: string; type: 'success' | 'error' } | null) => void;
}

// Map platform names to schedulable platform types
const platformToSchedulable: Record<string, string | null> = {
  'LinkedIn': 'linkedin',
  'Twitter': 'twitter',
  'Facebook': null,
  'Instagram': null, // Not schedulable via API
  'Instagram Stories': null, // Not schedulable via API
};

// Platform icons
const PlatformIcon: React.FC<{ platform: string; className?: string }> = ({ platform, className = "h-4 w-4" }) => {
  switch (platform) {
    case 'LinkedIn':
      return <Linkedin className={className} />;
    case 'Twitter':
      return <Twitter className={className} />;
    case 'Facebook':
      return <Facebook className={className} />;
    case 'Instagram':
    case 'Instagram Stories':
      return <Instagram className={className} />;
    default:
      return null;
  }
};

const SocialCalendarView: React.FC<SocialCalendarViewProps> = ({
  repurposed,
  transcript,
  copiedSection,
  handleCopyJSON,
  setActiveRepurposeView,
  scheduleNotification,
  setScheduleNotification,
}) => {
  // Start date/time for scheduling
  const [startDate, setStartDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState('09:00');

  // Scheduling state
  const [isSchedulingAll, setIsSchedulingAll] = useState(false);
  const [schedulingDay, setSchedulingDay] = useState<number | null>(null);
  const [scheduledDays, setScheduledDays] = useState<Set<number>>(new Set());

  // Expanded days state
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1]));

  // Group posts by day
  const postsByDay = useMemo(() => {
    if (!repurposed.socialCalendar) return {};

    const grouped: Record<number, SocialCalendarItem[]> = {};
    repurposed.socialCalendar.forEach((post) => {
      const day = post.day || 1;
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(post);
    });

    return grouped;
  }, [repurposed.socialCalendar]);

  const days = Object.keys(postsByDay).map(Number).sort((a, b) => a - b);

  // Calculate the date for a specific day
  const getDateForDay = (dayNumber: number): Date => {
    const date = new Date(`${startDate}T${startTime}`);
    date.setDate(date.getDate() + (dayNumber - 1));
    return date;
  };

  // Format date for display
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  // Toggle day expansion
  const toggleDay = (day: number) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
      }
      return next;
    });
  };

  // Schedule all posts for a specific day
  const handleScheduleDay = async (dayNumber: number) => {
    if (!transcript?.id) return;

    const posts = postsByDay[dayNumber];
    if (!posts || posts.length === 0) return;

    setSchedulingDay(dayNumber);
    const scheduledDate = getDateForDay(dayNumber).toISOString();

    let successCount = 0;
    let skipCount = 0;
    const errors: string[] = [];

    for (const post of posts) {
      const platform = platformToSchedulable[post.platform];

      // Skip platforms that can't be scheduled
      if (!platform) {
        skipCount++;
        continue;
      }

      try {
        await schedulePost({
          platform,
          content: post.content,
          scheduledDate,
          status: 'Scheduled',
          transcriptId: transcript.id,
          metadata: {
            source: 'social_calendar',
            day: dayNumber,
            type: post.type,
          },
        });
        successCount++;
      } catch (err: any) {
        console.error(`Failed to schedule ${post.platform}:`, err);
        errors.push(`${post.platform}: ${err.message}`);
      }
    }

    setSchedulingDay(null);

    if (successCount > 0) {
      setScheduledDays((prev) => new Set([...prev, dayNumber]));
      const dateStr = formatDate(getDateForDay(dayNumber));
      let message = `Day ${dayNumber} scheduled for ${dateStr}: ${successCount} post${successCount > 1 ? 's' : ''} scheduled`;
      if (skipCount > 0) {
        message += `, ${skipCount} skipped (manual only)`;
      }
      setScheduleNotification({ message, type: 'success' });
    } else if (errors.length > 0) {
      setScheduleNotification({ message: `Failed to schedule: ${errors.join(', ')}`, type: 'error' });
    } else {
      setScheduleNotification({ message: 'No schedulable platforms for this day', type: 'error' });
    }

    setTimeout(() => setScheduleNotification(null), 5000);
  };

  // Schedule entire series
  const handleScheduleAll = async () => {
    if (!transcript?.id || days.length === 0) return;

    setIsSchedulingAll(true);

    let totalSuccess = 0;
    let totalSkip = 0;
    const errors: string[] = [];

    for (const day of days) {
      if (scheduledDays.has(day)) continue; // Skip already scheduled days

      const posts = postsByDay[day];
      const scheduledDate = getDateForDay(day).toISOString();

      for (const post of posts) {
        const platform = platformToSchedulable[post.platform];

        if (!platform) {
          totalSkip++;
          continue;
        }

        try {
          await schedulePost({
            platform,
            content: post.content,
            scheduledDate,
            status: 'Scheduled',
            transcriptId: transcript.id,
            metadata: {
              source: 'social_calendar',
              day,
              type: post.type,
            },
          });
          totalSuccess++;
        } catch (err: any) {
          console.error(`Failed to schedule Day ${day} ${post.platform}:`, err);
          errors.push(`Day ${day} ${post.platform}`);
        }
      }

      setScheduledDays((prev) => new Set([...prev, day]));
    }

    setIsSchedulingAll(false);

    if (totalSuccess > 0) {
      const startDateStr = formatDate(getDateForDay(days[0]));
      const endDateStr = formatDate(getDateForDay(days[days.length - 1]));
      let message = `Scheduled ${totalSuccess} posts from ${startDateStr} to ${endDateStr}`;
      if (totalSkip > 0) {
        message += ` (${totalSkip} skipped - manual only)`;
      }
      setScheduleNotification({ message, type: 'success' });
    } else if (errors.length > 0) {
      setScheduleNotification({ message: `Failed to schedule some posts`, type: 'error' });
    }

    setTimeout(() => setScheduleNotification(null), 5000);
  };

  // Copy content to clipboard
  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  if (!repurposed.socialCalendar) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-textPrimary">Social Calendar</h4>
          <button onClick={() => setActiveRepurposeView('hub')} className="px-3 py-1 bg-gray-100 border rounded-md">Back</button>
        </div>
        <div className="p-6 text-center text-textMuted">No social calendar generated. Click "Social Calendar" above to generate.</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-textPrimary">Social Calendar</h4>
        <div className="flex gap-2">
          <button onClick={() => setActiveRepurposeView('hub')} className="px-3 py-1 bg-gray-100 border rounded-md">
            Back
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopyJSON(repurposed.socialCalendar, 'copy-json');
            }}
            className="px-3 py-1 bg-gray-100 border rounded-md"
          >
            {copiedSection === 'copy-json' ? 'Copied' : 'Copy JSON'}
          </button>
        </div>
      </div>

      {/* Schedule Notification */}
      {scheduleNotification && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            scheduleNotification.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {scheduleNotification.message}
        </div>
      )}

      {/* Start Date/Time Picker */}
      <div className="bg-linear-to-r from-primary/5 to-secondary/5 rounded-xl p-4 mb-6 border border-gray-200">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <span className="font-medium text-textPrimary">Start Date:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg bg-white text-textPrimary"
            />
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <span className="font-medium text-textPrimary">Time:</span>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg bg-white text-textPrimary"
            />
          </div>
          <div className="flex-1"></div>
          <button
            onClick={handleScheduleAll}
            disabled={isSchedulingAll || days.every((d) => scheduledDays.has(d))}
            className="px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
          >
            {isSchedulingAll ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Scheduling...
              </>
            ) : days.every((d) => scheduledDays.has(d)) ? (
              <>
                <Check className="h-4 w-4" />
                All Scheduled
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4" />
                Schedule Entire Series
              </>
            )}
          </button>
        </div>
        <p className="text-sm text-textMuted mt-3">
          Day 1 posts will be scheduled for {startDate} at {startTime}. Each subsequent day adds 24 hours.
        </p>
      </div>

      {/* Days List */}
      <div className="space-y-4">
        {days.map((day) => {
          const posts = postsByDay[day];
          const date = getDateForDay(day);
          const isExpanded = expandedDays.has(day);
          const isScheduled = scheduledDays.has(day);
          const isScheduling = schedulingDay === day;
          const schedulablePosts = posts.filter((p) => platformToSchedulable[p.platform]);
          const manualOnlyPosts = posts.filter((p) => !platformToSchedulable[p.platform]);

          return (
            <div
              key={day}
              className={`rounded-xl border ${isScheduled ? 'border-green-300 bg-green-50/30' : 'border-gray-200 bg-white'}`}
            >
              {/* Day Header */}
              <button
                onClick={() => toggleDay(day)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50/50 transition rounded-t-xl"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${isScheduled ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary'}`}>
                    {day}
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-textPrimary flex items-center gap-2">
                      Day {day}
                      {isScheduled && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          Scheduled
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-textMuted">
                      {formatDate(date)} • {posts.length} posts
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Platform icons */}
                  <div className="flex gap-1">
                    {([...new Set(posts.map((p) => p.platform))] as string[]).map((platform) => (
                      <div
                        key={platform}
                        className={`p-1.5 rounded ${platformToSchedulable[platform] ? 'bg-gray-100' : 'bg-yellow-50'}`}
                        title={platformToSchedulable[platform] ? platform : `${platform} (Manual only)`}
                      >
                        <PlatformIcon platform={platform} className="h-4 w-4 text-gray-600" />
                      </div>
                    ))}
                  </div>
                  {isExpanded ? <ChevronUp className="h-5 w-5 text-textMuted" /> : <ChevronDown className="h-5 w-5 text-textMuted" />}
                </div>
              </button>

              {/* Day Content */}
              {isExpanded && (
                <div className="border-t border-gray-200 p-4">
                  {/* Schedule Day Button */}
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={() => handleScheduleDay(day)}
                      disabled={isScheduling || isScheduled || schedulablePosts.length === 0}
                      className="px-3 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isScheduling ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Scheduling...
                        </>
                      ) : isScheduled ? (
                        <>
                          <Check className="h-3 w-3" />
                          Scheduled
                        </>
                      ) : (
                        <>
                          <Calendar className="h-3 w-3" />
                          Schedule Day {day} ({schedulablePosts.length} posts)
                        </>
                      )}
                    </button>
                  </div>

                  {/* Posts Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {posts.map((post, i) => {
                      const isSchedulable = !!platformToSchedulable[post.platform];
                      return (
                        <div
                          key={i}
                          className={`p-3 rounded-lg border ${
                            isSchedulable
                              ? 'bg-gray-50 border-gray-200'
                              : 'bg-yellow-50/50 border-yellow-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <PlatformIcon platform={post.platform} className="h-4 w-4" />
                              <span className="font-medium text-textPrimary text-sm">{post.platform}</span>
                              {!isSchedulable && (
                                <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
                                  Manual only
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-textMuted bg-gray-100 px-2 py-0.5 rounded">
                              {post.type}
                            </span>
                          </div>
                          <p className="text-sm text-textSecondary mb-2 line-clamp-3">{post.content}</p>
                          <button
                            onClick={() => handleCopy(post.content)}
                            className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                          >
                            <Copy className="h-3 w-3" />
                            Copy
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Manual Only Notice */}
                  {manualOnlyPosts.length > 0 && (
                    <p className="text-xs text-textMuted mt-3">
                      * Instagram and Instagram Stories require manual posting. Copy the content and post directly to the platform.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SocialCalendarView;
