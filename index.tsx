
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { FCC_THEME, AGENTS } from './config';
import { FusedReport, AgentId, ProposedAction, MinorityReport, ExternalContext } from './types';
import { orchestrator } from './orchestrator';
import { storage } from './storage';
import { executeCloudActions } from './actions';
import { generateMarkdown } from './markdown';
import { ingestGitHubRepo } from './github';

// --- ICONS ---
const Icon = ({ path, size = 16, color = "currentColor", className = "", style = {} }: any) => (
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

// --- STYLES ---
const GLOBAL_STYLES = `
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
`;

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

function App() {
  const [query, setQuery] = useState('');
  const [activeAgentIds, setActiveAgentIds] = useState<AgentId[]>(AGENTS.map(a => a.id));
  const [mode, setMode] = useState<"analysis" | "action">("analysis");
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  
  const [report, setReport] = useState<FusedReport | null>(null);
  const [history, setHistory] = useState<FusedReport[]>([]);
  const [historyOpen, setHistoryOpen] = useState(true);
  
  const [executing, setExecuting] = useState(false);
  const [uiActions, setUiActions] = useState<ProposedAction[]>([]);
  
  const [followUpQuery, setFollowUpQuery] = useState('');
  const reportEndRef = useRef<HTMLDivElement>(null);

  // GitHub Context State
  const [githubRepo, setGithubRepo] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);
  const [externalContext, setExternalContext] = useState<ExternalContext | null>(null);

  useEffect(() => {
    storage.listRecentReports().then(setHistory);
  }, []);

  useEffect(() => {
    if (report) {
       setUiActions(report.proposedActions || []);
    }
  }, [report]);

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
        const content = await ingestGitHubRepo(githubRepo, githubToken);
        setExternalContext({
            source: `github:${githubRepo}`,
            content: content,
            loadedAt: new Date().toISOString()
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
    
    const previousContext = report; 

    setReport(null);
    setUiActions([]);
    setLogs([]);
    setQuery('');
    setFollowUpQuery('');

    try {
      const result = await orchestrator.runCollective(
        inputText, 
        activeAgentIds, 
        mode, 
        addLog, 
        previousContext,
        externalContext // Pass the ingested context
      );
      
      setReport(result);
      const newHistory = [result, ...history];
      setHistory(newHistory);
      await storage.saveFusedReport(result);
    } catch (e) {
      console.error(e);
      addLog("FATAL_ERROR :: SEE CONSOLE");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleActions = async (dryRun: boolean) => {
    if (!report || uiActions.length === 0) return;
    setExecuting(true);
    
    setUiActions(prev => prev.map(a => ({ 
      ...a, 
      status: dryRun ? 'simulating' : 'executing', 
      resultMessage: undefined 
    })));
    
    try {
      const results = await executeCloudActions(uiActions, { dryRun });
      
      setUiActions(prev => prev.map(a => {
        const res = results.find(r => r.id === a.id);
        if (res) {
          return { 
            ...a, 
            status: res.success ? (dryRun ? 'simulated' : 'success') : 'failed',
            resultMessage: res.message
          };
        }
        return a;
      }));
      
    } catch (e) {
      console.error("Action pipeline failed", e);
    } finally {
      setExecuting(false);
    }
  };

  const loadFromHistory = (r: FusedReport) => {
    setReport(r);
    setUiActions(r.proposedActions || []);
    setLogs([`LOADED HISTORY: ${r.id}`]);
  };

  const downloadMarkdown = () => {
    if (!report) return;
    const md = generateMarkdown(report);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fcc-report-${report.id.slice(0, 8)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const container = document.getElementById('app');
  if (!container) return null;

  return (
    <div className="fixed inset-0 w-full h-full bg-slate-950 text-slate-200 font-sans flex overflow-hidden">
      <style>{GLOBAL_STYLES}</style>
      
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
          {history.map(h => (
            <div 
              key={h.id} 
              onClick={() => loadFromHistory(h)}
              className={`p-3 rounded-lg cursor-pointer border transition-all duration-200 ${
                report?.id === h.id 
                  ? 'bg-cyan-500/10 border-cyan-500/20' 
                  : 'bg-transparent border-transparent hover:bg-white/5'
              }`}
            >
              <div className="flex justify-between mb-1">
                <span className="font-mono text-[10px] text-slate-500">{new Date(h.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${h.mode === 'action' ? 'text-red-400 bg-red-900/20' : 'text-cyan-400 bg-cyan-900/20'}`}>
                  {h.mode === 'action' ? 'ACT' : 'ANA'}
                </span>
              </div>
              <div className="text-xs text-slate-400 line-clamp-1">{h.query}</div>
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
               <span className="font-bold tracking-widest text-xs text-slate-200">FROST <span className="text-slate-600 font-normal">COLLECTIVE</span></span>
            </div>
          </div>
          <div className={`font-mono text-[11px] px-3 py-1.5 rounded border flex items-center gap-2 ${
            isProcessing ? 'bg-cyan-950/30 border-cyan-500/30 text-cyan-400' : 'border-slate-800 text-slate-600'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isProcessing ? 'bg-cyan-400 animate-pulse' : 'bg-slate-700'}`} />
            {isProcessing ? 'PROCESSING' : 'READY'}
          </div>
        </div>

        {/* WORKSPACE */}
        <div className="flex-1 flex p-6 gap-6 overflow-hidden">
          
          {/* COLUMN 1: CONTROLS */}
          <div className="w-96 flex flex-col gap-6 flex-shrink-0 overflow-y-auto pb-20">
            {/* Agents */}
            <div className="glass-panel rounded-xl p-6 flex flex-col gap-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Neural Nodes</span>
              <div className="grid grid-cols-1 gap-2">
                {AGENTS.map(agent => {
                  const isActive = activeAgentIds.includes(agent.id);
                  return (
                    <div 
                      key={agent.id}
                      onClick={() => isActive ? setActiveAgentIds(p => p.filter(id => id !== agent.id)) : setActiveAgentIds(p => [...p, agent.id])}
                      className={`cursor-pointer border rounded-lg p-3 flex items-center gap-3 transition-all ${
                        isActive ? 'bg-slate-800/50 border-cyan-500/30' : 'border-transparent hover:bg-white/5'
                      }`}
                    >
                      <div className="text-lg opacity-80" style={{color: isActive ? agent.color : '#64748b'}}>{agent.icon}</div>
                      <div>
                        <div className={`text-xs font-bold ${isActive ? 'text-slate-200' : 'text-slate-500'}`}>{agent.name}</div>
                        <div className="text-[11px] text-slate-600">{agent.role}</div>
                      </div>
                      <div className={`ml-auto w-1.5 h-1.5 rounded-full ${isActive ? 'bg-cyan-400 shadow-[0_0_8px_cyan]' : 'bg-slate-800'}`} />
                    </div>
                  );
                })}
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
                  onClick={() => setMode('analysis')}
                  className={`flex-1 py-2 text-[11px] font-bold rounded transition-all ${mode === 'analysis' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  ANALYSIS
                </button>
                <button 
                  onClick={() => setMode('action')}
                  className={`flex-1 py-2 text-[11px] font-bold rounded transition-all ${mode === 'action' ? 'bg-red-900/30 text-red-400 border border-red-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  ACTION
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
                className="bg-cyan-600 hover:bg-cyan-500 text-white py-3 rounded-lg font-bold text-[11px] tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(8,145,178,0.4)] disabled:opacity-50 disabled:shadow-none border border-cyan-400/20"
              >
                {isProcessing ? 'Synthesizing...' : 'Initialize Consensus'}
              </button>
            </div>
          </div>

          {/* COLUMN 2: REPORT AREA */}
          <div className="flex-1 glass-panel rounded-xl overflow-hidden flex flex-col relative">
            {!report ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-700 gap-6">
                <div className="w-24 h-24 rounded-full border border-dashed border-slate-800 flex items-center justify-center animate-spin-slow bg-slate-950/50">
                  <Icon path={ICONS.layer} size={48} className="opacity-20" />
                </div>
                <div className="text-center">
                   <div className="text-xs font-bold text-slate-600 tracking-widest uppercase mb-2">System Ready</div>
                   <div className="text-[10px] text-slate-700">Awaiting input vector...</div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-10 pb-32 scroll-smooth">
                  {/* Report Header */}
                  <div className="flex justify-between items-start border-b border-white/10 pb-6 mb-8">
                    <div>
                      <h1 className="text-2xl font-bold text-white mb-2">Fused Intelligence Report</h1>
                      <div className="flex gap-4 text-[11px] font-mono text-slate-500 uppercase items-center">
                        <span>ID: {report.id.slice(0,8)}</span>
                        <span className="text-cyan-500">Confidence: {report.confidence}%</span>
                        <span className={report.mode === 'action' ? "text-red-400" : "text-slate-500"}>MODE: {report.mode}</span>
                        
                        <button 
                          onClick={downloadMarkdown}
                          className="ml-4 flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors border-l border-white/10 pl-4"
                          title="Download Markdown Report"
                        >
                          <Icon path={ICONS.download} size={14} />
                          <span className="text-[10px] font-bold">MD</span>
                        </button>
                      </div>
                    </div>
                    <div className="flex -space-x-2">
                      {report.participatingAgents.map(aid => {
                        const agent = AGENTS.find(a => a.id === aid);
                        return (
                          <div key={aid} className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-xs relative z-10 shadow-lg" style={{color: agent?.color}}>
                            {agent?.icon}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Standardized Sections */}
                  <div className="max-w-4xl mx-auto pb-10">
                      <ReportSection title="Overview" content={report.overview} />
                      
                      <div className="grid grid-cols-2 gap-8 my-8">
                        <ReportSection title="Architecture & Integrations" content={report.architectureAndIntegrations} />
                        <ReportSection title="Key Features & Workflows" content={report.keyFeaturesAndWorkflows} />
                      </div>
                      
                      <ReportSection title="Key Risks" content={report.keyRisks} />

                      {report.minorityReports.length > 0 && (
                        <div className="my-10">
                          <div className="grid grid-cols-1 gap-4">
                            {report.minorityReports.map((mr, i) => <MinorityReportCard key={i} report={mr} />)}
                          </div>
                        </div>
                      )}

                      <ReportSection title="Next Actions" content={report.nextActionsForHuman} />
                      
                      <div className="mt-8 mb-12 p-6 bg-slate-900/50 rounded-lg border border-white/5">
                        <ReportSection title="Executive Summary" content={report.executiveSummary} />
                      </div>

                      {/* Action Log */}
                      {report.mode === 'action' && uiActions.length > 0 && (
                        <div className="mt-12 border border-white/10 rounded-lg overflow-hidden bg-slate-900/40">
                          <div className="bg-white/5 px-4 py-3 flex justify-between items-center border-b border-white/5">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                              <Icon path={ICONS.cloud} size={14} />
                              Cloud Action Pipeline
                            </span>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleActions(true)} 
                                disabled={executing}
                                className="text-[10px] font-bold text-cyan-400 hover:text-white border border-cyan-500/30 px-3 py-1.5 rounded hover:bg-cyan-500/10 transition-all disabled:opacity-50"
                              >
                                {executing ? 'PROCESSING...' : 'SIMULATE'}
                              </button>
                              <button 
                                onClick={() => handleActions(false)}
                                disabled={executing}
                                className="text-[10px] font-bold text-white bg-red-600 hover:bg-red-500 px-3 py-1.5 rounded transition-all disabled:opacity-50 shadow-lg shadow-red-900/20"
                              >
                                EXECUTE
                              </button>
                            </div>
                          </div>
                          <div className="divide-y divide-white/5">
                            {uiActions.map((action, i) => (
                              <ActionRow key={i} action={action} />
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {report.mode === 'action' && uiActions.length === 0 && (
                        <div className="mt-12 text-center text-slate-500 text-xs italic p-4 border border-dashed border-white/10 rounded-lg">
                          No cloud actions proposed by the collective for this run.
                        </div>
                      )}
                      <div ref={reportEndRef} />
                  </div>
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
  );
}

const rootElement = document.getElementById('app');
if (rootElement) {
  createRoot(rootElement).render(<App />);
}
