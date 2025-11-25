"use client";

import Link from "next/link";
import { frostTools, FrostTool } from "./config/frostTools";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-black to-slate-900 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.03)_1px,_transparent_1px)] bg-[length:50px_50px] opacity-20 pointer-events-none" />
      
      {/* Main container */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12 md:py-16">
        <div className="w-full max-w-5xl">
          {/* Header */}
          <div className="mb-12 md:mb-16 text-center">
            <div className="inline-block mb-4 px-3 py-1 text-xs font-bold tracking-widest text-slate-400 uppercase border border-slate-800 rounded-full">
              Frost OS
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
              Frost Control Panel
            </h1>
            <p className="text-slate-400 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
              Your internal hub for FCC, Study OS, Prompt Architect, SemanticModeler, and Frost Solutions
            </p>
          </div>

          {/* Tools Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {frostTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolCard({ tool }: { tool: FrostTool }) {
  const cardContent = (
    <div className="group relative h-full p-6 rounded-2xl bg-zinc-950/60 backdrop-blur-sm border border-zinc-800 transition-all duration-300 hover:border-zinc-500 hover:bg-zinc-900/60 cursor-pointer flex flex-col">
      {/* Badge */}
      {tool.badge && (
        <div className="absolute top-4 right-4 px-2.5 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase border border-zinc-800 rounded-full bg-zinc-900/50">
          {tool.badge}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 mb-4">
        <h2 className="text-xl font-bold mb-2 text-white group-hover:text-cyan-400 transition-colors">
          {tool.name}
        </h2>
        <p className="text-xs font-medium text-cyan-400/70 mb-3 uppercase tracking-wide">
          {tool.tagline}
        </p>
        <p className="text-sm text-slate-400 leading-relaxed line-clamp-2">
          {tool.description}
        </p>
      </div>

      {/* Footer with arrow */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-800 group-hover:border-zinc-600 transition-colors">
        <span className="text-xs text-slate-500 group-hover:text-slate-400 transition-colors">
          {tool.external ? "Open in new tab" : "Open module"}
        </span>
        <svg
          className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all duration-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </div>
  );

  if (tool.external) {
    return (
      <a
        href={tool.href}
        target="_blank"
        rel="noreferrer"
        className="block h-full"
      >
        {cardContent}
      </a>
    );
  }

  return (
    <Link href={tool.href} className="block h-full">
      {cardContent}
    </Link>
  );
}

