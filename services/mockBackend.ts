import { Transcript, User, Comment, WorkflowStatus, TeamMember, ActivityLog, ScheduledPost, Guest, AnalysisResult, UsageMetrics, ApiKey, Webhook, HelpArticle, Tutorial } from "../types";

// Mock Data Keys
const STORAGE_KEY_TRANSCRIPTS = 'pid_transcripts';
const STORAGE_KEY_USER = 'pid_user';
const STORAGE_KEY_TEAM = 'pid_team';
const STORAGE_KEY_CALENDAR = 'pid_calendar';
const STORAGE_KEY_GUESTS = 'pid_guests';
const STORAGE_KEY_API_KEYS = 'pid_api_keys';
const STORAGE_KEY_WEBHOOKS = 'pid_webhooks';

export const getStoredUser = (): User | null => {
  const stored = localStorage.getItem(STORAGE_KEY_USER);
  return stored ? JSON.parse(stored) : null;
};

export const loginUser = async (email: string): Promise<User> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const user: User = {
    id: 'user_123',
    email,
    name: email.split('@')[0],
    plan: 'Free',
    role: 'Owner'
  };
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
  return user;
};

export const logoutUser = async () => {
   localStorage.removeItem(STORAGE_KEY_USER);
};

  
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updatedUser));
  return updatedUser;
};

// --- Help System ---

export const getHelpArticles = async (): Promise<HelpArticle[]> => {
  return [
    {
      id: '1',
      title: 'How to upload your first transcript',
      category: 'Getting Started',
      content: 'Navigate to the dashboard and click "New Analysis". You can paste text directly, upload a .txt file, or use our speech-to-text feature for short audio clips.'
    },
    {
      id: '2',
      title: 'Understanding Sentiment Analysis',
      category: 'Features',
      content: 'Our sentiment score ranges from 0 (Negative) to 100 (Positive). A score of 50 indicates neutral content. We also provide emotional keywords to help you understand the tone.'
    },
    {
      id: '3',
      title: 'Exporting to PDF and DOCX',
      category: 'Features',
      content: 'On the results page, click the "Export" button in the top right corner. Select your desired format from the dropdown menu. PDF reports include all analysis data.
    },
    {
      id: '4',
      title: 'Managing Team Members',
      category: 'Account',
      content: 'Go to the Team Workspace tab. Click "Invite Member" and enter their email address. You can assign roles such as Editor or Viewer to control access levels.'
    },
    {
      id: '5',
      title: 'Podcast SEO Best Practices',
      category: 'Best Practices',
      content: 'Use our generated keywords in your show notes and titles. Ensure your blog post outline covers the main topics discussed to rank higher in search results.'
    },
    {
      id: '6',
      title: 'How to use the Social Media Calendar',
      category: 'Features',
      content: 'The Content Calendar allows you to schedule posts generated from your transcripts. You can drag and drop posts (coming soon) and view your publishing schedule at a glance.'
    }
  ];
};

export const getTutorials = async (): Promise<Tutorial[]> => {
  return [
    {
      id: '1',
      title: 'Quick Start Guide: From Audio to Insights',
      duration: '2:30',
      thumbnailUrl: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&q=80&w=400',
    },
    {
      id: '2',
      title: 'Advanced Feature Walkthrough',
      duration: '5:45',
      thumbnailUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=400',
    },
    {
      id: '3',
      title: 'Customizing Your Brand',
      duration: '3:15',
      thumbnailUrl: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=400',
    }
  ];
};

export const sendSupportTicket = async (subject: string, message: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log(`Support ticket sent: ${subject} - ${message}`);
};

// --- API Keys ---

export const getApiKeys = async (): Promise<ApiKey[]> => {
  const stored = localStorage.getItem(STORAGE_KEY_API_KEYS);
  if (stored) return JSON.parse(stored);
  // Default empty or mock key
  return [];
};

