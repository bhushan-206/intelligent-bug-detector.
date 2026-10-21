import React, { useState, useEffect } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  Square, 
  Globe, 
  Sparkles, 
  Sliders, 
  Check, 
  Loader2,
  RefreshCw,
  Languages
} from 'lucide-react';
import { 
  ExplanationLanguage, 
  EXPLANATION_LANGUAGES, 
  DetectedBug, 
  AnalysisSummary 
} from '../types';
import { voiceSynthesizer, VoiceState } from '../utils/voiceSynthesizer';
import { TRANSLATIONS } from '../utils/languageTranslations';

interface VoiceExplainerProps {
  summary?: AnalysisSummary;
  bugs: DetectedBug[];
  explanationLanguage: ExplanationLanguage;
  onLanguageChange: (lang: ExplanationLanguage) => void;
  isTranslating?: boolean;
}

export const VoiceExplainer: React.FC<VoiceExplainerProps> = ({
  summary,
  bugs,
  explanationLanguage,
  onLanguageChange,
  isTranslating = false,
}) => {
  const [voiceState, setVoiceState] = useState<VoiceState>(voiceSynthesizer.getState());
  const [speed, setSpeed] = useState<number>(1.0);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const unsubscribe = voiceSynthesizer.subscribe((state) => {
      setVoiceState(state);
    });
    return () => unsubscribe();
  }, []);

  const t = TRANSLATIONS[explanationLanguage] || TRANSLATIONS.en;
  const currentLangObj = EXPLANATION_LANGUAGES.find((l) => l.code === explanationLanguage);

  const handlePlaySummary = () => {
    if (voiceState.isSpeaking && voiceState.activeId === 'summary') {
      if (voiceState.isPaused) {
        voiceSynthesizer.resume();
      } else {
        voiceSynthesizer.pause();
      }
      return;
    }

    if (!summary) return;
    const script = voiceSynthesizer.generateSummaryVoiceScript(summary, bugs, explanationLanguage);
    voiceSynthesizer.speak(script, 'summary', explanationLanguage);
  };

  const handleStop = () => {
    voiceSynthesizer.stop();
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    voiceSynthesizer.setRate(newSpeed);
  };

  const isSummaryActive = voiceState.isSpeaking && voiceState.activeId === 'summary';

  return (
    <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-4 shadow-xl backdrop-blur-md transition-all">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Left Side: Voice & Language Header */}
        <div className="flex items-start space-x-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 shadow-inner">
            {voiceState.isSpeaking ? (
              <Volume2 className="h-5 w-5 animate-pulse text-cyan-400" />
            ) : (
              <Languages className="h-5 w-5 text-indigo-400" />
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>{t.voiceAudioExplanation}</span>
                <span className="rounded-md bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-300 border border-indigo-500/30">
                  {currentLangObj?.name} ({currentLangObj?.nativeName})
                </span>
              </h3>
              {voiceState.isSpeaking && (
                <span className="flex items-center space-x-1 rounded-full bg-cyan-950 px-2 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-500/50">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
                  <span>Reading aloud...</span>
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300 mt-0.5">
              Listen to spoken audio explanations of detected bugs in your preferred natural language.
            </p>
          </div>
        </div>

        {/* Right Side: Language Selector & Audio Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Explanation Language Selector */}
          <div className="relative flex items-center">
            <Globe className="absolute left-2.5 h-3.5 w-3.5 text-indigo-400 pointer-events-none" />
            <select
              id="explanation-language-select"
              value={explanationLanguage}
              onChange={(e) => onLanguageChange(e.target.value as ExplanationLanguage)}
              className="appearance-none rounded-xl border border-indigo-500/40 bg-slate-800/90 pl-8 pr-7 py-1.5 text-xs font-semibold text-slate-100 hover:border-indigo-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition-all cursor-pointer shadow-sm"
            >
              {EXPLANATION_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-slate-900 text-white">
                  {lang.nativeName} ({lang.name})
                </option>
              ))}
            </select>
            <span className="absolute right-2.5 text-[10px] text-slate-400 pointer-events-none">▼</span>
          </div>

          {/* Read Summary Button */}
          <button
            id="btn-read-summary-aloud"
            onClick={handlePlaySummary}
            disabled={!summary}
            className={`flex items-center space-x-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shadow-md active:scale-95 ${
              isSummaryActive
                ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                : 'bg-indigo-600 text-white hover:bg-indigo-500 border border-indigo-400/40'
            }`}
          >
            {isSummaryActive ? (
              voiceState.isPaused ? (
                <>
                  <Play className="h-3.5 w-3.5" />
                  <span>{t.resumeAudio}</span>
                </>
              ) : (
                <>
                  <Pause className="h-3.5 w-3.5" />
                  <span>{t.pauseAudio}</span>
                </>
              )
            ) : (
              <>
                <Volume2 className="h-3.5 w-3.5" />
                <span>{t.listenToSummary}</span>
              </>
            )}
          </button>

          {/* Stop Audio Button */}
          {voiceState.isSpeaking && (
            <button
              id="btn-stop-audio"
              onClick={handleStop}
              className="flex items-center space-x-1 rounded-xl bg-rose-600/90 hover:bg-rose-500 px-3 py-1.5 text-xs font-bold text-white shadow-md transition-all active:scale-95"
              title="Stop audio playback"
            >
              <Square className="h-3 w-3 fill-white" />
              <span>{t.stopAudio}</span>
            </button>
          )}

          {/* Speed settings toggle */}
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center space-x-1 rounded-xl border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors"
              title="Adjust Speech Speed"
            >
              <Sliders className="h-3.5 w-3.5 text-slate-400" />
              <span>{speed}x</span>
            </button>

            {showSettings && (
              <div className="absolute right-0 top-full mt-1.5 z-20 w-44 rounded-xl border border-slate-700 bg-slate-900 p-2.5 shadow-2xl space-y-1 text-xs">
                <div className="text-[11px] font-semibold text-slate-400 px-1 mb-1">
                  {t.speechSpeed}:
                </div>
                {[0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => {
                      handleSpeedChange(rate);
                      setShowSettings(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      speed === rate
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{rate}x Speed</span>
                    {speed === rate && <Check className="h-3 w-3" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Currently speaking live banner */}
      {voiceState.isSpeaking && voiceState.text && (
        <div className="mt-3 rounded-xl border border-cyan-500/30 bg-slate-950/70 p-2.5 text-xs text-cyan-200 flex items-start space-x-2 animate-fadeIn">
          <Volume2 className="h-4 w-4 shrink-0 text-cyan-400 mt-0.5 animate-bounce" />
          <p className="line-clamp-2 leading-relaxed">
            <span className="font-semibold text-cyan-400">Narration: </span>
            {voiceState.text}
          </p>
        </div>
      )}
    </div>
  );
};
