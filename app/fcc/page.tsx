"use client";

import React, { useState, useEffect, useRef } from 'react';
import { FCC_THEME, AGENTS } from '@/config';
import { FusedReport, AgentId, ProposedAction, MinorityReport, ExternalContext } from '@/types';
// FCC v1 types
import { FCCReport, FCCQuestionContext, FCCFinding, FCCRecommendation } from '@/fcc/core/types';
import { getModelPanelForMode, MODEL_REGISTRY } from '@/fcc/core/modelRouter';
// Orchestrator is now called via API route (server-side only)
import { storage } from '@/storage';
import { executeCloudActions } from '@/actions';
import { generateMarkdown } from '@/markdown';

// --- ICONS ---
const Icon = ({ path, size = 16, color = "currentColor", className = "", style = {} }: { path: string; size?: number; color?: string; className?: string; style?: React.CSSProperties }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d={path} />
  </svg>
);

const ICONS = {
  cpu: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M9 9h6v6H9z M9 1v3 M15 1v3 M9 20v3 M15 20v3 M20 9h3 M20 14h3 M1 9h3 M1 14h3",
  zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  history: "M3 3v5h5 M3.05 13A9 9 0 1 0 6 5.3L3 8",
  play: "M5 3l14 9-14 9V3z",
  check: "M20 6L9 17l-5-5",
  alert: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01",
  layer: "M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5",
  cloud: "M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  chevronRight: "M9 18l6-6-6-6",
  chevronLeft: "M15 19l-7-7 7-7",
  loader: "M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3",
  send: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  github: "M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"
};

// --- SUB-COMPONENTS ---

const ReportSection: React.FC<{ title: string; content: string }> = ({ title, content }) => {
  if (!content || content === "N/A" || content === "") return null;
  return (
    <div className="mb-10 last:mb-0">
      <h3 className="text-xs font-bold tracking-widest text-cyan-400 uppercase mb-4 flex items-center gap-3">
        <div className="h-px w-4 bg-cyan-500/50"></div>
        {title}
      </h3>
      <div className="text-sm text-slate-300 leading-7 font-light whitespace-pre-line">
        {content}
      </div>
    </div>
  );
};

const MinorityReportCard: React.FC<{ report: MinorityReport }> = ({ report }) => (
  <div className="bg-red-950/20 border border-red-500/20 p-5 rounded-lg">
    <div className="flex justify-between items-center mb-3">
      <div className="flex items-center gap-2">
         <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
         <span className="text-[11px] font-mono text-red-400 uppercase">SYSTEM_DISSENT</span>
      </div>
    </div>
    <div className="text-xs text-red-200/70 leading-relaxed whitespace-pre-line">{report.details}</div>
  </div>
);

