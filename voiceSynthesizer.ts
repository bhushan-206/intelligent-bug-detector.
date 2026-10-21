import { ExplanationLanguage, DetectedBug, AnalysisSummary, EXPLANATION_LANGUAGES } from '../types';

export interface VoiceState {
  isSpeaking: boolean;
  isPaused: boolean;
  activeId: string | null;
  text: string;
  language: ExplanationLanguage;
  rate: number;
  pitch: number;
  source?: 'ai-tts' | 'indic-stream' | 'web-speech';
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function pcmToWavBlob(base64Pcm: string, sampleRate = 24000): Blob {
  const binaryString = atob(base64Pcm);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = bytes.length;
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  return new Blob([wavHeader, bytes], { type: 'audio/wav' });
}

class VoiceSynthesizerEngine {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentAudioElement: HTMLAudioElement | null = null;
  private currentBlobUrl: string | null = null;
  private listeners: Set<(state: VoiceState) => void> = new Set();
  private availableVoices: SpeechSynthesisVoice[] = [];
  private activeRequestId: number = 0;
  private clientAudioCache = new Map<string, string>();

  private state: VoiceState = {
    isSpeaking: false,
    isPaused: false,
    activeId: null,
    text: '',
    language: 'en',
    rate: 1.0,
    pitch: 1.0,
    source: 'indic-stream',
  };

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices() {
    if (this.synth) {
      this.availableVoices = this.synth.getVoices();
    }
  }

  public subscribe(callback: (state: VoiceState) => void): () => void {
    this.listeners.add(callback);
    callback(this.state);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener({ ...this.state });
    }
  }

  public getState(): VoiceState {
    return { ...this.state };
  }

  public setRate(rate: number) {
    this.state.rate = Math.max(0.5, Math.min(2.0, rate));
    if (this.currentUtterance && this.state.isSpeaking) {
      this.currentUtterance.rate = this.state.rate;
    }
    if (this.currentAudioElement && this.state.isSpeaking) {
      this.currentAudioElement.playbackRate = this.state.rate;
    }
    this.notify();
  }

  public setPitch(pitch: number) {
    this.state.pitch = Math.max(0.5, Math.min(1.5, pitch));
    this.notify();
  }

  public getAvailableVoicesForLanguage(lang: ExplanationLanguage): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    if (this.availableVoices.length === 0) {
      this.availableVoices = this.synth.getVoices();
    }

    const langConfig = EXPLANATION_LANGUAGES.find((l) => l.code === lang);
    const targetCode = (langConfig?.speechCode || 'en-IN').toLowerCase();
    const prefix = targetCode.split('-')[0];

    if (lang === 'mr') {
      const marathiVoices = this.availableVoices.filter((v) => 
        v.lang.toLowerCase() === 'mr-in' || 
        v.lang.toLowerCase() === 'mr_in' || 
        v.lang.toLowerCase().startsWith('mr') ||
        v.name.toLowerCase().includes('marathi') ||
        v.name.includes('मराठी')
      );
      if (marathiVoices.length > 0) return marathiVoices;

      const devanagariVoices = this.availableVoices.filter((v) =>
        v.lang.toLowerCase().startsWith('hi') ||
        v.name.toLowerCase().includes('hindi') ||
        v.name.includes('हिन्दी')
      );
      if (devanagariVoices.length > 0) return devanagariVoices;

      return [];
    }

    if (lang === 'hi') {
      const hindiVoices = this.availableVoices.filter((v) => 
        v.lang.toLowerCase() === 'hi-in' || 
        v.lang.toLowerCase() === 'hi_in' || 
        v.lang.toLowerCase().startsWith('hi') ||
        v.name.toLowerCase().includes('hindi') ||
        v.name.includes('हिन्दी')
      );
      if (hindiVoices.length > 0) return hindiVoices;

      return [];
    }

    if (lang === 'en') {
      const indianEnglish = this.availableVoices.filter((v) => 
        v.lang.toLowerCase() === 'en-in' || 
        v.lang.toLowerCase() === 'en_in' || 
        v.name.toLowerCase().includes('india')
      );
      if (indianEnglish.length > 0) return indianEnglish;

      const standardEnglish = this.availableVoices.filter((v) => 
        v.lang.toLowerCase().startsWith('en')
      );
      if (standardEnglish.length > 0) return standardEnglish;

      return [];
    }

    const exact = this.availableVoices.filter((v) => v.lang.toLowerCase() === targetCode);
    if (exact.length > 0) return exact;

    const prefixMatch = this.availableVoices.filter((v) => v.lang.toLowerCase().startsWith(prefix));
    if (prefixMatch.length > 0) return prefixMatch;