export const generateApiKey = async (name: string): Promise<ApiKey> => {
  const keys = await getApiKeys();
  const newKey: ApiKey = {
    id: crypto.randomUUID(),
    name,
    key: `pi_live_${Math.random().toString(36).substr(2, 24)}`,
    createdAt: new Date().toISOString(),
    lastUsed: '-',
    status: 'Active'
  };
  localStorage.setItem(STORAGE_KEY_API_KEYS, JSON.stringify([...keys, newKey]));
  return newKey;
};

export const revokeApiKey = async (id: string): Promise<void> => {
  const keys = await getApiKeys();
  const updated = keys.filter(k => k.id !== id);
  localStorage.setItem(STORAGE_KEY_API_KEYS, JSON.stringify(updated));
};

// --- Webhooks ---

export const getWebhooks = async (): Promise<Webhook[]> => {
  const stored = localStorage.getItem(STORAGE_KEY_WEBHOOKS);
  if (stored) return JSON.parse(stored);
  return [];
};

export const addWebhook = async (url: string, events: string[]): Promise<Webhook> => {
  const webhooks = await getWebhooks();
  const newWebhook: Webhook = {
    id: crypto.randomUUID(),
    url,
    events,
    secret: `whsec_${Math.random().toString(36).substr(2, 16)}`,
    isActive: true,
    status: 'Untested'
  };
  localStorage.setItem(STORAGE_KEY_WEBHOOKS, JSON.stringify([...webhooks, newWebhook]));
  return newWebhook;
};

export const deleteWebhook = async (id: string): Promise<void> => {
  const webhooks = await getWebhooks();
  const updated = webhooks.filter(w => w.id !== id);
  localStorage.setItem(STORAGE_KEY_WEBHOOKS, JSON.stringify(updated));
};

export const testWebhook = async (id: string): Promise<void> => {
  // Simulate test
  await new Promise(resolve => setTimeout(resolve, 1000));
  const webhooks = await getWebhooks();
  const index = webhooks.findIndex(w => w.id === id);
  if (index !== -1) {
    webhooks[index].status = 'Healthy';
    webhooks[index].lastTriggered = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY_WEBHOOKS, JSON.stringify(webhooks));
  }
};

// --- Transcripts ---

export const getTranscripts = async (): Promise<Transcript[]> => {
  const stored = localStorage.getItem(STORAGE_KEY_TRANSCRIPTS);
  return stored ? JSON.parse(stored) : [];
};

export const getTranscriptById = async (id: string): Promise<Transcript | undefined> => {
  const transcripts = await getTranscripts();
  return transcripts.find(t => t.id === id);
};

export const saveTranscript = async (transcript: Transcript): Promise<void> => {
  const transcripts = await getTranscripts();
  // Ensure default workflow status
  if (!transcript.workflowStatus) transcript.workflowStatus = 'Draft';
  if (!transcript.comments) transcript.comments = [];
  
  const updatedTranscripts = [transcript, ...transcripts.filter(t => t.id !== transcript.id)];
  localStorage.setItem(STORAGE_KEY_TRANSCRIPTS, JSON.stringify(updatedTranscripts));
};

export const saveTranscriptResult = async (id: string, resultUpdates: Partial<AnalysisResult>): Promise<void> => {
    const transcripts = await getTranscripts();
    const index = transcripts.findIndex(t => t.id === id);
    if (index === -1) return;

    const transcript = transcripts[index];
    const updatedTranscript = {
        ...transcript,
        result: {
            ...transcript.result!,
            ...resultUpdates
        }
    };

    transcripts[index] = updatedTranscript;
    localStorage.setItem(STORAGE_KEY_TRANSCRIPTS, JSON.stringify(transcripts));
};

export const deleteTranscript = async (id: string): Promise<void> => {
  const transcripts = await getTranscripts();
  const updatedTranscripts = transcripts.filter(t => t.id !== id);
  localStorage.setItem(STORAGE_KEY_TRANSCRIPTS, JSON.stringify(updatedTranscripts));
};

// --- Collaboration Features ---