// FCC v1 Components
const FindingCard: React.FC<{ finding: FCCFinding }> = ({ finding }) => {
  const severityColor = finding.severity >= 8 ? '#ef4444' : finding.severity >= 5 ? '#f59e0b' : '#84cc16';
  return (
    <div className="bg-slate-900/50 border border-white/10 p-5 rounded-lg mb-4">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[11px] font-mono text-slate-500 uppercase">{finding.impactArea}</span>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: severityColor }} />
              <span className="text-[10px] font-bold" style={{ color: severityColor }}>
                Severity: {finding.severity}/10
              </span>
            </div>
          </div>
          <h4 className="text-sm font-bold text-white mb-2">{finding.title}</h4>
          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{finding.description}</p>
        </div>
      </div>
      {finding.evidence && Array.isArray(finding.evidence) && finding.evidence.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <div className="text-[10px] font-bold text-slate-500 uppercase mb-2">Evidence:</div>
          {finding.evidence.map((ev, i) => (
            <div key={`${finding.id}-evidence-${i}`} className="text-[10px] font-mono text-slate-400 mb-1">
              <span className="text-cyan-400">{ev.filePath}</span>: {ev.reasoning}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const RecommendationCard: React.FC<{ recommendation: FCCRecommendation }> = ({ recommendation }) => {
  const difficultyColor = recommendation.difficulty === 'high' ? '#ef4444' : recommendation.difficulty === 'medium' ? '#f59e0b' : '#84cc16';
  return (
    <div className="bg-cyan-950/20 border border-cyan-500/20 p-5 rounded-lg mb-4">
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-sm font-bold text-white flex-1">{recommendation.title}</h4>
        <span className="text-[10px] font-bold px-2 py-1 rounded border" style={{ borderColor: difficultyColor, color: difficultyColor }}>
          {recommendation.difficulty.toUpperCase()}
        </span>
      </div>
      <p className="text-xs text-slate-300 leading-relaxed mb-2 whitespace-pre-line">{recommendation.description}</p>
      <div className="text-[10px] text-slate-400 italic">
        Expected Impact: {recommendation.expectedImpact}
      </div>
    </div>
  );
};

const ActionRow: React.FC<{ action: ProposedAction }> = ({ action }) => {
  let bgClass = "hover:bg-white/5";
  let borderClass = "border-white/10";
  let statusIcon = ICONS.cloud;
  let statusColor = "#94a3b8";

  if (action.status === 'simulating' || action.status === 'executing') {
    statusIcon = ICONS.loader;
    bgClass = "bg-yellow-500/5";
    statusColor = "#eab308";
  } else if (action.status === 'success' || action.status === 'simulated') {
    statusIcon = ICONS.check;
    bgClass = "bg-green-500/5";
    statusColor = FCC_THEME.success;
    borderClass = "border-green-500/20";
  } else if (action.status === 'failed') {
    statusIcon = ICONS.alert;
    bgClass = "bg-red-500/5";
    statusColor = FCC_THEME.alert;
  }

  const getTargetColor = (t: string) => {
    switch(t) {
      case 'github': return '#f1f5f9';
      case 'supabase': return '#3ecf8e';
      case 'notion': return '#fb7185';
      case 'log': return '#94a3b8';
      default: return '#94a3b8';
    }
  };

  return (
    <div className={`flex flex-col border-b last:border-0 ${borderClass} ${bgClass} transition-colors`}>
      <div className="flex items-center p-4">
        <div className="w-10 flex justify-center text-slate-500">
           <Icon path={statusIcon} size={18} color={statusColor} className={action.status === 'simulating' || action.status === 'executing' ? "animate-spin-fast" : ""} />
        </div>
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase">{action.type}</span>
            <Icon path={ICONS.chevronRight} size={10} className="text-slate-700" />
            <span className="text-[11px] font-bold uppercase" style={{color: getTargetColor(action.target)}}>{action.target}</span>
          </div>
          <div className="text-xs text-slate-300 truncate font-medium">{action.shortDescription}</div>
        </div>
        <div className="flex flex-col items-end gap-1 pl-4 border-l border-white/10">
          <span className={`text-[10px] font-bold border px-2 py-0.5 rounded ${
            action.priority === 1 ? 'border-red-500/30 text-red-400' :
            action.priority === 2 ? 'border-yellow-500/30 text-yellow-400' :
            'border-slate-700 text-slate-500'
          }`}>
            P{action.priority}
          </span>
        </div>
      </div>
      {action.resultMessage && (
        <div className="px-4 pb-3 pl-14 text-[10px] font-mono text-slate-500">
          &gt; {action.resultMessage}
        </div>
      )}
    </div>
  );
};

// --- MAIN APP COMPONENT ---

export default function FCCPage() {
  const [query, setQuery] = useState('');
  const [fccMode, setFccMode] = useState<"pipeline_diagnosis" | "agent_output_critique" | "meta_prompt_architect">("pipeline_diagnosis");
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const [report, setReport] = useState<FCCReport | null>(null);
  const [history, setHistory] = useState<FCCReport[]>([]);
  const [historyOpen, setHistoryOpen] = useState(true);
  
  const [followUpQuery, setFollowUpQuery] = useState('');
  const reportEndRef = useRef<HTMLDivElement>(null);

  // GitHub Context State
  const [githubRepo, setGithubRepo] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);
  const [externalContext, setExternalContext] = useState<ExternalContext | null>(null);

  useEffect(() => {
    // Load history if needed - for now, keep empty
    setHistory([]);
  }, []);

  // Get models used for current FCC mode
  const modelsUsed = report?.metadata?.modelsUsed || getModelPanelForMode(fccMode).map(m => m.id);

  const addLog = (msg: string) => {
    setLogs(prev => [`${new Date().toLocaleTimeString().split(' ')[0]} :: ${msg}`, ...prev.slice(0, 8)]);
  };

  const handleIngestGitHub = async () => {
    if (!githubRepo.includes('/')) {
        addLog("ERROR: Invalid Repo Format");
        return;
    }
    setIsIngesting(true);
    addLog(`GITHUB_INGEST :: TARGET ${githubRepo}`);
    
    try {
        // Call server-side API route to avoid CORS issues
        const response = await fetch("/api/fcc/github/ingest", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ownerRepo: githubRepo,
            token: githubToken || undefined,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || errorData.error || "Failed to ingest GitHub repo");
        }

        const data = await response.json();
        setExternalContext({
            source: data.source || `github:${githubRepo}`,
            content: data.content,
            loadedAt: data.loadedAt || new Date().toISOString()
        });
        addLog("GITHUB_INGEST :: SUCCESS");
    } catch (e: any) {
        addLog(`GITHUB_INGEST :: FAILED - ${e.message}`);
    } finally {
        setIsIngesting(false);
    }
  };

  const handleRun = async (textOverride?: string) => {
    const inputText = textOverride || query;
    if (!inputText.trim() || isProcessing) return;
    
    setIsProcessing(true);
    setError(null);
    setLogs([]);
    
    setReport(null);
    setQuery('');
    setFollowUpQuery('');

    try {
      addLog(`FCC_QUERY :: Mode: ${fccMode}`);
      
      // Build FCCQuestionContext
      const fccContext: FCCQuestionContext = {
        mode: fccMode,
        question: inputText,
        relatedFiles: externalContext ? ['*'] : undefined, // Use all files if external context loaded
      };

      // Call FCC v1 API route with timeout
      // Allow up to 10 minutes for DeepSeek R1 thinking time + sequential model calls
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minute timeout

      try {
        const response = await fetch("/api/fcc", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(fccContext),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json();
          const errorMsg = errorData.message || errorData.error || "Failed to run FCC";
          throw new Error(errorMsg);
        }

        const reportData: FCCReport = await response.json();
        
        addLog(`FCC_SUCCESS :: Findings: ${reportData.findings.length}, Recommendations: ${reportData.recommendations.length}`);
        
        setReport(reportData);
        setHistory([reportData, ...history]);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        // Handle abort/timeout errors
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Request timed out after 10 minutes. This usually means:\n1. DeepSeek R1 is taking longer than expected to think\n2. All model API calls are timing out (check your API keys in .env.local)\n3. The repository scan is taking too long\n4. Network connectivity issues\n\nCheck the server logs for details.');
        }
        
        // Handle network errors (connection refused, DNS errors, etc.)
        if (fetchError instanceof TypeError) {
          const errorMsg = fetchError.message || 'Unknown network error';
          console.error('[FCC Client] Network error details:', {
            name: fetchError.name,
            message: errorMsg,
            stack: fetchError.stack
          });
          
          throw new Error(`Network error: ${errorMsg}\n\nPossible causes:\n1. Server is not running (check if Next.js dev server is running)\n2. API route crashed before responding (check server console logs)\n3. Network connectivity issues\n4. Request was blocked by browser\n\nTroubleshooting:\n- Check server console for "[FCC API]" error messages\n- Try: curl http://localhost:3000/api/fcc (should return JSON)\n- Restart dev server if needed`);
        }
        
        // Handle other errors
        console.error('[FCC Client] Fetch error:', fetchError);
        throw fetchError;
      }
    } catch (e) {
      console.error('[FCC] Error:', e);
      const errorMsg = e instanceof Error ? e.message : "Unknown error occurred";
      setError(errorMsg);
      addLog(`FCC_ERROR :: ${errorMsg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // TODO: Implement action execution for FCC recommendations if needed
  // For now, FCC v1 doesn't support direct action execution
  const handleActions = async (dryRun: boolean) => {
    if (!report) return;
    console.log('[FCC] Action execution not yet implemented for FCC v1 reports');
    // FCC reports have recommendations but no proposedActions like the old system
    // Future: Could implement recommendation execution if needed
  };

  const loadFromHistory = (r: FCCReport) => {
    setReport(r);
    setExternalContext(null);
    setLogs([`LOADED HISTORY: ${r.mode} - ${r.question.substring(0, 50)}...`]);
  };

  const downloadMarkdown = () => {
    if (!report) return;
    // Simple markdown export for FCCReport
    const md = `# FCC Analysis Report

**Mode:** ${report.mode}
**Question:** ${report.question}
**Confidence:** ${report.confidence}%
**Risk Score:** ${report.overallRiskScore}/100

## Summary

${report.summary}

## Assumptions

${report.assumptions.map(a => `- ${a}`).join('\n')}

## Findings

${report.findings.map(f => `### ${f.title}

**Severity:** ${f.severity}/10 | **Impact Area:** ${f.impactArea}

${f.description}

${f.evidence.map(e => `- **${e.filePath}**: ${e.reasoning}`).join('\n')}
`).join('\n')}

## Recommendations

${report.recommendations.map(r => `### ${r.title}

**Difficulty:** ${r.difficulty}

${r.description}

**Expected Impact:** ${r.expectedImpact}
`).join('\n')}

${report.notes ? `## Notes\n\n${report.notes}\n` : ''}

---
Generated: ${report.metadata?.timestamp || new Date().toISOString()}
`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fcc-report-${report.mode}-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <style jsx global>{`
        .bg-grid-pattern {
          background-size: 50px 50px;
          background-image: 
            linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          mask-image: radial-gradient(circle at center, black 40%, transparent 100%);
          -webkit-mask-image: radial-gradient(circle at center, black 40%, transparent 100%);
        }
        .glass-panel { 
          background: rgba(10, 10, 12, 0.7); 
          backdrop-filter: blur(20px); 
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.12); 
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
        }
        .frost-glow { box-shadow: 0 0 20px rgba(34, 211, 238, 0.2); }
        
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin 3s linear infinite; }
        .animate-spin-fast { animation: spin 1s linear infinite; }
        
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}</style>
      
      <div className="fixed inset-0 w-full h-full bg-slate-950 text-slate-200 font-sans flex overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black pointer-events-none" />
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

        {/* LEFT SIDEBAR (History) */}
        <div className={`relative z-20 flex-shrink-0 bg-slate-950/50 backdrop-blur-xl border-r border-white/10 transition-all duration-300 flex flex-col ${historyOpen ? 'w-72' : 'w-0 overflow-hidden'}`}>
          <div className="h-16 flex items-center justify-between px-5 border-b border-white/10">
            <span className="text-[11px] font-bold tracking-widest text-slate-500 uppercase">Run History</span>
            <button onClick={() => setHistoryOpen(false)} className="text-slate-600 hover:text-white transition-colors">
              <Icon path={ICONS.chevronLeft} size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {history.map((h, idx) => (
              <div 
                key={idx} 
                onClick={() => loadFromHistory(h)}
                className={`p-3 rounded-lg cursor-pointer border transition-all duration-200 ${
                  report === h 
                    ? 'bg-cyan-500/10 border-cyan-500/20' 
                    : 'bg-transparent border-transparent hover:bg-white/5'
                }`}
              >
                <div className="flex justify-between mb-1">
                  <span className="font-mono text-[10px] text-slate-500">
                    {h.metadata?.timestamp ? new Date(h.metadata.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Recent'}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded text-cyan-400 bg-cyan-900/20`}>
                    {h.mode.substring(0, 3).toUpperCase()}
                  </span>
                </div>
                <div className="text-xs text-slate-400 line-clamp-1">{h.question}</div>
              </div>
            ))}
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 flex flex-col min-w-0 relative z-10">
          
          {/* HEADER */}
          <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-slate-950/20 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              {!historyOpen && (
                <button onClick={() => setHistoryOpen(true)} className="text-slate-500 hover:text-white">
                  <Icon path={ICONS.history} size={18} />
                </button>
              )}
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                   <Icon path={ICONS.layer} size={16} color={FCC_THEME.primary} />
                 </div>
                 <div className="flex flex-col">
                   <span className="font-bold tracking-widest text-xs text-slate-200">FROST <span className="text-slate-600 font-normal">COLLECTIVE</span></span>
                   <span className="text-[9px] text-cyan-500 font-mono">FCC v1</span>
                 </div>
              </div>
            </div>
            <div className={`font-mono text-[11px] px-3 py-1.5 rounded border flex items-center gap-2 ${
              isProcessing ? 'bg-cyan-950/30 border-cyan-500/30 text-cyan-400' : 'border-slate-800 text-slate-600'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isProcessing ? 'bg-cyan-400 animate-pulse' : 'bg-slate-700'}`} />
              {isProcessing ? 'ANALYZING' : 'READY'}
            </div>
          </div>

          {/* WORKSPACE */}
          <div className="flex-1 flex p-6 gap-6 overflow-hidden">
            
            {/* COLUMN 1: CONTROLS */}
            <div className="w-96 flex flex-col gap-6 flex-shrink-0 overflow-y-auto pb-20">
              {/* FCC v1 Models */}
              <div className="glass-panel rounded-xl p-6 flex flex-col gap-4 border border-cyan-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest">FCC v1 Models</span>
                  <span className="text-[9px] text-slate-600 font-mono px-2 py-0.5 bg-slate-900/50 rounded border border-slate-800">
                    {fccMode.replace('_', ' ')}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {getModelPanelForMode(fccMode).map(model => {
                    const isEnabled = model.enabled;
                    const roleColors: Record<string, string> = {
                      'lead_thinker': '#66FCF1',
                      'reviewer': '#A700FF',
                      'long_context': '#00FF9D',
                      'speed': '#F59E0B',
                      'code_analyst': '#FF003C',
                      'research': '#8B5CF6',
                    };
                    const roleIcons: Record<string, string> = {
                      'lead_thinker': '⬢',
                      'reviewer': '◈',
                      'long_context': '◉',
                      'speed': '⚡',
                      'code_analyst': '⚔',
                      'research': '🔍',
                    };
                    const color = roleColors[model.role] || '#94a3b8';
                    const icon = roleIcons[model.role] || '•';
                    
                    return (
                      <div 
                        key={model.id}
                        className={`border rounded-lg p-3 flex items-center gap-3 transition-all ${
                          isEnabled ? 'bg-slate-800/50 border-cyan-500/30' : 'border-transparent opacity-50'
                        }`}
                      >
                        <div className="text-lg opacity-80" style={{color: isEnabled ? color : '#64748b'}}>{icon}</div>
                        <div className="flex-1">
                          <div className={`text-xs font-bold ${isEnabled ? 'text-slate-200' : 'text-slate-500'}`}>{model.label}</div>
                          <div className="text-[11px] text-slate-600 capitalize">{model.role.replace('_', ' ')}</div>
                          <div className="text-[10px] text-slate-500 mt-1 font-mono opacity-70">
                            {model.providerModelName || model.id}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${isEnabled ? 'bg-cyan-400 shadow-[0_0_8px_cyan]' : 'bg-slate-800'}`} />
                          <div className={`text-[9px] px-1.5 py-0.5 rounded ${
                            model.costTier === 'high' ? 'bg-red-900/20 text-red-400' :
                            model.costTier === 'medium' ? 'bg-yellow-900/20 text-yellow-400' :
                            'bg-green-900/20 text-green-400'
                          }`}>
                            {model.costTier}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 pt-3 border-t border-white/5">
                  <div className="text-[9px] text-slate-600 leading-tight">
                    <div className="font-bold text-slate-500 mb-1">Mode: {fccMode.replace('_', ' ')}</div>
                    {fccMode === 'pipeline_diagnosis' && 'Deep reasoning + code analysis'}
                    {fccMode === 'agent_output_critique' && 'Code review + meta-analysis'}
                    {fccMode === 'meta_prompt_architect' && 'Prompt design + reasoning'}
                  </div>
                </div>
              </div>

              {/* EXTERNAL KNOWLEDGE (GITHUB) */}
              <div className="glass-panel rounded-xl p-6 flex flex-col gap-4">
                 <div className="flex items-center justify-between">
                     <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                         <Icon path={ICONS.github} size={14} />
                         External Knowledge
                     </span>
                     {externalContext && (
                         <span className="text-[9px] text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded bg-green-500/10">LINKED</span>
                     )}
                 </div>
                 
                 {!externalContext ? (
                   <div className="flex flex-col gap-3">
                     <input 
                       type="text" 
                       className="bg-slate-900/50 border border-white/10 rounded px-3 py-2 text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500/30"
                       placeholder="owner/repo"
                       value={githubRepo}
                       onChange={(e) => setGithubRepo(e.target.value)}
                     />
                     <div className="flex gap-2">
                         <input 
                           type="password" 
                           className="flex-1 bg-slate-900/50 border border-white/10 rounded px-3 py-2 text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500/30"
                           placeholder="Token (Optional)"
                           value={githubToken}
                           onChange={(e) => setGithubToken(e.target.value)}
                         />
                         <button 
                           onClick={handleIngestGitHub}
                           disabled={isIngesting || !githubRepo}
                           className="bg-slate-800 hover:bg-slate-700 text-white px-3 rounded text-[10px] font-bold transition-colors disabled:opacity-50"
                         >
                           {isIngesting ? '...' : 'INGEST'}
                         </button>
                     </div>
                     <p className="text-[9px] text-slate-600 leading-tight">
                         Connects recursively to public repos (or private with token). Limits depth to prevent overflow.
                     </p>
                   </div>
                 ) : (
                   <div className="bg-slate-900/50 border border-white/10 rounded p-3 relative group">
                       <div className="flex items-center gap-2 mb-1">
                           <Icon path={ICONS.github} size={12} className="text-slate-400" />
                           <span className="text-xs text-slate-200 font-mono truncate">{externalContext.source}</span>
                       </div>
                       <div className="text-[10px] text-slate-500">
                           Context loaded at {new Date(externalContext.loadedAt).toLocaleTimeString()}
                       </div>
                       <button 
                         onClick={() => setExternalContext(null)}
                         className="absolute top-2 right-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                       >
                        ×
                       </button>
                   </div>
                 )}
              </div>

              {/* Input */}
              <div className="glass-panel rounded-xl p-6 flex flex-col gap-4 flex-1 min-h-[250px]">
                 <div className="flex bg-slate-900/80 p-1 rounded-lg border border-white/10">
                  <button 
                    onClick={() => setFccMode('pipeline_diagnosis')}
                    className={`flex-1 py-2 text-[11px] font-bold rounded transition-all ${fccMode === 'pipeline_diagnosis' ? 'bg-cyan-900/30 text-cyan-400 border border-cyan-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    DIAGNOSIS
                  </button>
                  <button 
                    onClick={() => setFccMode('agent_output_critique')}
                    className={`flex-1 py-2 text-[11px] font-bold rounded transition-all ${fccMode === 'agent_output_critique' ? 'bg-purple-900/30 text-purple-400 border border-purple-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    CRITIQUE
                  </button>
                  <button 
                    onClick={() => setFccMode('meta_prompt_architect')}
                    className={`flex-1 py-2 text-[11px] font-bold rounded transition-all ${fccMode === 'meta_prompt_architect' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    ARCHITECT
                  </button>
                </div>
                
                <textarea 
                  className="flex-1 bg-slate-950/50 border border-white/10 rounded-lg p-4 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/30 resize-none font-mono leading-relaxed placeholder-slate-600"
                  placeholder="Enter directive..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  disabled={isProcessing}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleRun();
                    }
                  }}
                />

                <button 
                  onClick={() => handleRun()}
                  disabled={isProcessing || !query.trim()}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white py-3 rounded-lg font-bold text-[11px] tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(8,145,178,0.4)] disabled:opacity-50 disabled:shadow-none border border-cyan-400/20 relative flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Icon path={ICONS.loader} size={14} className="animate-spin-fast" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Icon path={ICONS.zap} size={14} />
                      Run FCC Analysis
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* COLUMN 2: REPORT AREA */}
            <div className="flex-1 glass-panel rounded-xl overflow-hidden flex flex-col relative">
              {!report && !error ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-700 gap-6">
                  {isProcessing ? (
                    <>
                      <div className="w-24 h-24 rounded-full border-2 border-cyan-500/30 flex items-center justify-center bg-cyan-950/20 relative">
                        <div className="absolute inset-0 rounded-full border-2 border-cyan-500/50 animate-ping" />
                        <Icon path={ICONS.loader} size={48} className="text-cyan-400 animate-spin-fast" />
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-bold text-cyan-400 tracking-widest uppercase mb-2">FCC v1 Analyzing</div>
                        <div className="text-[10px] text-slate-600">Processing with {getModelPanelForMode(fccMode).length} models...</div>
                        <div className="text-[9px] text-slate-700 mt-2 font-mono">
                          Mode: {fccMode.replace('_', ' ')}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-24 h-24 rounded-full border-2 border-dashed border-cyan-500/20 flex items-center justify-center bg-slate-950/50 relative">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/10 to-transparent" />
                        <Icon path={ICONS.layer} size={48} className="opacity-30 text-cyan-500" />
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-bold text-cyan-400 tracking-widest uppercase mb-2">FCC v1 Ready</div>
                        <div className="text-[10px] text-slate-600">Enter a directive to begin analysis</div>
                        <div className="text-[9px] text-slate-700 mt-2 font-mono">
                          Current mode: {fccMode.replace('_', ' ')}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : error && !report ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-700 gap-6 p-10">
                  <div className="w-24 h-24 rounded-full border border-red-500/20 flex items-center justify-center bg-red-950/20">
                    <Icon path={ICONS.alert} size={48} color="#ef4444" className="opacity-50" />
                  </div>
                  <div className="text-center max-w-md">
                    <div className="text-xs font-bold text-red-400 tracking-widest uppercase mb-2">Error</div>
                    <div className="text-sm text-slate-300">{error}</div>
                    <button
                      onClick={() => { setError(null); setReport(null); }}
                      className="mt-4 text-xs text-cyan-400 hover:text-cyan-300 underline"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto p-10 pb-32 scroll-smooth">
                    {/* Report Header */}
                    <div className="flex justify-between items-start border-b border-white/10 pb-6 mb-8">
                      <div>
                        <h1 className="text-2xl font-bold text-white mb-2">FCC Analysis Report</h1>
                        <div className="flex gap-4 text-[11px] font-mono text-slate-500 uppercase items-center flex-wrap">
                          {report && (
                            <>
                              <span className="text-cyan-500">Confidence: {report.confidence}%</span>
                              <span className="text-yellow-500">Risk: {report.overallRiskScore}/100</span>
                              <span className="text-slate-400">MODE: {report.mode.replace('_', ' ')}</span>
                              
                              <button 
                                onClick={downloadMarkdown}
                                className="ml-4 flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors border-l border-white/10 pl-4"
                                title="Download Markdown Report"
                              >
                                <Icon path={ICONS.download} size={14} />
                                <span className="text-[10px] font-bold">MD</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Models Used:</div>
                        <div className="flex flex-wrap gap-2 justify-end">
                          {modelsUsed.map((modelId) => {
                            const model = MODEL_REGISTRY.find(m => m.id === modelId);
                            if (!model) return null;
                            return (
                              <div 
                                key={modelId} 
                                className="text-[10px] px-2 py-1 rounded bg-slate-900/50 border border-slate-700 text-slate-400"
                                title={model.label}
                              >
                                {model.label}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* FCC Report Sections */}
                    {report && (
                      <div className="max-w-4xl mx-auto pb-10">
                        {/* Summary */}
                        <ReportSection title="Summary" content={report.summary} />
                        
                        {/* Assumptions */}
                        {report.assumptions && report.assumptions.length > 0 && (
                          <div className="mb-10">
                            <h3 className="text-xs font-bold tracking-widest text-cyan-400 uppercase mb-4 flex items-center gap-3">
                              <div className="h-px w-4 bg-cyan-500/50"></div>
                              Assumptions
                            </h3>
                            <ul className="list-disc list-inside text-sm text-slate-300 leading-7 space-y-2">
                              {report.assumptions.map((assumption, i) => (
                                <li key={i} className="text-slate-300">{assumption}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Findings */}
                        {report.findings && report.findings.length > 0 && (
                          <div className="my-10">
                            <h3 className="text-xs font-bold tracking-widest text-cyan-400 uppercase mb-6 flex items-center gap-3">
                              <div className="h-px w-4 bg-cyan-500/50"></div>
                              Findings ({report.findings.length})
                            </h3>
                            <div className="space-y-4">
                              {report.findings.map((finding) => (
                                <FindingCard key={finding.id} finding={finding} />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Recommendations */}
                        {report.recommendations && report.recommendations.length > 0 && (
                          <div className="my-10">
                            <h3 className="text-xs font-bold tracking-widest text-cyan-400 uppercase mb-6 flex items-center gap-3">
                              <div className="h-px w-4 bg-cyan-500/50"></div>
                              Recommendations ({report.recommendations.length})
                            </h3>
                            <div className="space-y-4">
                              {report.recommendations.map((rec) => (
                                <RecommendationCard key={rec.id} recommendation={rec} />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Notes */}
                        {report.notes && (
                          <div className="mt-8 mb-12 p-6 bg-slate-900/50 rounded-lg border border-white/5">
                            <h3 className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-4">Notes</h3>
                            <div className="text-xs text-slate-400 font-mono whitespace-pre-line">{report.notes}</div>
                          </div>
                        )}

                        {/* Error Display */}
                        {error && (
                          <div className="mt-8 mb-12 p-6 bg-red-950/20 border border-red-500/20 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Icon path={ICONS.alert} size={16} color="#ef4444" />
                              <h3 className="text-xs font-bold text-red-400 uppercase">Error</h3>
                            </div>
                            <div className="text-sm text-red-200">{error}</div>
                          </div>
                        )}

                        {/* Metadata */}
                        {report.metadata && (
                          <div className="mt-8 text-[10px] text-slate-600 font-mono">
                            Execution: {report.metadata.executionTimeMs}ms | 
                            Files Scanned: {report.metadata.repoFilesScanned || 'N/A'} |
                            {report.metadata.timestamp && ` Timestamp: ${new Date(report.metadata.timestamp).toLocaleString()}`}
                          </div>
                        )}
                        
                        <div ref={reportEndRef} />
                      </div>
                    )}
                  </div>

                  {/* --- FOLLOW-UP INPUT BAR --- */}
                  <div className="absolute bottom-0 left-0 right-0 bg-slate-950/80 backdrop-blur-md border-t border-white/10 p-4 flex gap-3 items-center z-40">
                    <div className="flex-1 relative">
                      <input 
                        type="text" 
                        className="w-full bg-slate-900/80 border border-white/10 rounded-lg px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 font-mono shadow-inner"
                        placeholder="Enter follow-up directive or implementation request..."
                        value={followUpQuery}
                        onChange={(e) => setFollowUpQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleRun(followUpQuery);
                          }
                        }}
                        disabled={isProcessing}
                      />
                      {isProcessing && (
                        <div className="absolute right-3 top-3">
                           <Icon path={ICONS.loader} size={16} className="text-cyan-400 animate-spin-fast" />
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => handleRun(followUpQuery)}
                      disabled={isProcessing || !followUpQuery.trim()}
                      className="bg-cyan-600 hover:bg-cyan-500 text-white p-3 rounded-lg transition-all shadow-lg shadow-cyan-900/20 disabled:opacity-50 disabled:shadow-none"
                    >
                      <Icon path={ICONS.send} size={16} />
                    </button>
                  </div>
                </>
              )}

              {/* Live Logs */}
              {isProcessing && (
                <div className="absolute top-4 right-4 max-w-sm max-h-32 bg-black/90 backdrop-blur rounded-lg border border-cyan-900/30 p-4 font-mono text-[10px] overflow-y-auto shadow-2xl z-50 pointer-events-none">
                  {logs.map((log, i) => (
                    <div key={i} className="text-cyan-500/80 mb-1 border-l-2 border-cyan-800 pl-2">{log}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
