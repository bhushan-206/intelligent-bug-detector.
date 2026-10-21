import { ExplanationLanguage } from '../types';

/**
 * Intelligent Language Detector
 * Accurately recognizes Hindi, Marathi, Hinglish, English, Spanish, French, German, Japanese, Chinese, etc.
 */
export function detectLanguageFromText(text: string): ExplanationLanguage {
  if (!text || !text.trim()) return 'en';

  const clean = text.trim();

  // 1. Japanese script (Hiragana \u3040-\u309F, Katakana \u30A0-\u30FF, Kanji)
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(clean)) {
    return 'ja';
  }

  // 2. Chinese script (Hanzi \u4E00-\u9FFF)
  if (/[\u4E00-\u9FFF]/.test(clean)) {
    return 'zh';
  }

  // 3. Cyrillic / Russian script (\u0400-\u04FF)
  if (/[\u0400-\u04FF]/.test(clean)) {
    return 'ru';
  }

  // 4. Arabic script (\u0600-\u06FF)
  if (/[\u0600-\u06FF]/.test(clean)) {
    return 'ar';
  }

  // 5. Devanagari script (\u0900-\u097F) - Distinguish between Marathi and Hindi
  if (/[\u0900-\u097F]/.test(clean)) {
    // Specific Marathi characteristic markers/words
    const marathiKeywords = [
      'आहे', 'नाही', 'कसा', 'कुठे', 'करायचा', 'झाला', 'बघ', 'सांग', 'त्रुटी', 'करायचे',
      'द्या', 'पाहिजे', 'करा', 'काय', 'केले', 'येत', 'आहेत', 'मधील', 'वरून', 'होते',
      'वापर', 'दुरुस्त', 'ओळ', 'समस्या', 'उत्तर', 'मदत', 'माहिती'
    ];
    const words = clean.split(/\s+/);
    const hasMarathiWord = words.some(w => marathiKeywords.some(mk => w.includes(mk)));

    if (hasMarathiWord || clean.includes('ळ') || clean.includes('आहे')) {
      return 'mr';
    }
    return 'hi';
  }

  const lower = clean.toLowerCase();

  // 6. Latin-script Marathi Detection (Transliteration / Romanized Marathi)
  const marathiLatinMarkers = [
    /\bkasa\b/, /\bkuthe\b/, /\baahe\b/, /\bkaraycha\b/, /\bkarayche\b/,
    /\bsang\b/, /\bbagh\b/, /\bkay\b/, /\btruti\b/, /\bmadhye\b/, /\bdurust\b/,
    /\bkas\b/, /\bnahi\b/, /\bhotay\b/, /\bkaru\b/, /\bkashi\b/, /\bkase\b/,
    /\bmaza\b/, /\btuza\b/, /\baamhi\b/, /\bkiti\b/, /\bkonavar\b/
  ];
  if (marathiLatinMarkers.some(re => re.test(lower))) {
    return 'mr';
  }

  // 7. Latin-script Hindi / Hinglish Detection
  const hinglishMarkers = [
    /\bkaha\b/, /\bkaise\b/, /\bkarna\b/, /\bhai\b/, /\bhain\b/, /\bmujhe\b/,
    /\bbatao\b/, /\bsamjhao\b/, /\bkya\b/, /\bisme\b/, /\bkaro\b/, /\btheek\b/,
    /\bmera\b/, /\btera\b/, /\bapna\b/, /\byaha\b/, /\bvaha\b/, /\bkyun\b/,
    /\bkripya\b/, /\bmadad\b/, /\bgalti\b/, /\bkarein\b/, /\bdekho\b/
  ];
  if (hinglishMarkers.some(re => re.test(lower))) {
    return 'hi';
  }

  // 8. Spanish Detection
  const spanishMarkers = [
    /\bpor\s+favor\b/, /\bgracias\b/, /\bcódigo\b/, /\berror\b/, /\bexplicar\b/,
    /\bcomo\b/, /\bdonde\b/, /\bque\b/, /\bcorregir\b/, /\barreglar\b/, /\bproblema\b/,
    /\blinea\b/, /\bfallando\b/, /\bpor\s+qué\b/
  ];
  if (spanishMarkers.some(re => re.test(lower)) && /[áéíóúñ¿¡]/.test(lower)) {
    return 'es';
  }

  // 9. French Detection
  const frenchMarkers = [
    /\bs'il\s+vous\s+pla[îi]t\b/, /\bmerci\b/, /\bexpliquer\b/, /\bpourquoi\b/,
    /\bcorriger\b/, /\bligne\b/, /\bprobl[èe]me\b/, /\bcode\b/
  ];
  if (frenchMarkers.some(re => re.test(lower)) && /[àâçéèêëîïôûù]/.test(lower)) {
    return 'fr';
  }

  // 10. German Detection
  const germanMarkers = [
    /\bbitte\b/, /\bdanke\b/, /\berklären\b/, /\bfehler\b/, /\bwarum\b/,
    /\bzeile\b/, /\bbeheben\b/, /\bprogramm\b/
  ];
  if (germanMarkers.some(re => re.test(lower)) && /[äöüß]/.test(lower)) {
    return 'de';
  }

