import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Sparkles, X, Mail, Hash, Users, ChevronDown, Loader2 } from 'lucide-react';
import { schedulePost } from '../services/transcripts';
import { getEmailLists, getEmailList, EmailList } from '../services/emailLists';

interface EmailSeriesItem {
  day: number;
  subject: string;
  body: string;
}

interface SocialCalendarItem {
  day: number;
  platform: string;
  content: string;
}

interface SeriesScheduleWizardProps {
  type: 'email' | 'social';
  items: EmailSeriesItem[] | SocialCalendarItem[];
  transcriptId?: string;
  onClose: () => void;
  onComplete: () => void;
}

const SeriesScheduleWizard: React.FC<SeriesScheduleWizardProps> = ({
  type,
  items,
  transcriptId,
  onClose,
  onComplete
}) => {
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

  // Email list state
  const [emailLists, setEmailLists] = useState<EmailList[]>([]);
  const [emailListsLoading, setEmailListsLoading] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [selectedListEmails, setSelectedListEmails] = useState<string[]>([]);
  const [loadingListEmails, setLoadingListEmails] = useState(false);

  // Load email lists on mount for email type
  useEffect(() => {
    if (type === 'email') {
      loadEmailLists();
    }
  }, [type]);

  const loadEmailLists = async () => {
    try {
      setEmailListsLoading(true);
      const lists = await getEmailLists();
      setEmailLists(lists);
    } catch (err) {
      console.error('Failed to load email lists:', err);
    } finally {
      setEmailListsLoading(false);
    }
  };

  const handleListSelect = async (listId: string) => {
    setSelectedListId(listId);
    setRecipientEmail(''); // Clear single email when list is selected

    if (!listId) {
      setSelectedListEmails([]);
      return;
    }

    try {
      setLoadingListEmails(true);
      const list = await getEmailList(listId);
      setSelectedListEmails(list.emails || []);
    } catch (err) {
      console.error('Failed to load email list:', err);
      setSelectedListEmails([]);
    } finally {
      setLoadingListEmails(false);
    }
  };

  const hasValidRecipients = selectedListEmails.length > 0 || recipientEmail.trim().length > 0;

  const handleSchedule = async () => {
    if (!startDate || !startTime) {
      alert('Please select a start date and time');
      return;
    }

    if (type === 'email' && !hasValidRecipients) {
      alert('Please select an email list or enter a recipient email address');
      return;
    }

    setIsScheduling(true);
    try {
      const startDateTime = new Date(`${startDate}T${startTime}`);

      // Determine recipients
      const recipients = selectedListEmails.length > 0
        ? selectedListEmails
        : [recipientEmail.trim()];

      for (const item of items) {
        // Calculate date based on day number (day 1 = start date, day 2 = start date + 1 day, etc.)
        const scheduleTime = new Date(startDateTime.getTime() + ((item.day - 1) * 24 * 60 * 60 * 1000));

        if (type === 'email') {
          const emailItem = item as EmailSeriesItem;
          await schedulePost({
            platform: 'email',
            content: `Subject: ${emailItem.subject}\n\n${emailItem.body}`,
            scheduledDate: scheduleTime.toISOString(),
            status: 'Scheduled',
            transcriptId,
            metadata: {
              recipientEmails: recipients,
              recipientEmail: recipients[0] // Keep for backwards compatibility
            }
          });
        } else {
          const socialItem = item as SocialCalendarItem;
          await schedulePost({
            platform: socialItem.platform as any,
            content: socialItem.content,
            scheduledDate: scheduleTime.toISOString(),
            status: 'Scheduled',
            transcriptId
          });
        }
      }

      onComplete();
      onClose();
    } catch (e) {
      console.error(e);
      alert('Failed to schedule series. Please try again.');
    } finally {
      setIsScheduling(false);
    }
  };

  const previewDates = items.map(item => {
    if (!startDate || !startTime) return null;
    const startDateTime = new Date(`${startDate}T${startTime}`);
    return new Date(startDateTime.getTime() + ((item.day - 1) * 24 * 60 * 60 * 1000));
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => e.stopPropagation()}>
      <div className="bg-gray-100 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-300" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-primary text-white p-6 rounded-t-xl flex justify-between items-center">
          <div className="flex items-center gap-3">
            {type === 'email' ? <Mail className="h-6 w-6" /> : <Hash className="h-6 w-6" />}
            <h2 className="text-xl font-bold">
              Schedule {type === 'email' ? 'Email Series' : 'Social Calendar'}
            </h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Info */}
          <div className="bg-accent-soft/20 border border-primary/30 rounded-lg p-4">
            <p className="text-sm text-textBody">
              {type === 'email'
                ? `Schedule ${items.length} emails to be sent daily starting from your chosen date.`
                : `Schedule ${items.length} social posts (5 platforms × 5 days). Posts with the same day number will be scheduled on the same day.`
              }
            </p>
          </div>

          {/* Recipients (for email series only) */}
          {type === 'email' && (
            <div className="space-y-4">
              {/* Email List Selector */}
              <div>
                <label className="text-xs font-bold text-textMuted uppercase mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" /> Email List
                </label>
                {emailListsLoading ? (
                  <div className="flex items-center gap-2 text-textMuted text-sm py-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading lists...
                  </div>
                ) : emailLists.length > 0 ? (
                  <div className="relative">
                    <select
                      value={selectedListId}
                      onChange={(e) => handleListSelect(e.target.value)}
                      disabled={recipientEmail.length > 0}
                      className="w-full bg-gray-200 border border-gray-300 rounded-lg p-3 text-textBody appearance-none cursor-pointer disabled:opacity-50"
                    >
                      <option value="">Select an email list...</option>
                      {emailLists.map((list) => (
                        <option key={list.id} value={list.id}>
                          {list.name} ({list.email_count} emails)
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-textMuted pointer-events-none" />
                  </div>
                ) : (
                  <p className="text-sm text-textMuted py-2">
                    No email lists yet.{' '}
                    <a href="/#/settings" className="text-primary hover:underline">
                      Import a CSV in Settings
                    </a>
                  </p>
                )}

                {/* Show selected list emails */}
                {loadingListEmails && (
                  <div className="flex items-center gap-2 text-textMuted text-sm mt-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading emails...
                  </div>
                )}
                {selectedListEmails.length > 0 && !loadingListEmails && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700 font-medium">
                      {selectedListEmails.length} recipient{selectedListEmails.length !== 1 ? 's' : ''} selected
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      {selectedListEmails.slice(0, 3).join(', ')}
                      {selectedListEmails.length > 3 && ` ... and ${selectedListEmails.length - 3} more`}
                    </p>
                  </div>
                )}
              </div>

              {/* OR divider */}
              {emailLists.length > 0 && (
                <div className="flex items-center gap-4">
                  <div className="flex-1 border-t border-gray-300"></div>
                  <span className="text-xs text-textMuted uppercase">or</span>
                  <div className="flex-1 border-t border-gray-300"></div>
                </div>
              )}

              {/* Single Email Input */}
              <div>
                <label className="text-xs font-bold text-textMuted uppercase mb-2 flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Single Recipient Email
                </label>
                <input
                  type="email"
                  placeholder="recipient@example.com"
                  value={recipientEmail}
                  onChange={(e) => {
                    setRecipientEmail(e.target.value);
                    if (e.target.value) {
                      setSelectedListId('');
                      setSelectedListEmails([]);
                    }
                  }}
                  disabled={selectedListId.length > 0}
                  className="w-full bg-gray-200 border border-gray-300 rounded-lg p-3 text-textBody disabled:opacity-50"
                />
                <p className="text-xs text-textMuted mt-1">
                  {selectedListEmails.length > 0
                    ? 'Clear the email list selection above to use a single email'
                    : 'All emails in the series will be sent to this address via Gmail.'}
                </p>
              </div>
            </div>
          )}

          {/* Start Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-textMuted uppercase mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg p-3 text-textBody"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-textMuted uppercase mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" /> Time (Daily)
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg p-3 text-textBody"
              />
            </div>
          </div>

          {/* Preview */}
          {startDate && startTime && (
            <div className="bg-accent-soft/20 border border-primary/30 rounded-lg p-4">
              <h4 className="font-bold text-primary mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Schedule Preview
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center text-sm bg-gray-100 p-3 rounded border border-gray-300">
                    <div className="flex-1">
                      {type === 'email' ? (
                        <div>
                          <span className="font-bold text-textPrimary">Day {item.day}:</span>{' '}
                          <span className="text-textBody">{(item as EmailSeriesItem).subject}</span>
                        </div>
                      ) : (
                        <div>
                          <span className="font-bold text-textPrimary">Day {item.day}:</span>{' '}
                          <span className="text-textBody capitalize">{(item as SocialCalendarItem).platform}</span>
                        </div>
                      )}
                    </div>
                    <span className="text-textSecondary text-xs ml-4 whitespace-nowrap">
                      {previewDates[i]?.toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-300">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 border border-gray-300 text-textSecondary rounded-lg hover:bg-gray-200 transition font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSchedule}
              disabled={isScheduling || !startDate || !startTime || (type === 'email' && !hasValidRecipients)}
              className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isScheduling ? (
                'Scheduling...'
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Schedule {items.length} {type === 'email' ? 'Emails' : 'Posts'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeriesScheduleWizard;
