import React, { useState, useMemo } from 'react';
import { Copy, Check, Calendar, Clock, Loader2, ChevronDown, ChevronUp, Linkedin, Twitter, Facebook, Instagram, X as CloseIcon } from 'lucide-react';
import { schedulePost } from '../services/transcripts';
import { getLinkedInStatus, getLinkedInAuthUrl } from '../services/linkedin';
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
// Only LinkedIn supports automated scheduling right now
const platformToSchedulable: Record<string, string | null> = {
  'LinkedIn': 'linkedin',
  'X': null,
  'Twitter': null,  // Legacy name fallback
  'Facebook': null,
  'Instagram': null,
  'Instagram Stories': null,
};

// Display name mapping (Twitter -> X)
const getPlatformDisplayName = (platform: string): string => {
  if (platform === 'Twitter') return 'X';
  return platform;
};

const PlatformIcon: React.FC<{ platform: string; className?: string }> = ({ platform, className = "h-4 w-4" }) => {
  switch (platform) {
    case 'LinkedIn':
      return <Linkedin className={className} />;
    case 'Twitter':
    case 'X':
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

  // Schedule modal state
  const [showScheduleDayModal, setShowScheduleDayModal] = useState(false);
  const [scheduleDayNumber, setScheduleDayNumber] = useState<number | null>(null);
  const [scheduleDayDate, setScheduleDayDate] = useState('');
  const [scheduleDayTime, setScheduleDayTime] = useState('09:00');

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

  // Open schedule day modal with LinkedIn check
  const handleScheduleDayClick = async (dayNumber: number) => {
    // Check if LinkedIn is connected
    try {
      const status = await getLinkedInStatus();
      if (!status.connected) {
        const confirmConnect = window.confirm(
          'LinkedIn is not connected. Would you like to connect your LinkedIn account now to schedule posts?'
        );
        if (confirmConnect) {
          const url = await getLinkedInAuthUrl();
          window.location.href = url;
        }
        return;
      }
    } catch (error) {
      console.error('Failed to check LinkedIn status:', error);
      setScheduleNotification({ 
        message: 'Failed to verify LinkedIn connection. Please try again.', 
        type: 'error' 
      });
      setTimeout(() => setScheduleNotification(null), 5000);
      return;
    }

    // Open scheduling modal
    setScheduleDayNumber(dayNumber);
    const defaultDate = getDateForDay(dayNumber);
    setScheduleDayDate(defaultDate.toISOString().split('T')[0]);
    setScheduleDayTime(startTime);
    setShowScheduleDayModal(true);
  };

  // Schedule all posts for a specific day
  const handleScheduleDay = async () => {
    if (!transcript?.id || scheduleDayNumber === null) return;

    const dayNumber = scheduleDayNumber;
    const posts = postsByDay[dayNumber];
    if (!posts || posts.length === 0) return;

    setSchedulingDay(dayNumber);
    const scheduledDate = new Date(`${scheduleDayDate}T${scheduleDayTime}`).toISOString();

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
    setShowScheduleDayModal(false);

    if (successCount > 0) {
      setScheduledDays((prev) => new Set([...prev, dayNumber]));
      const dateStr = new Date(`${scheduleDayDate}T${scheduleDayTime}`).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
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
    // Check if LinkedIn is connected
    try {
      const status = await getLinkedInStatus();
      if (!status.connected) {
        const confirmConnect = window.confirm(
          'LinkedIn is not connected. Would you like to connect your LinkedIn account now to schedule posts?'
        );
        if (confirmConnect) {
          const url = await getLinkedInAuthUrl();
          window.location.href = url;
        }
        return;
      }
    } catch (error) {
      console.error('Failed to check LinkedIn status:', error);
      setScheduleNotification({ 
        message: 'Failed to verify LinkedIn connection. Please try again.', 
        type: 'error' 
      });
      setTimeout(() => setScheduleNotification(null), 5000);
      return;
    }

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
          <button onClick={() => setActiveRepurposeView('hub')} className="px-3 py-1 bg-gray-200 border border-gray-300 rounded-md text-textSecondary text-sm">Back</button>
        </div>
        <div className="p-6 text-center text-textSecondary">No social calendar generated. Click "Social Calendar" above to generate.</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-textPrimary">Social Calendar</h4>
        <div className="flex gap-2">
          <button onClick={() => setActiveRepurposeView('hub')} className="px-3 py-1 bg-gray-200 border border-gray-300 rounded-md text-textPrimary text-sm">
            Back
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopyJSON(repurposed.socialCalendar, 'copy-json');
            }}
            className="px-3 py-1 bg-gray-200 border border-gray-300 rounded-md text-textPrimary text-sm"
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
      <div className="bg-gray-100 rounded-xl p-4 mb-6 border border-gray-300">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <span className="font-semibold text-textPrimary text-sm">Start Date:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg bg-gray-200 text-textPrimary text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <span className="font-semibold text-textPrimary text-sm">Time:</span>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg bg-gray-200 text-textPrimary text-sm"
            />
          </div>
          <div className="flex-1"></div>
          <button
            onClick={handleScheduleAll}
            disabled={isSchedulingAll || days.every((d) => scheduledDays.has(d))}
            className="px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 text-sm"
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
                Schedule LinkedIn Series
              </>
            )}
          </button>
        </div>
        <p className="text-sm text-textPrimary mt-3">
          Day 1 LinkedIn posts will be scheduled for {startDate} at {startTime}. Each subsequent day adds 24 hours. Other platforms require manual posting.
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
              className={`rounded-xl border ${isScheduled ? 'border-green-300 bg-green-50/30' : 'border-gray-300 bg-gray-100'}`}
            >
              {/* Day Header */}
              <button
                onClick={() => toggleDay(day)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-200/50 transition rounded-t-xl"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${isScheduled ? 'bg-green-100 text-green-800' : 'bg-primary/20 text-primary'}`}>
                    {day}
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-textPrimary flex items-center gap-2">
                      Day {day}
                      {isScheduled && (
                        <span className="text-xs bg-green-100 text-green-800 font-semibold px-2 py-0.5 rounded-full">
                          Scheduled
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-textPrimary">
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
                        className="p-1.5 rounded bg-gray-200"
                        title={platformToSchedulable[platform] ? getPlatformDisplayName(platform) : `${getPlatformDisplayName(platform)} (Manual only)`}
                      >
                        <PlatformIcon platform={platform} className="h-4 w-4 text-textPrimary" />
                      </div>
                    ))}
                  </div>
                  {isExpanded ? <ChevronUp className="h-5 w-5 text-textPrimary" /> : <ChevronDown className="h-5 w-5 text-textPrimary" />}
                </div>
              </button>

              {/* Day Content */}
              {isExpanded && (
                <div className="border-t border-gray-300 p-4">
                  {/* Schedule Day Button */}
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={() => handleScheduleDayClick(day)}
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
                          Schedule Day {day} LinkedIn ({schedulablePosts.length} post{schedulablePosts.length !== 1 ? 's' : ''})
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
                          className="p-3 rounded-lg border bg-gray-200 border-gray-300"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <PlatformIcon platform={post.platform} className="h-4 w-4 text-textPrimary" />
                              <span className="font-semibold text-textPrimary text-sm">{getPlatformDisplayName(post.platform)}</span>
                              {!isSchedulable && (
                                <span className="text-xs bg-gray-300 text-textPrimary font-bold px-1.5 py-0.5 rounded">
                                  Manual only
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-textPrimary bg-gray-300 font-semibold px-2 py-0.5 rounded">
                              {post.type}
                            </span>
                          </div>
                          <p className="text-sm text-textPrimary mb-2 line-clamp-3 leading-relaxed">{post.content}</p>
                          <button
                            onClick={() => handleCopy(post.content)}
                            className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
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
                    <p className="text-xs text-textSecondary mt-3">
                      * X, Facebook, Instagram, and Instagram Stories require manual posting. Copy the content and post directly to the platform.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Schedule Day Modal */}
      {showScheduleDayModal && scheduleDayNumber !== null && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowScheduleDayModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Schedule Day {scheduleDayNumber} LinkedIn Posts
              </h3>
              <button
                onClick={() => setShowScheduleDayModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Schedule {postsByDay[scheduleDayNumber]?.filter((p) => platformToSchedulable[p.platform]).length} LinkedIn post(s) to be published.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Schedule Date
                </label>
                <input
                  type="date"
                  value={scheduleDayDate}
                  onChange={(e) => setScheduleDayDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Schedule Time
                </label>
                <input
                  type="time"
                  value={scheduleDayTime}
                  onChange={(e) => setScheduleDayTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Scheduled for:</strong> {new Date(`${scheduleDayDate}T${scheduleDayTime}`).toLocaleString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowScheduleDayModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 font-medium rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleDay}
                disabled={schedulingDay !== null || !scheduleDayDate || !scheduleDayTime}
                className="flex-1 px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {schedulingDay === scheduleDayNumber ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Confirm Schedule
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialCalendarView;
