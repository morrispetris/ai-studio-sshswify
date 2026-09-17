import React, { useState } from 'react';
import { 
  X, 
  Cloud, 
  Check, 
  Copy, 
  Terminal, 
  ExternalLink, 
  Cpu, 
  Zap, 
  ShieldCheck, 
  Globe 
} from 'lucide-react';

interface CloudRunModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudRunModal: React.FC<CloudRunModalProps> = ({ isOpen, onClose }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const deployCommand = `gcloud run deploy sshwifty \\
  --source . \\
  --port 3000 \\
  --timeout 3600 \\
  --allow-unauthenticated \\
  --set-env-vars SSHWIFTY_SHAREDKEY=""`;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#151821] border border-zinc-700/80 rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="h-14 border-b border-zinc-800 px-5 flex items-center justify-between bg-[#12141a]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 font-mono">Google Cloud Run Deployment</h3>
              <p className="text-[11px] text-zinc-400">Production ready container deployment</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          {/* Status badge */}
          <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-emerald-300 font-mono">
                Cloud Run Compatible & Ready
              </h4>
              <p className="text-[11px] text-zinc-300 mt-0.5">
                This Sshwifty build runs on Node.js/Express with full WebSocket streaming support on port 3000, fully compatible with Google Cloud Run container execution and scaling.
              </p>
            </div>
          </div>

          {/* Quick Publish Options */}
          <div className="space-y-3">
            <h5 className="text-xs font-semibold text-zinc-200 font-mono uppercase tracking-wider flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>How to Publish to Google Cloud Run</span>
            </h5>

            {/* Option 1: AI Studio UI */}
            <div className="bg-[#181c26] border border-zinc-800 rounded-lg p-3.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-zinc-200 font-mono">
                  1. One-Click Deploy in AI Studio
                </span>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-mono">
                  Easiest
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Click the <strong>Deploy</strong> button in the top right menu of Google AI Studio. AI Studio will automatically build the container image and deploy this service directly to your Google Cloud project on Cloud Run.
              </p>
            </div>

            {/* Option 2: gcloud CLI */}
            <div className="bg-[#181c26] border border-zinc-800 rounded-lg p-3.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-zinc-200 font-mono">
                  2. Deploy via Google Cloud SDK (gcloud)
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(deployCommand, 1)}
                  className="text-xs text-zinc-400 hover:text-white flex items-center space-x-1"
                >
                  {copiedIndex === 1 ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span className="text-[11px]">{copiedIndex === 1 ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[11px] text-zinc-400 mb-2">
                Export or clone the repository, then run the command from the root folder:
              </p>
              <pre className="bg-[#0e1015] p-2.5 rounded text-[11px] font-mono text-emerald-400 overflow-x-auto border border-zinc-800">
                {deployCommand}
              </pre>
            </div>
          </div>

          {/* Cloud Run Specific Optimizations */}
          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-zinc-200 font-mono uppercase tracking-wider flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
              <span>Cloud Run Architecture Notes</span>
            </h5>
            <ul className="text-[11px] text-zinc-400 space-y-1.5 list-disc list-inside">
              <li>
                <strong className="text-zinc-300">WebSocket Timeout:</strong> Cloud Run supports up to 60-minute long-lived WebSocket connections using <code className="text-zinc-200">--timeout 3600</code>.
              </li>
              <li>
                <strong className="text-zinc-300">Session Affinity:</strong> For multiple container instances, enable session affinity in Cloud Run to keep WebSocket tabs routed to the same instance.
              </li>
              <li>
                <strong className="text-zinc-300">Security / SharedKey:</strong> Configure the environment variable <code className="text-zinc-200">SSHWIFTY_SHAREDKEY</code> in Cloud Run variables to protect the web client.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="h-14 border-t border-zinc-800 px-5 flex items-center justify-end bg-[#12141a]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-mono font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