export const addCommentToTranscript = async (transcriptId: string, text: string, user: User): Promise<Comment> => {
  const transcripts = await getTranscripts();
  const transcriptIndex = transcripts.findIndex(t => t.id === transcriptId);
  
  if (transcriptIndex === -1) throw new Error("Transcript not found");

  const newComment: Comment = {
    id: crypto.randomUUID(),
    userId: user.id,
    userName: user.name,
    text,
    timestamp: new Date().toISOString()
  };

  const transcript = transcripts[transcriptIndex];
  const comments = transcript.comments || [];
  
  transcripts[transcriptIndex] = {
    ...transcript,
    comments: [...comments, newComment]
  };

  localStorage.setItem(STORAGE_KEY_TRANSCRIPTS, JSON.stringify(transcripts));
  return newComment;
};

export const updateTranscriptStatus = async (transcriptId: string, status: WorkflowStatus): Promise<void> => {
  const transcripts = await getTranscripts();
  const transcriptIndex = transcripts.findIndex(t => t.id === transcriptId);
  
  if (transcriptIndex === -1) throw new Error("Transcript not found");

  transcripts[transcriptIndex] = {
    ...transcripts[transcriptIndex],
    workflowStatus: status
  };

  localStorage.setItem(STORAGE_KEY_TRANSCRIPTS, JSON.stringify(transcripts));
};

// --- Team Features (Mock) ---

export const getTeamMembers = async (): Promise<TeamMember[]> => {
  const stored = localStorage.getItem(STORAGE_KEY_TEAM);
  if (stored) return JSON.parse(stored);

  // Default mock team
  const defaultTeam: TeamMember[] = [
    { id: '1', name: 'You', email: 'demo@podcastinsight.com', role: 'Owner', status: 'Active', lastActive: 'Now' },
    { id: '2', name: 'Sarah Editor', email: 'sarah@example.com', role: 'Editor', status: 'Active', lastActive: '2h ago' },
    { id: '3', name: 'Mike Guest', email: 'mike@example.com', role: 'Viewer', status: 'Pending', lastActive: '-' }
  ];
  localStorage.setItem(STORAGE_KEY_TEAM, JSON.stringify(defaultTeam));
  return defaultTeam;
};

export const inviteTeamMember = async (email: string, role: TeamMember['role']): Promise<TeamMember> => {
  const members = await getTeamMembers();
  const newMember: TeamMember = {
    id: crypto.randomUUID(),
    name: email.split('@')[0],
    email,
    role,
    status: 'Pending',
    lastActive: '-'
  };
  localStorage.setItem(STORAGE_KEY_TEAM, JSON.stringify([...members, newMember]));
  return newMember;
};

export const removeTeamMember = async (id: string): Promise<void> => {
  const members = await getTeamMembers();
  const updated = members.filter(m => m.id !== id);
  localStorage.setItem(STORAGE_KEY_TEAM, JSON.stringify(updated));
};

export const getActivityLog = async (): Promise<ActivityLog[]> => {
  // Mock activity log
  return [
    { id: '1', user: 'Sarah Editor', action: 'Approved', target: 'Ep 42: Future of AI', timestamp: '2 hours ago' },
    { id: '2', user: 'You', action: 'Uploaded', target: 'Ep 43: Marketing 101', timestamp: '5 hours ago' },
    { id: '3', user: 'Sarah Editor', action: 'Commented on', target: 'Ep 41: Startups', timestamp: '1 day ago' },
    { id: '4', user: 'You', action: 'Invited', target: 'mike@example.com', timestamp: '2 days ago' },
  ];
};

// --- Calendar & Publishing ---

export const getScheduledPosts = async (): Promise<ScheduledPost[]> => {
  const stored = localStorage.getItem(STORAGE_KEY_CALENDAR);
  if (stored) return JSON.parse(stored);
  
  // Mock some initial posts
  const today = new Date();
  const mockPosts: ScheduledPost[] = [
    {
      id: 'post_1',
      platform: 'linkedin',
      content: 'Excited to share insights from our latest episode on AI trends! #AI #Tech',
      scheduledDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2, 9, 0).toISOString(),
      status: 'Published',
      metrics: { likes: 45, comments: 12, shares: 5, clicks: 120, impressions: 850 }
    },
    {
      id: 'post_2',
      platform: 'twitter',
      content: '1/5 The future of marketing is here. Here are 5 key takeaways from Ep 43.',
      scheduledDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 14, 0).toISOString(),
      status: 'Scheduled'
    }
  ];
  
  localStorage.setItem(STORAGE_KEY_CALENDAR, JSON.stringify(mockPosts));
  return mockPosts;
};

