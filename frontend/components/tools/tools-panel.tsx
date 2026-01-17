'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MagnifyingGlass, Warning, X } from '@phosphor-icons/react/dist/ssr';
import { useToolRegistry } from '@/hooks/useToolRegistry';
import type { ToolIndexEntry } from '@/types/tools';
import { BrowseToolsView } from './browse-tools-view';
import { CategoryFilter } from './category-filter';
import { InstalledToolsView } from './installed-tools-view';
import { ToolDetailModal } from './tool-detail-modal';
import { ToolInstallModal } from './tool-install-modal';

type PanelView = 'browse' | 'installed';

interface ToolsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ToolsPanel({ isOpen, onClose }: ToolsPanelProps) {
  const {
    filteredTools,
    tools: registryTools,
    loading,
    error,
    selectedCategory,
    searchQuery,
    setCategory,
    setSearch,
    refresh,
  } = useToolRegistry();

  const [currentView, setCurrentView] = useState<PanelView>('browse');
  const [installingTool, setInstallingTool] = useState<ToolIndexEntry | null>(null);
  const [selectedTool, setSelectedTool] = useState<ToolIndexEntry | null>(null);
  const [n8nEnabled, setN8nEnabled] = useState<boolean | null>(null);
  const [checkingN8n, setCheckingN8n] = useState(true);

  const checkN8nStatus = useCallback(async () => {
    setCheckingN8n(true);
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setN8nEnabled(data.settings?.n8n_enabled ?? false);
      }
    } catch {
      setN8nEnabled(false);
    } finally {
      setCheckingN8n(false);
    }
  }, []);

  // Load registry and check n8n status when panel opens
  useEffect(() => {
    if (isOpen) {
      refresh();
      checkN8nStatus();
    }
  }, [isOpen, refresh, checkN8nStatus]);

  const handleInstall = useCallback((tool: ToolIndexEntry) => {
    setSelectedTool(null); // Close detail modal if open
    setInstallingTool(tool);
  }, []);

  const handleCardClick = useCallback((tool: ToolIndexEntry) => {
    setSelectedTool(tool);
  }, []);

  const handleInstallComplete = useCallback(() => {
    // Could refresh registry here if needed
  }, []);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="bg-background absolute inset-y-0 right-0 flex w-full flex-col shadow-2xl sm:w-[80%] sm:max-w-4xl">
        {/* Header */}
        <header className="shrink-0 border-b">
          <div className="flex items-center justify-between px-6 py-5">
            <div>
              <h1 className="text-2xl font-bold">Skills</h1>
              <p className="text-muted-foreground text-sm">Expand what CAAL can do</p>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full p-2 transition-colors"
            >
              <X className="h-6 w-6" weight="bold" />
            </button>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-2 border-b px-6">
            <button
              onClick={() => setCurrentView('browse')}
              className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                currentView === 'browse'
                  ? 'border-blue-500 text-blue-400'
                  : 'text-muted-foreground hover:text-foreground border-transparent'
              }`}
            >
              Browse Registry
            </button>
            <button
              onClick={() => setCurrentView('installed')}
              className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                currentView === 'installed'
                  ? 'border-blue-500 text-blue-400'
                  : 'text-muted-foreground hover:text-foreground border-transparent'
              }`}
            >
              Installed Tools
            </button>
          </div>

          {/* Search and filter (only for browse view) */}
          {currentView === 'browse' && (
            <div className="space-y-3 px-6 py-4">
              {/* Search input */}
              <div className="relative">
                <MagnifyingGlass className="text-muted-foreground absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tools..."
                  className="border-input bg-muted/50 w-full rounded-lg border py-2.5 pr-4 pl-10 text-sm"
                />
              </div>

              {/* Category filter */}
              <CategoryFilter selected={selectedCategory} onSelect={setCategory} />
            </div>
          )}
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* n8n not enabled warning (only for browse view when trying to install) */}
          {currentView === 'browse' && !checkingN8n && n8nEnabled === false && (
            <div className="mb-6 rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
              <div className="flex items-start gap-3">
                <Warning className="h-5 w-5 shrink-0 text-orange-400" weight="bold" />
                <div>
                  <p className="font-medium text-orange-200">n8n not configured</p>
                  <p className="text-sm text-orange-300/80">
                    Enable n8n in Settings → Integrations to install tools.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Conditional view rendering */}
          {currentView === 'browse' ? (
            <BrowseToolsView
              filteredTools={filteredTools}
              loading={loading}
              error={error}
              searchQuery={searchQuery}
              n8nEnabled={n8nEnabled ?? false}
              onInstall={handleInstall}
              onCardClick={handleCardClick}
              onRefresh={refresh}
              onClearSearch={() => setSearch('')}
            />
          ) : (
            <InstalledToolsView registryTools={registryTools} n8nEnabled={n8nEnabled ?? false} />
          )}
        </main>
      </div>

      {/* Detail modal */}
      {selectedTool && (
        <ToolDetailModal
          tool={selectedTool}
          onClose={() => setSelectedTool(null)}
          onInstall={handleInstall}
          n8nEnabled={n8nEnabled ?? false}
        />
      )}

      {/* Install modal */}
      {installingTool && (
        <ToolInstallModal
          tool={installingTool}
          onClose={() => setInstallingTool(null)}
          onInstallComplete={handleInstallComplete}
        />
      )}
    </div>,
    document.body
  );
}
