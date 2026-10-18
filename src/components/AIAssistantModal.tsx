import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Brain,
  Mic,
  MicOff,
  Video,
  Image as ImageIcon,
  Zap,
  Send,
  X,
  Volume2,
  VolumeX,
  Radio,
  FileVideo,
  Loader2,
  CheckCircle2,
  Download,
} from 'lucide-react';
import { Game } from '../types';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeGame?: Game | null;
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  activeGame,
}) => {
  const [activeTab, setActiveTab] = useState<
    'coach' | 'thinking' | 'live' | 'image' | 'video' | 'transcribe'
  >('coach');

  // Coach state (gemini-3.8-flash)
  const [coachInput, setCoachInput] = useState('');
  const [coachMessages, setCoachMessages] = useState<
    Array<{ role: 'user' | 'assistant'; text: string }>
  >([
    {
      role: 'assistant',
      text: `Greetings, pilot! I am your Apex Gaming Strategist. Need walkthroughs, boss tips, frame-perfect speedrun routes, or combo counters for ${
        activeGame ? activeGame.title : 'any game on GAMING HUB'
      }? Ask me anything!`,
    },
  ]);
  const [coachLoading, setCoachLoading] = useState(false);

  // High Thinking state (gemini-4-argon with thinkingLevel: HIGH)
  const [thinkingTopic, setThinkingTopic] = useState(activeGame ? activeGame.title : 'Anti-Gravity Racing Physics');
  const [thinkingQuestion, setThinkingQuestion] = useState(
    'How do I calculate optimal corner apex drifting angles to minimize velocity decay on 90-degree neon chicane turns?'
  );
  const [thinkingResult, setThinkingResult] = useState('');
  const [thinkingLoading, setThinkingLoading] = useState(false);

  // Live Voice API (gemini-3.8-live)
  const [liveConnected, setLiveConnected] = useState(false);
  const [liveTalking, setLiveTalking] = useState(false);
  const [liveError, setLiveError] = useState('');
  const liveWsRef = useRef<WebSocket | null>(null);
  const liveAudioCtxRef = useRef<AudioContext | null>(null);
  const liveMicStreamRef = useRef<MediaStream | null>(null);
  const liveProcessorRef = useRef<ScriptProcessorNode | null>(null);

  // Image Generation (gemini-3-pro-image-preview with 1K, 2K, 4K)
  const [imagePrompt, setImagePrompt] = useState(
    'Cyberpunk neon hovercraft flying through a towering neon metropolis under rainy twilight'
  );
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '1:1' | '9:16'>('16:9');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageCaption, setImageCaption] = useState('');
  const [imageLoading, setImageLoading] = useState(false);

  // Video Analysis (gemini-4-argon)
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoFocus, setVideoFocus] = useState('Combat execution, timing mistakes, and movement optimization');
  const [videoReport, setVideoReport] = useState('');
  const [videoLoading, setVideoLoading] = useState(false);

  // Audio Transcription (gemini-3.5-transcribe)
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [transcribeLoading, setTranscribeLoading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // 1. Submit Coach query (gemini-3.8-flash)
  const handleSendCoach = async () => {
    if (!coachInput.trim() || coachLoading) return;
    const userText = coachInput;
    setCoachInput('');
    setCoachMessages((prev) => [...prev, { role: 'user', text: userText }]);
    setCoachLoading(true);

    try {
      const res = await fetch('/api/gemini/game-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameTitle: activeGame ? activeGame.title : 'GAMING HUB Title',
          userQuery: userText,
          history: coachMessages.map((m) => ({ role: m.role, content: m.text })),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCoachMessages((prev) => [...prev, { role: 'assistant', text: data.reply }]);
    } catch (err: any) {
      setCoachMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `⚠️ Error: ${err.message || 'Failed to contact coach server'}` },
      ]);
    } finally {
      setCoachLoading(false);
    }
  };

  // 2. High Thinking Mode (gemini-4-argon)
  const handleExecuteThinking = async () => {
    if (!thinkingQuestion.trim() || thinkingLoading) return;
    setThinkingLoading(true);
    setThinkingResult('');

    try {
      const res = await fetch('/api/gemini/deep-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: thinkingTopic,
          complexQuestion: thinkingQuestion,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setThinkingResult(data.analysis);
    } catch (err: any) {
      setThinkingResult(`⚠️ Reasoning error: ${err.message || 'Failed to complete high-thinking analysis'}`);
    } finally {
      setThinkingLoading(false);
    }
  };

  // 3. Generate Image (gemini-3-pro-image-preview)
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim() || imageLoading) return;
    setImageLoading(true);
    setGeneratedImage(null);

    try {
      const res = await fetch('/api/gemini/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          aspectRatio,
          imageSize,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setGeneratedImage(data.imageUrl);
      setImageCaption(data.caption || 'Art rendered by gemini-3-pro-image-preview');
    } catch (err: any) {
      alert(`Image Generation Failed: ${err.message}`);
    } finally {
      setImageLoading(false);
    }
  };

  // 4. Video Analysis (gemini-4-argon)
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleAnalyzeVideo = async () => {
    if (!videoFile || videoLoading) return;
    setVideoLoading(true);
    setVideoReport('');

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const res = await fetch('/api/gemini/analyze-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoBase64: base64Data,
            mimeType: videoFile.type || 'video/mp4',
            gameTitle: activeGame ? activeGame.title : 'Competitive Match',
            analysisFocus: videoFocus,
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setVideoReport(data.report);
        setVideoLoading(false);
      };
      reader.readAsDataURL(videoFile);
    } catch (err: any) {
      setVideoReport(`⚠️ Video analysis failed: ${err.message}`);
      setVideoLoading(false);
    }
  };

  // 5. Audio Transcription (gemini-3.5-transcribe)
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          setTranscribeLoading(true);
          try {
            const res = await fetch('/api/gemini/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioBase64: base64Audio,
                mimeType: 'audio/webm',
              }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setTranscription(data.transcript);
            setCoachInput(data.transcript); // Auto-fill coach
          } catch (err: any) {
            setTranscription(`Error transcribing: ${err.message}`);
          } finally {
            setTranscribeLoading(false);
          }
        };
        reader.readAsDataURL(audioBlob);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (e: any) {
      alert(`Mic access error: ${e.message}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  };

  // 6. Live API Voice Session (gemini-3.8-live)
  const startLiveVoice = async () => {
    try {
      setLiveError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      liveMicStreamRef.current = stream;

      const inputAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      const outputAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });
      liveAudioCtxRef.current = outputAudioCtx;

      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/live`;
      const ws = new WebSocket(wsUrl);
      liveWsRef.current = ws;

      ws.onopen = () => {
        setLiveConnected(true);
        console.log('Connected to Live Voice API');

        const source = inputAudioCtx.createMediaStreamSource(stream);
        const processor = inputAudioCtx.createScriptProcessor(4096, 1, 1);
        liveProcessorRef.current = processor;

        source.connect(processor);
        processor.connect(inputAudioCtx.destination);

        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            const input = e.inputBuffer.getChannelData(0);
            const pcm16 = new Int16Array(input.length);
            for (let i = 0; i < input.length; i++) {
              pcm16[i] = Math.max(-32768, Math.min(32767, input[i] * 32768));
            }
            const uint8 = new Uint8Array(pcm16.buffer);
            let binary = '';
            for (let i = 0; i < uint8.byteLength; i++) {
              binary += String.fromCharCode(uint8[i]);
            }
            const base64 = btoa(binary);
            ws.send(JSON.stringify({ audio: base64 }));
          }
        };
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.error) {
            setLiveError(data.error);
            stopLiveVoice();
            return;
          }
          if (data.audio) {
            setLiveTalking(true);
            const binary = atob(data.audio);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            const pcm16 = new Int16Array(bytes.buffer);
            const float32 = new Float32Array(pcm16.length);
            for (let i = 0; i < pcm16.length; i++) {
              float32[i] = pcm16[i] / 32768.0;
            }

            const buffer = outputAudioCtx.createBuffer(1, float32.length, 24000);
            buffer.getChannelData(0).set(float32);
            const source = outputAudioCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(outputAudioCtx.destination);
            source.start();
            source.onended = () => setLiveTalking(false);
          }
        } catch (err) {
          console.error('Error decoding audio chunk:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setLiveError('WebSocket connection error. Check server status.');
        stopLiveVoice();
      };

      ws.onclose = () => {
        setLiveConnected(false);
        setLiveTalking(false);
      };
    } catch (e: any) {
      setLiveError(`Live Voice Initialization Failed: ${e.message}`);
    }
  };

  const stopLiveVoice = () => {
    if (liveWsRef.current) {
      liveWsRef.current.close();
      liveWsRef.current = null;
    }
    if (liveProcessorRef.current) {
      liveProcessorRef.current.disconnect();
      liveProcessorRef.current = null;
    }
    if (liveMicStreamRef.current) {
      liveMicStreamRef.current.getTracks().forEach((track) => track.stop());
      liveMicStreamRef.current = null;
    }
    if (liveAudioCtxRef.current) {
      liveAudioCtxRef.current.close().catch(() => {});
      liveAudioCtxRef.current = null;
    }
    setLiveConnected(false);
    setLiveTalking(false);
  };

  useEffect(() => {
    return () => {
      stopLiveVoice();
      if (isRecording) stopRecording();
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl h-[85vh] max-h-[750px] bg-slate-900 border border-cyan-500/40 rounded-2xl shadow-[0_0_50px_rgba(0,240,255,0.2)] flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 p-0.5 flex items-center justify-center shadow-lg">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-orbitron font-black text-white tracking-wider">
                  APEX INTELLIGENCE
                </h2>
                <span className="text-[10px] font-orbitron uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full">
                  Gemini Suite
                </span>
              </div>
              <p className="text-xs font-rajdhani text-slate-400">
                {activeGame ? `Assisting: ${activeGame.title}` : 'Universal Gaming AI Co-Pilot'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopLiveVoice();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 gap-2 overflow-x-auto scrollbar-none py-2">
          <button
            onClick={() => setActiveTab('coach')}
            className={`px-4 py-2 rounded-xl text-xs font-orbitron font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'coach'
                ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" /> PRO COACH (3.8 Flash)
          </button>

          <button
            onClick={() => setActiveTab('thinking')}
            className={`px-4 py-2 rounded-xl text-xs font-orbitron font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'thinking'
                ? 'bg-purple-500/20 border border-purple-500/50 text-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Brain className="w-3.5 h-3.5" /> HIGH THINKING (4 Argon)
          </button>

          <button
            onClick={() => setActiveTab('live')}
            className={`px-4 py-2 rounded-xl text-xs font-orbitron font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'live'
                ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" /> LIVE VOICE (3.8 Live)
          </button>

          <button
            onClick={() => setActiveTab('image')}
            className={`px-4 py-2 rounded-xl text-xs font-orbitron font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'image'
                ? 'bg-pink-500/20 border border-pink-500/50 text-pink-400 shadow-[0_0_12px_rgba(236,72,153,0.3)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" /> ART STUDIO (3 Pro Image)
          </button>

          <button
            onClick={() => setActiveTab('video')}
            className={`px-4 py-2 rounded-xl text-xs font-orbitron font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'video'
                ? 'bg-amber-500/20 border border-amber-500/50 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5" /> VIDEO REVIEW (4 Argon)
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: PRO COACH (gemini-3.8-flash) */}
          {activeTab === 'coach' && (
            <div className="flex flex-col h-full justify-between">
              <div className="space-y-4 mb-4 overflow-y-auto max-h-[420px] pr-2">
                {coachMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-4 text-sm font-rajdhani whitespace-pre-wrap leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-cyan-600/30 border border-cyan-500/50 text-white rounded-tr-none'
                          : 'bg-slate-950/80 border border-slate-800 text-slate-200 rounded-tl-none shadow-lg'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {coachLoading && (
                  <div className="flex items-center gap-2 text-xs font-orbitron text-cyan-400">
                    <Loader2 className="w-4 h-4 animate-spin" /> Coach analyzing combat mechanics...
                  </div>
                )}
              </div>

              {/* Chat Input & Voice Mic */}
              <div className="pt-2 border-t border-slate-800 flex gap-2">
                <input
                  type="text"
                  value={coachInput}
                  onChange={(e) => setCoachInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendCoach()}
                  placeholder={
                    activeGame
                      ? `Ask for tactics, combos, or strategies in ${activeGame.title}...`
                      : 'Ask for advice, tips, mechanics...'
                  }
                  className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />

                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`p-3 rounded-xl border transition-colors ${
                    isRecording
                      ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse'
                      : 'bg-slate-950 border-slate-700 text-slate-300 hover:text-cyan-400'
                  }`}
                  title={isRecording ? 'Stop Recording' : 'Voice Input (gemini-3.5-transcribe)'}
                >
                  {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                <button
                  onClick={handleSendCoach}
                  disabled={coachLoading || !coachInput.trim()}
                  className="px-5 py-3 rounded-xl bg-cyan-400 text-slate-950 font-orbitron font-bold text-xs uppercase hover:bg-cyan-300 disabled:opacity-40 transition-colors flex items-center gap-2"
                >
                  <Send className="w-4 h-4" /> Send
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: HIGH THINKING (gemini-4-argon with thinkingLevel: HIGH) */}
          {activeTab === 'thinking' && (
            <div className="space-y-4">
              <div className="bg-purple-950/30 border border-purple-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs font-orbitron font-bold text-purple-300 uppercase">
                  <Brain className="w-4 h-4 text-purple-400" /> Deep Reasoning Engine (ThinkingLevel.HIGH)
                </div>
                <p className="mt-1 text-xs font-rajdhani text-slate-400">
                  Activates unrestricted cognitive reasoning with Gemini 4 Argon to analyze mathematical probability, frame-perfect speedrun routes, and esports meta-balance.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-xs font-orbitron text-slate-300 block mb-1">Topic / Mechanics Focus</label>
                  <input
                    type="text"
                    value={thinkingTopic}
                    onChange={(e) => setThinkingTopic(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-orbitron text-slate-300 block mb-1">Complex Analytical Query</label>
                  <textarea
                    rows={3}
                    value={thinkingQuestion}
                    onChange={(e) => setThinkingQuestion(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <button
                onClick={handleExecuteThinking}
                disabled={thinkingLoading || !thinkingQuestion.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-orbitron font-bold text-xs uppercase tracking-wider hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                {thinkingLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Formulating High Reasoning Breakdown...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4" /> Run Deep Analysis
                  </>
                )}
              </button>

              {thinkingResult && (
                <div className="mt-4 bg-slate-950 border border-purple-500/40 rounded-xl p-5 shadow-xl max-h-[300px] overflow-y-auto">
                  <div className="text-xs font-orbitron text-purple-400 font-bold uppercase mb-2">
                    Analytical Breakdown Output
                  </div>
                  <div className="text-sm font-rajdhani text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {thinkingResult}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LIVE API (gemini-3.8-live) */}
          {activeTab === 'live' && (
            <div className="flex flex-col items-center justify-center text-center py-6 space-y-6">
              <div className="relative">
                <div
                  className={`w-32 h-32 rounded-full border-2 flex items-center justify-center transition-all ${
                    liveConnected
                      ? liveTalking
                        ? 'border-emerald-400 bg-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.7)] animate-pulse'
                        : 'border-cyan-400 bg-cyan-500/10 shadow-[0_0_30px_rgba(0,240,255,0.4)]'
                      : 'border-slate-700 bg-slate-950'
                  }`}
                >
                  <Radio
                    className={`w-12 h-12 ${
                      liveConnected ? (liveTalking ? 'text-emerald-400' : 'text-cyan-400') : 'text-slate-600'
                    }`}
                  />
                </div>
                {liveConnected && (
                  <span className="absolute bottom-1 right-2 w-4 h-4 rounded-full bg-emerald-400 border-2 border-slate-900 animate-ping" />
                )}
              </div>

              <div>
                <h3 className="text-xl font-orbitron font-bold text-white">
                  {liveConnected ? (liveTalking ? 'ApexLive Speaking...' : 'Listening to Pilot Voice...') : 'Gemini 3.8 Live Voice Co-Pilot'}
                </h3>
                <p className="mt-1 text-xs font-rajdhani text-slate-400 max-w-sm">
                  Ultra low-latency audio duplex stream via WebSocket. Speak in natural language for tactical gameplay instructions in real-time.
                </p>
              </div>

              {liveError && (
                <div className="text-xs font-rajdhani text-red-400 bg-red-950/40 border border-red-500/40 px-4 py-2 rounded-xl max-w-md">
                  {liveError}
                </div>
              )}

              <button
                onClick={liveConnected ? stopLiveVoice : startLiveVoice}
                className={`px-8 py-3.5 rounded-full font-orbitron font-bold text-xs uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 ${
                  liveConnected
                    ? 'bg-red-500/20 border border-red-500 text-red-400 hover:bg-red-500/30'
                    : 'bg-emerald-400 text-slate-950 hover:bg-emerald-300'
                }`}
              >
                {liveConnected ? (
                  <>
                    <MicOff className="w-4 h-4" /> Disconnect Live Stream
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" /> Connect Live Voice Channel
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 4: ART STUDIO (gemini-3-pro-image-preview with 1K, 2K, 4K) */}
          {activeTab === 'image' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-orbitron text-slate-300 block mb-1">Art Description / Concept Prompt</label>
                <textarea
                  rows={2}
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              {/* Resolution Affordance: 1K, 2K, 4K Required by prompt */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-orbitron text-slate-300 block mb-1">Image Size (Resolution)</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['1K', '2K', '4K'] as const).map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setImageSize(size)}
                        className={`py-2 rounded-xl text-xs font-orbitron font-bold border transition-all ${
                          imageSize === size
                            ? 'bg-pink-500/20 border-pink-500 text-pink-400 shadow-[0_0_10px_rgba(236,72,153,0.4)]'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-orbitron text-slate-300 block mb-1">Aspect Ratio</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['16:9', '1:1', '9:16'] as const).map((ratio) => (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => setAspectRatio(ratio)}
                        className={`py-2 rounded-xl text-xs font-orbitron font-bold border transition-all ${
                          aspectRatio === ratio
                            ? 'bg-pink-500/20 border-pink-500 text-pink-400 shadow-[0_0_10px_rgba(236,72,153,0.4)]'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={handleGenerateImage}
                disabled={imageLoading || !imagePrompt.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-orbitron font-bold text-xs uppercase tracking-wider hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                {imageLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Rendering {imageSize} Concept Art...
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4" /> Render {imageSize} Artwork (gemini-3-pro-image-preview)
                  </>
                )}
              </button>

              {generatedImage && (
                <div className="mt-4 bg-slate-950 border border-pink-500/40 rounded-xl p-4 flex flex-col items-center">
                  <img
                    src={generatedImage}
                    alt="AI Generated Game Art"
                    className="max-h-[350px] rounded-lg object-contain border border-slate-800 shadow-2xl"
                  />
                  <div className="mt-3 flex items-center justify-between w-full text-xs font-rajdhani text-slate-400">
                    <span>Resolution: {imageSize} • Aspect: {aspectRatio}</span>
                    <a
                      href={generatedImage}
                      download={`gaminghub-${Date.now()}.png`}
                      className="px-3 py-1.5 rounded-lg bg-pink-500/20 border border-pink-500/50 text-pink-300 font-orbitron text-xs flex items-center gap-1 hover:bg-pink-500/30"
                    >
                      <Download className="w-3.5 h-3.5" /> Save Image
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: VIDEO ANALYSIS (gemini-4-argon) */}
          {activeTab === 'video' && (
            <div className="space-y-4">
              <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs font-orbitron font-bold text-amber-300 uppercase">
                  <Video className="w-4 h-4 text-amber-400" /> Gameplay Video Understanding (gemini-4-argon)
                </div>
                <p className="mt-1 text-xs font-rajdhani text-slate-400">
                  Select or drag a match gameplay video recording to analyze mechanics, identify misplays, and receive timestamped breakdown reports.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div className="border-2 border-dashed border-slate-700 rounded-xl p-4 text-center hover:border-amber-500 transition-colors">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    className="hidden"
                    id="video-upload-input"
                  />
                  <label htmlFor="video-upload-input" className="cursor-pointer flex flex-col items-center">
                    <FileVideo className="w-8 h-8 text-amber-400 mb-2" />
                    <span className="text-xs font-orbitron text-white">
                      {videoFile ? videoFile.name : 'Choose Gameplay Clip (.mp4, .webm)'}
                    </span>
                    <span className="text-[11px] font-rajdhani text-slate-500 mt-1">
                      Max file recommended: ~20MB
                    </span>
                  </label>
                </div>

                {videoPreviewUrl && (
                  <div className="rounded-xl overflow-hidden border border-slate-800 bg-black aspect-video flex items-center justify-center">
                    <video src={videoPreviewUrl} controls className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-orbitron text-slate-300 block mb-1">Analysis Focus</label>
                <input
                  type="text"
                  value={videoFocus}
                  onChange={(e) => setVideoFocus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                onClick={handleAnalyzeVideo}
                disabled={videoLoading || !videoFile}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-orbitron font-bold text-xs uppercase tracking-wider hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                {videoLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" /> Gemini 4 Argon Scanning Video Frames...
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4" /> Run Video Analysis
                  </>
                )}
              </button>

              {videoReport && (
                <div className="mt-4 bg-slate-950 border border-amber-500/40 rounded-xl p-5 shadow-xl max-h-[300px] overflow-y-auto">
                  <div className="text-xs font-orbitron text-amber-400 font-bold uppercase mb-2">
                    Video Analysis Diagnostics
                  </div>
                  <div className="text-sm font-rajdhani text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {videoReport}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
