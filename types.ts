export type SupportedLanguage = 'python' | 'javascript' | 'java' | 'c' | 'cpp' | 'html';

export type BugSeverity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';

export type BugCategory = 'Syntax' | 'Semantic' | 'Logical' | 'Runtime' | 'Security';

export type CertaintyLevel = 'Confirmed Error' | 'Potential Bug' | 'Warning' | 'Suggestion';

export type DetectionSource = 'Static Analyzer' | 'Compiler/Parser' | 'Gemini AI' | 'Combined Analysis';

export type ExplanationLanguage = 'en' | 'hi' | 'mr' | 'es' | 'fr' | 'de' | 'ja' | 'zh' | 'pt' | 'ru' | 'ar';

export interface ExplanationLanguageOption {
  code: ExplanationLanguage;
  name: string;
  nativeName: string;
  flag: string;
  speechCode: string;
}

export const EXPLANATION_LANGUAGES: ExplanationLanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English (India)', flag: '🇮🇳', speechCode: 'en-IN' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', speechCode: 'hi-IN' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳', speechCode: 'mr-IN' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', speechCode: 'es-ES' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', speechCode: 'fr-FR' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', speechCode: 'de-DE' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', speechCode: 'ja-JP' },
  { code: 'zh', name: 'Chinese', nativeName: '简体中文', flag: '🇨🇳', speechCode: 'zh-CN' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷', speechCode: 'pt-BR' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', speechCode: 'ru-RU' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', speechCode: 'ar-SA' },
];

export interface DetectedBug {
  id: string;
  title: string;
  type: BugCategory;
  severity: BugSeverity;
  certainty: CertaintyLevel;
  confidence: number; // 0.0 to 1.0 (e.g. 0.95)
  line: number; // 1-based
  column?: number;
  endLine?: number;
  message: string;
  explanation: string;
  whyProblem: string;
  suggestedFix: string;
  codeSnippet?: string;
  fixedSnippet?: string;
  source: DetectionSource;
  ruleId?: string;
  cwe?: string;
  voiceExplanation?: string;
  languageExplanation?: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'completed' | 'skipped' | 'fallback';
  message?: string;
  durationMs?: number;
}

export interface AnalysisSummary {
  totalIssues: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  syntaxErrors: number;
  logicErrors: number;
  securityIssues: number;
  runtimeRisks: number;
  semanticErrors: number;
  warnings: number;
  healthScore: number; // 0 - 100
  analyzedAt: string;
  language: SupportedLanguage;
  linesOfCode: number;
  engineUsed: string;
  explanationLanguage?: ExplanationLanguage;
  voiceSummary?: string;
  stages?: PipelineStage[];
}

export interface AnalysisResult {
  summary: AnalysisSummary;
  bugs: DetectedBug[];
  fixedCode?: string;
  appliedFixesCount?: number;
  compilerResult?: ExecutionResult;
  verification?: FixVerificationResult;
}

export interface AnalysisHistoryItem {
  id: string;
  timestamp: string;
  language: SupportedLanguage;
  healthScore: number;
  totalBugs: number;
  criticalCount: number;
  highCount: number;
  codeSnippetPreview: string;
  summary: AnalysisSummary;
  bugs: DetectedBug[];
  code: string;
  fixedCode?: string;
}

