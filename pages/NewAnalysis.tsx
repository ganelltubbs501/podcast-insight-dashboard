import React, { useState, useRef } from 'react';
import { ArrowLeft, Loader2, FileUp, Type, Settings, Sliders, X, Globe, Shield, Mic2, Tag, Camera, Mic, Image as ImageIcon, Check } from 'lucide-react';
import { analyzeTranscript } from '../services/geminiService';
import { saveTranscript } from '../services/transcripts';
import { Transcript, AnalysisSettings } from '../types';

interface NewAnalysisProps {
  onBack: () => void;
  onComplete: (id: string) => void;
}

const NewAnalysis: React.FC<NewAnalysisProps> = ({ onBack, onComplete }) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'upload' | 'camera' | 'audio'>('paste');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  
  // Media Input State
  const [mediaData, setMediaData] = useState<{mimeType: string, data: string} | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Advanced Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<AnalysisSettings>({
    accuracyLevel: 'Standard',
    toneFilter: 'Auto',
    language: 'Auto',
    customKeywords: [],
    sensitiveContentFilter: false,
    dialectContext: ''
  });
  const [keywordInput, setKeywordInput] = useState('');

  // Handle Text/File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setContent(event.target?.result as string);
        setMediaData(null);
      };
      reader.readAsText(file);
    }
  };

  // Handle Image Capture/Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = (event.target?.result as string).split(',')[1];
        setMediaData({
            mimeType: file.type,
            data: base64String
        });
        setMediaPreview(URL.createObjectURL(file));
        setContent(`[Image Uploaded: ${file.name}]`);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Audio Recording
  const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunksRef.current.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' }); // Gemini supports common audio
            const reader = new FileReader();
            reader.onloadend = () => {
                 const base64String = (reader.result as string).split(',')[1];
                 setMediaData({
                     mimeType: 'audio/mp3', 
                     data: base64String
                 });
                 setMediaPreview('AUDIO_RECORDED');
                 setContent(`[Audio Recorded: ${new Date().toLocaleTimeString()}]`);
            };
            reader.readAsDataURL(audioBlob);
            
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
    } catch (err) {
        console.error(err);
        setError("Could not access microphone.");
    }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
      }
  };

  const handleAddKeyword = () => {
    if(keywordInput.trim()) {
      setSettings(prev => ({
        ...prev,
        customKeywords: [...prev.customKeywords, keywordInput.trim()]
      }));
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (index: number) => {
    setSettings(prev => ({
      ...prev,
      customKeywords: prev.customKeywords.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    if (!content.trim() && !mediaData) {
      setError("Please provide content to analyze.");
      return;
    }
    if (!title.trim()) {
        setError("Please give your analysis a title.");
        return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Use mediaData if available, otherwise use text content
      const input = mediaData ? { inlineData: mediaData } : content;
      const result = await analyzeTranscript(input, settings);
      
      const newTranscript: Transcript = {
        id: crypto.randomUUID(),
        title: title,
        date: new Date().toISOString(),
        content: content, // We store the placeholder text or raw text here
        status: 'Completed',
        result: result,
        settings: settings
      };

      await saveTranscript(newTranscript);
      
      // Request notification permission
      if (Notification.permission === 'granted') {
          new Notification('Analysis Complete', { body: `Your analysis for "${title}" is ready.` });
      } else if (Notification.permission !== 'denied') {
          Notification.requestPermission();
      }

      onComplete(newTranscript.id);

    } catch (err: any) {
      console.error(err);
      setError("Analysis failed. Please check your API key or try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button onClick={onBack} className="flex items-center text-gray-500 hover:text-gray-900 mb-6 transition">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Dashboard
      </button>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 p-6 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
             <h1 className="text-2xl font-bold text-gray-900">New Analysis</h1>
             <p className="text-gray-500 mt-1">Upload a transcript, voice note, or image.</p>
          </div>
          <button 
             onClick={() => setShowSettings(true)}
             className="flex items-center gap-2 text-gray-600 bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition text-sm font-medium w-full sm:w-auto justify-center"
          >
             <Sliders className="h-4 w-4" /> Advanced Settings
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Episode Title</label>
            <input 
              type="text" 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
              placeholder="e.g. The Future of AI with John Doe"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
            <button 
              className={`pb-3 px-4 text-sm font-medium transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'paste' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => { setActiveTab('paste'); setMediaData(null); }}
            >
              <Type className="h-4 w-4" />
              Paste Text
            </button>
            <button 
              className={`pb-3 px-4 text-sm font-medium transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'upload' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => { setActiveTab('upload'); setMediaData(null); }}
            >
              <FileUp className="h-4 w-4" />
              Upload File
            </button>
            <button 
              className={`pb-3 px-4 text-sm font-medium transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'camera' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => { setActiveTab('camera'); setContent(''); }}
            >
              <Camera className="h-4 w-4" />
              Photo
            </button>
            <button 
              className={`pb-3 px-4 text-sm font-medium transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'audio' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => { setActiveTab('audio'); setContent(''); }}
            >
              <Mic className="h-4 w-4" />
              Voice
            </button>
          </div>

          {activeTab === 'paste' && (
            <div className="mb-6">
              <textarea 
                className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition font-mono text-sm"
                placeholder="Paste your transcript here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              ></textarea>
              <p className="text-xs text-gray-400 mt-2 text-right">{content.length} characters (Max 45,000)</p>
            </div>
          )}
          
          {activeTab === 'upload' && (
            <div className="mb-6 h-64 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition">
              <input 
                type="file" 
                accept=".txt" 
                onChange={handleFileUpload} 
                className="hidden" 
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                 <FileUp className="h-10 w-10 text-gray-400 mb-3" />
                 <span className="text-sm font-medium text-gray-700">Click to upload transcript</span>
                 <span className="text-xs text-gray-500 mt-1">.txt files only</span>
              </label>
              {content && <p className="mt-4 text-sm text-accent-emerald font-medium truncate max-w-xs px-4">File loaded successfully!</p>}
            </div>
          )}

          {activeTab === 'camera' && (
            <div className="mb-6 h-64 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition relative overflow-hidden">
                {mediaPreview && mediaPreview !== 'AUDIO_RECORDED' ? (
                    <img src={mediaPreview} alt="Preview" className="h-full w-full object-contain" />
                ) : (
                    <>
                        <input 
                            type="file" 
                            accept="image/*" 
                            capture="environment"
                            onChange={handleImageUpload} 
                            className="hidden" 
                            id="camera-upload"
                        />
                        <label htmlFor="camera-upload" className="cursor-pointer flex flex-col items-center">
                            <Camera className="h-10 w-10 text-gray-400 mb-3" />
                            <span className="text-sm font-medium text-gray-700">Take a photo of notes</span>
                            <span className="text-xs text-gray-500 mt-1">or upload image</span>
                        </label>
                    </>
                )}
                {mediaData && (
                    <button 
                        onClick={() => { setMediaData(null); setMediaPreview(null); }}
                        className="absolute top-2 right-2 bg-white/80 p-1 rounded-full text-gray-600 hover:text-red-500"
                    >
                        <X className="h-5 w-5" />
                    </button>
                )}
            </div>
          )}

          {activeTab === 'audio' && (
             <div className="mb-6 h-64 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50 transition">
                 {mediaPreview === 'AUDIO_RECORDED' ? (
                     <div className="text-center">
                         <div className="h-16 w-16 bg-accent-soft rounded-full flex items-center justify-center mx-auto mb-4">
                             <Check className="h-8 w-8 text-accent-emerald" />
                         </div>
                         <p className="font-bold text-gray-900">Audio Recorded!</p>
                         <button onClick={() => { setMediaData(null); setMediaPreview(null); }} className="text-sm text-red-500 hover:underline mt-2">Delete & Retake</button>
                     </div>
                 ) : isRecording ? (
                     <div className="text-center">
                         <div className="animate-pulse h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                             <Mic className="h-8 w-8 text-red-600" />
                         </div>
                         <p className="font-bold text-gray-900 mb-4">Recording...</p>
                         <button 
                            onClick={stopRecording}
                            className="bg-red-500 text-white px-6 py-2 rounded-full font-bold hover:bg-red-600"
                         >
                            Stop Recording
                         </button>
                     </div>
                 ) : (
                     <div className="text-center">
                         <button 
                            onClick={startRecording}
                            className="h-20 w-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg hover:scale-105 transition"
                         >
                             <Mic className="h-10 w-10 text-white" />
                         </button>
                         <p className="text-sm font-medium text-gray-700">Tap to record voice note</p>
                     </div>
                 )}
             </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
             <div className="text-sm text-gray-500 w-full sm:w-auto text-center sm:text-left">
                {settings.accuracyLevel !== 'Standard' && <span className="mr-2 text-primary font-medium">• {settings.accuracyLevel} Accuracy</span>}
                {settings.language !== 'Auto' && <span className="text-primary font-medium">• {settings.language}</span>}
             </div>
             <button 
               onClick={handleSubmit} 
               disabled={isProcessing}
               style={{ backgroundColor: isProcessing ? undefined : 'var(--color-primary)' }}
               className={`w-full sm:w-auto flex justify-center items-center px-6 py-3 rounded-lg text-white font-medium shadow-md transition ${isProcessing ? 'bg-primary cursor-not-allowed' : 'hover:brightness-95'}`}
             >
               {isProcessing ? (
                 <>
                   <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                   Processing...
                 </>
               ) : (
                 'Start Analysis'
               )}
             </button>
          </div>
        </div>
      </div>

      {/* Advanced Settings Modal */}
      {showSettings && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
               <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                     <Settings className="h-5 w-5 text-gray-600" /> Analysis Settings
                  </h2>
                  <button onClick={() => setShowSettings(false)}><X className="h-6 w-6 text-gray-400 hover:text-gray-600" /></button>
               </div>

               <div className="space-y-6">
                  {/* Accuracy */}
                  <div>
                     <label className="block text-sm font-bold text-gray-700 mb-2">Transcript Accuracy & Depth</label>
                     <div className="grid grid-cols-3 gap-2">
                        {(['Standard', 'High', 'Maximum'] as const).map(level => (
                           <button
                             key={level}
                             onClick={() => setSettings(s => ({...s, accuracyLevel: level}))}
                             className={`px-3 py-2 rounded-lg text-sm border font-medium transition ${
                               settings.accuracyLevel === level ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                             }`}
                           >
                              {level}
                           </button>
                        ))}
                     </div>
                     <p className="text-xs text-gray-500 mt-1">Higher levels provide deeper, more nuanced analysis but may take longer.</p>
                  </div>

                  {/* Tone */}
                  <div>
                     <label className="block text-sm font-bold text-gray-700 mb-2">Tone Filtering</label>
                     <select 
                        value={settings.toneFilter}
                        onChange={(e) => setSettings(s => ({...s, toneFilter: e.target.value as any}))}
                        className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary"
                     >
                        <option value="Auto">Auto-detect</option>
                        <option value="Formal">Formal / Professional</option>
                        <option value="Conversational">Conversational / Casual</option>
                     </select>
                  </div>

                  {/* Language & Dialect */}
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
                           <Globe className="h-4 w-4" /> Language
                        </label>
                        <select 
                           value={settings.language}
                           onChange={(e) => setSettings(s => ({...s, language: e.target.value}))}
                           className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary"
                        >
                           <option value="Auto">Auto-detect</option>
                           <option value="English (US)">English (US)</option>
                           <option value="English (UK)">English (UK)</option>
                           <option value="Spanish">Spanish</option>
                           <option value="French">French</option>
                           <option value="German">German</option>
                           <option value="Portuguese">Portuguese</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
                           <Mic2 className="h-4 w-4" /> Dialect/Accent
                        </label>
                        <input 
                           type="text"
                           value={settings.dialectContext || ''}
                           onChange={(e) => setSettings(s => ({...s, dialectContext: e.target.value}))}
                           placeholder="e.g. Scottish, Australian"
                           className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary"
                        />
                     </div>
                  </div>

                  {/* Custom Keywords */}
                  <div>
                     <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
                        <Tag className="h-4 w-4" /> Custom Keywords
                     </label>
                     <div className="flex gap-2 mb-2">
                        <input 
                           type="text"
                           value={keywordInput}
                           onChange={(e) => setKeywordInput(e.target.value)}
                           onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
                           placeholder="Enter keyword to focus on..."
                           className="flex-1 border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary"
                        />
                        <button 
                           onClick={handleAddKeyword}
                           className="bg-gray-100 text-gray-700 px-4 rounded-lg font-medium hover:bg-gray-200"
                        >
                           Add
                        </button>
                     </div>
                     <div className="flex flex-wrap gap-2">
                        {settings.customKeywords.map((kw, i) => (
                           <span key={i} className="bg-accent-soft text-primary px-2 py-1 rounded text-sm flex items-center gap-1">
                              {kw} <button onClick={() => handleRemoveKeyword(i)} className="hover:text-red-500"><X className="h-3 w-3"/></button>
                           </span>
                        ))}
                     </div>
                  </div>

                  {/* Sensitive Content */}
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                     <Shield className="h-5 w-5 text-gray-500 mt-0.5" />
                     <div>
                        <label className="flex items-center gap-2 font-bold text-gray-900 text-sm cursor-pointer select-none">
                           <input 
                              type="checkbox"
                              checked={settings.sensitiveContentFilter}
                              onChange={(e) => setSettings(s => ({...s, sensitiveContentFilter: e.target.checked}))}
                              className="w-4 h-4 text-primary rounded focus:ring-primary border-gray-300"
                           />
                           Sensitive Content Filter
                        </label>
                        <p className="text-xs text-gray-500 mt-1">Flag potential sensitive topics and redact or use neutral language in outputs.</p>
                     </div>
                  </div>
               </div>

               <div className="flex justify-end pt-6 border-t border-gray-100 mt-6">
                  <button 
                     onClick={() => setShowSettings(false)}
                     className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-primary"
                  >
                     Save Settings
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default NewAnalysis;