export const schedulePost = async (post: Omit<ScheduledPost, 'id' | 'status'>): Promise<ScheduledPost> => {
  const posts = await getScheduledPosts();
  const newPost: ScheduledPost = {
    ...post,
    id: crypto.randomUUID(),
    status: 'Scheduled'
  };
  
  localStorage.setItem(STORAGE_KEY_CALENDAR, JSON.stringify([...posts, newPost]));
  return newPost;
};

export const deleteScheduledPost = async (id: string): Promise<void> => {
  const posts = await getScheduledPosts();
  const updated = posts.filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY_CALENDAR, JSON.stringify(updated));
};

// --- Guest Outreach ---

export const getGuests = async (): Promise<Guest[]> => {
  const stored = localStorage.getItem(STORAGE_KEY_GUESTS);
  if (stored) return JSON.parse(stored);
  return [];
};

export const addGuest = async (guest: Guest): Promise<Guest> => {
  const guests = await getGuests();
  // Avoid duplicates by name (simple check)
  if (guests.some(g => g.name === guest.name)) return guest;
  
  const updated = [...guests, guest];
  localStorage.setItem(STORAGE_KEY_GUESTS, JSON.stringify(updated));
  return guest;
};

export const updateGuest = async (id: string, updates: Partial<Guest>): Promise<void> => {
  const guests = await getGuests();
  const updated = guests.map(g => g.id === id ? { ...g, ...updates } : g);
  localStorage.setItem(STORAGE_KEY_GUESTS, JSON.stringify(updated));
};

export const deleteGuest = async (id: string): Promise<void> => {
  const guests = await getGuests();
  const updated = guests.filter(g => g.id !== id);
  localStorage.setItem(STORAGE_KEY_GUESTS, JSON.stringify(updated));
};

// --- Analytics & Usage ---

export const getUsageMetrics = async (): Promise<UsageMetrics> => {
    const transcripts = await getTranscripts();
    const posts = await getScheduledPosts();
    
    // Calculate simple stats based on existing data
    const transcriptsUsed = transcripts.length;
    const transcriptQuota = 50; // Mock quota for Pro plan
    const totalWords = transcripts.reduce((acc, t) => acc + (t.content?.length || 0) / 5, 0); // approx words
    const hoursSaved = Math.round(transcriptsUsed * 3.5); // avg 3.5 hours per transcript manual work
    
    // Content generated breakdown
    const contentCounts = {
        'Blog Posts': transcripts.filter(t => t.result?.blogPost).length,
        'Social Clips': transcripts.filter(t => t.result?.socialContent).length * 4, // Approx 4 platforms
        'Emails': transcripts.filter(t => t.result?.socialContent?.emailNewsletter).length,
        'Summaries': transcripts.filter(t => t.result?.keyTakeaways).length
    };
    
    const contentGenerated = Object.entries(contentCounts).map(([type, count]) => ({ type, count }));
    const topPerformingType = 'Social Clips'; // Mock

    // Daily Usage (Mock data for last 7 days)
    const dailyUsage = Array.from({length: 7}, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return {
            date: d.toLocaleDateString(undefined, {weekday: 'short'}),
            count: Math.floor(Math.random() * 5)
        };
    });

    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);

    return {
        period: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
        transcriptsUsed,
        transcriptQuota,
        totalWordsProcessed: Math.round(totalWords),
        hoursSaved,
        contentGenerated,
        dailyUsage,
        topPerformingType,
        quotaResetDate: nextMonth.toLocaleDateString(),
    };
};