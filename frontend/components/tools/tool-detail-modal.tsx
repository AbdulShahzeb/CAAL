'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowRight,
  ArrowSquareOut,
  CheckCircle,
  CircleNotch,
  GithubLogo,
  Key,
  Microphone,
  Package,
  Tag,
  Warning,
  X,
} from '@phosphor-icons/react/dist/ssr';
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  TIER_COLORS,
  TIER_LABELS,
  type ToolCategory,
  type ToolIndexEntry,
  type ToolManifest,
} from '@/types/tools';

interface InstalledStatus {
  version: string;
  upToDate: boolean;
  workflowId?: string;
  n8nBaseUrl?: string;
}

interface ToolDetailModalProps {
  tool: ToolIndexEntry;
  onClose: () => void;
  onInstall: (tool: ToolIndexEntry) => void;
  n8nEnabled: boolean;
  installedStatus?: InstalledStatus;
}

export function ToolDetailModal({
  tool,
  onClose,
  onInstall,
  n8nEnabled,
  installedStatus,
}: ToolDetailModalProps) {
  const [manifest, setManifest] = useState<ToolManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const categoryColor =
    CATEGORY_COLORS[tool.category as ToolCategory] || 'bg-gray-500/20 text-gray-400';
  const tierColor = TIER_COLORS[tool.tier] || 'bg-gray-500/20 text-gray-400';
  const categoryLabel = CATEGORY_LABELS[tool.category as ToolCategory] || tool.category;
  const tierLabel = TIER_LABELS[tool.tier] || tool.tier;

  useEffect(() => {
    async function fetchManifest() {
      try {
        const res = await fetch(`/api/tools/workflow?path=${encodeURIComponent(tool.path)}`);
        if (!res.ok) {
          throw new Error('Failed to fetch tool details');
        }
        const data = await res.json();
        setManifest(data.manifest);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchManifest();
  }, [tool.path]);

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="panel-elevated relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl"
        style={{ border: '1px solid var(--border-subtle)' }}
      >
        {/* Header */}
        <div className="section-divider shrink-0 border-b-0 px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryColor}`}>
                  {categoryLabel}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tierColor}`}>
                  {tierLabel}
                </span>
              </div>
              <h2 className="text-xl font-bold">{tool.name.replace(/-/g, ' ')}</h2>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full p-1 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <CircleNotch className="h-8 w-8 animate-spin text-blue-500" />
              <p className="text-muted-foreground mt-4">Loading details...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Warning className="h-8 w-8 text-red-500" />
              <p className="text-muted-foreground mt-4">{error}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Description */}
              <div>
                <p className="text-muted-foreground">{manifest?.description || tool.description}</p>
              </div>

              {/* Voice triggers */}
              {manifest?.voice_triggers && manifest.voice_triggers.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <Microphone className="h-4 w-4 text-blue-400" />
                    Voice Triggers
                  </h3>
                  <ul className="space-y-1.5">
                    {manifest.voice_triggers.map((trigger, i) => (
                      <li key={i} className="text-sm text-blue-400 italic">
                        &ldquo;Hey Cal, {trigger}&rdquo;
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Required services */}
              {manifest?.required_services && manifest.required_services.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <Package className="h-4 w-4 text-purple-400" />
                    Required Services
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {manifest.required_services.map((service) => (
                      <span
                        key={service}
                        className="rounded-lg bg-purple-500/10 px-3 py-1 text-sm text-purple-300"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Required variables */}
              {manifest?.required_variables && manifest.required_variables.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <Key className="h-4 w-4 text-orange-400" />
                    Configuration Required
                  </h3>
                  <div className="container-inset">
                    {manifest.required_variables.map((v) => (
                      <div key={v.name} className="mb-2 last:mb-0">
                        <code className="text-xs text-orange-300">{v.name}</code>
                        <p className="text-muted-foreground text-sm">{v.description}</p>
                        <p className="text-muted-foreground/60 text-xs">
                          Example: <code>{v.example}</code>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Required credentials */}
              {manifest?.required_credentials && manifest.required_credentials.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <Key className="h-4 w-4 text-green-400" />
                    n8n Credentials Required
                  </h3>
                  <div className="container-inset space-y-2">
                    {manifest.required_credentials.map((c) => (
                      <div key={c.name}>
                        <p className="text-sm font-medium">{c.description}</p>
                        <p className="text-muted-foreground text-xs">
                          {c.credential_type}
                          {c.node && ` • ${c.node}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {manifest?.tags && manifest.tags.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <Tag className="h-4 w-4 text-gray-400" />
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {manifest.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Author */}
              {manifest?.author && (
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <GithubLogo className="h-4 w-4 text-gray-400" />
                    Author
                  </h3>
                  <a
                    href={`https://github.com/${manifest.author.github}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-400 hover:underline"
                  >
                    @{manifest.author.github}
                  </a>
                </div>
              )}

              {/* n8n Workflow Link (when installed) */}
              {installedStatus?.workflowId && installedStatus?.n8nBaseUrl && (
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <ArrowSquareOut className="h-4 w-4 text-gray-400" />
                    Workflow
                  </h3>
                  <a
                    href={`${installedStatus.n8nBaseUrl}/workflow/${installedStatus.workflowId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-blue-400 hover:underline"
                  >
                    Open in n8n
                    <ArrowSquareOut className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="section-divider shrink-0 overflow-visible px-6 py-4">
          {!n8nEnabled ? (
            <div className="container-inset flex items-center gap-2 text-sm text-orange-400">
              <Warning className="h-4 w-4" />
              Enable n8n in Settings to install tools
            </div>
          ) : installedStatus?.upToDate ? (
            <div
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-500/10 px-4 py-3 text-green-400"
              style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)' }}
            >
              <CheckCircle className="h-5 w-5" weight="fill" />
              <span className="font-medium">Installed</span>
              <span className="text-sm text-green-400/60">v{installedStatus.version}</span>
            </div>
          ) : installedStatus ? (
            <button
              onClick={() => onInstall(tool)}
              disabled={loading || !!error}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              style={{ boxShadow: 'var(--shadow-md)' }}
            >
              Update to v{tool.version}
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => onInstall(tool)}
              disabled={loading || !!error}
              className="btn-glow bg-primary-bg text-primary-foreground disabled:bg-muted disabled:text-muted-foreground flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-medium disabled:cursor-not-allowed disabled:shadow-none"
            >
              Install
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