// Default to English
  return 'en';
}

/**
 * Intelligent Source Code Programming Language Classifier
 * Automatically identifies C, C++, Java, Python, JavaScript, or HTML from source syntax.
 */
export function detectProgrammingLanguage(code: string): 'python' | 'javascript' | 'java' | 'c' | 'cpp' | 'html' | null {
  if (!code || !code.trim()) return null;
  const clean = code.trim();

  // 1. HTML detection
  if (/<!DOCTYPE\s+html/i.test(clean) || /<html[\s>]/i.test(clean) || (/<(?:head|body|div|span|script|style)[\s>]/i.test(clean) && /<\/[a-z]+>/i.test(clean))) {
    return 'html';
  }

  // 2. C++ specific markers
  if (
    /#include\s*<iostream>/i.test(clean) ||
    /#include\s*<(vector|string|map|set|memory|algorithm|thread)>/i.test(clean) ||
    /\b(std::|cout\s*<<|cin\s*>>|cerr\s*<<|using\s+namespace\s+std;)/.test(clean) ||
    /\b(constexpr|nullptr|auto\s+[a-zA-Z_]\w*\s*=)/.test(clean) ||
    (/\bclass\s+[a-zA-Z_]\w*/.test(clean) && /#include/.test(clean))
  ) {
    return 'cpp';
  }

  // 3. C specific markers
  if (
    /#include\s*<(stdio|stdlib|string|math|unistd|time|stdbool)\.h>/i.test(clean) ||
    /\b(printf|scanf|puts|gets|fgets|malloc|free|calloc|realloc)\s*\(/.test(clean) ||
    (/\bint\s+main\s*\([^)]*\)\s*\{/.test(clean) && !clean.includes('System.out') && !clean.includes('public static'))
  ) {
    // If it has any C++ stream or std, return cpp, otherwise c
    if (/\b(std::|cout|cin)\b/.test(clean)) return 'cpp';
    return 'c';
  }

  // 4. Java specific markers
  if (
    /\bpublic\s+(?:class|interface|enum)\s+[a-zA-Z_]/.test(clean) ||
    /\bpublic\s+static\s+void\s+main\s*\(/.test(clean) ||
    /\bSystem\.(out|err)\.(println|print|printf)\s*\(/.test(clean) ||
    /\bimport\s+java\.[a-z0-9_.]+\s*;/.test(clean) ||
    /\bpackage\s+[a-z0-9_.]+\s*;/.test(clean)
  ) {
    return 'java';
  }

  // 5. Python specific markers
  if (
    /\bdef\s+[a-zA-Z_]\w*\s*\([^)]*\)\s*:/.test(clean) ||
    /\belif\b.*:/.test(clean) ||
    /\bif\s+__name__\s*==\s*['"]__main__['"]\s*:/.test(clean) ||
    /\bimport\s+(sys|os|json|re|math|random|numpy|pandas|requests)\b/.test(clean) ||
    /\bfrom\s+[a-zA-Z_]\w*\s+import\b/.test(clean) ||
    (/^\s*print\s*\([^;]*\)\s*$/m.test(clean) && !clean.includes(';'))
  ) {
    return 'python';
  }

  // 6. JavaScript / TypeScript specific markers
  if (
    /\bconsole\.(log|error|warn|info|debug)\s*\(/.test(clean) ||
    /\b(?:const|let|var)\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*=/.test(clean) ||
    /\bfunction\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*\(/.test(clean) ||
    /\b(?:import|export)\s+(?:default\s+)?(?:\{|\*|[a-zA-Z_$])/.test(clean) ||
    /=>\s*\{?/.test(clean) ||
    /\brequire\s*\(['"][^'"]+['"]\)/.test(clean)
  ) {
    return 'javascript';
  }

  return null;
}

