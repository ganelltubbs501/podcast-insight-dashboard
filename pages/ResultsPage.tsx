import React, { useEffect, useState } from 'react';
import {
  ArrowLeft, Check, Copy, Download, Share2, Quote, FileText, BarChart3, Clock,
  Linkedin, Twitter, Video, Mail, Youtube, FileType, Send, File, Link2, Loader2,
  Sparkles, Activity, MessageSquare, ChevronDown, Calendar as CalendarIcon,
  DollarSign, Target, Briefcase, Calculator, ExternalLink, Settings, FileJson,
  Table
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';

import {
  getTranscriptById,
  addCommentToTranscript,
  updateTranscriptStatus,
  saveTranscriptResult,
} from "../services/transcripts";


import { getStoredUser } from '../services/auth';

import { generateSponsorshipInsights, generateRepurposedContent } from '../services/geminiService';
import { Transcript, Comment, WorkflowStatus, Platform, RepurposedContent } from '../types';
import {
  downloadPDF, downloadDOCX, downloadMarkdown, downloadMediaKit, downloadJSON,
  sendEmailExport, exportToGoogleSheets
} from '../services/downloadService';

interface ResultsPageProps {
  id: string;
  onBack: () => void;
}

type TabType = 'overview' | 'platform' | 'blog' | 'speakers' | 'collaboration' | 'monetization' | 'repurpose';
type PlatformType = 'linkedin' | 'twitter' | 'tiktok' | 'youtube' | 'email' | 'medium' | 'teaser';
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

  // Email Export State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Monetization State
  const [isGeneratingMonetization, setIsGeneratingMonetization] = useState(false);
  const [downloads, setDownloads] = useState(5000);
  const [cpm, setCpm] = useState(25);

  // Repurposing State
  const [activeRepurposeView, setActiveRepurposeView] = useState<'hub' | 'email' | 'calendar' | 'article' | 'images'>('hub');
  const [isRepurposing, setIsRepurposing] = useState(false);

  // Speaker analytics state
  const [speakerEstimates, setSpeakerEstimates] = useState<Record<string, number> | null>(null);
  const [isEstimatingSpeakers, setIsEstimatingSpeakers] = useState(false);
  const [isSavingEstimates, setIsSavingEstimates] = useState(false);

  const navigate = useNavigate();

  // Estimate speaking times using a simple heuristic (uniform distribution)
  const estimateSpeakers = () => {
    if (!result?.speakers || result.speakers.length === 0) return;
    setIsEstimatingSpeakers(true);

    try {
      const speakers = result.speakers;
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

  const handleCopy = (text: string, sectionName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionName);
    setTimeout(() => setCopiedSection(null), 2000);
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
    if (platform === 'tiktok') return socialContent.tiktokScript;
    if (platform === 'youtube') return socialContent.youtubeDescription;
    if (platform === 'email') return `Subject: ${socialContent.emailNewsletter?.subject}\n\n${socialContent.emailNewsletter?.body}`;
    if (platform === 'medium') return socialContent.mediumArticle;
    if (platform === 'teaser') return `Subject: ${socialContent.newsletterTeaser?.subject}\n\n${socialContent.newsletterTeaser?.body}`;
    return '';
  };

  const handleSchedulePost = async () => {
    // Scheduling requires a production backend. The UI remains but scheduling will call the configured API when available.
    if (!scheduleDate || !scheduleTime || !transcript || !transcript.result) return;

    setIsScheduling(true);
    try {
      const dateTime = new Date(`${scheduleDate}T${scheduleTime}`);
      console.log("SCHEDULE (not wired yet):", {
        transcriptId: transcript.id,
        when: dateTime.toISOString(),
        platform: activePlatform
      });

      setShowScheduleModal(false);
      alert("Scheduling is not wired to Supabase yet. (Safe stub)");
    } catch (e) {
      console.error(e);
      alert("Failed to schedule post");
    } finally {
      setIsScheduling(false);
    }
  };

  const generateMonetization = async () => {
    if (!transcript || !transcript.result) return;
    setIsGeneratingMonetization(true);
    try {
      const context = `
        Title: ${transcript.title}
        Key Takeaways: ${transcript.result.keyTakeaways?.join('\n') || ''}
        Topics: ${transcript.result.seo?.keywords?.join(', ') || ''}
      `;
      const insights = await generateSponsorshipInsights(context);

      // merge into result
      await saveTranscriptResult(transcript.id, { sponsorship: insights });
      await loadData();
    } catch (e) {
      console.error(e);
      alert("Failed to generate sponsorship insights.");
    } finally {
      setIsGeneratingMonetization(false);
    }
  };

  const handleRepurpose = async (type: 'email_series' | 'social_calendar' | 'linkedin_article' | 'image_prompts') => {
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

      if (type === 'email_series') setActiveRepurposeView('email');
      if (type === 'social_calendar') setActiveRepurposeView('calendar');
      if (type === 'linkedin_article') setActiveRepurposeView('article');
      if (type === 'image_prompts') setActiveRepurposeView('images');
    } catch (e) {
      console.error('Repurpose failed', e);
      const msg = (e as any)?.message ?? (typeof e === 'string' ? e : 'Unknown error');
      alert(`Failed to repurpose content: ${msg}`);
    } finally {
      setIsRepurposing(false);
    }
  };

  if (!transcript || !transcript.result) {
    return <div className="p-12 text-center text-gray-500">Loading results...</div>;
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
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-xl border border-gray-200 text-center">
          <DollarSign className="h-16 w-16 text-indigo-200 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Unlock Monetization Insights</h3>
          <p className="text-gray-500 max-w-md mb-8">
            Discover potential sponsors, estimate ad revenue, and generate a professional media kit based on this episode's content.
          </p>
          <button
            onClick={generateMonetization}
            disabled={isGeneratingMonetization}
            className="bg-primary text-white px-6 py-3 rounded-lg font-bold shadow-md hover:bg-indigo-700 transition flex items-center gap-2 disabled:opacity-70"
          >
            {isGeneratingMonetization ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
            Generate Sponsorship Analysis
          </button>
        </div>
      );
    }

    const { sponsorship } = result;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col md:flex-row gap-6 items-center">
            <div className="relative w-32 h-32 flex-shrink-0">
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
                <span className="text-3xl font-bold text-gray-900">{sponsorship.score}</span>
                <span className="text-xs font-bold text-gray-400 uppercase">Score</span>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Sponsorship Readiness</h3>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">{sponsorship.reasoning}</p>
              <div className="flex flex-wrap gap-2">
                {sponsorship.potentialAdSpots?.map((spot: string, i: number) => (
                  <span key={i} className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md border border-indigo-100 font-medium">
                    {spot}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-gray-500" /> Suggested Sponsors
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {sponsorship.suggestedSponsors?.map((rec: any, i: number) => (
                <div key={i} className="p-6 hover:bg-gray-50 transition">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-gray-900 text-lg">{rec.industry}</h4>
                    <div className="flex gap-2">
                      {rec.brands?.map((brand: string) => (
                        <span key={brand} className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded font-medium">{brand}</span>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{rec.matchReason}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" /> Target Audience Profile
            </h3>
            <p className="text-gray-700 text-sm leading-relaxed bg-gray-50 p-4 rounded-lg border border-gray-100">
              {sponsorship.targetAudienceProfile}
            </p>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Calculator className="h-5 w-5 text-green-500" /> Revenue Calculator
            </h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Downloads per Ep</label>
                <input
                  type="number"
                  value={downloads}
                  onChange={(e) => setDownloads(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CPM Rate ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                  <input
                    type="number"
                    value={cpm}
                    onChange={(e) => setCpm(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg p-2.5 pl-7 outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4 border border-green-100 text-center">
              <div className="text-xs font-bold text-green-600 uppercase mb-1">Estimated Revenue</div>
              <div className="text-3xl font-extrabold text-green-700">
                ${((downloads / 1000) * cpm).toFixed(2)}
              </div>
              <div className="text-xs text-green-500 mt-1">per episode</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Actions</h3>
            <button
              onClick={() => handleDownload('kit')}
              className="w-full flex items-center justify-center gap-2 bg-indigo-50 text-primary border border-indigo-100 px-4 py-3 rounded-lg font-bold hover:bg-indigo-100 transition mb-3"
            >
              <FileText className="h-5 w-5" /> Download Media Kit
            </button>
            <p className="text-xs text-center text-gray-500 mb-6">Generates a PDF one-sheet with your stats and audience profile.</p>

            <h4 className="font-bold text-gray-900 text-sm mb-3">Recommended Ad Networks</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-gray-600">
                <ExternalLink className="h-3 w-3 text-gray-400" /> Gumball
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-600">
                <ExternalLink className="h-3 w-3 text-gray-400" /> AdvertiseCast
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-600">
                <ExternalLink className="h-3 w-3 text-gray-400" /> Podcorn
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
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Repurposing</h3>
            <p className="text-sm text-gray-500">Generate email series, social calendar, LinkedIn drafts, or image prompts from this episode.</p>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => handleRepurpose('email_series')} disabled={isRepurposing} className="px-3 py-1 text-sm rounded-md bg-white border border-gray-200 hover:bg-gray-50">Email Series</button>
            <button onClick={() => handleRepurpose('social_calendar')} disabled={isRepurposing} className="px-3 py-1 text-sm rounded-md bg-white border border-gray-200 hover:bg-gray-50">Social Calendar</button>
            <button onClick={() => handleRepurpose('linkedin_article')} disabled={isRepurposing} className="px-3 py-1 text-sm rounded-md bg-white border border-gray-200 hover:bg-gray-50">LinkedIn Article</button>
            <button onClick={() => handleRepurpose('image_prompts')} disabled={isRepurposing} className="px-3 py-1 text-sm rounded-md bg-white border border-gray-200 hover:bg-gray-50">Image Prompts</button>
          </div>
        </div>

        <div>
          {/* Hub view */}
          {activeRepurposeView === 'hub' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <h4 className="font-semibold text-gray-900">Email Series</h4>
                <p className="text-sm text-gray-600 mt-2">Short automated email sequences to onboard listeners or promote the episode.</p>
                <div className="mt-4">
                  <button onClick={() => { setActiveRepurposeView('email'); }} className="px-3 py-2 bg-white border border-gray-200 rounded-md text-sm">Open</button>
                </div>
                <div className="mt-4 text-xs text-gray-500">{repurposed.emailSeries ? `${repurposed.emailSeries.length} emails generated` : 'No emails generated yet'}</div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <h4 className="font-semibold text-gray-900">Social Calendar</h4>
                <p className="text-sm text-gray-600 mt-2">A multi-week calendar of posts for LinkedIn, Twitter, and more.</p>
                <div className="mt-4">
                  <button onClick={() => { setActiveRepurposeView('calendar'); }} className="px-3 py-2 bg-white border border-gray-200 rounded-md text-sm">Open</button>
                </div>
                <div className="mt-4 text-xs text-gray-500">{repurposed.socialCalendar ? `${repurposed.socialCalendar.length} items` : 'No social content generated'}</div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <h4 className="font-semibold text-gray-900">LinkedIn Article</h4>
                <p className="text-sm text-gray-600 mt-2">A draft article adapted for LinkedIn based on the episode's insights.</p>
                <div className="mt-4">
                  <button onClick={() => { setActiveRepurposeView('article'); }} className="px-3 py-2 bg-white border border-gray-200 rounded-md text-sm">Open</button>
                </div>
                <div className="mt-4 text-xs text-gray-500">{repurposed.linkedinArticle ? 'Draft available' : 'No draft yet'}</div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <h4 className="font-semibold text-gray-900">Image Prompts</h4>
                <p className="text-sm text-gray-600 mt-2">AI image prompts for social graphics or quote cards.</p>
                <div className="mt-4">
                  <button onClick={() => { setActiveRepurposeView('images'); }} className="px-3 py-2 bg-white border border-gray-200 rounded-md text-sm">Open</button>
                </div>
                <div className="mt-4 text-xs text-gray-500">{repurposed.imagePrompts ? `${repurposed.imagePrompts.length} prompts` : 'No prompts yet'}</div>
              </div>
            </div>
          )}

          {/* Email Series View */}
          {activeRepurposeView === 'email' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">Email Series</h4>
                <div className="flex gap-2">
                  <button onClick={() => setActiveRepurposeView('hub')} className="px-3 py-1 bg-white border rounded-md">Back</button>
                  <button onClick={() => { repurposed.emailSeries ? navigator.clipboard.writeText(JSON.stringify(repurposed.emailSeries, null, 2)) : null; }} className="px-3 py-1 bg-white border rounded-md text-sm">Copy JSON</button>
                </div>
              </div>

              {!repurposed.emailSeries ? (
                <div className="p-6 text-center text-gray-500">No email series generated. Click “Email Series” above to generate.</div>
              ) : (
                <div className="space-y-4">
                  {repurposed.emailSeries.map((e: any, i: number) => (
                    <div key={i} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-gray-900">Day {e.day}: {e.subject}</div>
                          <div className="text-sm text-gray-700 mt-1 whitespace-pre-line">{e.body}</div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button onClick={() => navigator.clipboard.writeText(e.body)} className="px-3 py-1 bg-white border rounded-md text-sm">Copy</button>
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
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">Social Calendar</h4>
                <div className="flex gap-2">
                  <button onClick={() => setActiveRepurposeView('hub')} className="px-3 py-1 bg-white border rounded-md">Back</button>
                  <button onClick={() => { repurposed.socialCalendar ? navigator.clipboard.writeText(JSON.stringify(repurposed.socialCalendar, null, 2)) : null; }} className="px-3 py-1 bg-white border rounded-md">Copy JSON</button>
                </div>
              </div>

              {!repurposed.socialCalendar ? (
                <div className="p-6 text-center text-gray-500">No social calendar generated. Click “Social Calendar” above to generate.</div>
              ) : (
                <div className="space-y-4">
                  {repurposed.socialCalendar.map((s: any, i: number) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-gray-900">Day {s.day} • {s.platform}</div>
                        <div className="text-sm text-gray-700">{s.content}</div>
                      </div>
                      <div>
                        <button onClick={() => navigator.clipboard.writeText(s.content)} className="px-3 py-1 bg-white border rounded-md text-sm">Copy</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* LinkedIn Article View */}
          {activeRepurposeView === 'article' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">LinkedIn Article</h4>
                <div className="flex gap-2">
                  <button onClick={() => setActiveRepurposeView('hub')} className="px-3 py-1 bg-white border rounded-md">Back</button>
                  <button onClick={() => { repurposed.linkedinArticle ? navigator.clipboard.writeText(repurposed.linkedinArticle) : null; }} className="px-3 py-1 bg-white border rounded-md">Copy</button>
                </div>
              </div>

              {!repurposed.linkedinArticle ? (
                <div className="p-6 text-center text-gray-500">No LinkedIn draft generated. Click “LinkedIn Article” above to generate.</div>
              ) : (
                <div className="prose max-w-none text-sm text-gray-700">
                  <h2 className="text-lg font-bold mb-2">{transcript.title}</h2>
                  <div className="mt-2 whitespace-pre-line">{repurposed.linkedinArticle}</div>
                </div>
              )}
            </div>
          )}

          {/* Image Prompts View */}
          {activeRepurposeView === 'images' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">Image Prompts</h4>
                <div className="flex gap-2">
                  <button onClick={() => setActiveRepurposeView('hub')} className="px-3 py-1 bg-white border rounded-md">Back</button>
                  <button onClick={() => { repurposed.imagePrompts ? navigator.clipboard.writeText(JSON.stringify(repurposed.imagePrompts, null, 2)) : null; }} className="px-3 py-1 bg-white border rounded-md">Copy JSON</button>
                </div>
              </div>

              {!repurposed.imagePrompts ? (
                <div className="p-6 text-center text-gray-500">No image prompts generated. Click “Image Prompts” above to generate.</div>
              ) : (
                <div className="space-y-4">
                  {repurposed.imagePrompts.map((p: any, i: number) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-gray-900">{p.quote}</div>
                          <div className="text-sm text-gray-700 mt-1">{p.prompt}</div>
                        </div>
                        <div>
                          <button onClick={() => navigator.clipboard.writeText(p.prompt)} className="px-3 py-1 bg-white border rounded-md text-sm">Copy</button>
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Key Takeaways
            </h2>
            <button
              onClick={() => handleCopy(result.keyTakeaways?.join('\n- ') || '', 'takeaways')}
              className="text-gray-400 hover:text-primary transition"
            >
              {copiedSection === 'takeaways' ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
            </button>
          </div>
          <ul className="space-y-4">
            {result.keyTakeaways?.map((item: string, idx: number) => (
              <li key={idx} className="flex items-start text-gray-700 bg-indigo-50/50 p-3 rounded-lg">
                <span className="mr-3 text-primary font-bold mt-1">•</span>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Activity className="h-5 w-5 text-secondary" />
              Sentiment & Tone Analysis
            </h2>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-8 mb-8 border-b border-gray-100 pb-8">
            <div className="relative w-40 h-40 flex items-center justify-center flex-shrink-0">
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
                <span className="text-4xl font-extrabold text-gray-900">{sentiment.score}</span>
                <span className={`text-sm font-bold uppercase tracking-wide ${
                  sentiment.score > 60 ? 'text-green-600' : sentiment.score < 40 ? 'text-red-600' : 'text-yellow-600'
                }`}>{sentiment.label}</span>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-1">Overall Tone</h4>
                <p className="text-gray-900 font-medium text-lg leading-snug">{sentiment.tone || "Not available"}</p>
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Emotional Triggers</h4>
                <div className="flex flex-wrap gap-2">
                  {sentiment.emotionalKeywords?.map((kw: string, idx: number) => (
                    <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md border border-gray-200">
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Quote className="h-5 w-5 text-purple-500" />
            Best Quotes
          </h2>
          <div className="space-y-6">
            {result.quotes?.map((quote: any, idx: number) => (
              <div key={idx} className="relative pl-4 border-l-4 border-purple-200">
                <blockquote className="italic text-gray-700 mb-2 text-sm leading-relaxed">
                  "{quote.text}"
                </blockquote>
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2 text-gray-500 font-medium">
                    {quote.speaker && <span className="text-purple-700 bg-purple-50 px-1.5 rounded">{quote.speaker}</span>}
                    <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-400 font-mono">{quote.timestamp}</span>
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
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="col-span-1 space-y-2">
        {[
          { id: 'linkedin', icon: Linkedin, label: 'LinkedIn' },
          { id: 'twitter', icon: Twitter, label: 'Twitter / X' },
          { id: 'tiktok', icon: Video, label: 'TikTok / Reels' },
          { id: 'youtube', icon: Youtube, label: 'YouTube Shorts' },
          { id: 'email', icon: Mail, label: 'Newsletter' },
          { id: 'medium', icon: FileType, label: 'Medium Article' },
          { id: 'teaser', icon: Send, label: 'Teaser' },
        ].map((platform) => (
          <button
            key={platform.id}
            onClick={() => setActivePlatform(platform.id as PlatformType)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${
              activePlatform === platform.id
                ? 'bg-primary text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <platform.icon className="h-4 w-4" /> {platform.label}
          </button>
        ))}
      </div>

      <div className="col-span-1 md:col-span-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <div>
              <h3 className="font-bold text-gray-900 capitalize">{activePlatform.replace('teaser', 'Newsletter Teaser')}</h3>
              <p className="text-xs text-gray-500 mt-1">Optimized content ready to post</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowScheduleModal(true)}
                className="text-gray-600 hover:text-primary font-medium text-sm flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-white transition"
              >
                <CalendarIcon className="h-4 w-4" /> Schedule
              </button>
              <button
                onClick={() => {
                  const content = getContentForPlatform(activePlatform, socialContent);
                  handleCopy(content, activePlatform);
                }}
                className="text-primary hover:text-indigo-700 font-medium text-sm flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition"
              >
                {copiedSection === activePlatform ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy
              </button>
            </div>
          </div>
          <div className="p-6 max-h-[600px] overflow-y-auto">
            {activePlatform === 'twitter' ? (
              <div className="space-y-4">
                {socialContent.twitterThread?.map((tweet: string, idx: number) => (
                  <div key={idx} className="bg-gray-50 p-4 rounded-lg text-sm text-gray-800 border border-gray-100 relative">
                    <div className="flex justify-between items-start mb-2">
                      <span className="bg-black text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-bold">{idx + 1}</span>
                      <span className={`text-xs ${tweet.length > 280 ? 'text-red-500' : 'text-gray-400'}`}>{tweet.length}/280</span>
                    </div>
                    {tweet}
                  </div>
                ))}
              </div>
            ) : (
              <pre className="whitespace-pre-wrap font-sans text-gray-700 text-sm leading-relaxed">
                {activePlatform === 'linkedin' && socialContent.linkedinPost}
                {activePlatform === 'tiktok' && socialContent.tiktokScript}
                {activePlatform === 'youtube' && socialContent.youtubeDescription}
                {activePlatform === 'email' && `Subject: ${socialContent.emailNewsletter?.subject}\n\n${socialContent.emailNewsletter?.body}`}
                {activePlatform === 'medium' && socialContent.mediumArticle}
                {activePlatform === 'teaser' && `Subject: ${socialContent.newsletterTeaser?.subject}\n\n${socialContent.newsletterTeaser?.body}`}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderCollaborationTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Team Comments
          </h2>

          <div className="space-y-6 mb-8">
            {comments.length === 0 && (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                No comments yet. Start the conversation!
              </div>
            )}

            {comments.map((comment: any) => (
              <div key={comment.id} className="flex gap-4">
                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                  {(comment.userName || "U").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="bg-gray-50 p-4 rounded-lg rounded-tl-none">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-sm text-gray-900">{comment.userName}</span>
                      <span className="text-xs text-gray-400">{new Date(comment.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-gray-700 text-sm">{comment.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 items-start">
            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xs flex-shrink-0">
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
                  className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  Post Comment
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="lg:col-span-1">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 mb-4">Workflow Status</h3>
          <div className="space-y-2">
            {(['Draft', 'In Review', 'Approved', 'Published'] as WorkflowStatus[]).map(status => (
              <div
                key={status}
                onClick={() => handleStatusChange(status)}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition ${
                  transcript.status === status ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-2.5 w-2.5 rounded-full ${
                    status === 'Approved' ? 'bg-green-500' :
                    status === 'Published' ? 'bg-blue-500' :
                    status === 'In Review' ? 'bg-yellow-500' : 'bg-gray-300'
                  }`}></div>
                  <span className={`text-sm font-medium ${transcript.status === status ? 'text-primary' : 'text-gray-700'}`}>{status}</span>
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
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-gray-900">Blog & SEO</h3>
            <p className="text-sm text-gray-500">Drafts and SEO suggestions generated from the episode</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveBlogTab('article')}
              className={`px-3 py-1 text-sm rounded-md ${activeBlogTab === 'article' ? 'bg-indigo-50 text-primary' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Article
            </button>
            <button
              onClick={() => setActiveBlogTab('shownotes')}
              className={`px-3 py-1 text-sm rounded-md ${activeBlogTab === 'shownotes' ? 'bg-indigo-50 text-primary' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Show Notes
            </button>
            <button
              onClick={() => setActiveBlogTab('seo')}
              className={`px-3 py-1 text-sm rounded-md ${activeBlogTab === 'seo' ? 'bg-indigo-50 text-primary' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              SEO
            </button>
          </div>
        </div>

        <div>
          {activeBlogTab === 'article' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">{post?.title || 'Draft Title'}</h2>
              <p className="text-sm text-gray-600">{post?.intro || 'No intro available.'}</p>

              {post?.sections?.map((s, i) => (
                <div key={i} className="pt-4 border-t border-gray-100">
                  <h4 className="font-semibold text-gray-900 mb-2">{s.heading}</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">{s.content}</p>
                </div>
              ))}

              {post?.conclusion && (
                <div className="pt-4 border-t border-gray-100">
                  <h4 className="font-semibold text-gray-900 mb-2">Conclusion</h4>
                  <p className="text-sm text-gray-700">{post.conclusion}</p>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => navigator.clipboard.writeText(`${post?.title}\n\n${post?.intro}\n\n${post?.sections?.map(s => `${s.heading}\n${s.content}`).join('\n\n') || ''}\n\n${post?.conclusion || ''}`)}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                >
                  Copy Article
                </button>
                <button onClick={() => downloadDOCX({ title: post?.title || 'Draft', intro: post?.intro || '', sections: post?.sections || [], conclusion: post?.conclusion || '' } as any as Transcript)} className="px-4 py-2 bg-primary text-white rounded-md text-sm hover:brightness-95">Export</button>
              </div>
            </div>
          )}

          {activeBlogTab === 'shownotes' && (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900">Show Notes</h3>
              <p className="text-sm text-gray-600">{result.showNotes || post?.intro || 'No show notes available.'}</p>

              <div className="mt-4 grid gap-3">
                {post?.sections?.map((s, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <h4 className="font-semibold text-gray-900">{s.heading}</h4>
                    <p className="text-sm text-gray-700">{s.content}</p>
                  </div>
                ))}
              </div>

              <div className="flex justify-end mt-4">
                <button onClick={() => navigator.clipboard.writeText(result.showNotes || post?.intro || '')} className="px-4 py-2 bg-white border border-gray-200 rounded-md text-sm text-gray-700 hover:bg-gray-50">Copy Notes</button>
              </div>
            </div>
          )}

          {activeBlogTab === 'seo' && (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900">SEO Suggestions</h3>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <p className="text-sm text-gray-700"><span className="font-medium">Meta Description:</span> {seoData?.metaDescription || 'No meta description generated.'}</p>
                <p className="text-sm text-gray-700 mt-2"><span className="font-medium">Keywords:</span> {seoData?.keywords?.join(', ') || 'No keywords generated.'}</p>
                <p className="text-sm text-gray-700 mt-2"><span className="font-medium">Title Variations:</span> {seoData?.titleVariations?.join(' • ') || 'No title variations.'}</p>
                <p className="text-sm text-gray-700 mt-2"><span className="font-medium">Readability:</span> {seoData?.readability?.score ?? 'N/A'} ({seoData?.readability?.level ?? 'N/A'})</p>
              </div>

              <div className="flex justify-end mt-2">
                <button onClick={() => navigator.clipboard.writeText(JSON.stringify(seoData, null, 2))} className="px-4 py-2 bg-white border border-gray-200 rounded-md text-sm text-gray-700 hover:bg-gray-50">Copy SEO JSON</button>
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
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Speaker Analytics</h3>
            <p className="text-sm text-gray-500">Contributions and speaking time estimates</p>
          </div>

          <div className="flex items-center gap-2">
            {!hasPercent && speakers.length > 0 && (
              <button
                onClick={estimateSpeakers}
                className={`px-3 py-1 text-sm rounded-md ${isEstimatingSpeakers ? 'bg-gray-100' : 'bg-white border border-gray-200'}`}
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
          <div className="p-8 text-center text-gray-500">No speaker analytics available for this transcript.</div>
        ) : (
          <div className="space-y-4">
            {speakers.map((s, i) => {
              const percent = speakerEstimates?.[s.name] ?? s.speakingTimePercent ?? 0;
              return (
                <div key={i} className="p-4 bg-gray-50 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center font-bold text-indigo-700">{(s.name || 'U').charAt(0).toUpperCase()}</div>
                    <div>
                      <div className="font-semibold text-gray-900">{s.name} <span className="text-xs text-gray-500 ml-2">{s.role}</span></div>
                      <p className="text-sm text-gray-600">{s.contribution}</p>
                      {s.topics && s.topics.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {s.topics.map((t: string) => (
                            <span key={t} className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="w-40 text-right">
                    <div className="text-xs text-gray-500 mb-1">Speaking Time</div>
                    <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div className="h-2 bg-indigo-600" style={{ width: `${percent}%` }} />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{percent}%</div>
                  </div>
                </div>
              );
            })}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => navigator.clipboard.writeText(speakers.map(s => `${s.name}: ${speakerEstimates?.[s.name] ?? s.speakingTimePercent ?? 0}%`).join('\n'))}
                className="px-4 py-2 bg-white border border-gray-200 rounded-md text-sm text-gray-700 hover:bg-gray-50"
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <button onClick={onBack} className="flex items-center text-gray-500 hover:text-gray-900 mb-2 transition text-sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900 line-clamp-1">{transcript.title}</h1>

            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowStatusMenu(!showStatusMenu); }}
                className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 uppercase tracking-wide cursor-pointer hover:opacity-80 ${
                  transcript.status === 'Approved' ? 'bg-green-100 text-green-800 border-green-200' :
                  transcript.status === 'Published' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                  transcript.status === 'In Review' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                  'bg-gray-100 text-gray-700 border-gray-200'
                }`}
              >
                {transcript.status || 'Draft'}
                <ChevronDown className="h-3 w-3" />
              </button>

              {showStatusMenu && (
                <div className="absolute top-full left-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10">
                  {(['Draft', 'In Review', 'Approved', 'Published'] as WorkflowStatus[]).map(status => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {status}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 mt-2">
            <span className="flex items-center text-gray-500 text-sm">
              <Clock className="h-3.5 w-3.5 mr-1" />
              Analyzed on {new Date((transcript as any).date ?? transcript.created_at ?? Date.now()).toLocaleDateString()}
            </span>
            {settings && (
              <div className="flex items-center gap-2 text-xs text-gray-400 border-l border-gray-300 pl-4">
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
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition text-sm font-medium disabled:opacity-50"
            >
              {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {isDownloading ? "Processing..." : "Export"}
            </button>

            {showDownloadMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10">
                <button onClick={() => handleDownload('pdf')} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                  <FileText className="h-4 w-4 text-red-500" />
                  Download PDF
                </button>

                <button onClick={() => handleDownload('docx')} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                  <File className="h-4 w-4 text-blue-500" />
                  Download DOCX
                </button>

                <button onClick={() => handleDownload('md')} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                  <Download className="h-4 w-4 text-gray-500" />
                  Download Markdown
                </button>

                <button onClick={() => handleDownload('json')} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                  <FileJson className="h-4 w-4 text-orange-500" />
                  Export JSON
                </button>

                <div className="h-px bg-gray-100 my-1"></div>

                <button onClick={() => handleDownload('kit')} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                  <Briefcase className="h-4 w-4 text-purple-500" />
                  Media Kit
                </button>

                <div className="h-px bg-gray-100 my-1"></div>

                <button onClick={() => handleDownload('email')} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                  <Mail className="h-4 w-4 text-green-500" />
                  Email Results
                </button>

                <button onClick={() => handleDownload('sheets')} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                  <Table className="h-4 w-4 text-green-600" />
                  Google Sheets
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium shadow-sm"
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-8 overflow-x-auto">
        <button onClick={() => setActiveTab('overview')} className={`px-6 py-4 text-sm font-medium transition whitespace-nowrap border-b-2 ${activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          Overview
        </button>
        <button onClick={() => setActiveTab('platform')} className={`px-6 py-4 text-sm font-medium transition whitespace-nowrap border-b-2 ${activeTab === 'platform' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          Platform Content
        </button>
        <button onClick={() => setActiveTab('blog')} className={`px-6 py-4 text-sm font-medium transition whitespace-nowrap border-b-2 ${activeTab === 'blog' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          Blog & SEO
        </button>
        <button onClick={() => setActiveTab('speakers')} className={`px-6 py-4 text-sm font-medium transition whitespace-nowrap border-b-2 ${activeTab === 'speakers' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          Speakers
        </button>
        <button onClick={() => setActiveTab('repurpose')} className={`px-6 py-4 text-sm font-medium transition whitespace-nowrap border-b-2 ${activeTab === 'repurpose' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          Repurposing
        </button>
        <button onClick={() => setActiveTab('monetization')} className={`px-6 py-4 text-sm font-medium transition whitespace-nowrap border-b-2 ${activeTab === 'monetization' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          Monetization
        </button>
        <button onClick={() => setActiveTab('collaboration')} className={`px-6 py-4 text-sm font-medium transition whitespace-nowrap border-b-2 flex items-center gap-2 ${activeTab === 'collaboration' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          Collaboration
          {comments.length > 0 && (
            <span className="bg-indigo-100 text-primary text-xs px-2 py-0.5 rounded-full">{comments.length}</span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Schedule Post
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Choose a date and time to publish this {activePlatform} post.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
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
                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSchedulePost}
                disabled={isScheduling || !scheduleDate || !scheduleTime}
                className="px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-indigo-700 text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {isScheduling && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Export Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" /> Email Results
            </h3>
            <p className="text-sm text-gray-500 mb-6">Send the complete analysis report to a team member or client.</p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Email</label>
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
                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={isSendingEmail || !recipientEmail}
                className="px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-indigo-700 text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {isSendingEmail && <Loader2 className="h-4 w-4 animate-spin" />}
                Send Email
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ResultsPage;