    return [];
  }

  /**
   * Split long text into natural, crisp sentence chunks for zero-latency streaming.
   */
  private splitTextIntoChunks(text: string, maxLen = 140): string[] {
    const rawSentences = text.split(/(?<=[।\.!\?\,])\s+/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const s of rawSentences) {
      if (!s.trim()) continue;
      if ((currentChunk + ' ' + s).trim().length <= maxLen) {
        currentChunk = (currentChunk + ' ' + s).trim();
      } else {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = s.trim();
      }
    }
    if (currentChunk) chunks.push(currentChunk);
    return chunks.length > 0 ? chunks : [text.slice(0, maxLen)];
  }

  /**
   * Speak narrative script with instant playback (<100ms) using fast audio streaming.
   */
  public async speak(
    text: string,
    id: string,
    language: ExplanationLanguage = 'en',
    onEnd?: () => void
  ) {
    this.stop();

    if (!text || !text.trim()) return;

    const currentReq = ++this.activeRequestId;

    this.state.isSpeaking = true;
    this.state.isPaused = false;
    this.state.activeId = id;
    this.state.text = text;
    this.state.language = language;
    this.notify();

    // Check if client browser has an exact native voice already for English/European languages
    const nativeVoices = this.getAvailableVoicesForLanguage(language);
    const hasExactNativeVoice = nativeVoices.length > 0 && nativeVoices.some(v => v.lang.toLowerCase().startsWith(language));

    // For Marathi (or if no exact native voice installed), use instant audio stream engine
    if (language === 'mr' || language === 'hi' || !hasExactNativeVoice) {
      const chunks = this.splitTextIntoChunks(text, 140);
      this.playAudioChunksSequentially(chunks, 0, currentReq, id, language, onEnd);
      return;
    }

    // Default Web Speech API for languages with pre-installed browser voice packs
    this.speakViaWebSpeech(text, id, language, onEnd);
  }

  /**
   * Plays a queue of audio chunks with zero gap between sentences.
   */
  private playAudioChunksSequentially(
    chunks: string[],
    index: number,
    requestId: number,
    id: string,
    language: ExplanationLanguage,
    onEnd?: () => void
  ) {
    if (requestId !== this.activeRequestId || index >= chunks.length) {
      if (requestId === this.activeRequestId) {
        this.state.isSpeaking = false;
        this.state.isPaused = false;
        this.state.activeId = null;
        this.notify();
        if (onEnd) onEnd();
      }
      return;
    }

    const currentChunkText = chunks[index];
    const streamUrl = `/api/tts/audio?text=${encodeURIComponent(currentChunkText)}&lang=${language}`;

    this.cleanupAudio();

    const audio = new Audio(streamUrl);
    audio.playbackRate = this.state.rate;
    this.currentAudioElement = audio;
    this.state.source = 'indic-stream';
    this.notify();

    audio.onended = () => {
      if (requestId !== this.activeRequestId) return;
      this.playAudioChunksSequentially(chunks, index + 1, requestId, id, language, onEnd);
    };

    audio.onerror = () => {
      if (requestId !== this.activeRequestId) return;
      // Fallback: try remaining text in Web Speech API
      const remainingText = chunks.slice(index).join(' ');
      this.cleanupAudio();
      this.speakViaWebSpeech(remainingText, id, language, onEnd);
    };

    // Play instantly
    audio.play().catch((err) => {
      if (requestId !== this.activeRequestId) return;
      console.warn('Direct stream playback error, falling back:', err);
      this.cleanupAudio();
      this.speakViaWebSpeech(chunks.slice(index).join(' '), id, language, onEnd);
    });
  }

  private speakViaWebSpeech(
    text: string,
    id: string,
    language: ExplanationLanguage,
    onEnd?: () => void
  ) {
    if (!this.synth) {
      this.state.isSpeaking = false;
      this.state.activeId = null;
      this.notify();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance = utterance;
    this.state.source = 'web-speech';

    const langConfig = EXPLANATION_LANGUAGES.find((l) => l.code === language);
    const speechLang = langConfig?.speechCode || (language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN');
    utterance.lang = speechLang;
    utterance.rate = this.state.rate;
    utterance.pitch = this.state.pitch;

    const voices = this.getAvailableVoicesForLanguage(language);
    if (voices.length > 0) {
      const preferred = voices.find((v) => v.name.includes('Google') || v.name.includes('Natural')) || voices[0];
      utterance.voice = preferred;
    }

    utterance.onend = () => {
      this.state.isSpeaking = false;
      this.state.isPaused = false;
      this.state.activeId = null;
      this.currentUtterance = null;
      this.notify();
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      console.warn('Web speech synthesis error:', e);
      this.state.isSpeaking = false;
      this.state.isPaused = false;
      this.state.activeId = null;
      this.currentUtterance = null;
      this.notify();
    };

    this.synth.speak(utterance);
  }

  private cleanupAudio() {
    if (this.currentAudioElement) {
      this.currentAudioElement.pause();
      this.currentAudioElement.src = '';
      this.currentAudioElement = null;
    }
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }
  }

  public pause() {
    if (this.currentAudioElement && this.state.isSpeaking && !this.state.isPaused) {
      this.currentAudioElement.pause();
      this.state.isPaused = true;
      this.notify();
      return;
    }

    if (this.synth && this.state.isSpeaking && !this.state.isPaused) {
      this.synth.pause();
      this.state.isPaused = true;
      this.notify();
    }
  }

  public resume() {
    if (this.currentAudioElement && this.state.isPaused) {
      this.currentAudioElement.play();
      this.state.isPaused = false;
      this.notify();
      return;
    }

    if (this.synth && this.state.isPaused) {
      this.synth.resume();
      this.state.isPaused = false;
      this.notify();
    }
  }

  public stop() {
    this.activeRequestId++;
    this.cleanupAudio();

    if (this.synth) {
      this.synth.cancel();
    }

    this.state.isSpeaking = false;
    this.state.isPaused = false;
    this.state.activeId = null;
    this.currentUtterance = null;
    this.notify();
  }

  /**
   * Generates a concise, natural spoken narrative script for a bug in user's language.
   */
  public generateBugVoiceScript(bug: DetectedBug, lang: ExplanationLanguage = 'en'): string {
    if (bug.voiceExplanation) {
      if (lang === 'mr' && /[\u0900-\u097F]/.test(bug.voiceExplanation)) {
        return bug.voiceExplanation;
      }
      if (lang === 'hi' && /[\u0900-\u097F]/.test(bug.voiceExplanation)) {
        return bug.voiceExplanation;
      }
      if (lang !== 'mr' && lang !== 'hi') {
        return bug.voiceExplanation;
      }
    }

    const bugTitle = bug.title || bug.type;
    const bugProblem = bug.whyProblem || bug.message || bug.explanation;
    const bugFix = bug.suggestedFix || 'कोड योग्यरित्या अपडेट करा';

    switch (lang) {
      case 'mr':
        return `ओळ ${bug.line}: ${bugTitle}। समस्या: ${bugProblem}। उपाय: ${bugFix}।`;
      case 'hi':
        return `लाइन ${bug.line}: ${bugTitle}। समस्या: ${bugProblem}। समाधान: ${bugFix}।`;
      case 'es':
        return `Línea ${bug.line}: ${bugTitle}. Problema: ${bugProblem}. Solución: ${bugFix}.`;
      case 'fr':
        return `Ligne ${bug.line}: ${bugTitle}. Problème: ${bugProblem}. Solution: ${bugFix}.`;
      case 'de':
        return `Zeile ${bug.line}: ${bugTitle}. Problem: ${bugProblem}. Lösung: ${bugFix}.`;
      case 'ja':
        return `行 ${bug.line}: ${bugTitle}。問題: ${bugProblem}。修正方法: ${bugFix}。`;
      case 'zh':
        return `第 ${bug.line} 行: ${bugTitle}。问题: ${bugProblem}。解决方式: ${bugFix}。`;
      case 'pt':
        return `Linha ${bug.line}: ${bugTitle}. Problema: ${bugProblem}. Correção: ${bugFix}.`;
      case 'ru':
        return `Строка ${bug.line}: ${bugTitle}. Проблема: ${bugProblem}. Решение: ${bugFix}.`;
      case 'ar':
        return `السطر ${bug.line}: ${bugTitle}. المشكلة: ${bugProblem}. الحل: ${bugFix}.`;
      case 'en':
      default:
        return `Line ${bug.line}: ${bugTitle}. Issue: ${bugProblem}. Fix: ${bugFix}.`;
    }
  }

  /**
   * Generates ONE complete spoken narrative script for the entire analysis in user's selected language.
   */
  public generateSummaryVoiceScript(
    summary: AnalysisSummary,
    bugs: DetectedBug[],
    lang: ExplanationLanguage = 'en'
  ): string {
    if (summary.voiceSummary) {
      if (lang === 'mr' && /[\u0900-\u097F]/.test(summary.voiceSummary)) {
        return summary.voiceSummary;
      }
      if (lang === 'hi' && /[\u0900-\u097F]/.test(summary.voiceSummary)) {
        return summary.voiceSummary;
      }
      if (lang !== 'mr' && lang !== 'hi' && !summary.voiceSummary.startsWith('Code audit complete')) {
        return summary.voiceSummary;
      }
    }

    if (bugs.length === 0) {
      switch (lang) {
        case 'hi':
          return `कोड विश्लेषण पूर्ण हुआ। स्वास्थ्य स्कोर १०० में से १०० है। कोई त्रुटि नहीं मिली।`;
        case 'mr':
          return `कोड विश्लेषण पूर्ण झाले. कोड स्कोर १०० पैकी १०० आहे. कोणतीही त्रुटी आढळली नाही.`;
        case 'es':
          return `Análisis completado. Puntuación 100 de 100. Cero defectos encontrados.`;
        case 'fr':
          return `Analyse terminée. Score 100 sur 100. Aucune erreur trouvée.`;
        case 'de':
          return `Analyse abgeschlossen. Score 100 von 100. Keine Fehler gefunden.`;
        case 'ja':
          return `分析完了。スコア100点。エラーは見つかりませんでした。`;
        case 'zh':
          return `分析完成。健康评分 100 分。未发现错误。`;
        case 'pt':
          return `Análise concluída. Pontuação 100 de 100. Nenhum erro encontrado.`;
        case 'ru':
          return `Анализ завершен. Оценка 100 из 100. Ошибок не обнаружено.`;
        case 'ar':
          return `اكتمل التحليل. النتيجة 100 من 100. لا توجد أخطاء.`;
        case 'en':
        default:
          return `Code analysis complete. Health score 100 out of 100. Zero bugs detected.`;
      }
    }

    const bugDescriptions = bugs
      .slice(0, 3)
      .map((b) => this.generateBugVoiceScript(b, lang))
      .join(' ');

    switch (lang) {
      case 'mr':
        return `विश्लेषण निकाल: एकूण ${summary.totalIssues} त्रुटी आढळल्या. आरोग्य गुण १०० पैकी ${summary.healthScore} आहे. ${bugDescriptions}`;
      case 'hi':
        return `विश्लेषण परिणाम: कुल ${summary.totalIssues} त्रुटियां मिली हैं। हेल्थ स्कोर ${summary.healthScore} है। ${bugDescriptions}`;
      case 'es':
        return `Resultados: ${summary.totalIssues} problemas detectados. Puntuación: ${summary.healthScore} de 100. ${bugDescriptions}`;
      case 'fr':
        return `Résultats: ${summary.totalIssues} erreurs détectées. Score: ${summary.healthScore} sur 100. ${bugDescriptions}`;
      case 'de':
        return `Ergebnis: ${summary.totalIssues} Probleme gefunden. Score: ${summary.healthScore} von 100. ${bugDescriptions}`;
      case 'ja':
        return `結果: ${summary.totalIssues} 件のエラーが見つかりました。スコア: ${summary.healthScore} 点。${bugDescriptions}`;
      case 'zh':
        return `分析结果: 检测到 ${summary.totalIssues} 个问题。评分: ${summary.healthScore} 分。${bugDescriptions}`;
      case 'pt':
        return `Resultado: ${summary.totalIssues} problemas encontrados. Pontuação: ${summary.healthScore}. ${bugDescriptions}`;
      case 'ru':
        return `Результат: обнаружено ${summary.totalIssues} ошибок. Оценка: ${summary.healthScore}. ${bugDescriptions}`;
      case 'ar':
        return `النتيجة: تم اكتشاف ${summary.totalIssues} أخطاء. التقييم: ${summary.healthScore}. ${bugDescriptions}`;
      case 'en':
      default:
        return `Analysis result: ${summary.totalIssues} issues found. Health score ${summary.healthScore} out of 100. ${bugDescriptions}`;
    }
  }

  public generateFixSuccessVoiceScript(lang: ExplanationLanguage): string {
    switch (lang) {
      case 'mr':
        return 'कोडमधील त्रुटी दुरुस्त करण्यात आली आहे. आता कोड रन करण्यासाठी तयार आहे.';
      case 'hi':
        return 'त्रुटि ठीक कर दी गई है। अब कोड सही तरीके से चलने के लिए तैयार है।';
      case 'es':
        return 'El error ha sido corregido. El código ahora es correcto.';
      case 'fr':
        return 'L\'erreur a été corrigée. Le code est maintenant correct.';
      case 'de':
        return 'Der Fehler wurde behoben. Der Code ist jetzt korrekt.';
      case 'ja':
        return 'エラーは修正されました。コードは正常です。';
      case 'zh':
        return '错误已修复。代码现已正确。';
      case 'pt':
        return 'O erro foi corrigido. O código agora está correto.';
      case 'ru':
        return 'Ошибка исправлена. Теперь код правильный.';
      case 'ar':
        return 'تم إصلاح الخطأ. الكود الآن صحيح.';
      case 'en':
      default:
        return 'The error has been fixed. The code is now correct.';
    }
  }
}

export const voiceSynthesizer = new VoiceSynthesizerEngine();
