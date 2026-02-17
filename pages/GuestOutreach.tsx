import React, { useEffect, useState } from 'react';
import { getGuests, addGuest, updateGuest, deleteGuest } from '../services/backend';
import { getTranscripts } from '../services/transcripts';
import { suggestGuests, generateOutreachEmail } from '../services/geminiService';
import { getGmailStatus, sendGmailEmail, GmailStatus } from '../services/gmail';
import { getSendGridStatus, sendEmailViaSendGrid } from '../services/sendgrid';
import { getKitStatus, sendKitEmail } from '../services/kit';
import { getMailchimpStatus, sendMailchimpEmail } from '../services/mailchimp';
import { Guest, Transcript } from '../types';
import { Users, Mail, Search, Plus, UserCheck, Trash2, ExternalLink, Loader2, Sparkles, X, Copy, Check, Send, AlertCircle, ChevronDown } from 'lucide-react';

type EmailProvider = 'gmail' | 'sendgrid' | 'kit' | 'mailchimp';

interface ProviderStatus {
  id: EmailProvider;
  label: string;
  connected: boolean;
  canSend: boolean; // Can send individual emails (vs list-only)
}

const GuestOutreach: React.FC = () => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showFindModal, setShowFindModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  // Find Guests State
  const [selectedTranscriptId, setSelectedTranscriptId] = useState('');
  const [isFinding, setIsFinding] = useState(false);
  const [foundGuests, setFoundGuests] = useState<Guest[]>([]);

  // Email State
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [isDrafting, setIsDrafting] = useState(false);
  const [emailDraft, setEmailDraft] = useState<{subject: string, body: string} | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Email Provider State
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<EmailProvider | null>(null);
  const [showProviderPicker, setShowProviderPicker] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [loadingProviders, setLoadingProviders] = useState(true);

  useEffect(() => {
    loadData();
    loadProviderStatuses();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const g = await getGuests();
    const t = await getTranscripts();
    setGuests(g);
    setTranscripts(t);
    setLoading(false);
  };

  const loadProviderStatuses = async () => {
    setLoadingProviders(true);
    try {
      const [gmailRes, sendgridRes, kitRes, mailchimpRes] = await Promise.all([
        getGmailStatus().catch(() => ({ connected: false })),
        getSendGridStatus().catch(() => ({ connected: false })),
        getKitStatus().catch(() => ({ connected: false })),
        getMailchimpStatus().catch(() => ({ connected: false })),
      ]);

      const statuses: ProviderStatus[] = [
        { id: 'gmail', label: 'Gmail', connected: !!gmailRes?.connected, canSend: true },
        { id: 'sendgrid', label: 'SendGrid', connected: !!sendgridRes?.connected, canSend: true },
        { id: 'kit', label: 'Kit (ConvertKit)', connected: !!kitRes?.connected, canSend: true },
        { id: 'mailchimp', label: 'Mailchimp', connected: !!mailchimpRes?.connected, canSend: true },
      ];

      setProviders(statuses);

      // Auto-select first connected provider that can send
      const defaultProvider = statuses.find(p => p.connected && p.canSend);
      if (defaultProvider) {
        setSelectedProvider(defaultProvider.id);
      }
    } catch (err) {
      console.error('Failed to load provider statuses:', err);
    } finally {
      setLoadingProviders(false);
    }
  };

  const connectedProviders = providers.filter(p => p.connected);
  const sendableProviders = providers.filter(p => p.connected && p.canSend);
  const hasAnyConnection = connectedProviders.length > 0;
  const hasAnySendable = sendableProviders.length > 0;

  const handleFindGuests = async () => {
    if (!selectedTranscriptId) return;
    setIsFinding(true);
    setFoundGuests([]);
    
    try {
      const transcript = transcripts.find(t => t.id === selectedTranscriptId);
      if (transcript && transcript.result) {
        // Construct context from transcript summary/takeaways
        const context = `
          Title: ${transcript.title}
          Key Takeaways: ${transcript.result.keyTakeaways.join('\n')}
          Topics: ${transcript.result.seo?.keywords.join(', ') || ''}
        `;
        const results = await suggestGuests(context);
        // Add source ID
        const resultsWithSource = results.map(r => ({...r, sourceTranscriptId: transcript.id}));
        setFoundGuests(resultsWithSource);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to generate suggestions.");
    } finally {
      setIsFinding(false);
    }
  };

  const handleSaveGuest = async (guest: Guest) => {
    await addGuest(guest);
    // Remove from found list to show it's added
    setFoundGuests(prev => prev.filter(g => g.id !== guest.id));
    // Refresh main list
    const g = await getGuests();
    setGuests(g);
  };

  const handleDeleteGuest = async (id: string) => {
    if(window.confirm("Remove this guest?")) {
      await deleteGuest(id);
      loadData();
    }
  };

  const handleStatusChange = async (id: string, status: Guest['status']) => {
    await updateGuest(id, { status });
    loadData();
  };

  const handleDraftEmail = async (guest: Guest) => {
    setSelectedGuest(guest);
    setShowEmailModal(true);
    setEmailDraft(null);
    setIsDrafting(true);

    try {
      // Build rich context from source transcript if available
      const transcript = transcripts.find(t => t.id === guest.sourceTranscriptId);
      let context = "a podcast about industry insights and expert perspectives";

      if (transcript) {
        const parts = [`Episode: "${transcript.title}"`];

        if (transcript.result?.keyTakeaways?.length) {
          parts.push(`Key topics discussed: ${transcript.result.keyTakeaways.slice(0, 3).join('; ')}`);
        }

        if (transcript.result?.seo?.keywords?.length) {
          parts.push(`Keywords: ${transcript.result.seo.keywords.slice(0, 5).join(', ')}`);
        }

        if (transcript.result?.summary) {
          parts.push(`Episode summary: ${transcript.result.summary.substring(0, 300)}`);
        }

        context = parts.join('\n');
      }

      // Use guest bio, or fall back to match reason for context
      const guestBio = guest.bio || guest.matchReason || '';

      const draft = await generateOutreachEmail(guest.name, guestBio, context);
      setEmailDraft(draft);
    } catch (e) {
       console.error(e);
       alert("Failed to draft email.");
       setShowEmailModal(false);
    } finally {
      setIsDrafting(false);
    }
  };

  const handleCopyEmail = () => {
    if(emailDraft) {
      navigator.clipboard.writeText(`Subject: ${emailDraft.subject}\n\n${emailDraft.body}`);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);

      // Auto-update status to Contacted if still suggested
      if(selectedGuest && selectedGuest.status === 'Suggested') {
        handleStatusChange(selectedGuest.id, 'Contacted');
      }
    }
  };

  const handleSendEmail = () => {
    if(emailDraft && selectedGuest) {
      // Create mailto link with pre-filled content
      const to = selectedGuest.email || recipientEmail || '';
      const subject = encodeURIComponent(emailDraft.subject);
      const body = encodeURIComponent(emailDraft.body);

      const mailtoLink = `mailto:${to}?subject=${subject}&body=${body}`;
      window.location.href = mailtoLink;

      // Auto-update status to Contacted if still suggested
      if(selectedGuest.status === 'Suggested') {
        handleStatusChange(selectedGuest.id, 'Contacted');
      }
    }
  };

  const handleSendViaProvider = async () => {
    if (!emailDraft || !selectedGuest || !selectedProvider) return;

    const to = selectedGuest.email || recipientEmail;
    if (!to) {
      setSendError('Please enter a recipient email address');
      return;
    }

    try {
      setIsSending(true);
      setSendError(null);
      setSendSuccess(false);

      if (selectedProvider === 'gmail') {
        await sendGmailEmail(to, emailDraft.subject, emailDraft.body);
      } else if (selectedProvider === 'sendgrid') {
        const result = await sendEmailViaSendGrid({
          to,
          subject: emailDraft.subject,
          text: emailDraft.body,
        });
        if (!result.success) {
          throw new Error(result.message || 'Failed to send via SendGrid');
        }
      } else if (selectedProvider === 'kit') {
        await sendKitEmail(to, emailDraft.subject, emailDraft.body);
      } else if (selectedProvider === 'mailchimp') {
        await sendMailchimpEmail(to, emailDraft.subject, emailDraft.body);
      }

      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 3000);

      // Auto-update status to Contacted
      if (selectedGuest.status === 'Suggested') {
        handleStatusChange(selectedGuest.id, 'Contacted');
      }
    } catch (err: any) {
      setSendError(err.message || 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Guest Outreach</h1>
          <p className="text-textMuted">Discover and contact experts for your podcast.</p>
        </div>
        <button 
          onClick={() => setShowFindModal(true)}
          className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-primary transition font-medium shadow-sm"
        >
          <Sparkles className="h-5 w-5" />
          Find Potential Guests
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-100 p-6 rounded-xl border border-gray-300 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-sm font-medium text-textMuted">Total Suggested</p>
             <p className="text-3xl font-bold text-textPrimary">{guests.length}</p>
           </div>
           <Users className="h-8 w-8 text-primary" />
        </div>
        <div className="bg-gray-100 p-6 rounded-xl border border-gray-300 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-sm font-medium text-textMuted">Contacted</p>
             <p className="text-3xl font-bold text-textPrimary">{guests.filter(g => g.status === 'Contacted').length}</p>
           </div>
           <Mail className="h-8 w-8 text-yellow-600" />
        </div>
        <div className="bg-gray-100 p-6 rounded-xl border border-gray-300 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-sm font-medium text-textMuted">Booked</p>
             <p className="text-3xl font-bold text-textPrimary">{guests.filter(g => g.status === 'Booked').length}</p>
           </div>
           <UserCheck className="h-8 w-8 text-green-600" />
        </div>
      </div>

      {/* Guest List */}
      <div className="bg-gray-100 rounded-xl shadow-sm border border-gray-300 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-300 bg-gray-50">
          <h2 className="font-semibold text-textBody">Your Guest Pipeline</h2>
        </div>
        
        {loading ? (
           <div className="p-12 text-center text-textMuted">Loading guests...</div>
        ) : guests.length === 0 ? (
           <div className="p-12 text-center text-textMuted">
             <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
             <p>No guests yet. Click "Find Potential Guests" to start.</p>
           </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-textMuted uppercase tracking-wider">Name & Bio</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-textMuted uppercase tracking-wider">Match Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-textMuted uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-textMuted uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-gray-100 divide-y divide-gray-200">
                {guests.map((guest) => (
                  <tr key={guest.id} className="hover:bg-gray-200">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary font-bold mr-4">
                          {guest.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-textPrimary">{guest.name}</div>
                          <div className="text-xs text-textMuted">{guest.title}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-textSecondary max-w-xs truncate" title={guest.matchReason}>{guest.matchReason || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                       <select 
                         value={guest.status}
                         onChange={(e) => handleStatusChange(guest.id, e.target.value as any)}
                         className={`text-xs font-semibold px-2 py-1 rounded-full border-none outline-none cursor-pointer ${
                           guest.status === 'Booked' ? 'bg-accent-soft text-accent-emerald' :
                           guest.status === 'Contacted' ? 'bg-yellow-100 text-yellow-800' :
                           guest.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                           'bg-gray-100 text-textBody'
                         }`}
                       >
                         <option value="Suggested">Suggested</option>
                         <option value="Contacted">Contacted</option>
                         <option value="Booked">Booked</option>
                         <option value="Rejected">Rejected</option>
                       </select>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                       <div className="flex items-center justify-end gap-2">
                         <button 
                           onClick={() => handleDraftEmail(guest)}
                           className="text-primary hover:text-primary bg-accent-soft p-2 rounded-lg"
                           title="Draft Outreach Email"
                         >
                           <Mail className="h-4 w-4" />
                         </button>
                         <button 
                           onClick={() => handleDeleteGuest(guest.id)}
                           className="text-textMuted hover:text-red-600 p-2"
                           title="Remove"
                         >
                           <Trash2 className="h-4 w-4" />
                         </button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Find Guests Modal */}
      {showFindModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
           <div className="bg-gray-100 rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-bold text-textPrimary">Find Potential Guests</h2>
                 <button onClick={() => setShowFindModal(false)}><X className="h-6 w-6 text-textMuted hover:text-textSecondary" /></button>
              </div>

              {!isFinding && foundGuests.length === 0 && (
                <div className="space-y-4">
                   <p className="text-textSecondary">Select a past episode transcript. AI will analyze the topics and suggest relevant experts.</p>
                   <div>
                     <label className="block text-sm font-medium text-textSecondary mb-2">Source Transcript</label>
                     <select 
                       className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary"
                       value={selectedTranscriptId}
                       onChange={(e) => setSelectedTranscriptId(e.target.value)}
                     >
                       <option value="">-- Select an episode --</option>
                       {transcripts.map(t => (
                         <option key={t.id} value={t.id}>{t.title}</option>
                       ))}
                     </select>
                   </div>
                   <div className="flex justify-end pt-4">
                      <button 
                        onClick={handleFindGuests}
                        disabled={!selectedTranscriptId}
                        className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-primary disabled:opacity-50 flex items-center gap-2"
                      >
                        <Search className="h-4 w-4" /> Analyze & Find Guests
                      </button>
                   </div>
                </div>
              )}

              {isFinding && (
                 <div className="py-12 text-center">
                    <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto mb-4" />
                    <p className="text-textSecondary font-medium">AI is researching experts based on your episode...</p>
                 </div>
              )}

              {foundGuests.length > 0 && (
                 <div>
                    <h3 className="font-bold text-textPrimary mb-4 flex items-center gap-2">
                       <Sparkles className="h-4 w-4 text-primary" /> 
                       Suggested Guests
                    </h3>
                    <div className="space-y-4 mb-6">
                       {foundGuests.map(guest => (
                         <div key={guest.id} className="border border-gray-300 rounded-lg p-4 hover:border-primary transition bg-gray-50">
                            <div className="flex justify-between items-start">
                               <div>
                                  <h4 className="font-bold text-textPrimary">{guest.name}</h4>
                                  <p className="text-xs text-primary font-medium mb-1">{guest.title}</p>
                                  <p className="text-sm text-textSecondary mb-2 line-clamp-2">{guest.bio}</p>
                                  <p className="text-xs text-textMuted italic">Match: {guest.matchReason}</p>
                               </div>
                               <button 
                                 onClick={() => handleSaveGuest(guest)}
                                 className="ml-4 bg-gray-100 border border-gray-300 text-textSecondary px-3 py-1 rounded text-sm font-medium hover:bg-gray-100 flex items-center gap-1"
                               >
                                  <Plus className="h-3 w-3" /> Add
                               </button>
                            </div>
                         </div>
                       ))}
                    </div>
                    <div className="text-center">
                       <button onClick={() => setFoundGuests([])} className="text-textMuted text-sm hover:text-textPrimary underline">Start Over</button>
                    </div>
                 </div>
              )}
           </div>
        </div>
      )}

      {/* Email Draft Modal */}
      {showEmailModal && selectedGuest && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-100 rounded-xl shadow-xl max-w-2xl w-full p-6">
               <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-textPrimary flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" /> Outreach Email
                  </h2>
                  <button onClick={() => setShowEmailModal(false)}><X className="h-6 w-6 text-textMuted hover:text-textSecondary" /></button>
               </div>
               
               {isDrafting ? (
                  <div className="py-12 text-center">
                     <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-3" />
                     <p className="text-textMuted">Writing personalized email for {selectedGuest.name}...</p>
                  </div>
               ) : emailDraft ? (
                  <div className="space-y-4">
                     {/* Recipient Email Input */}
                     <div>
                        <label className="block text-xs font-bold text-textMuted uppercase mb-1">To</label>
                        <input
                          type="email"
                          placeholder={selectedGuest.email || "Enter recipient email..."}
                          value={recipientEmail}
                          onChange={(e) => setRecipientEmail(e.target.value)}
                          className="w-full p-3 rounded outline-none focus:ring-1 focus:ring-primary"
                          style={{ backgroundColor: '#1A1A26', border: '1px solid #3A3A55', color: '#FFFFFF' }}
                        />
                        {selectedGuest.email && !recipientEmail && (
                          <p className="text-xs text-textMuted mt-1">Will use: {selectedGuest.email}</p>
                        )}
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-textMuted uppercase mb-1">Subject</label>
                        <div className="p-3 rounded font-medium" style={{ backgroundColor: '#1A1A26', border: '1px solid #3A3A55', color: '#FFFFFF' }}>{emailDraft.subject}</div>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-textMuted uppercase mb-1">Body</label>
                        <textarea
                          className="w-full h-40 p-3 rounded text-sm outline-none focus:ring-1 focus:ring-primary"
                          style={{ backgroundColor: '#1A1A26', border: '1px solid #3A3A55', color: '#FFFFFF' }}
                          value={emailDraft.body}
                          readOnly
                        ></textarea>
                     </div>

                     {/* Send Status Messages */}
                     {sendError && (
                       <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                         <AlertCircle className="h-4 w-4" />
                         {sendError}
                       </div>
                     )}
                     {sendSuccess && (
                       <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg">
                         <Check className="h-4 w-4" />
                         Email sent successfully!
                       </div>
                     )}

                     {/* Connected Integrations Info */}
                     {!loadingProviders && connectedProviders.length > 0 && (
                       <div className="text-xs text-textMuted">
                         Connected: {connectedProviders.map(p => p.label).join(', ')}
                       </div>
                     )}

                     {/* Action Buttons */}
                     <div className="flex flex-wrap justify-end gap-3 pt-2">
                        <button
                           onClick={handleCopyEmail}
                           className="flex items-center gap-2 border border-gray-300 text-textSecondary px-4 py-2 rounded-lg hover:bg-gray-50 transition font-medium"
                        >
                           {copiedEmail ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                           {copiedEmail ? "Copied!" : "Copy"}
                        </button>
                        {hasAnySendable ? (
                          <div className="relative flex">
                            <button
                               onClick={handleSendViaProvider}
                               disabled={isSending || !selectedProvider}
                               className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-l-lg hover:bg-primary/90 transition font-medium disabled:opacity-50"
                            >
                               {isSending ? (
                                 <Loader2 className="h-4 w-4 animate-spin" />
                               ) : (
                                 <Send className="h-4 w-4" />
                               )}
                               {isSending ? "Sending..." : `Send via ${providers.find(p => p.id === selectedProvider)?.label || 'Email'}`}
                            </button>
                            {sendableProviders.length > 1 && (
                              <div className="relative">
                                <button
                                  onClick={() => setShowProviderPicker(!showProviderPicker)}
                                  className="flex items-center bg-primary text-white px-2 py-2 rounded-r-lg hover:bg-primary/90 transition border-l border-white/20"
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </button>
                                {showProviderPicker && (
                                  <div className="absolute right-0 bottom-full mb-1 w-48 bg-gray-100 rounded-lg shadow-xl border border-gray-300 z-50 overflow-hidden">
                                    {sendableProviders.map(p => (
                                      <button
                                        key={p.id}
                                        onClick={() => {
                                          setSelectedProvider(p.id);
                                          setShowProviderPicker(false);
                                        }}
                                        className={`w-full px-4 py-2.5 text-left text-sm font-medium flex items-center gap-2 hover:bg-gray-200 transition ${
                                          selectedProvider === p.id ? 'text-primary bg-gray-200' : 'text-textBody'
                                        }`}
                                      >
                                        <Mail className="h-4 w-4" />
                                        {p.label}
                                        {selectedProvider === p.id && <Check className="h-3 w-3 ml-auto" />}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <a
                            href="/settings"
                            className="flex items-center gap-2 bg-gray-200 text-textMuted px-4 py-2 rounded-lg hover:bg-gray-300 transition font-medium text-sm"
                          >
                            <Mail className="h-4 w-4" />
                            Connect Email Provider
                          </a>
                        )}
                     </div>
                  </div>
               ) : (
                  <p className="text-red-500">Failed to generate draft.</p>
               )}
            </div>
         </div>
      )}
    </div>
  );
};

export default GuestOutreach;