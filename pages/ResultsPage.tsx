import React, { useEffect, useState } from 'react';
import {
  ArrowLeft, Check, Copy, Download, Share2, Quote, FileText, BarChart3, Clock,
  Linkedin, Twitter, Video, Mail, Youtube, FileType, Send, File, Link2, Loader2,
  Sparkles, Activity, MessageSquare, ChevronDown, Calendar as CalendarIcon,
  DollarSign, Target, Briefcase, Calculator, ExternalLink, Settings, FileJson,
  Table, Facebook
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';

import {
  getTranscriptById,
  addCommentToTranscript,
  updateTranscriptStatus,
  saveTranscriptResult,
  schedulePost,
  createScheduledPost,
  getScheduledPosts,
} from "../services/transcripts";


import { getStoredUser } from '../services/auth';
import { getLinkedInStatus, connectLinkedIn } from '../services/linkedin';
import { getTwitterStatus, connectTwitter } from '../services/twitter';
import {
  getKitAuthUrl,
  getKitStatus,
  getMailchimpAuthUrl,
  getMailchimpStatus,
  getMailchimpDestinations,
  getMailchimpAutomations,
  triggerEpisodePublished,
  scheduleNewsletterTrigger
} from '../services/integrations';

import { getSendGridLists, getSendGridTemplates, SendGridList, SendGridTemplate } from '../services/sendgrid';
import { generateSponsorshipInsights, generateRepurposedContent, generateTruthBasedMonetization } from '../services/geminiService';
import { Transcript, Comment, WorkflowStatus, Platform, RepurposedContent } from '../types';
import { MonetizationInput } from '../types/monetization';
import {
  downloadPDF, downloadDOCX, downloadMarkdown, downloadMediaKit, downloadJSON,
  sendEmailExport, exportToGoogleSheets
} from '../services/downloadService';
import { MonetizationInputModal } from '../components/MonetizationInputModal';
import SeriesScheduleWizard from '../components/SeriesScheduleWizard';
import SocialCalendarView from '../components/SocialCalendarView';
import { DataConfidenceDisplay, CompactConfidenceIndicator } from '../components/DataConfidenceDisplay';

interface ResultsPageProps {
  id: string;
  onBack: () => void;
}

type TabType = 'overview' | 'platform' | 'blog' | 'speakers' | 'collaboration' | 'monetization' | 'repurpose';
type PlatformType = 'linkedin' | 'twitter' | 'tiktok' | 'youtube' | 'email' | 'medium' | 'teaser' | 'facebook';
type BlogSubTab = 'article' | 'shownotes' | 'seo' | 'faq';

const ResultsPage: React.FC<ResultsPageProps> = ({ id, onBack }) => {
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [activePlatform, setActivePlatform] = useState<PlatformType>('linkedin');
  const [activeBlogTab, setActiveBlogTab] = useState<BlogSubTab>('article');

  // Collab State
  const [newComment, setNewComment] = useState('');

  // Schedule Modal State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleNotification, setScheduleNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showSeriesScheduleWizard, setShowSeriesScheduleWizard] = useState(false);
  const [seriesScheduleType, setSeriesScheduleType] = useState<'email' | 'social'>('email');
  const [seriesScheduleItems, setSeriesScheduleItems] = useState<any[]>([]);

  // Track scheduled posts for this transcript by platform
  const [scheduledByPlatform, setScheduledByPlatform] = useState<Record<string, { scheduledDate: string; status: string } | null>>({});

  // LinkedIn connection check state
  const [showConnectLinkedInModal, setShowConnectLinkedInModal] = useState(false);
  const [isCheckingLinkedIn, setIsCheckingLinkedIn] = useState(false);

  // X/Twitter connection check state
  const [showConnectXModal, setShowConnectXModal] = useState(false);
  const [isCheckingX, setIsCheckingX] = useState(false);

  // Kit connection check state
  const [showConnectKitModal, setShowConnectKitModal] = useState(false);
  const [isCheckingKit, setIsCheckingKit] = useState(false);

  // Mailchimp connection check state
  const [showConnectMailchimpModal, setShowConnectMailchimpModal] = useState(false);
  const [isCheckingMailchimp, setIsCheckingMailchimp] = useState(false);
  const [isLoadingMailchimpData, setIsLoadingMailchimpData] = useState(false);
  const [mailchimpDestinations, setMailchimpDestinations] = useState<Array<{ id: string; name: string; audience_id: string }>>([]);
  const [mailchimpAutomations, setMailchimpAutomations] = useState<Array<{ id: string; name: string; destination_id: string; trigger_value: string }>>([]);

  const [emailProvider, setEmailProvider] = useState<'mailchimp' | 'kit' | 'sendgrid'>('mailchimp');

  // SendGrid scheduling state
  const [sendgridLists, setSendgridLists] = useState<SendGridList[]>([]);
  const [sendgridTemplates, setSendgridTemplates] = useState<SendGridTemplate[]>([]);
  const [isLoadingSendGridData, setIsLoadingSendGridData] = useState(false);
  const [selectedSendGridListId, setSelectedSendGridListId] = useState('');
  const [selectedSendGridTemplateId, setSelectedSendGridTemplateId] = useState('');
  const [emailSubjectOverride, setEmailSubjectOverride] = useState('');

  // Mailchimp newsletter scheduling
  const [newsletterDestinationId, setNewsletterDestinationId] = useState('');
  const [newsletterAutomationId, setNewsletterAutomationId] = useState('');

  // Email Export State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Monetization State
  const [isGeneratingMonetization, setIsGeneratingMonetization] = useState(false);
  const [downloads, setDownloads] = useState(1000);
  const [cpm, setCpm] = useState(18);
  const [showMonetizationModal, setShowMonetizationModal] = useState(false);

  // Update calculator when sponsorship data is loaded
  useEffect(() => {
    if (transcript?.result?.sponsorship?.estimatedMetrics) {
      setDownloads(transcript.result.sponsorship.estimatedMetrics.downloadsPerEpisode);
      setCpm(transcript.result.sponsorship.estimatedMetrics.realisticCPM);
    }
  }, [transcript?.result?.sponsorship?.estimatedMetrics]);

  // Repurposing State
  const [activeRepurposeView, setActiveRepurposeView] = useState<'hub' | 'email' | 'calendar' | 'article' | 'images' | 'facebook'>('hub');
  const [isRepurposing, setIsRepurposing] = useState(false);
  const [hasAutoGeneratedRepurposing, setHasAutoGeneratedRepurposing] = useState(false);

  // Speaker analytics state
  const [speakerEstimates, setSpeakerEstimates] = useState<Record<string, number> | null>(null);
  const [isEstimatingSpeakers, setIsEstimatingSpeakers] = useState(false);
  const [isSavingEstimates, setIsSavingEstimates] = useState(false);

  const navigate = useNavigate();

  // Estimate speaking times using a simple heuristic (uniform distribution)
  const estimateSpeakers = () => {
    if (!transcript?.result?.speakers || transcript.result.speakers.length === 0) return;
    setIsEstimatingSpeakers(true);

    try {
      const speakers = transcript.result.speakers;
      const n = speakers.length;
      const base = Math.floor(100 / n);
      let remainder = 100 - base * n;
      const estimates: Record<string, number> = {};
      for (let i = 0; i < n; i++) {
        const add = remainder > 0 ? 1 : 0;
        estimates[speakers[i].name] = base + add;
        if (remainder > 0) remainder -= 1;
      }
      setSpeakerEstimates(estimates);
    } catch (err) {
      console.error('Failed to estimate speakers', err);
      setSpeakerEstimates(null);
    } finally {
      setIsEstimatingSpeakers(false);
    }
  };

  // Persist estimates into the transcript result.speakers.speakingTimePercent via saveTranscriptResult
  const saveSpeakerEstimates = async () => {
    if (!transcript || !speakerEstimates) return;
    setIsSavingEstimates(true);
    try {
      const updatedSpeakers = (transcript.result?.speakers || []).map(s => ({
        ...s,
        speakingTimePercent: speakerEstimates[s.name] ?? s.speakingTimePercent ?? 0,
      }));

      await saveTranscriptResult(transcript.id, { speakers: updatedSpeakers });
      await loadData();
      setSpeakerEstimates(null);
      alert('Speaker estimates saved.');
    } catch (err) {
      console.error('Failed to save speaker estimates', err);
      alert('Failed to save speaker estimates.');
    } finally {
      setIsSavingEstimates(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadData = async () => {
    try {
      const data = await getTranscriptById(id);
      setTranscript(data);
    } catch (e) {
      console.error("Failed to load transcript:", e);
      setTranscript(null);
    }
  };

  // Load scheduled posts for this transcript
  const loadScheduledPosts = async () => {
    try {
      const allPosts = await getScheduledPosts();
      // Filter posts for this transcript and map by platform
      const postsForTranscript = allPosts.filter(p => p.transcriptId === id);
      const byPlatform: Record<string, { scheduledDate: string; status: string } | null> = {};

      for (const post of postsForTranscript) {
        // Only show scheduled (not published or failed) posts
        if ((post.status || '').toLowerCase() === 'scheduled') {
          byPlatform[post.platform] = {
            scheduledDate: post.scheduledDate,
            status: post.status
          };
        }
      }
      setScheduledByPlatform(byPlatform);
    } catch (e) {
      console.error("Failed to load scheduled posts:", e);
    }
  };

  // Load scheduled posts on mount
  useEffect(() => {
    loadScheduledPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleCopy = (text: string, sectionName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionName);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleCopyJSON = async (obj: any, label: string = 'copy-json') => {
    const json = JSON.stringify(obj ?? {}, null, 2);

    try {
      await navigator.clipboard.writeText(json);
      setCopiedSection(label);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      // Fallback for browsers/settings that block clipboard
      try {
        const ta = document.createElement("textarea");
        ta.value = json;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);

        setCopiedSection(label);
        setTimeout(() => setCopiedSection(null), 2000);
      } catch (e) {
        console.error("Copy JSON failed:", err);
        alert("Copy failed. Your browser blocked clipboard access.");
      }
    }
  };

  const handleDownload = async (type: 'pdf' | 'docx' | 'md' | 'kit' | 'json' | 'sheets' | 'email') => {
    if (!transcript) return;
    setShowDownloadMenu(false);

    if (type === 'email') {
      setShowEmailModal(true);
      return;
    }

    setIsDownloading(true);
    try {
      if (type === 'pdf') await downloadPDF(transcript);
      if (type === 'docx') await downloadDOCX(transcript);
      if (type === 'md') await downloadMarkdown(transcript);
      if (type === 'kit') await downloadMediaKit(transcript);
      if (type === 'json') await downloadJSON(transcript);
      if (type === 'sheets') {
        await exportToGoogleSheets(transcript);
        alert("Successfully exported to Google Sheets!");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!transcript || !recipientEmail) return;
    setIsSendingEmail(true);
    try {
      await sendEmailExport(transcript, recipientEmail);
      setShowEmailModal(false);
      setRecipientEmail('');
      alert("Email sent successfully!");
    } catch (e) {
      console.error(e);
      alert("Failed to send email.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleStatusChange = async (status: WorkflowStatus) => {
    try {
      await updateTranscriptStatus(id, status);
      await loadData();
      setShowStatusMenu(false);

      if (status === 'Published' && transcript) {
        try {
          await triggerEpisodePublished({
            transcriptId: transcript.id,
            episodeTitle: transcript.title
          });
        } catch (e) {
          console.warn('Episode published trigger failed:', e);
        }
      }
    } catch (e) {
      console.error(e);
      alert("Failed to update status.");
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const user = await getStoredUser();
      await addCommentToTranscript(id, newComment, {
        id: user?.id ?? 'unknown',
        name: user?.name ?? 'Anonymous',
      });
      setNewComment('');
      await loadData();
    } catch (e) {
      console.error(e);
      alert("Failed to add comment.");
    }
  };

  const handleShare = async () => {
    if (navigator.share && transcript) {
      try {
        await navigator.share({
          title: `Analysis: ${transcript.title}`,
          text: `Check out the podcast insights for "${transcript.title}"!`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      handleCopy(window.location.href, 'share');
      alert("Link copied to clipboard!");
    }
  };

  const getContentForPlatform = (platform: PlatformType, socialContent: any) => {
    if (platform === 'linkedin') return socialContent.linkedinPost;
    if (platform === 'twitter') return socialContent.twitterThread?.join('\n\n') || '';
    if (platform === 'facebook') return socialContent.facebookPost;
    if (platform === 'tiktok') return socialContent.tiktokScript;
    if (platform === 'youtube') return socialContent.youtubeDescription;
    if (platform === 'email') return `Subject: ${socialContent.emailNewsletter?.subject}\n\n${socialContent.emailNewsletter?.body}`;
    if (platform === 'medium') return socialContent.mediumArticle;
    if (platform === 'teaser') return `Subject: ${socialContent.newsletterTeaser?.subject}\n\n${socialContent.newsletterTeaser?.body}`;
    return '';
  };

  const PLATFORM_FLAGS: Record<PlatformType, { canSchedule: boolean }> = {
    linkedin: { canSchedule: true },
    twitter: { canSchedule: false },
    email: { canSchedule: true },
    medium: { canSchedule: true },
    teaser: { canSchedule: false },
    facebook: { canSchedule: false },
    tiktok: { canSchedule: false },
    youtube: { canSchedule: false },
  };

  const isSchedulingSupported = (platform: PlatformType) => PLATFORM_FLAGS[platform]?.canSchedule ?? true;

  const getSchedulingBadgeLabel = (platform: PlatformType) => {
    if (platform === 'twitter') return 'Coming soon';
    if (platform === 'facebook') return 'Coming soon';
    return 'Manual publishing only';
  };

  const getSchedulingTooltip = (platform: PlatformType) => {
    if (platform === 'twitter') return 'X scheduling is coming soon. Generate content now and post manually.';
    if (platform === 'facebook') return 'Facebook scheduling is coming soon. Generate content now and post manually.';
    return 'Manual publishing only';
  };

  const getApiErrorMessage = (err: unknown) => {
    if (!err) return 'Unknown error';
    if (err instanceof Error) {
      const match = err.message.match(/API \d+: (.*)$/);
      if (match?.[1]) {
        try {
          const parsed = JSON.parse(match[1]);
          if (parsed?.error) return parsed.error;
        } catch {
          return match[1];
        }
      }
      return err.message;
    }
    return String(err);
  };

  const loadMailchimpOptions = async (destinationId?: string) => {
    setIsLoadingMailchimpData(true);
    try {
      const { destinations } = await getMailchimpDestinations();
      setMailchimpDestinations(destinations || []);

      const preferredDestinationId =
        destinationId || newsletterDestinationId || destinations?.[0]?.id || '';

      if (preferredDestinationId && preferredDestinationId !== newsletterDestinationId) {
        setNewsletterDestinationId(preferredDestinationId);
      }

      if (preferredDestinationId) {
        const { automations } = await getMailchimpAutomations(preferredDestinationId);
        setMailchimpAutomations(automations || []);

        if (!newsletterAutomationId && automations?.[0]?.id) {
          setNewsletterAutomationId(automations[0].id);
        }
      } else {
        setMailchimpAutomations([]);
      }
    } catch (e) {
      console.error('Failed to load Mailchimp options:', e);
      setMailchimpDestinations([]);
      setMailchimpAutomations([]);
    } finally {
      setIsLoadingMailchimpData(false);
    }
  };

  const loadSendGridOptions = async () => {
    setIsLoadingSendGridData(true);
    try {
      const [lists, templates] = await Promise.all([
        getSendGridLists(),
        getSendGridTemplates(),
      ]);
      setSendgridLists(lists || []);
      setSendgridTemplates(templates || []);
    } catch (e) {
      console.error('Failed to load SendGrid options:', e);
      setSendgridLists([]);
      setSendgridTemplates([]);
    } finally {
      setIsLoadingSendGridData(false);
    }
  };

  const handleMailchimpDestinationChange = async (value: string) => {
    setNewsletterDestinationId(value);
    setNewsletterAutomationId('');
    setMailchimpAutomations([]);
    if (!value) return;

    setIsLoadingMailchimpData(true);
    try {
      const { automations } = await getMailchimpAutomations(value);
      setMailchimpAutomations(automations || []);
      if (automations?.[0]?.id) {
        setNewsletterAutomationId(automations[0].id);
      }
    } catch (e) {
      console.error('Failed to load Mailchimp automations:', e);
      setMailchimpAutomations([]);
    } finally {
      setIsLoadingMailchimpData(false);
    }
  };

  // Check LinkedIn/X connection before opening schedule modal
  const handleScheduleClick = async () => {
    if (activePlatform === 'facebook') {
      alert('Facebook scheduling is coming soon. You can still generate content now.');
      return;
    }
    if (activePlatform === 'twitter') {
      alert('X scheduling is coming soon. You can still generate content now.');
      return;
    }
    // Check for Kit (email) platform
    if (activePlatform === 'email') {
      if (emailProvider === 'mailchimp') {
        setIsCheckingMailchimp(true);
        try {
          const status = await getMailchimpStatus();
          if (!status.connected) {
            if (status.revoked) {
              setScheduleNotification({ message: 'Mailchimp access was revoked. Reconnect to continue.', type: 'error' });
              setTimeout(() => setScheduleNotification(null), 5000);
            }
            setShowConnectMailchimpModal(true);
            return;
          }
        } catch (e) {
          console.error('Failed to check Mailchimp status:', e);
          setShowConnectMailchimpModal(true);
          return;
        } finally {
          setIsCheckingMailchimp(false);
        }
      } else {
        setIsCheckingKit(true);
        try {
          const status = await getKitStatus();
          if (!status.connected || status.tokenExpired) {
            if (status.tokenExpired) {
              setScheduleNotification({ message: 'Your Kit access has expired. Reconnect to continue.', type: 'error' });
              setTimeout(() => setScheduleNotification(null), 5000);
            }
            setShowConnectKitModal(true);
            return;
          }
        } catch (e) {
          console.error('Failed to check Kit status:', e);
          setShowConnectKitModal(true);
          return;
        } finally {
          setIsCheckingKit(false);
        }
      }
    }
    if (!isSchedulingSupported(activePlatform)) {
      setScheduleNotification({ message: getSchedulingBadgeLabel(activePlatform), type: 'error' });
      setTimeout(() => setScheduleNotification(null), 4000);
      return;
    }
    // Check for LinkedIn platform
    if (activePlatform === 'linkedin') {
      setIsCheckingLinkedIn(true);
      try {
        const status = await getLinkedInStatus();
        if (!status.connected) {
          setShowConnectLinkedInModal(true);
          return;
        }
        if (status.tokenExpired) {
          setShowConnectLinkedInModal(true);
          return;
        }
      } catch (e) {
        console.error('Failed to check LinkedIn status:', e);
        // If we can't check status, show connect modal to be safe
        setShowConnectLinkedInModal(true);
        return;
      } finally {
        setIsCheckingLinkedIn(false);
      }
    }

    // Check for X/Twitter platform
    if (activePlatform === 'twitter') {
      setIsCheckingX(true);
      try {
        const status = await getTwitterStatus();
        if (!status.connected) {
          setShowConnectXModal(true);
          return;
        }
        if (status.tokenExpired) {
          setShowConnectXModal(true);
          return;
        }
      } catch (e) {
        console.error('Failed to check X status:', e);
        // If we can't check status, show connect modal to be safe
        setShowConnectXModal(true);
        return;
      } finally {
        setIsCheckingX(false);
      }
    }

    // If connected (or platform doesn't require connection), open the schedule modal
    setShowScheduleModal(true);
  };

  useEffect(() => {
    if (showScheduleModal && activePlatform === 'email' && emailProvider === 'mailchimp') {
      loadMailchimpOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showScheduleModal, activePlatform, emailProvider]);

  const handleSchedulePost = async () => {
    if (!scheduleDate || !scheduleTime || !transcript || !transcript.result) return;

    if (!isSchedulingSupported(activePlatform)) {
      setScheduleNotification({ message: getSchedulingBadgeLabel(activePlatform), type: 'error' });
      setTimeout(() => setScheduleNotification(null), 4000);
      return;
    }

    let mailchimpSuccessMessage: string | null = null;
    setIsScheduling(true);
    try {
      const startDateTime = new Date(`${scheduleDate}T${scheduleTime}`);

      // Special handling for Twitter threads - schedule 1 tweet per day
      if (activePlatform === 'twitter' && transcript.result.socialContent.twitterThread && transcript.result.socialContent.twitterThread.length > 1) {
        const tweets = transcript.result.socialContent.twitterThread;

        // Schedule each tweet on a different day
        for (let i = 0; i < tweets.length; i++) {
          const tweetDateTime = new Date(startDateTime.getTime() + (i * 24 * 60 * 60 * 1000)); // Add i days
          await schedulePost({
            platform: 'twitter',
            content: tweets[i],
            scheduledDate: tweetDateTime.toISOString(),
            status: 'Scheduled',
            transcriptId: transcript.id,
            metadata: {
              threadIndex: i + 1,
              totalTweets: tweets.length
            }
          });
        }

        // Update local state
        setScheduledByPlatform(prev => ({
          ...prev,
          [activePlatform]: {
            scheduledDate: startDateTime.toISOString(),
            status: 'Scheduled'
          }
        }));

        // Show success notification
        const endDate = new Date(startDateTime.getTime() + ((tweets.length - 1) * 24 * 60 * 60 * 1000));
        const successMessage = `✓ ${tweets.length} X posts scheduled from ${startDateTime.toLocaleDateString()} to ${endDate.toLocaleDateString()} (1 per day)`;
        setScheduleNotification({ message: successMessage, type: 'success' });
      } else {
        // Standard single post scheduling for other platforms
        const content = getContentForPlatform(activePlatform, transcript.result.socialContent);

        console.log('[DEBUG Schedule] activePlatform:', activePlatform);
        console.log('[DEBUG Schedule] content from getContentForPlatform:', content?.substring(0, 100));
        console.log('[DEBUG Schedule] linkedinPost:', transcript.result.socialContent?.linkedinPost?.substring(0, 100));

        const emailSubject = transcript.result.socialContent?.emailNewsletter?.subject;
        const emailBody = transcript.result.socialContent?.emailNewsletter?.body;
        const emailContent = emailSubject && emailBody ? `Subject: ${emailSubject}\n\n${emailBody}` : content;

        if (activePlatform === 'email') {
          if (emailProvider === 'mailchimp') {
            if (!newsletterDestinationId || !newsletterAutomationId) {
              setScheduleNotification({ message: 'You must connect your Mailchimp account and select a trigger tag before scheduling email content.', type: 'error' });
              setTimeout(() => setScheduleNotification(null), 4000);
              setIsScheduling(false);
              return;
            }

            await scheduleNewsletterTrigger({
              scheduledDate: startDateTime.toISOString(),
              content: emailContent,
              destinationId: newsletterDestinationId,
              automationId: newsletterAutomationId,
            });

            const selectedAutomation = mailchimpAutomations.find((a) => a.id === newsletterAutomationId);
            const tagName = selectedAutomation?.trigger_value || selectedAutomation?.name || 'selected tag';
            mailchimpSuccessMessage = `✅ Scheduled\nAt the scheduled time, LoquiHQ will apply the tag ${tagName} in Mailchimp.\nYour automation will handle delivery.`;
          } else if (emailProvider === 'sendgrid') {
            if (!selectedSendGridListId || !selectedSendGridTemplateId) {
              setScheduleNotification({ message: 'You must select a marketing list and template before scheduling via SendGrid.', type: 'error' });
              setTimeout(() => setScheduleNotification(null), 4000);
              setIsScheduling(false);
              return;
            }

            await createScheduledPost({
              platform: 'email',
              provider: 'sendgrid',
              title: emailSubjectOverride || emailSubject || null,
              content: emailContent,
              scheduledDate: startDateTime.toISOString(),
              transcriptId: transcript.id,
              meta: {
                provider: 'sendgrid',
                emailType: 'newsletter',
                listId: selectedSendGridListId,
                templateId: selectedSendGridTemplateId,
                subject: emailSubjectOverride || emailSubject || 'Newsletter',
              },
            });
          } else {
            await createScheduledPost({
              platform: 'email',
              provider: 'kit',
              content: emailContent,
              scheduledDate: startDateTime.toISOString(),
              transcriptId: transcript.id,
              meta: {
                provider: 'kit',
                emailType: 'newsletter',
              },
            });
          }
        } else {
          console.log('[DEBUG Schedule] Scheduling non-email platform with content:', content?.substring(0, 100));
          await schedulePost({
            platform: activePlatform,
            provider: undefined,
            title: undefined,
            content: content,
            contentHtml: undefined,
            scheduledDate: startDateTime.toISOString(),
            status: 'Scheduled',
            transcriptId: transcript.id,
            metadata: undefined
          });
        }

        // Update local state immediately to show the "Scheduled" badge
        setScheduledByPlatform(prev => ({
          ...prev,
          [activePlatform]: {
            scheduledDate: startDateTime.toISOString(),
            status: 'Scheduled'
          }
        }));

        // Show success notification
        const platformName = activePlatform === 'teaser' ? 'Newsletter Teaser' : activePlatform.charAt(0).toUpperCase() + activePlatform.slice(1);
        const defaultSuccessMessage = `✓ ${platformName} post scheduled for ${startDateTime.toLocaleDateString()} at ${startDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        const successMessage = mailchimpSuccessMessage || defaultSuccessMessage;
        setScheduleNotification({ message: successMessage, type: 'success' });
      }

      // Also refresh from DB for consistency
      loadScheduledPosts();

      // Auto-dismiss notification after 5 seconds
      setTimeout(() => setScheduleNotification(null), 5000);

      // Close modal and reset form
      setTimeout(() => {
        setShowScheduleModal(false);
        setScheduleDate('');
        setScheduleTime('');
      }, 500);
    } catch (e) {
      console.error(e);
      const apiMessage = getApiErrorMessage(e);
      const errorMessage = apiMessage || "Failed to schedule post. The backend may not be running.";
      setScheduleNotification({ message: errorMessage, type: 'error' });
      setTimeout(() => setScheduleNotification(null), 5000);
    } finally {
      setIsScheduling(false);
    }
  };

  const generateMonetization = async () => {
    if (!transcript || !transcript.result) return;
    setIsGeneratingMonetization(true);
    try {
      // Build detailed, episode-specific context
      const speakers = transcript.result.speakers?.map(s => `${s.name} (${s.role}): ${s.contribution}`).join('\n') || '';
      const quotes = transcript.result.quotes?.map(q => `"${q.text}" - ${q.speaker}`).join('\n') || '';
      const blogSections = transcript.result.blogPost?.sections?.map(s => `${s.heading}: ${s.content.substring(0, 200)}`).join('\n') || '';

      const context = `
EPISODE TITLE: ${transcript.title}

MAIN TOPICS & THEMES:
${transcript.result.keyTakeaways?.join('\n- ') || 'Not available'}

KEY INSIGHTS FROM DISCUSSION:
${blogSections || 'Not available'}

NOTABLE QUOTES:
${quotes.substring(0, 1000) || 'Not available'}

SPEAKERS & THEIR EXPERTISE:
${speakers || 'Not available'}

SEO KEYWORDS (Topics Covered):
${transcript.result.seo?.keywords?.join(', ') || 'Not available'}

AUDIENCE TONE & SENTIMENT:
Sentiment: ${transcript.result.sentiment?.label || 'N/A'} (${transcript.result.sentiment?.score || 'N/A'}/100)
Tone: ${transcript.result.sentiment?.tone || 'N/A'}

TRANSCRIPT EXCERPT (First 1000 chars):
${(transcript.content || '').substring(0, 1000)}
      `.trim();

      const insights = await generateSponsorshipInsights(context, true);

      // merge into result
      await saveTranscriptResult(transcript.id, { sponsorship: insights });
      await loadData();
    } catch (e) {
      console.error("Sponsorship generation failed:", e);
      const msg = (e as any)?.message ?? String(e);
      alert(`Failed to generate sponsorship insights: ${msg}`);
    } finally {
      setIsGeneratingMonetization(false);
    }
  };

  const handleMonetizationInput = async (monetizationInput: MonetizationInput) => {
    if (!transcript || !transcript.result) return;

    try {
      // Build episode context
      const speakers = transcript.result.speakers?.map(s => `${s.name} (${s.role}): ${s.contribution}`).join('\n') || '';
      const quotes = transcript.result.quotes?.map(q => `"${q.text}" - ${q.speaker}`).join('\n') || '';
      const blogSections = transcript.result.blogPost?.sections?.map(s => `${s.heading}: ${s.content.substring(0, 200)}`).join('\n') || '';

      const context = `
EPISODE TITLE: ${transcript.title}

MAIN TOPICS & THEMES:
${transcript.result.keyTakeaways?.join('\n- ') || 'Not available'}

KEY INSIGHTS FROM DISCUSSION:
${blogSections || 'Not available'}

NOTABLE QUOTES:
${quotes.substring(0, 1000) || 'Not available'}

SPEAKERS & THEIR EXPERTISE:
${speakers || 'Not available'}

SEO KEYWORDS (Topics Covered):
${transcript.result.seo?.keywords?.join(', ') || 'Not available'}

AUDIENCE TONE & SENTIMENT:
Sentiment: ${transcript.result.sentiment?.label || 'N/A'} (${transcript.result.sentiment?.score || 'N/A'}/100)
Tone: ${transcript.result.sentiment?.tone || 'N/A'}

TRANSCRIPT EXCERPT (First 1000 chars):
${(transcript.content || '').substring(0, 1000)}
      `.trim();

      const insights = await generateTruthBasedMonetization(context, monetizationInput);

      // Save to transcript
      await saveTranscriptResult(transcript.id, { sponsorship: insights });
      await loadData();
    } catch (e) {
      console.error("Truth-based monetization generation failed:", e);
      const msg = (e as any)?.message ?? String(e);
      alert(`Failed to generate monetization insights: ${msg}`);
    }
  };

  const handleRepurpose = async (type: 'email_series' | 'social_calendar' | 'linkedin_article' | 'image_prompts' | 'facebook_post') => {
    if (!transcript || !transcript.result) return;
    setIsRepurposing(true);
    try {
      const context = `
        Title: ${transcript.title}
        Key Takeaways: ${transcript.result.keyTakeaways?.join('\n') || ''}
        Blog Post: ${transcript.result.blogPost?.intro || ''}
      `;
      const result = await generateRepurposedContent(type, context);

      const currentRepurposed = transcript.result.repurposed || {};
      const updatedRepurposed = { ...currentRepurposed, ...result };

      await saveTranscriptResult(transcript.id, { repurposed: updatedRepurposed });
      await loadData();

      if (type === 'facebook_post') {
        alert('Facebook content generated.');
      }

      if (type === 'email_series') setActiveRepurposeView('email');
      if (type === 'social_calendar') setActiveRepurposeView('calendar');
      if (type === 'linkedin_article') setActiveRepurposeView('article');
      if (type === 'image_prompts') setActiveRepurposeView('images');
      if (type === 'facebook_post') setActiveRepurposeView('facebook');
    } catch (e) {
      console.error('Repurpose failed', e);
      const msg = (e as any)?.message ?? (typeof e === 'string' ? e : 'Unknown error');
      alert(`Failed to repurpose content: ${msg}`);
    } finally {
      setIsRepurposing(false);
    }
  };

  // Auto-generate all repurposing content when the Repurposing tab is first viewed
  useEffect(() => {
    const autoGenerateRepurposing = async () => {
      if (!transcript || !transcript.result || hasAutoGeneratedRepurposing || activeTab !== 'repurpose') return;

      const repurposed = transcript.result.repurposed || {};
      const needsGeneration = !repurposed.emailSeries && !repurposed.socialCalendar && !repurposed.linkedinArticle && !repurposed.imagePrompts && !repurposed.facebookPost;

      if (!needsGeneration) {
        setHasAutoGeneratedRepurposing(true);
        return;
      }

      setIsRepurposing(true);
      setHasAutoGeneratedRepurposing(true);

      try {
        const context = `
          Title: ${transcript.title}
          Key Takeaways: ${transcript.result.keyTakeaways?.join('\n') || ''}
          Blog Post: ${transcript.result.blogPost?.intro || ''}
        `;

        // Generate all content types in parallel
        const [emailResult, calendarResult, articleResult, imageResult, facebookResult] = await Promise.all([
          generateRepurposedContent('email_series', context),
          generateRepurposedContent('social_calendar', context),
          generateRepurposedContent('linkedin_article', context),
          generateRepurposedContent('image_prompts', context),
          generateRepurposedContent('facebook_post', context),
        ]);

        const combinedRepurposed = {
          ...emailResult,
          ...calendarResult,
          ...articleResult,
          ...imageResult,
          ...facebookResult,
        };

        await saveTranscriptResult(transcript.id, { repurposed: combinedRepurposed });
        await loadData();
      } catch (e) {
        console.error("Auto-generation of repurposing content failed:", e);
        // Don't show alert for auto-generation failures, just log them
      } finally {
        setIsRepurposing(false);
      }
    };

    autoGenerateRepurposing();
  }, [activeTab, transcript, hasAutoGeneratedRepurposing]);

  if (!transcript || !transcript.result) {
    return <div className="p-12 text-center text-textMuted">Loading results...</div>;
  }

  const { result, settings } = transcript;

  // COMMENTS: stored inside result.comments (NOT a table column)
  const comments: Comment[] = Array.isArray((result as any).comments) ? (result as any).comments : [];

  // Safe defaults
  const socialContent = result.socialContent || {
    linkedinPost: "No content generated.",
    twitterThread: [],
    tiktokScript: "No content generated.",
    youtubeDescription: "No content generated.",
    emailNewsletter: { subject: "", body: "" },
    mediumArticle: "No content generated.",
    newsletterTeaser: { subject: "", body: "" }
  };

  const seo = result.seo || {
    metaDescription: "",
    keywords: [],
    titleVariations: [],
    keywordAnalysis: [],
    readability: { score: 0, level: "N/A", suggestions: [] },
    internalLinks: []
  };

  const sentiment = result.sentiment || {
    score: 50,
    label: "Neutral",
    emotionalKeywords: [],
    tone: "N/A",
    audiencePrediction: "N/A",
    timeline: []
  };

  const repurposed = result.repurposed || {};

  const renderMonetizationTab = () => {
    if (!result.sponsorship) {
      return (
        <div className="flex flex-col items-center justify-center p-16 bg-gray-100 rounded-xl border border-gray-300 text-center">
          <DollarSign className="h-16 w-16 text-primary mb-4" />
          <h3 className="text-xl font-bold text-textPrimary mb-2">Unlock Monetization Insights</h3>
          <p className="text-textMuted max-w-md mb-8">
            Get real monetization advice based on your actual podcast metrics, not generic estimates.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setShowMonetizationModal(true)}
              style={{ backgroundColor: 'var(--color-primary)' }}
              className="text-white px-6 py-3 rounded-lg font-bold shadow-md hover:brightness-110 transition flex items-center gap-2 justify-center"
            >
              <Sparkles className="h-5 w-5" />
              Get Real Monetization Analysis
            </button>
            <button
              onClick={generateMonetization}
              disabled={isGeneratingMonetization}
              className="border-2 border-gray-300 text-textSecondary px-6 py-3 rounded-lg font-semibold hover:border-gray-400 hover:bg-gray-100 transition flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed justify-center"
            >
              {isGeneratingMonetization ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
              Quick Estimate (Legacy)
            </button>
          </div>
        </div>
      );
    }

    const { sponsorship } = result;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Change Analysis Method Button */}
          <div className="flex justify-end">
            <button
              onClick={async () => {
                if (!transcript) return;
                await saveTranscriptResult(transcript.id, { sponsorship: null });
                await loadData();
              }}
              className="text-sm text-textSecondary hover:text-textPrimary font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
            >
              ← Change Analysis Method
            </button>
          </div>

          {/* Truth Statement & Data Confidence */}
          {sponsorship.truthStatement && (
            <div className="bg-linear-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
              <div className="flex items-start gap-3 mb-4">
                <Target className="h-6 w-6 shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-bold mb-2">The Truth About Your Monetization</h3>
                  <p className="text-xl font-semibold leading-relaxed">{sponsorship.truthStatement}</p>
                </div>
              </div>
              {sponsorship.nextBestMove && (
                <div className="mt-4 p-4 bg-white/10 rounded-lg border border-white/20">
                  <h4 className="font-bold text-sm uppercase tracking-wide mb-2">Next Best Move</h4>
                  <p className="text-base leading-relaxed">{sponsorship.nextBestMove}</p>
                </div>
              )}
              {sponsorship.whyThisWorksNow && sponsorship.whyThisWorksNow.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-bold text-sm uppercase tracking-wide mb-2">Why This Works Now</h4>
                  <ul className="space-y-1.5">
                    {sponsorship.whyThisWorksNow.map((reason: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-4 w-4 shrink-0 mt-0.5" />
                        <span className="text-sm">{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Data Confidence Display */}
          {sponsorship.dataConfidence && sponsorship.overallConfidence && (
            <DataConfidenceDisplay
              dataConfidence={sponsorship.dataConfidence}
              overallConfidence={sponsorship.overallConfidence}
            />
          )}

          {/* Key Metrics Summary with Confidence */}
          {sponsorship.metrics && (
            <div className="bg-gray-100 rounded-xl border border-gray-300 p-6">
              <h3 className="font-bold text-textPrimary mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-textMuted" />
                Your Podcast Metrics
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {sponsorship.metrics.downloadsPerEpisode && (
                  <div className="p-3 bg-gray-100 rounded-lg border border-gray-300">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-textMuted font-medium">Downloads/Ep</span>
                      {sponsorship.dataConfidence && (() => {
                        const conf = sponsorship.dataConfidence.find((d: any) => d.field === 'downloadsPerEpisode');
                        return conf ? (
                          <span className="text-xs">
                            {conf.confidence === 'verified' ? '🟢' : conf.confidence === 'estimated' ? '🟡' : '🔴'}
                          </span>
                        ) : null;
                      })()}
                    </div>
                    <div className="text-lg font-bold text-textPrimary">
                      {sponsorship.metrics.downloadsPerEpisode.toLocaleString()}
                    </div>
                  </div>
                )}
                {sponsorship.metrics.completionRate && (
                  <div className="p-3 bg-gray-100 rounded-lg border border-gray-300">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-textMuted font-medium">Completion Rate</span>
                      {sponsorship.dataConfidence && (() => {
                        const conf = sponsorship.dataConfidence.find((d: any) => d.field === 'completionRate');
                        return conf ? (
                          <span className="text-xs">
                            {conf.confidence === 'verified' ? '🟢' : conf.confidence === 'estimated' ? '🟡' : '🔴'}
                          </span>
                        ) : null;
                      })()}
                    </div>
                    <div className="text-lg font-bold text-textPrimary">
                      {sponsorship.metrics.completionRate}%
                    </div>
                  </div>
                )}
                {sponsorship.metrics.totalEpisodes && (
                  <div className="p-3 bg-gray-100 rounded-lg border border-gray-300">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-textMuted font-medium">Total Episodes</span>
                      {sponsorship.dataConfidence && (() => {
                        const conf = sponsorship.dataConfidence.find((d: any) => d.field === 'totalEpisodes');
                        return conf ? (
                          <span className="text-xs">
                            {conf.confidence === 'verified' ? '🟢' : conf.confidence === 'estimated' ? '🟡' : '🔴'}
                          </span>
                        ) : null;
                      })()}
                    </div>
                    <div className="text-lg font-bold text-textPrimary">
                      {sponsorship.metrics.totalEpisodes}
                    </div>
                  </div>
                )}
                {sponsorship.metrics.emailListSize && (
                  <div className="p-3 bg-gray-100 rounded-lg border border-gray-300">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-textMuted font-medium">Email List</span>
                      {sponsorship.dataConfidence && (() => {
                        const conf = sponsorship.dataConfidence.find((d: any) => d.field === 'emailListSize');
                        return conf ? (
                          <span className="text-xs">
                            {conf.confidence === 'verified' ? '🟢' : conf.confidence === 'estimated' ? '🟡' : '🔴'}
                          </span>
                        ) : null;
                      })()}
                    </div>
                    <div className="text-lg font-bold text-textPrimary">
                      {sponsorship.metrics.emailListSize.toLocaleString()}
                    </div>
                  </div>
                )}
                {sponsorship.metrics.youtubeSubscribers && (
                  <div className="p-3 bg-gray-100 rounded-lg border border-gray-300">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-textMuted font-medium">YouTube Subs</span>
                      {sponsorship.dataConfidence && (() => {
                        const conf = sponsorship.dataConfidence.find((d: any) => d.field === 'youtubeSubscribers');
                        return conf ? (
                          <span className="text-xs">
                            {conf.confidence === 'verified' ? '🟢' : conf.confidence === 'estimated' ? '🟡' : '🔴'}
                          </span>
                        ) : null;
                      })()}
                    </div>
                    <div className="text-lg font-bold text-textPrimary">
                      {sponsorship.metrics.youtubeSubscribers.toLocaleString()}
                    </div>
                  </div>
                )}
                {sponsorship.metrics.estimatedCPM && (
                  <div className="p-3 bg-gray-100 rounded-lg border border-gray-300">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-textMuted font-medium">CPM Rate</span>
                      {sponsorship.dataConfidence && (() => {
                        const conf = sponsorship.dataConfidence.find((d: any) => d.field === 'estimatedCPM');
                        return conf ? (
                          <span className="text-xs">
                            {conf.confidence === 'verified' ? '🟢' : conf.confidence === 'estimated' ? '🟡' : '🔴'}
                          </span>
                        ) : null;
                      })()}
                    </div>
                    <div className="text-lg font-bold text-textPrimary">
                      ${sponsorship.metrics.estimatedCPM}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-gray-100 rounded-xl border border-gray-300 p-6 flex flex-col md:flex-row gap-6 items-center">
            <div className="relative w-32 h-32 shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r="56" stroke="#f3f4f6" strokeWidth="12" fill="transparent" />
                <circle
                  cx="64" cy="64" r="56"
                  stroke={sponsorship.score >= 80 ? '#10B981' : sponsorship.score >= 50 ? '#F59E0B' : '#EF4444'}
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray={351}
                  strokeDashoffset={351 - (351 * sponsorship.score / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-3xl font-bold text-textPrimary">{sponsorship.score}</span>
                <span className="text-xs font-bold text-textMuted uppercase">Score</span>
              </div>
            </div>
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-textPrimary mb-2">Sponsorship Readiness</h3>
                    {sponsorship.enrichment?.sources && (
                      <div className="text-xs text-textMuted mb-2">Live data: {sponsorship.enrichment.sources.join(', ')}</div>
                    )}

                    {sponsorship.enrichmentAttempted && sponsorship.enrichmentNote === 'noSponsorCandidates' && (
                      <div className="text-xs text-textMuted mt-1">Live data was checked but no sponsor mentions were found in show notes / feed.</div>
                    )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyJSON(sponsorship, 'copy-sponsorship');
                    }}
                    className="px-3 py-1 bg-gray-100 border rounded-md text-sm"
                  >
                    {copiedSection === 'copy-sponsorship' ? 'Copied' : 'Copy JSON'}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      generateMonetization();
                    }}
                    disabled={isGeneratingMonetization}
                    className="px-3 py-1 bg-gray-100 border rounded-md text-sm disabled:opacity-70"
                  >
                    {isGeneratingMonetization ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Regenerate'}
                  </button>
                </div>
              </div>

              <div className="mt-3">
                <div className="flex flex-wrap gap-2">
                  {sponsorship.potentialAdSpots?.map((spot: string, i: number) => (
                    <span key={i} className="text-xs bg-accent-soft text-primary px-2.5 py-1 rounded-md border border-primary font-medium">
                      {spot}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-100 rounded-xl border border-gray-300 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-300 bg-gray-50">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-textPrimary flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-textMuted" /> Suggested Sponsors
                  </h3>
                  {sponsorship.researchMetadata && (
                    <p className="text-xs text-textMuted mt-1">
                      {sponsorship.researchMetadata.totalSponsorBrands} brands analyzed • {sponsorship.researchMetadata.categoriesMatched} categories matched
                      {sponsorship.researchMetadata.liveDataUsed && ' • Live data included'}
                    </p>
                  )}
                </div>
                {sponsorship.overallConfidence && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-textMuted">Confidence:</span>
                    <CompactConfidenceIndicator
                      confidence={
                        sponsorship.overallConfidence === 'high' ? 'verified' :
                        sponsorship.overallConfidence === 'medium' ? 'estimated' :
                        'unknown'
                      }
                      source={sponsorship.overallConfidence}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {sponsorship.suggestedSponsors?.map((rec: any, i: number) => (
                <div key={i} className="p-6 hover:bg-gray-100 transition">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h4 className="font-bold text-textPrimary text-lg">{rec.category || rec.industry}</h4>
                      {rec.estimatedCPM && (
                        <p className="text-xs text-accent-emerald font-semibold mt-1">Est. {rec.estimatedCPM}</p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyJSON(rec, `copy-sponsor-${i}`);
                      }}
                      className="px-2 py-1 bg-gray-100 border rounded-md text-xs shrink-0 ml-3"
                    >
                      {copiedSection === `copy-sponsor-${i}` ? 'Copied' : 'Copy'}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {rec.brands?.slice(0, 8).map((brand: string) => (
                      <span key={brand} className="text-xs bg-accent-soft text-primary px-2.5 py-1 rounded-md border border-primary font-medium">{brand}</span>
                    ))}
                  </div>

                  <p className="text-sm text-textSecondary mb-2">{rec.matchReason}</p>

                  {rec.typicalDeal && (
                    <p className="text-xs text-textMuted italic">Typical deal: {rec.typicalDeal}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-100 rounded-xl border border-gray-300 p-6">
            <h3 className="font-bold text-textPrimary mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" /> Target Audience Profile
            </h3>
            <p className="text-textSecondary text-sm leading-relaxed bg-gray-100 p-4 rounded-lg border border-gray-300">
              {sponsorship.targetAudienceProfile}
            </p>
          </div>

          {sponsorship.actionableNextSteps && sponsorship.actionableNextSteps.length > 0 && (
            <div className="bg-gray-100 rounded-xl border border-gray-300 p-6">
              <h3 className="font-bold text-textPrimary mb-4">Next Steps to Land Sponsors</h3>
              <ol className="space-y-3">
                {sponsorship.actionableNextSteps.map((step: string, i: number) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                    <span className="text-sm text-textSecondary pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {sponsorship.platformRecommendations && (
            <div className="bg-gray-100 rounded-xl border border-gray-300 p-6">
              <h3 className="font-bold text-textPrimary mb-4">Platform Monetization Opportunities</h3>
              <div className="grid gap-4">
                {Object.entries(sponsorship.platformRecommendations).map(([platform, data]: [string, any]) => (
                  <div key={platform} className="flex items-start gap-3 p-3 bg-gray-100 rounded-lg border border-gray-300">
                    <div className={`px-2 py-1 rounded text-xs font-bold ${
                      data.priority === 'High' ? 'bg-accent-soft text-green-700' :
                      data.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-textSecondary'
                    }`}>
                      {data.priority}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-textPrimary text-sm capitalize">{platform}</div>
                      <div className="text-xs text-accent-emerald font-mono mt-0.5">{data.cpmRange}</div>
                      <div className="text-xs text-textSecondary mt-1">{data.notes}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sponsorship.dataSources && sponsorship.dataSources.length > 0 && (
            <div className="bg-gray-100 rounded-xl border border-gray-300 p-6">
              <h3 className="font-bold text-textPrimary mb-3 text-sm">Data Sources</h3>
              <div className="flex flex-wrap gap-2">
                {sponsorship.dataSources.map((source: string, i: number) => (
                  <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100">
                    {source}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-1 space-y-8">
          <div className="bg-gray-100 rounded-xl border border-gray-300 p-6 shadow-sm">
            <h3 className="font-bold text-textPrimary mb-2 flex items-center gap-2">
              <Calculator className="h-5 w-5 text-green-500" /> Revenue Calculator
            </h3>

            {sponsorship?.estimatedMetrics && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <div className="text-xs font-semibold text-blue-900 mb-1">
                  Estimates (
                  <span className={
                    sponsorship.estimatedMetrics.confidence === 'high' ? 'text-green-600' :
                    sponsorship.estimatedMetrics.confidence === 'medium' ? 'text-yellow-600' :
                    'text-textSecondary'
                  }>
                    {sponsorship.estimatedMetrics.confidence} confidence
                  </span>
                  )
                </div>
                <div className="text-xs text-blue-700">{sponsorship.estimatedMetrics.basedOn}</div>
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-textMuted uppercase">Downloads per Ep</label>
                  {sponsorship?.dataConfidence && (
                    (() => {
                      const downloadConfidence = sponsorship.dataConfidence.find((d: any) =>
                        d.field === 'downloadsPerEpisode' || d.label.includes('Downloads')
                      );
                      if (downloadConfidence) {
                        return (
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            downloadConfidence.confidence === 'verified' ? 'bg-green-100 text-green-700' :
                            downloadConfidence.confidence === 'estimated' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-textSecondary'
                          }`}>
                            {downloadConfidence.confidence === 'verified' ? '🟢' :
                             downloadConfidence.confidence === 'estimated' ? '🟡' : '🔴'}
                          </span>
                        );
                      }
                      return null;
                    })()
                  )}
                </div>
                <input
                  type="number"
                  value={downloads}
                  onChange={(e) => setDownloads(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-textMuted uppercase">CPM Rate ($)</label>
                  {sponsorship?.dataConfidence && (
                    (() => {
                      const cpmConfidence = sponsorship.dataConfidence.find((d: any) =>
                        d.field === 'estimatedCPM' || d.label.includes('CPM')
                      );
                      if (cpmConfidence) {
                        return (
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            cpmConfidence.confidence === 'verified' ? 'bg-green-100 text-green-700' :
                            cpmConfidence.confidence === 'estimated' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-textSecondary'
                          }`}>
                            {cpmConfidence.confidence === 'verified' ? '🟢' :
                             cpmConfidence.confidence === 'estimated' ? '🟡' : '🔴'}
                          </span>
                        );
                      }
                      return null;
                    })()
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-textMuted">$</span>
                  <input
                    type="number"
                    value={cpm}
                    onChange={(e) => setCpm(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg p-2.5 pl-7 outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            <div className="bg-accent-soft rounded-lg p-4 border border-green-100 text-center">
              <div className="text-xs font-bold text-accent-emerald uppercase mb-1">Estimated Revenue</div>
              <div className="text-3xl font-extrabold text-green-700">
                ${((downloads / 1000) * cpm).toFixed(2)}
              </div>
              <div className="text-xs text-green-500 mt-1">per episode</div>
            </div>

            {/* Show under-monetization if available */}
            {sponsorship.underMonetizedBy !== undefined && sponsorship.underMonetizedBy > 0 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-center">
                <div className="text-xs font-bold text-red-900 uppercase mb-1">Under-Monetized By</div>
                <div className="text-2xl font-extrabold text-red-700">
                  ${sponsorship.underMonetizedBy.toFixed(2)}
                </div>
                <div className="text-xs text-red-600 mt-1">per episode</div>
              </div>
            )}

            {/* Show readiness score if available */}
            {sponsorship.readinessScore !== undefined && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-textSecondary">Readiness Score</span>
                  <span className="text-xs font-bold text-textPrimary">{sponsorship.readinessScore}/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      sponsorship.readinessScore >= 80 ? 'bg-green-500' :
                      sponsorship.readinessScore >= 60 ? 'bg-yellow-500' :
                      sponsorship.readinessScore >= 40 ? 'bg-orange-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${sponsorship.readinessScore}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Ranked Recommendations by Readiness */}
          {sponsorship.recommendations && sponsorship.recommendations.length > 0 && (
            <div className="bg-gray-100 rounded-xl border border-gray-300 p-6">
              <h3 className="font-bold text-textPrimary mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Monetization Strategies
              </h3>
              <div className="space-y-3">
                {sponsorship.recommendations
                  .sort((a: any, b: any) => b.readiness - a.readiness)
                  .slice(0, 4)
                  .map((rec: any, i: number) => (
                    <div
                      key={i}
                      className="border border-gray-300 rounded-lg p-3 hover:border-primary transition"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-textPrimary capitalize">
                              {rec.type}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                              rec.priority === 'immediate' ? 'bg-red-100 text-red-700' :
                              rec.priority === 'short-term' ? 'bg-orange-100 text-orange-700' :
                              rec.priority === 'medium-term' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-textSecondary'
                            }`}>
                              {rec.priority}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-textSecondary mb-2">
                            <span className="font-mono">${rec.estimatedRevenue?.toLocaleString()}/mo</span>
                            <span>•</span>
                            <span className="capitalize">{rec.effort} effort</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-textMuted mb-1">Readiness</div>
                          <div className={`text-lg font-bold ${
                            rec.readiness >= 80 ? 'text-green-600' :
                            rec.readiness >= 60 ? 'text-yellow-600' :
                            'text-textMuted'
                          }`}>
                            {rec.readiness}%
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-textSecondary leading-relaxed mb-2">
                        {rec.reasoning}
                      </p>
                      {rec.nextSteps && rec.nextSteps.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-300">
                          <div className="text-xs font-semibold text-textSecondary mb-1">Next Steps:</div>
                          <ul className="space-y-1">
                            {rec.nextSteps.slice(0, 2).map((step: string, idx: number) => (
                              <li key={idx} className="text-xs text-textSecondary flex items-start gap-1">
                                <span className="text-primary mt-0.5">→</span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="bg-gray-100 rounded-xl border border-gray-300 p-6">
            <h3 className="font-bold text-textPrimary mb-4">Actions</h3>

            <div className="flex flex-col gap-3 mb-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyJSON(result.sponsorship, 'copy-sponsorship');
                }}
                className="w-full flex items-center justify-center gap-2 bg-gray-100 text-textSecondary border border-gray-300 px-4 py-3 rounded-lg hover:bg-gray-100 transition"
              >
                <FileJson className="h-4 w-4" /> {copiedSection === 'copy-sponsorship' ? 'Copied' : 'Copy Sponsorship JSON'}
              </button>

              <button
                onClick={() => handleDownload('kit')}
                className="w-full flex items-center justify-center gap-2 bg-accent-soft text-primary border border-primary px-4 py-3 rounded-lg font-bold hover:bg-primary transition"
              >
                <FileText className="h-5 w-5" /> Download Media Kit
              </button>
            </div>

            <p className="text-xs text-center text-textMuted mb-6">Generates a PDF one-sheet with your stats and audience profile.</p>

            <h4 className="font-bold text-textPrimary text-sm mb-3">Recommended Ad Networks</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-textSecondary">
                <ExternalLink className="h-3 w-3 text-textMuted" /> Gumball
              </li>
              <li className="flex items-center gap-2 text-sm text-textSecondary">
                <ExternalLink className="h-3 w-3 text-textMuted" /> AdvertiseCast
              </li>
              <li className="flex items-center gap-2 text-sm text-textSecondary">
                <ExternalLink className="h-3 w-3 text-textMuted" /> Podcorn
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const renderRepurposingTab = () => {
    const repurposed: Partial<RepurposedContent> = result.repurposed || {};

    return (
      <div className="bg-gray-100 rounded-xl border border-gray-300 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-textPrimary">Repurposing</h3>
            <p className="text-sm text-textMuted">Email series, social calendar, LinkedIn drafts, Facebook posts, and image prompts auto-generated from this episode.</p>
          </div>

          {isRepurposing && (
            <div className="flex items-center gap-2 text-sm text-textMuted">
              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
              Generating content...
            </div>
          )}
        </div>

        <div>
          {/* Hub view */}
          {activeRepurposeView === 'hub' && (
            <>
              {isRepurposing && !repurposed.emailSeries && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
                  <p className="text-textSecondary">Generating all repurposed content...</p>
                  <p className="text-sm text-textMuted mt-1">This will take about 30 seconds</p>
                </div>
              )}

              {(!isRepurposing || repurposed.emailSeries) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-100 rounded-lg border border-gray-300">
                    <h4 className="font-semibold text-textPrimary">Email Series</h4>
                    <p className="text-sm text-textSecondary mt-2">Short automated email sequences to onboard listeners or promote the episode.</p>
                    <div className="mt-4">
                      <button onClick={() => { setActiveRepurposeView('email'); }} className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm hover:bg-gray-200">Open</button>
                    </div>
                    <div className="mt-4 text-xs text-textMuted">{repurposed.emailSeries ? `${repurposed.emailSeries.length} emails generated` : 'Generating...'}</div>
                  </div>

                  <div className="p-4 bg-gray-100 rounded-lg border border-gray-300">
                    <h4 className="font-semibold text-textPrimary">Social Calendar</h4>
                    <p className="text-sm text-textSecondary mt-2">25 posts across 5 platforms (Instagram, Facebook, LinkedIn, X, Instagram Stories) for 5 days.</p>
                    <div className="mt-4">
                      <button onClick={() => { setActiveRepurposeView('calendar'); }} className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm hover:bg-gray-200">Open</button>
                    </div>
                    <div className="mt-4 text-xs text-textMuted">{repurposed.socialCalendar ? `${repurposed.socialCalendar.length} posts generated` : 'Generating...'}</div>
                  </div>

                  <div className="p-4 bg-gray-100 rounded-lg border border-gray-300">
                    <h4 className="font-semibold text-textPrimary">LinkedIn Article</h4>
                    <p className="text-sm text-textSecondary mt-2">A draft article adapted for LinkedIn based on the episode's insights.</p>
                    <div className="mt-4">
                      <button onClick={() => { setActiveRepurposeView('article'); }} className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm hover:bg-gray-200">Open</button>
                    </div>
                    <div className="mt-4 text-xs text-textMuted">{repurposed.linkedinArticle ? 'Draft available' : 'Generating...'}</div>
                  </div>

                  <div className="p-4 bg-gray-100 rounded-lg border border-gray-300">
                    <h4 className="font-semibold text-textPrimary">Facebook Post</h4>
                    <p className="text-sm text-textSecondary mt-2">A ready-to-post Facebook update with hook, value, and CTA.</p>
                    <div className="mt-4">
                      <button onClick={() => { setActiveRepurposeView('facebook'); }} className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm hover:bg-gray-200">Open</button>
                    </div>
                    <div className="mt-4 text-xs text-textMuted">{repurposed.facebookPost ? 'Post available' : 'Generating...'}</div>
                  </div>

                  <div className="p-4 bg-gray-100 rounded-lg border border-gray-300">
                    <h4 className="font-semibold text-textPrimary">Image Prompts</h4>
                    <p className="text-sm text-textSecondary mt-2">AI image prompts for social graphics or quote cards.</p>
                    <div className="mt-4">
                      <button onClick={() => { setActiveRepurposeView('images'); }} className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm hover:bg-gray-200">Open</button>
                    </div>
                    <div className="mt-4 text-xs text-textMuted">{repurposed.imagePrompts ? `${repurposed.imagePrompts.length} prompts` : 'Generating...'}</div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Email Series View */}
          {activeRepurposeView === 'email' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-textPrimary">Email Series</h4>
                <div className="flex gap-2">
                  <button onClick={() => setActiveRepurposeView('hub')} className="px-3 py-1 bg-gray-100 border rounded-md">Back</button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (repurposed.emailSeries) handleCopyJSON(repurposed.emailSeries, 'copy-json');
                    }}
                    className="px-3 py-1 bg-gray-100 border rounded-md text-sm"
                  >
                    {copiedSection === 'copy-json' ? 'Copied' : 'Copy JSON'}
                  </button>
                  {repurposed.emailSeries && repurposed.emailSeries.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSeriesScheduleType('email');
                        setSeriesScheduleItems(repurposed.emailSeries || []);
                        setShowSeriesScheduleWizard(true);
                      }}
                      className="px-3 py-1 bg-primary text-white rounded-md text-sm hover:bg-primary/90 transition flex items-center gap-1"
                    >
                      <CalendarIcon className="h-3 w-3" />
                      Schedule Series
                    </button>
                  )}
                </div>
              </div>

              {!repurposed.emailSeries ? (
                <div className="p-6 text-center text-textMuted">No email series generated. Click “Email Series” above to generate.</div>
              ) : (
                <div className="space-y-4">
                  {repurposed.emailSeries.map((e: any, i: number) => (
                    <div key={i} className="p-4 bg-gray-100 rounded-lg border border-gray-300">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-textPrimary">Day {e.day}: {e.subject}</div>
                          <div className="text-sm text-textSecondary mt-1 whitespace-pre-line">{e.body}</div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button onClick={() => navigator.clipboard.writeText(e.body)} className="px-3 py-1 bg-gray-100 border rounded-md text-sm">Copy</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Social Calendar View */}
          {activeRepurposeView === 'calendar' && (
            <SocialCalendarView
              repurposed={repurposed}
              transcript={transcript}
              copiedSection={copiedSection}
              handleCopyJSON={handleCopyJSON}
              setActiveRepurposeView={setActiveRepurposeView}
              scheduleNotification={scheduleNotification}
              setScheduleNotification={setScheduleNotification}
            />
          )}

          {/* LinkedIn Article View */}
          {activeRepurposeView === 'article' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-textPrimary">LinkedIn Article</h4>
                <div className="flex gap-2">
                  <button onClick={() => setActiveRepurposeView('hub')} className="px-3 py-1 bg-gray-100 border rounded-md">Back</button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (repurposed.linkedinArticle) handleCopy(repurposed.linkedinArticle, 'copy-linkedin');
                    }}
                    className="px-3 py-1 bg-gray-100 border rounded-md"
                  >
                    {copiedSection === 'copy-linkedin' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {!repurposed.linkedinArticle ? (
                <div className="p-6 text-center text-textMuted">No LinkedIn draft generated. Click “LinkedIn Article” above to generate.</div>
              ) : (
                <div className="prose max-w-none text-sm text-textSecondary">
                  <h2 className="text-lg font-bold mb-2">{transcript.title}</h2>
                  <div className="mt-2 whitespace-pre-line">{repurposed.linkedinArticle}</div>
                </div>
              )}
            </div>
          )}

          {/* Facebook Post View */}
          {activeRepurposeView === 'facebook' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-textPrimary">Facebook Post</h4>
                <div className="flex gap-2">
                  <button onClick={() => setActiveRepurposeView('hub')} className="px-3 py-1 bg-gray-100 border rounded-md">Back</button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (repurposed.facebookPost) handleCopy(repurposed.facebookPost, 'copy-facebook');
                    }}
                    className="px-3 py-1 bg-gray-100 border rounded-md"
                  >
                    {copiedSection === 'copy-facebook' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {!repurposed.facebookPost ? (
                <div className="p-6 text-center text-textMuted">No Facebook post generated. Click “Facebook Post” above to generate.</div>
              ) : (
                <div className="prose max-w-none text-sm text-textSecondary whitespace-pre-line">
                  {repurposed.facebookPost}
                </div>
              )}
            </div>
          )}

          {/* Image Prompts View */}
          {activeRepurposeView === 'images' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-textPrimary">Image Prompts</h4>
                <div className="flex gap-2">
                  <button onClick={() => setActiveRepurposeView('hub')} className="px-3 py-1 bg-gray-100 border rounded-md">Back</button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (repurposed.imagePrompts) handleCopyJSON(repurposed.imagePrompts, 'copy-json');
                    }}
                    className="px-3 py-1 bg-gray-100 border rounded-md"
                  >
                    {copiedSection === 'copy-json' ? 'Copied' : 'Copy JSON'}
                  </button>
                </div>
              </div>

              {!repurposed.imagePrompts ? (
                <div className="p-6 text-center text-textMuted">No image prompts generated. Click “Image Prompts” above to generate.</div>
              ) : (
                <div className="space-y-4">
                  {repurposed.imagePrompts.map((p: any, i: number) => (
                    <div key={i} className="p-3 bg-gray-100 rounded-lg border border-gray-300">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-textPrimary">{p.quote}</div>
                          <div className="text-sm text-textSecondary mt-1">{p.prompt}</div>
                        </div>
                        <div>
                          <button onClick={() => navigator.clipboard.writeText(p.prompt)} className="px-3 py-1 bg-gray-100 border rounded-md text-sm">Copy</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderOverviewTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <div className="bg-gray-100 rounded-xl shadow-sm border border-gray-300 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-textPrimary flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Key Takeaways
            </h2>
            <button
              onClick={() => handleCopy(result.keyTakeaways?.join('\n- ') || '', 'takeaways')}
              className="text-textMuted hover:text-primary transition"
            >
              {copiedSection === 'takeaways' ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
            </button>
          </div>
          <ul className="space-y-4">
            {result.keyTakeaways?.map((item: string, idx: number) => (
              <li key={idx} className="flex items-start text-textSecondary bg-accent-soft/50 p-3 rounded-lg">
                <span className="mr-3 text-primary font-bold mt-1">•</span>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-gray-100 rounded-xl shadow-sm border border-gray-300 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-textPrimary flex items-center gap-2">
              <Activity className="h-5 w-5 text-secondary" />
              Sentiment & Tone Analysis
            </h2>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-8 mb-8 border-b border-gray-300 pb-8">
            <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="80" cy="80" r="70" stroke="#f3f4f6" strokeWidth="12" fill="transparent" />
                <circle
                  cx="80" cy="80" r="70"
                  stroke={sentiment.score > 60 ? '#10B981' : sentiment.score < 40 ? '#EF4444' : '#F59E0B'}
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray={440}
                  strokeDashoffset={440 - (440 * sentiment.score / 100)}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-4xl font-extrabold text-textPrimary">{sentiment.score}</span>
                <span className={`text-sm font-bold uppercase tracking-wide ${
                  sentiment.score > 60 ? 'text-accent-emerald' : sentiment.score < 40 ? 'text-red-600' : 'text-yellow-600'
                }`}>{sentiment.label}</span>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <h4 className="text-xs font-bold text-textMuted uppercase mb-1">Overall Tone</h4>
                <p className="text-textPrimary font-medium text-lg leading-snug">{sentiment.tone || "Not available"}</p>
              </div>
              <div>
                <h4 className="text-xs font-bold text-textMuted uppercase mb-2">Emotional Triggers</h4>
                <div className="flex flex-wrap gap-2">
                  {sentiment.emotionalKeywords?.map((kw: string, idx: number) => (
                    <span key={idx} className="text-xs bg-gray-100 text-textSecondary px-2 py-1 rounded-md border border-gray-300">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="space-y-8">
        <div className="bg-gray-100 rounded-xl shadow-sm border border-gray-300 p-6 h-full">
          <h2 className="text-lg font-bold text-textPrimary mb-4 flex items-center gap-2">
            <Quote className="h-5 w-5 text-accent-violet" />
            Best Quotes
          </h2>
          <div className="space-y-6">
            {result.quotes?.map((quote: any, idx: number) => (
              <div key={idx} className="relative pl-4 border-l-4 border-purple-200">
                <blockquote className="italic text-textSecondary mb-2 text-sm leading-relaxed">
                  "{quote.text}"
                </blockquote>
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2 text-textMuted font-medium">
                    {quote.speaker && <span className="text-accent-violet bg-accent-soft px-1.5 rounded">{quote.speaker}</span>}
                    <span className="bg-gray-100 px-1.5 py-0.5 rounded text-textMuted font-mono">{quote.timestamp}</span>
                  </div>
                  <button onClick={() => handleCopy(`"${quote.text}"`, `quote-${idx}`)} className="text-gray-300 hover:text-primary transition">
                    {copiedSection === `quote-${idx}` ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );

  const renderPlatformTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="col-span-1 space-y-2">
          {[
            { id: 'linkedin', icon: Linkedin, label: 'LinkedIn' },
            { id: 'twitter', icon: Twitter, label: 'X' },
            { id: 'facebook', icon: Facebook, label: 'Facebook' },
            { id: 'tiktok', icon: Video, label: 'TikTok / Reels' },
            { id: 'youtube', icon: Youtube, label: 'YouTube Shorts' },
            { id: 'email', icon: Mail, label: 'Newsletter' },
            { id: 'medium', icon: FileType, label: 'Medium Article' },
            { id: 'teaser', icon: Send, label: 'Teaser' },
          ].map((platform) => (
          <button
            key={platform.id}
            onClick={() => setActivePlatform(platform.id as PlatformType)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition ${
              activePlatform === platform.id
                ? 'bg-primary text-white shadow-md'
                : 'bg-gray-100 text-textSecondary hover:bg-gray-100 border border-gray-300'
            }`}
          >
            <span className="flex items-center gap-3">
              <platform.icon className="h-4 w-4" />
              <span>{platform.label}</span>
              {!PLATFORM_FLAGS[platform.id as PlatformType]?.canSchedule && (
                <span className="text-[10px] uppercase tracking-wide text-gray-600 bg-gray-200 border border-gray-300 font-semibold px-1.5 py-0.5 rounded">
                  Coming soon
                </span>
              )}
            </span>
            {scheduledByPlatform[platform.id] && isSchedulingSupported(platform.id as PlatformType) && (
              <span className={`w-2 h-2 rounded-full ${activePlatform === platform.id ? 'bg-white' : 'bg-green-500'}`} title="Scheduled" />
            )}
          </button>
        ))}
      </div>

      <div className="col-span-1 md:col-span-3">
        <div className="bg-gray-100 rounded-xl shadow-sm border border-gray-300 overflow-hidden h-full">
          <div className="p-6 border-b border-gray-300 flex justify-between items-center bg-gray-50">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-textPrimary capitalize">{activePlatform.replace('teaser', 'Newsletter Teaser')}</h3>
                {scheduledByPlatform[activePlatform] && isSchedulingSupported(activePlatform) && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full border border-green-200">
                    <CalendarIcon className="h-3 w-3" />
                    Scheduled • {new Date(scheduledByPlatform[activePlatform]!.scheduledDate).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <p className="text-xs text-textMuted mt-1">Optimized content ready to post</p>
            </div>
            <div className="flex items-center gap-2">
              {!isSchedulingSupported(activePlatform) && (
                <span className="text-xs text-amber-900 bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-lg font-semibold">
                  {getSchedulingBadgeLabel(activePlatform)}
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleScheduleClick();
                }}
                disabled={!isSchedulingSupported(activePlatform) || isCheckingLinkedIn || isCheckingX || isCheckingMailchimp || isCheckingKit}
                title={!isSchedulingSupported(activePlatform) ? getSchedulingTooltip(activePlatform) : undefined}
                className="text-textSecondary hover:text-primary font-medium text-sm flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-100 transition disabled:opacity-50"
              >
                {(isCheckingLinkedIn || isCheckingX || isCheckingMailchimp || isCheckingKit) ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarIcon className="h-4 w-4" />} {scheduledByPlatform[activePlatform] ? 'Reschedule' : 'Schedule'}
              </button>
              <button
                onClick={() => {
                  const content = getContentForPlatform(activePlatform, socialContent);
                  handleCopy(content, activePlatform);
                }}
                className="text-primary hover:text-primary font-medium text-sm flex items-center gap-2 px-3 py-1.5 bg-accent-soft border border-primary rounded-lg hover:bg-primary transition"
              >
                {copiedSection === activePlatform ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy
              </button>
            </div>
          </div>
          <div className="p-6 max-h-150 overflow-y-auto">
            {activePlatform === 'twitter' ? (
              <div className="space-y-4">
                {socialContent.twitterThread?.map((tweet: string, idx: number) => (
                  <div key={idx} className="bg-gray-100 p-4 rounded-lg text-sm text-textBody border border-gray-300 relative">
                    <div className="flex justify-between items-start mb-2">
                      <span className="bg-black text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-bold">{idx + 1}</span>
                      <span className={`text-xs ${tweet.length > 280 ? 'text-red-500' : 'text-textMuted'}`}>{tweet.length}/280</span>
                    </div>
                    {tweet}
                  </div>
                ))}
              </div>
            ) : (activePlatform === 'email' || activePlatform === 'teaser') ? (
              <div className="space-y-3">
                <div className="bg-gray-100 border border-gray-300 rounded-lg px-4 py-3">
                  <span className="text-xs font-semibold text-textMuted uppercase tracking-wide">Subject</span>
                  <p className="text-sm text-textPrimary font-medium mt-1">
                    {activePlatform === 'email' ? socialContent.emailNewsletter?.subject : socialContent.newsletterTeaser?.subject}
                  </p>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-textSecondary text-sm leading-relaxed">
                  {activePlatform === 'email' ? socialContent.emailNewsletter?.body : socialContent.newsletterTeaser?.body}
                </pre>
              </div>
            ) : (
              <pre className="whitespace-pre-wrap font-sans text-textSecondary text-sm leading-relaxed">
                {activePlatform === 'linkedin' && socialContent.linkedinPost}
                {activePlatform === 'facebook' && socialContent.facebookPost}
                {activePlatform === 'tiktok' && socialContent.tiktokScript}
                {activePlatform === 'youtube' && socialContent.youtubeDescription}
                {activePlatform === 'medium' && socialContent.mediumArticle}
              </pre>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );

  const renderCollaborationTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <div className="bg-gray-100 rounded-xl shadow-sm border border-gray-300 p-6">
          <h2 className="text-lg font-bold text-textPrimary mb-6 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Team Comments
          </h2>

          <div className="space-y-6 mb-8">
            {comments.length === 0 && (
              <div className="text-center py-8 text-textMuted bg-gray-100 rounded-lg">
                No comments yet. Start the conversation!
              </div>
            )}

            {comments.map((comment: any) => (
              <div key={comment.id} className="flex gap-4">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary font-bold text-xs shrink-0">
                  {(comment.userName || "U").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="bg-gray-100 p-4 rounded-lg rounded-tl-none">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-sm text-textPrimary">{comment.userName}</span>
                      <span className="text-xs text-textMuted">{new Date(comment.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-textSecondary text-sm">{comment.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 items-start">
            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-textMuted font-bold text-xs shrink-0">
              Y
            </div>
            <div className="flex-1">
              <textarea
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                rows={3}
                placeholder="Add a comment for your team..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              ></textarea>
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary disabled:opacity-50"
                >
                  Post Comment
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="lg:col-span-1">
        <div className="bg-gray-100 rounded-xl shadow-sm border border-gray-300 p-6">
          <h3 className="font-bold text-textPrimary mb-4">Workflow Status</h3>
          <div className="space-y-2">
            {(['Draft', 'In Review', 'Approved', 'Published'] as WorkflowStatus[]).map(status => (
              <div
                key={status}
                onClick={() => handleStatusChange(status)}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition ${
                  transcript.status === status ? 'bg-accent-soft border border-primary' : 'hover:bg-gray-100 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-2.5 w-2.5 rounded-full ${
                    status === 'Approved' ? 'bg-accent-soft0' :
                    status === 'Published' ? 'bg-blue-500' :
                    status === 'In Review' ? 'bg-yellow-500' : 'bg-gray-300'
                  }`}></div>
                  <span className={`text-sm font-medium ${transcript.status === status ? 'text-primary' : 'text-textSecondary'}`}>{status}</span>
                </div>
                {transcript.status === status && <Check className="h-4 w-4 text-primary" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderBlogTab = () => {
    const post = result.blogPost || null;
    const seoData = result.seo || null;

    return (
      <div className="bg-gray-100 rounded-xl border border-gray-300 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-textPrimary">Blog & SEO</h3>
            <p className="text-sm text-textMuted">Drafts and SEO suggestions generated from the episode</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveBlogTab('article')}
              className={`px-3 py-1 text-sm rounded-md ${activeBlogTab === 'article' ? 'bg-accent-soft text-primary' : 'text-textSecondary hover:bg-gray-200'}`}
            >
              Article
            </button>
            <button
              onClick={() => setActiveBlogTab('shownotes')}
              className={`px-3 py-1 text-sm rounded-md ${activeBlogTab === 'shownotes' ? 'bg-accent-soft text-primary' : 'text-textSecondary hover:bg-gray-200'}`}
            >
              Show Notes
            </button>
            <button
              onClick={() => setActiveBlogTab('seo')}
              className={`px-3 py-1 text-sm rounded-md ${activeBlogTab === 'seo' ? 'bg-accent-soft text-primary' : 'text-textSecondary hover:bg-gray-200'}`}
            >
              SEO
            </button>
          </div>
        </div>

        <div>
          {activeBlogTab === 'article' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-textPrimary">{post?.title || 'Draft Title'}</h2>
              <p className="text-sm text-textSecondary">{post?.intro || 'No intro available.'}</p>

              {post?.sections?.map((s, i) => (
                <div key={i} className="pt-4 border-t border-gray-300">
                  <h4 className="font-semibold text-textPrimary mb-2">{s.heading}</h4>
                  <p className="text-sm text-textSecondary leading-relaxed">{s.content}</p>
                </div>
              ))}

              {post?.conclusion && (
                <div className="pt-4 border-t border-gray-300">
                  <h4 className="font-semibold text-textPrimary mb-2">Conclusion</h4>
                  <p className="text-sm text-textSecondary">{post.conclusion}</p>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => navigator.clipboard.writeText(`${post?.title}\n\n${post?.intro}\n\n${post?.sections?.map(s => `${s.heading}\n${s.content}`).join('\n\n') || ''}\n\n${post?.conclusion || ''}`)}
                  className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm text-textSecondary hover:bg-gray-200"
                >
                  Copy Article
                </button>
                <button onClick={() => downloadDOCX({ title: post?.title || 'Draft', intro: post?.intro || '', sections: post?.sections || [], conclusion: post?.conclusion || '' } as any as Transcript)} className="px-4 py-2 bg-primary text-white rounded-md text-sm hover:brightness-95">Export</button>
              </div>
            </div>
          )}

          {activeBlogTab === 'shownotes' && (
            <div className="space-y-4">
              <h3 className="font-bold text-textPrimary">Show Notes</h3>
              <p className="text-sm text-textSecondary">{result.showNotes || post?.intro || 'No show notes available.'}</p>

              <div className="mt-4 grid gap-3">
                {post?.sections?.map((s, i) => (
                  <div key={i} className="p-3 bg-gray-100 rounded-lg border border-gray-300">
                    <h4 className="font-semibold text-textPrimary">{s.heading}</h4>
                    <p className="text-sm text-textSecondary">{s.content}</p>
                  </div>
                ))}
              </div>

              <div className="flex justify-end mt-4">
                <button onClick={() => navigator.clipboard.writeText(result.showNotes || post?.intro || '')} className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm text-textSecondary hover:bg-gray-200">Copy Notes</button>
              </div>
            </div>
          )}

          {activeBlogTab === 'seo' && (
            <div className="space-y-4">
              <h3 className="font-bold text-textPrimary">SEO Suggestions</h3>

              <div className="bg-gray-100 p-4 rounded-lg border border-gray-300">
                <p className="text-sm text-textSecondary"><span className="font-medium">Meta Description:</span> {seoData?.metaDescription || 'No meta description generated.'}</p>
                <p className="text-sm text-textSecondary mt-2"><span className="font-medium">Keywords:</span> {seoData?.keywords?.join(', ') || 'No keywords generated.'}</p>
                <p className="text-sm text-textSecondary mt-2"><span className="font-medium">Title Variations:</span> {seoData?.titleVariations?.join(' • ') || 'No title variations.'}</p>
                <p className="text-sm text-textSecondary mt-2"><span className="font-medium">Readability:</span> {seoData?.readability?.score ?? 'N/A'} ({seoData?.readability?.level ?? 'N/A'})</p>
              </div>

              <div className="flex justify-end mt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyJSON(seoData, 'copy-seo-json');
                  }}
                  className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm text-textSecondary hover:bg-gray-200"
                >
                  {copiedSection === 'copy-seo-json' ? 'Copied' : 'Copy SEO JSON'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };
  const renderSpeakersTab = () => {
    const speakers = result.speakers || [];
    const hasPercent = speakers.some(s => typeof s.speakingTimePercent === 'number');

    return (
      <div className="bg-gray-100 rounded-xl border border-gray-300 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-textPrimary">Speaker Analytics</h3>
            <p className="text-sm text-textMuted">Contributions and speaking time estimates</p>
          </div>

          <div className="flex items-center gap-2">
            {!hasPercent && speakers.length > 0 && (
              <button
                onClick={estimateSpeakers}
                className={`px-3 py-1 text-sm rounded-md ${isEstimatingSpeakers ? 'bg-gray-100' : 'bg-gray-100 border border-gray-300'}`}
              >
                {isEstimatingSpeakers ? 'Estimating...' : 'Estimate Speaking Times'}
              </button>
            )}

            {speakerEstimates && (
              <button
                onClick={saveSpeakerEstimates}
                disabled={isSavingEstimates}
                className="px-3 py-1 text-sm rounded-md bg-primary text-white"
              >
                {isSavingEstimates ? 'Saving...' : 'Save Estimates'}
              </button>
            )}
          </div>
        </div>

        {speakers.length === 0 ? (
          <div className="p-8 text-center text-textMuted">No speaker analytics available for this transcript.</div>
        ) : (
          <div className="space-y-4">
            {speakers.map((s, i) => {
              const percent = speakerEstimates?.[s.name] ?? s.speakingTimePercent ?? 0;
              return (
                <div key={i} className="p-4 bg-gray-100 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-accent-soft flex items-center justify-center font-bold text-primary">{(s.name || 'U').charAt(0).toUpperCase()}</div>
                    <div>
                      <div className="font-semibold text-textPrimary">{s.name} <span className="text-xs text-textMuted ml-2">{s.role}</span></div>
                      <p className="text-sm text-textSecondary">{s.contribution}</p>
                      {s.topics && s.topics.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {s.topics.map((t: string) => (
                            <span key={t} className="text-xs bg-gray-100 border border-gray-300 px-2 py-0.5 rounded">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="w-40 text-right">
                    <div className="text-xs text-textMuted mb-1">Speaking Time</div>
                    <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div className="h-2 bg-primary" style={{ width: `${percent}%` }} />
                    </div>
                    <div className="text-xs text-textMuted mt-1">{percent}%</div>
                  </div>
                </div>
              );
            })}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => navigator.clipboard.writeText(speakers.map(s => `${s.name}: ${speakerEstimates?.[s.name] ?? s.speakingTimePercent ?? 0}%`).join('\n'))}
                className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm text-textSecondary hover:bg-gray-200"
              >
                Copy Summary
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      onClick={() => { setShowDownloadMenu(false); setShowStatusMenu(false); setShowScheduleModal(false); }}
    >
      {/* Schedule Notification Toast */}
      {scheduleNotification && (
        <div className={`fixed top-4 right-4 z-60 p-4 rounded-lg shadow-lg border animate-in fade-in slide-in-from-top-4 ${
          scheduleNotification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <p className="text-sm font-medium">{scheduleNotification.message}</p>
          {scheduleNotification.type === 'success' && (
            <p className="text-xs text-emerald-600 mt-1">You can view it in the Content Calendar</p>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <button onClick={onBack} className="flex items-center text-textMuted hover:text-textPrimary mb-2 transition text-sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-textPrimary line-clamp-1">{transcript.title}</h1>

            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowStatusMenu(!showStatusMenu); }}
                className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 uppercase tracking-wide cursor-pointer hover:opacity-80 ${
                  transcript.status === 'Approved' ? 'bg-accent-soft text-accent-emerald border-green-200' :
                  transcript.status === 'Published' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                  transcript.status === 'In Review' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                  'bg-gray-100 text-textSecondary border-gray-300'
                }`}
              >
                {transcript.status || 'Draft'}
                <ChevronDown className="h-3 w-3" />
              </button>

              {showStatusMenu && (
                <div className="absolute top-full left-0 mt-2 w-40 bg-gray-100 rounded-lg shadow-lg border border-gray-300 py-1 z-10">
                  {(['Draft', 'In Review', 'Approved', 'Published'] as WorkflowStatus[]).map(status => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      className="block w-full text-left px-4 py-2 text-sm text-textSecondary hover:bg-gray-200"
                    >
                      {status}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 mt-2">
            <span className="flex items-center text-textMuted text-sm">
              <Clock className="h-3.5 w-3.5 mr-1" />
              Analyzed on {new Date((transcript as any).date ?? transcript.created_at ?? Date.now()).toLocaleDateString()}
            </span>
            {settings && (
              <div className="flex items-center gap-2 text-xs text-textMuted border-l border-gray-300 pl-4">
                <span title="Accuracy">{settings.accuracyLevel} Mode</span>
                {settings.language !== 'Auto' && <span>• {settings.language}</span>}
                {settings.toneFilter !== 'Auto' && <span>• {settings.toneFilter} Tone</span>}
              </div>
            )}
          </div>

        </div>

        <div className="flex space-x-3 relative">
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowDownloadMenu(!showDownloadMenu); }}
              disabled={isDownloading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-textSecondary hover:bg-gray-100 transition text-sm font-medium disabled:opacity-50"
            >
              {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {isDownloading ? "Processing..." : "Export"}
            </button>

            {showDownloadMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-gray-100 rounded-lg shadow-lg border border-gray-300 py-1 z-10">
                <button onClick={() => handleDownload('pdf')} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-textSecondary hover:bg-gray-100 text-left">
                  <FileText className="h-4 w-4 text-red-500" />
                  Download PDF
                </button>

                <button onClick={() => handleDownload('docx')} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-textSecondary hover:bg-gray-100 text-left">
                  <File className="h-4 w-4 text-blue-500" />
                  Download DOCX
                </button>

                <button onClick={() => handleDownload('md')} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-textSecondary hover:bg-gray-100 text-left">
                  <Download className="h-4 w-4 text-textMuted" />
                  Download Markdown
                </button>

                <button onClick={() => handleDownload('json')} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-textSecondary hover:bg-gray-100 text-left">
                  <FileJson className="h-4 w-4 text-orange-500" />
                  Export JSON
                </button>

                <div className="h-px bg-gray-100 my-1"></div>

                <button onClick={() => handleDownload('kit')} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-textSecondary hover:bg-gray-100 text-left">
                  <Briefcase className="h-4 w-4 text-accent-violet" />
                  Media Kit
                </button>

                <div className="h-px bg-gray-100 my-1"></div>

                <button onClick={() => handleDownload('email')} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-textSecondary hover:bg-gray-100 text-left">
                  <Mail className="h-4 w-4 text-green-500" />
                  Email Results
                </button>

                <button onClick={() => handleDownload('sheets')} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-textSecondary hover:bg-gray-100 text-left">
                  <Table className="h-4 w-4 text-accent-emerald" />
                  Google Sheets
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary transition text-sm font-medium shadow-sm"
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-300 mb-8 overflow-x-auto">
        <button onClick={() => setActiveTab('overview')} className={`px-6 py-4 text-sm font-medium transition whitespace-nowrap border-b-2 ${activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-textMuted hover:text-textSecondary'}`}>
          Overview
        </button>
        <button onClick={() => setActiveTab('platform')} className={`px-6 py-4 text-sm font-medium transition whitespace-nowrap border-b-2 ${activeTab === 'platform' ? 'border-primary text-primary' : 'border-transparent text-textMuted hover:text-textSecondary'}`}>
          Platform Content
        </button>
        <button onClick={() => setActiveTab('blog')} className={`px-6 py-4 text-sm font-medium transition whitespace-nowrap border-b-2 ${activeTab === 'blog' ? 'border-primary text-primary' : 'border-transparent text-textMuted hover:text-textSecondary'}`}>
          Blog & SEO
        </button>
        <button onClick={() => setActiveTab('speakers')} className={`px-6 py-4 text-sm font-medium transition whitespace-nowrap border-b-2 ${activeTab === 'speakers' ? 'border-primary text-primary' : 'border-transparent text-textMuted hover:text-textSecondary'}`}>
          Speakers
        </button>
        <button onClick={() => setActiveTab('repurpose')} className={`px-6 py-4 text-sm font-medium transition whitespace-nowrap border-b-2 ${activeTab === 'repurpose' ? 'border-primary text-primary' : 'border-transparent text-textMuted hover:text-textSecondary'}`}>
          Repurposing
        </button>
        <button onClick={() => setActiveTab('monetization')} className={`px-6 py-4 text-sm font-medium transition whitespace-nowrap border-b-2 ${activeTab === 'monetization' ? 'border-primary text-primary' : 'border-transparent text-textMuted hover:text-textSecondary'}`}>
          Monetization
        </button>
        <button onClick={() => setActiveTab('collaboration')} className={`px-6 py-4 text-sm font-medium transition whitespace-nowrap border-b-2 flex items-center gap-2 ${activeTab === 'collaboration' ? 'border-primary text-primary' : 'border-transparent text-textMuted hover:text-textSecondary'}`}>
          Collaboration
          {comments.length > 0 && (
            <span className="bg-primary text-primary text-xs px-2 py-0.5 rounded-full">{comments.length}</span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-125">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'platform' && renderPlatformTab()}
        {activeTab === 'blog' && renderBlogTab()}
        {activeTab === 'speakers' && renderSpeakersTab()}
        {activeTab === 'monetization' && renderMonetizationTab()}
        {activeTab === 'repurpose' && renderRepurposingTab()}
        {activeTab === 'collaboration' && renderCollaborationTab()}
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gray-100 rounded-xl shadow-xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-textPrimary mb-4 flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Schedule Post
            </h3>
            <p className="text-sm text-textMuted mb-4">
              Choose a date and time to publish this {activePlatform === 'twitter' ? 'X' : activePlatform} post.
            </p>

            {/* Twitter thread info */}
            {activePlatform === 'twitter' && transcript?.result?.socialContent?.twitterThread && transcript.result.socialContent.twitterThread.length > 1 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>{transcript.result.socialContent.twitterThread.length} posts</strong> will be scheduled, one per day starting from your selected date.
                </p>
              </div>
            )}

            <div className="space-y-4 mb-6">
              {activePlatform === 'email' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-textSecondary mb-1">Email provider</label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                      value={emailProvider}
                      onChange={(e) => {
                        const next = e.target.value as 'mailchimp' | 'kit' | 'sendgrid';
                        setEmailProvider(next);
                        if (next === 'mailchimp') {
                          loadMailchimpOptions();
                        } else if (next === 'sendgrid') {
                          loadSendGridOptions();
                          // Pre-fill subject from generated content
                          const subject = transcript?.result?.socialContent?.emailNewsletter?.subject || '';
                          setEmailSubjectOverride(subject);
                        } else {
                          setNewsletterDestinationId('');
                          setNewsletterAutomationId('');
                          setMailchimpDestinations([]);
                          setMailchimpAutomations([]);
                        }
                      }}
                    >
                      <option value="mailchimp">Mailchimp</option>
                      <option value="kit">Kit</option>
                      <option value="sendgrid">SendGrid</option>
                    </select>
                    <p className="text-xs text-textMuted mt-1">
                      {emailProvider === 'sendgrid'
                        ? 'LoquiHQ will create a SendGrid Single Send campaign and schedule it for delivery.'
                        : 'LoquiHQ does not send emails on your behalf. It applies your trigger tag so your provider automation handles delivery.'}
                    </p>
                  </div>
                  {emailProvider === 'mailchimp' && (
                  <>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-textSecondary">Mailchimp audience</label>
                      <button
                        type="button"
                        onClick={() => loadMailchimpOptions(newsletterDestinationId)}
                        className="text-xs text-primary hover:underline"
                      >
                        Refresh
                      </button>
                    </div>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                      value={newsletterDestinationId}
                      onChange={(e) => handleMailchimpDestinationChange(e.target.value)}
                      disabled={isLoadingMailchimpData}
                    >
                      <option value="">Select an audience</option>
                      {mailchimpDestinations.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name || d.audience_id}
                        </option>
                      ))}
                    </select>
                    {!mailchimpDestinations.length && (
                      <p className="text-xs text-textMuted mt-1">No destinations found. Create one in Settings → Integrations.</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-textSecondary mb-1">Automation trigger tag</label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                      value={newsletterAutomationId}
                      onChange={(e) => setNewsletterAutomationId(e.target.value)}
                      disabled={isLoadingMailchimpData || !newsletterDestinationId}
                    >
                      <option value="">e.g. loquihq_newsletter</option>
                      {mailchimpAutomations.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name || a.trigger_value}
                        </option>
                      ))}
                    </select>
                    {newsletterDestinationId && !mailchimpAutomations.length && (
                      <p className="text-xs text-red-600 mt-1">This tag does not exist in your Mailchimp audience.</p>
                    )}
                    <p className="text-xs text-textMuted mt-1">
                      This tag must already exist in your Mailchimp audience.
                      LoquiHQ will apply it when the content is scheduled.
                    </p>
                    <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3">
                      <p className="text-xs font-medium text-textSecondary mb-1">How scheduling works</p>
                      <p className="text-xs text-textMuted">
                        When you schedule email content in LoquiHQ, we apply a tag to a subscriber in your Mailchimp audience.
                        Your Mailchimp automations decide what happens next.
                      </p>
                    </div>
                  </div>
                  </>
                  )}
                  {emailProvider === 'sendgrid' && (
                  <>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-textSecondary">Marketing list</label>
                      <button
                        type="button"
                        onClick={loadSendGridOptions}
                        className="text-xs text-primary hover:underline"
                      >
                        Refresh
                      </button>
                    </div>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                      value={selectedSendGridListId}
                      onChange={(e) => setSelectedSendGridListId(e.target.value)}
                      disabled={isLoadingSendGridData}
                    >
                      <option value="">Select a list</option>
                      {sendgridLists.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}{l.contactCount ? ` (${l.contactCount.toLocaleString()} contacts)` : ''}
                        </option>
                      ))}
                    </select>
                    {!isLoadingSendGridData && !sendgridLists.length && (
                      <p className="text-xs text-textMuted mt-1">No lists found. Create one in your SendGrid dashboard.</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-textSecondary mb-1">Email template</label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                      value={selectedSendGridTemplateId}
                      onChange={(e) => setSelectedSendGridTemplateId(e.target.value)}
                      disabled={isLoadingSendGridData}
                    >
                      <option value="">Select a template</option>
                      {sendgridTemplates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}{t.generation ? ` (${t.generation})` : ''}
                        </option>
                      ))}
                    </select>
                    {!isLoadingSendGridData && !sendgridTemplates.length && (
                      <p className="text-xs text-textMuted mt-1">No templates found. Create one in your SendGrid dashboard.</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-textSecondary mb-1">Subject line</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm"
                      value={emailSubjectOverride}
                      onChange={(e) => setEmailSubjectOverride(e.target.value)}
                      placeholder="Enter email subject..."
                    />
                  </div>
                  </>
                  )}
                </>
              )}
              {activePlatform === 'email' && emailProvider === 'mailchimp' && (!newsletterDestinationId || !newsletterAutomationId) && (
                <p className="text-xs text-red-600">
                  You must connect your Mailchimp account and select a trigger tag before scheduling email content.
                </p>
              )}
              {activePlatform === 'email' && emailProvider === 'sendgrid' && (!selectedSendGridListId || !selectedSendGridTemplateId) && (
                <p className="text-xs text-red-600">
                  You must select a marketing list and template before scheduling via SendGrid.
                </p>
              )}
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1">Date</label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1">Time</label>
                <input
                  type="time"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2 text-textSecondary font-medium hover:bg-gray-100 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSchedulePost}
                disabled={isScheduling || !scheduleDate || !scheduleTime || (activePlatform === 'email' && emailProvider === 'sendgrid' && (!selectedSendGridListId || !selectedSendGridTemplateId))}
                className="px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {isScheduling && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connect LinkedIn Modal */}
      {showConnectLinkedInModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gray-100 rounded-xl shadow-xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-textPrimary mb-4 flex items-center gap-2">
              <Linkedin className="h-5 w-5 text-[#0077B5]" />
              Connect LinkedIn
            </h3>
            <p className="text-sm text-textMuted mb-6">
              Connect your LinkedIn account to schedule and publish posts directly from this dashboard.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConnectLinkedInModal(false)}
                className="px-4 py-2 text-textSecondary font-medium hover:bg-gray-200 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConnectLinkedInModal(false);
                  connectLinkedIn();
                }}
                className="px-4 py-2 bg-[#0077B5] text-white font-medium rounded-lg hover:bg-[#006097] text-sm flex items-center gap-2"
              >
                <Linkedin className="h-4 w-4" />
                Connect LinkedIn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connect X Modal */}
      {showConnectXModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gray-100 rounded-xl shadow-xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-textPrimary mb-4 flex items-center gap-2">
              <Twitter className="h-5 w-5" />
              Connect X
            </h3>
            <p className="text-sm text-textMuted mb-6">
              Connect your X account to schedule and publish posts directly from this dashboard.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConnectXModal(false)}
                className="px-4 py-2 text-textSecondary font-medium hover:bg-gray-200 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConnectXModal(false);
                  connectTwitter();
                }}
                className="px-4 py-2 bg-black text-white font-medium rounded-lg hover:bg-gray-800 text-sm flex items-center gap-2"
              >
                <Twitter className="h-4 w-4" />
                Connect X
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connect Kit Modal */}
      {showConnectKitModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gray-100 rounded-xl shadow-xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-textPrimary mb-4 flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Connect your email provider
            </h3>
            <div className="text-sm text-textMuted mb-6 space-y-2">
              <p>LoquiHQ does not send emails on your behalf.</p>
              <p>Instead, LoquiHQ triggers your existing automations by applying tags inside your email platform.</p>
              <div>
                <p>You stay in control of:</p>
                <ul className="list-disc ml-5">
                  <li>the audience</li>
                  <li>the emails</li>
                  <li>the timing</li>
                  <li>the content</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConnectKitModal(false)}
                className="px-4 py-2 text-textSecondary font-medium hover:bg-gray-200 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const { url } = await getKitAuthUrl();
                    setShowConnectKitModal(false);
                    window.location.href = url;
                  } catch (e) {
                    console.error('Failed to start Kit auth:', e);
                    setShowConnectKitModal(false);
                  }
                }}
                className="px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary text-sm flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                Connect Kit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connect Mailchimp Modal */}
      {showConnectMailchimpModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gray-100 rounded-xl shadow-xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-textPrimary mb-4 flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Connect your email provider
            </h3>
            <div className="text-sm text-textMuted mb-6 space-y-2">
              <p>LoquiHQ does not send emails on your behalf.</p>
              <p>Instead, LoquiHQ triggers your existing automations by applying tags inside your email platform.</p>
              <div>
                <p>You stay in control of:</p>
                <ul className="list-disc ml-5">
                  <li>the audience</li>
                  <li>the emails</li>
                  <li>the timing</li>
                  <li>the content</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConnectMailchimpModal(false)}
                className="px-4 py-2 text-textSecondary font-medium hover:bg-gray-200 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const { url } = await getMailchimpAuthUrl();
                    setShowConnectMailchimpModal(false);
                    window.location.href = url;
                  } catch (e) {
                    console.error('Failed to start Mailchimp auth:', e);
                    setShowConnectMailchimpModal(false);
                  }
                }}
                className="px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary text-sm flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                Connect Mailchimp
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Series Schedule Wizard */}
      {showSeriesScheduleWizard && seriesScheduleItems.length > 0 && (
        <SeriesScheduleWizard
          type={seriesScheduleType}
          items={seriesScheduleItems}
          transcriptId={transcript?.id}
          onClose={() => setShowSeriesScheduleWizard(false)}
          onComplete={() => {
            alert(`${seriesScheduleType === 'email' ? 'Email series' : 'Social posts'} scheduled successfully! View them in the Content Calendar.`);
          }}
        />
      )}

      {/* Email Export Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-100 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-textPrimary mb-4 flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" /> Email Results
            </h3>
            <p className="text-sm text-textMuted mb-6">Send the complete analysis report to a team member or client.</p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-textSecondary mb-1">Recipient Email</label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="client@example.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 text-textSecondary font-medium hover:bg-gray-100 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={isSendingEmail || !recipientEmail}
                className="px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {isSendingEmail && <Loader2 className="h-4 w-4 animate-spin" />}
                Send Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Monetization Input Modal */}
      <MonetizationInputModal
        isOpen={showMonetizationModal}
        onClose={() => setShowMonetizationModal(false)}
        onSubmit={handleMonetizationInput}
        podcastTitle={transcript?.title || 'Your Podcast'}
      />

    </div>
  );
};

export default ResultsPage;