export interface SampleTestCase {
  id: string;
  title: string;
  language: SupportedLanguage;
  category: BugCategory | 'Clean';
  description: string;
  code: string;
  expectedBugsCount: number;
  tags: string[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  birthDate?: string;
  phoneNumber?: string;
  role?: 'Lead Security Architect' | 'Senior Staff Engineer' | 'QA Automation Lead' | 'Full-Stack Reviewer' | 'Guest Developer' | string;
  organization?: string;
  avatarUrl?: string;
  plan: 'Enterprise Pro AI' | 'Developer Cloud' | 'Community Open';
  token: string;
  joinedAt: string;
  stats: {
    scansCount: number;
    bugsResolved: number;
    hoursSaved: number;
  };
}

export type TableauChartType = 
  | 'bar' 
  | 'horizontal-bar' 
  | 'stacked-bar' 
  | 'line' 
  | 'area' 
  | 'pie' 
  | 'donut' 
  | 'heatmap' 
  | 'treemap' 
  | 'radar'
  | 'scatter';

export type TableauDimension = 'language' | 'severity' | 'type' | 'source' | 'status' | 'lineRange' | 'timeline';
export type TableauMeasure = 'count' | 'avgConfidence' | 'remediationMinutes' | 'healthImpact' | 'fixedRate' | 'healthScore';
export type TableauPalette = 'tableau10' | 'classic' | 'emerald' | 'sunset' | 'midnight' | 'cyberpunk';

export interface TableauDatasetRecord {
  id: string;
  scanId: string;
  timestamp: string;
  language: SupportedLanguage;
  title: string;
  category: BugCategory;
  severity: BugSeverity;
  confidence: number;
  line: number;
  source: DetectionSource;
  ruleId?: string;
  cwe?: string;
  status: 'Pending' | 'Fixed';
  fixApplied: boolean;
  fixSuccessful: boolean;
  healthScore: number;
  estRemediationMins: number;
}

export interface TableauAnalyticsSummary {
  totalAnalyses: number;
  totalBugsDetected: number;
  cleanAnalysesCount: number;
  fixedBugsCount: number;
  pendingBugsCount: number;
  avgHealthScore: number;
  avgConfidence: number;
  totalTimeSavedMinutes: number;
  estimatedCostSaved: number;
  mlPerformance: {
    precision: number;
    recall: number;
    f1Score: number;
    accuracy: number;
    astLatencyMs: number;
    aiLatencyMs: number;
  };
}

export interface TableauAiQueryResponse {
  insightNarrative: string;
  suggestedDimension?: TableauDimension;
  suggestedMeasure?: TableauMeasure;
  suggestedChartType?: TableauChartType;
  suggestedPalette?: TableauPalette;
  keyTakeaways?: string[];
}

export interface CompilerDiagnostic {
  file?: string;
  line: number;
  column?: number;
  severity: 'error' | 'warning' | 'note' | 'info';
  message: string;
  codeSnippet?: string;
  raw: string;
}

export type ExecutionStatus =
  | 'SUCCESS'
  | 'COMPILE_ERROR'
  | 'RUNTIME_ERROR'
  | 'TIMEOUT'
  | 'RESOURCE_LIMIT'
  | 'TOOL_UNAVAILABLE';

export interface ExecutionResult {
  success: boolean;
  status: ExecutionStatus;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  compilationOutput?: string;
  diagnostics: CompilerDiagnostic[];
  executionTimeMs: number;
  timedOut: boolean;
  resourceLimitReached: boolean;
  toolUsed: string;
  toolAvailable: boolean;
}

export interface FixVerificationResult {
  verified: boolean;
  status: 'FIX_VERIFIED' | 'FIX_PROPOSED_NOT_FULLY_VERIFIED';
  compilationPassed: boolean;
  originalErrorResolved: boolean;
  noNewErrorsIntroduced: boolean;
  verificationEvidence: string[];
  compilerOutput?: string;
  executionTimeMs: number;
}

export interface ProjectSymbolInfo {
  name: string;
  kind: 'function' | 'class' | 'variable' | 'interface' | 'import' | 'macro';
  line: number;
  column?: number;
  file: string;
  signature?: string;
  parentScope?: string;
}

export interface ProjectIndex {
  totalFiles: number;
  totalLines: number;
  functions: ProjectSymbolInfo[];
  classes: ProjectSymbolInfo[];
  variables: ProjectSymbolInfo[];
  dependencies: Array<{ fromFile: string; toModuleOrFile: string; type: string; line: number }>;
  callGraph: Array<{ caller: string; callee: string; file: string; line: number }>;
  summary: {
    totalFunctions: number;
    totalClasses: number;
    totalSymbols: number;
    languages: Record<string, number>;
  };
}

export interface SystemToolReport {
  timestamp: string;
  tools: Record<
    string,
    {
      name: string;
      command: string;
      available: boolean;
      version?: string;
      path?: string;
      category: 'compiler' | 'interpreter' | 'analyzer' | 'parser';
      languages: string[];
    }
  >;
  supportedLanguages: string[];
  summary: {
    totalTools: number;
    availableCount: number;
    unavailableCount: number;
  };
}


