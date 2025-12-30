import React, { useEffect, useState } from 'react';
import { getGuests, addGuest, updateGuest, deleteGuest, getTranscripts } from '../services/mockBackend';
import { suggestGuests, generateOutreachEmail } from '../services/geminiService';
import { Guest, Transcript } from '../types';
import { Users, Mail, Search, Plus, UserCheck, Trash2, ExternalLink, Loader2, Sparkles, X, Copy, Check } from 'lucide-react';

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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const g = await getGuests();
    const t = await getTranscripts();
    setGuests(g);
    setTranscripts(t);
    setLoading(false);
  };

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
      // Find context from source transcript if available, or just use general context
      const transcript = transcripts.find(t => t.id === guest.sourceTranscriptId);
      const context = transcript ? transcript.title : "our podcast about industry trends";
      
      const draft = await generateOutreachEmail(guest.name, guest.bio, context);
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Guest Outreach</h1>
          <p className="text-gray-500">Discover and contact experts for your podcast.</p>
        </div>
        <button 
          onClick={() => setShowFindModal(true)}
          className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition font-medium shadow-sm"
        >
          <Sparkles className="h-5 w-5" />
          Find Potential Guests
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-sm font-medium text-gray-500">Total Suggested</p>
             <p className="text-3xl font-bold text-gray-900">{guests.length}</p>
           </div>
           <Users className="h-8 w-8 text-indigo-100 text-primary" />
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-sm font-medium text-gray-500">Contacted</p>
             <p className="text-3xl font-bold text-gray-900">{guests.filter(g => g.status === 'Contacted').length}</p>
           </div>
           <Mail className="h-8 w-8 text-yellow-100 text-yellow-600" />
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-sm font-medium text-gray-500">Booked</p>
             <p className="text-3xl font-bold text-gray-900">{guests.filter(g => g.status === 'Booked').length}</p>
           </div>
           <UserCheck className="h-8 w-8 text-green-100 text-green-600" />
        </div>
      </div>

      {/* Guest List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="font-semibold text-gray-800">Your Guest Pipeline</h2>
        </div>
        
        {loading ? (
           <div className="p-12 text-center text-gray-500">Loading guests...</div>
        ) : guests.length === 0 ? (
           <div className="p-12 text-center text-gray-500">
             <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
             <p>No guests yet. Click "Find Potential Guests" to start.</p>
           </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name & Bio</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Match Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {guests.map((guest) => (
                  <tr key={guest.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-primary font-bold mr-4">
                          {guest.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900">{guest.name}</div>
                          <div className="text-xs text-gray-500">{guest.title}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600 max-w-xs truncate" title={guest.matchReason}>{guest.matchReason || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                       <select 
                         value={guest.status}
                         onChange={(e) => handleStatusChange(guest.id, e.target.value as any)}
                         className={`text-xs font-semibold px-2 py-1 rounded-full border-none outline-none cursor-pointer ${
                           guest.status === 'Booked' ? 'bg-green-100 text-green-800' :
                           guest.status === 'Contacted' ? 'bg-yellow-100 text-yellow-800' :
                           guest.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                           'bg-gray-100 text-gray-800'
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
                           className="text-primary hover:text-indigo-900 bg-indigo-50 p-2 rounded-lg"
                           title="Draft Outreach Email"
                         >
                           <Mail className="h-4 w-4" />
                         </button>
                         <button 
                           onClick={() => handleDeleteGuest(guest.id)}
                           className="text-gray-400 hover:text-red-600 p-2"
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
           <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-bold text-gray-900">Find Potential Guests</h2>
                 <button onClick={() => setShowFindModal(false)}><X className="h-6 w-6 text-gray-400 hover:text-gray-600" /></button>
              </div>

              {!isFinding && foundGuests.length === 0 && (
                <div className="space-y-4">
                   <p className="text-gray-600">Select a past episode transcript. AI will analyze the topics and suggest relevant experts.</p>
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">Source Transcript</label>
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
                        className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        <Search className="h-4 w-4" /> Analyze & Find Guests
                      </button>
                   </div>
                </div>
              )}

              {isFinding && (
                 <div className="py-12 text-center">
                    <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">AI is researching experts based on your episode...</p>
                 </div>
              )}

              {foundGuests.length > 0 && (
                 <div>
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                       <Sparkles className="h-4 w-4 text-primary" /> 
                       Suggested Guests
                    </h3>
                    <div className="space-y-4 mb-6">
                       {foundGuests.map(guest => (
                         <div key={guest.id} className="border border-gray-200 rounded-lg p-4 hover:border-indigo-200 transition bg-gray-50">
                            <div className="flex justify-between items-start">
                               <div>
                                  <h4 className="font-bold text-gray-900">{guest.name}</h4>
                                  <p className="text-xs text-primary font-medium mb-1">{guest.title}</p>
                                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{guest.bio}</p>
                                  <p className="text-xs text-gray-500 italic">Match: {guest.matchReason}</p>
                               </div>
                               <button 
                                 onClick={() => handleSaveGuest(guest)}
                                 className="ml-4 bg-white border border-gray-300 text-gray-700 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100 flex items-center gap-1"
                               >
                                  <Plus className="h-3 w-3" /> Add
                               </button>
                            </div>
                         </div>
                       ))}
                    </div>
                    <div className="text-center">
                       <button onClick={() => setFoundGuests([])} className="text-gray-500 text-sm hover:text-gray-900 underline">Start Over</button>
                    </div>
                 </div>
              )}
           </div>
        </div>
      )}

      {/* Email Draft Modal */}
      {showEmailModal && selectedGuest && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
               <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" /> Outreach Email
                  </h2>
                  <button onClick={() => setShowEmailModal(false)}><X className="h-6 w-6 text-gray-400 hover:text-gray-600" /></button>
               </div>
               
               {isDrafting ? (
                  <div className="py-12 text-center">
                     <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-3" />
                     <p className="text-gray-500">Writing personalized email for {selectedGuest.name}...</p>
                  </div>
               ) : emailDraft ? (
                  <div className="space-y-4">
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Subject</label>
                        <div className="bg-gray-50 p-3 rounded border border-gray-200 text-gray-900 font-medium">{emailDraft.subject}</div>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Body</label>
                        <textarea 
                          className="w-full h-48 bg-gray-50 p-3 rounded border border-gray-200 text-gray-800 text-sm outline-none focus:ring-1 focus:ring-primary"
                          value={emailDraft.body}
                          readOnly
                        ></textarea>
                     </div>
                     <div className="flex justify-end gap-3 pt-2">
                        <button 
                           onClick={handleCopyEmail}
                           className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition font-medium"
                        >
                           {copiedEmail ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                           {copiedEmail ? "Copied!" : "Copy to Clipboard"}
                        </button>
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