import React, { useState } from 'react';
import { Calendar, Clock, Sparkles, X } from 'lucide-react';
import { schedulePost } from '../services/transcripts';
import { Platform } from '../types';

interface BulkScheduleWizardProps {
  content: {
    platform: Platform;
    text: string;
  }[];
  transcriptId?: string;
  onClose: () => void;
  onComplete: () => void;
}

const BulkScheduleWizard: React.FC<BulkScheduleWizardProps> = ({
  content,
  transcriptId,
  onClose,
  onComplete
}) => {
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [frequency, setFrequency] = useState<'hourly' | 'daily' | 'custom'>('daily');
  const [customHours, setCustomHours] = useState(24);
  const [isScheduling, setIsScheduling] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<Platform>>(
    new Set(content.map(c => c.platform))
  );

  const togglePlatform = (platform: Platform) => {
    const newSet = new Set(selectedPlatforms);
    if (newSet.has(platform)) {
      newSet.delete(platform);
    } else {
      newSet.add(platform);
    }
    setSelectedPlatforms(newSet);
  };

  const getIntervalHours = () => {
    switch (frequency) {
      case 'hourly': return 1;
      case 'daily': return 24;
      case 'custom': return customHours;
    }
  };

  const handleBulkSchedule = async () => {
    if (!startDate || !startTime) {
      alert('Please select a start date and time');
      return;
    }

    setIsScheduling(true);
    try {
      const startDateTime = new Date(`${startDate}T${startTime}`);
      const intervalHours = getIntervalHours();
      const selectedContent = content.filter(c => selectedPlatforms.has(c.platform));

      for (let i = 0; i < selectedContent.length; i++) {
        const scheduleTime = new Date(startDateTime.getTime() + (i * intervalHours * 60 * 60 * 1000));

        await schedulePost({
          platform: selectedContent[i].platform,
          content: selectedContent[i].text,
          scheduledDate: scheduleTime.toISOString(),
          status: 'Scheduled',
          transcriptId
        });
      }

      onComplete();
      onClose();
    } catch (e) {
      console.error(e);
      alert('Failed to schedule posts. Please try again.');
    } finally {
      setIsScheduling(false);
    }
  };

  const selectedContent = content.filter(c => selectedPlatforms.has(c.platform));
  const previewDates = selectedContent.map((_, i) => {
    if (!startDate || !startTime) return null;
    const startDateTime = new Date(`${startDate}T${startTime}`);
    const intervalHours = getIntervalHours();
    return new Date(startDateTime.getTime() + (i * intervalHours * 60 * 60 * 1000));
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => e.stopPropagation()}>
      <div className="bg-gray-100 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-300" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-primary text-white p-6 rounded-t-xl flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6" />
            <h2 className="text-xl font-bold">Bulk Schedule Wizard</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Select Platforms */}
          <div>
            <h3 className="font-bold text-textPrimary mb-3">Select Platforms to Schedule</h3>
            <div className="grid grid-cols-2 gap-3">
              {content.map(({ platform }) => (
                <label
                  key={platform}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${
                    selectedPlatforms.has(platform)
                      ? 'border-primary bg-primary/10'
                      : 'border-gray-300 bg-gray-100 hover:border-primary/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedPlatforms.has(platform)}
                    onChange={() => togglePlatform(platform)}
                    className="w-4 h-4 text-primary"
                  />
                  <span className="font-medium text-textBody capitalize">{platform}</span>
                </label>
              ))}
            </div>
            <p className="text-sm text-textMuted mt-2">
              {selectedContent.length} platform{selectedContent.length !== 1 ? 's' : ''} selected
            </p>
          </div>

          {/* Start Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-textMuted uppercase mb-2 block flex items-center gap-2">
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
              <label className="text-xs font-bold text-textMuted uppercase mb-2 block flex items-center gap-2">
                <Clock className="h-4 w-4" /> Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg p-3 text-textBody"
              />
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className="text-xs font-bold text-textMuted uppercase mb-2 block">
              Time Between Platforms
            </label>
            <p className="text-xs text-textMuted mb-3">
              Each platform will post once, staggered at your chosen interval
            </p>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setFrequency('hourly')}
                className={`p-3 rounded-lg border-2 transition ${
                  frequency === 'hourly'
                    ? 'border-primary bg-primary/10 text-primary font-bold'
                    : 'border-gray-300 bg-gray-100 text-textBody hover:border-primary/50'
                }`}
              >
                1 Hour Apart
              </button>
              <button
                onClick={() => setFrequency('daily')}
                className={`p-3 rounded-lg border-2 transition ${
                  frequency === 'daily'
                    ? 'border-primary bg-primary/10 text-primary font-bold'
                    : 'border-gray-300 bg-gray-100 text-textBody hover:border-primary/50'
                }`}
              >
                1 Day Apart
              </button>
              <button
                onClick={() => setFrequency('custom')}
                className={`p-3 rounded-lg border-2 transition ${
                  frequency === 'custom'
                    ? 'border-primary bg-primary/10 text-primary font-bold'
                    : 'border-gray-300 bg-gray-100 text-textBody hover:border-primary/50'
                }`}
              >
                Custom
              </button>
            </div>

            {frequency === 'custom' && (
              <div className="mt-3">
                <label className="text-xs text-textMuted mb-1 block">Hours between each platform</label>
                <input
                  type="number"
                  min="1"
                  value={customHours}
                  onChange={(e) => setCustomHours(Number(e.target.value))}
                  className="w-full bg-gray-100 border border-gray-300 rounded-lg p-2 text-textBody"
                />
              </div>
            )}
          </div>

          {/* Preview */}
          {startDate && startTime && selectedContent.length > 0 && (
            <div className="bg-accent-soft/20 border border-primary/30 rounded-lg p-4">
              <h4 className="font-bold text-primary mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Schedule Preview
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedContent.map((item, i) => (
                  <div key={i} className="flex justify-between items-center text-sm bg-gray-100 p-2 rounded border border-gray-300">
                    <span className="font-medium capitalize text-textBody">{item.platform}</span>
                    <span className="text-textSecondary">
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
              onClick={handleBulkSchedule}
              disabled={isScheduling || selectedContent.length === 0 || !startDate || !startTime}
              className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isScheduling ? (
                'Scheduling...'
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Schedule {selectedContent.length} Post{selectedContent.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkScheduleWizard;
