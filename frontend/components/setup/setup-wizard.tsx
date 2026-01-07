'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/livekit/button';
import { IntegrationsStep } from './integrations-step';
import { PromptPreset, PromptStep } from './prompt-step';
import { ProviderStep } from './provider-step';

export interface SetupData {
  // Provider
  llm_provider: 'ollama' | 'groq';
  ollama_host: string;
  ollama_model: string;
  groq_api_key: string;
  groq_model: string;
  // Integrations
  hass_enabled: boolean;
  hass_host: string;
  hass_token: string;
  n8n_enabled: boolean;
  n8n_url: string;
  n8n_token: string;
  // Prompt preset
  prompt: PromptPreset;
}

interface SetupWizardProps {
  onComplete: () => void;
  onCancel?: () => void;
}

const INITIAL_DATA: SetupData = {
  llm_provider: 'ollama',
  ollama_host: 'http://localhost:11434',
  ollama_model: '',
  groq_api_key: '',
  groq_model: 'llama-3.3-70b-versatile',
  hass_enabled: false,
  hass_host: '',
  hass_token: '',
  n8n_enabled: false,
  n8n_url: '',
  n8n_token: '',
  prompt: 'default',
};

const TOTAL_STEPS = 3;

export function SetupWizard({ onComplete, onCancel }: SetupWizardProps) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<SetupData>(INITIAL_DATA);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateData = (updates: Partial<SetupData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setStep((prev) => prev - 1);
  };

  // Build full n8n MCP URL from host
  const getN8nMcpUrl = (host: string) => {
    if (!host) return '';
    // Remove trailing slash if present
    const baseUrl = host.replace(/\/$/, '');
    // If user already included the path, use as-is
    if (baseUrl.includes('/mcp-server')) return baseUrl;
    // Otherwise append the standard MCP path
    return `${baseUrl}/mcp-server/http`;
  };

  const handleComplete = async (promptPreset?: PromptPreset) => {
    setSaving(true);
    setError(null);

    // Use prompt from parameter if provided (from prompt step), otherwise from data
    // Transform n8n_url to include full MCP path if enabled
    const finalData = {
      ...data,
      prompt: promptPreset || data.prompt,
      n8n_url: data.n8n_enabled ? getN8nMcpUrl(data.n8n_url) : data.n8n_url,
    };

    try {
      const response = await fetch('/api/setup/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Setup failed');
      }

      // Trigger prewarm if using Ollama
      if (finalData.llm_provider === 'ollama') {
        fetch('/api/prewarm', { method: 'POST' }).catch(() => {
          // Ignore prewarm errors - it's non-critical
        });
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setSaving(false);
    }
  };

  // Check if current step is valid to proceed
  const canProceed = () => {
    if (step === 1) {
      if (data.llm_provider === 'ollama') {
        return data.ollama_host && data.ollama_model;
      } else {
        return data.groq_api_key && data.groq_model;
      }
    }
    return true;
  };

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return 'Choose your AI provider';
      case 2:
        return 'Configure integrations';
      case 3:
        return 'Choose a prompt preset';
      default:
        return '';
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background border-input dark:border-muted flex max-h-[85vh] w-full max-w-lg flex-col rounded-lg border shadow-xl">
        {/* Header */}
        <div className="border-input dark:border-muted relative shrink-0 border-b p-4">
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-muted-foreground hover:text-foreground absolute top-4 right-4 p-1 transition-colors"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          )}
          <h2 className="text-lg font-semibold">{onCancel ? 'Settings' : 'Welcome to CAAL'}</h2>
          <p className="text-muted-foreground text-sm">
            Step {step} of {TOTAL_STEPS} &mdash; {getStepTitle()}
          </p>
          {/* Progress bar */}
          <div className="bg-muted mt-3 h-1 w-full rounded-full">
            <div
              className="bg-primary h-1 rounded-full transition-all duration-300"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && <div className="mb-4 rounded-md bg-red-500/10 p-3 text-red-500">{error}</div>}

          {step === 1 && <ProviderStep data={data} updateData={updateData} />}
          {step === 2 && <IntegrationsStep data={data} updateData={updateData} />}
          {step === 3 && (
            <PromptStep
              initialPreset={data.prompt}
              hassEnabled={data.hass_enabled}
              onBack={handleBack}
              onComplete={(preset) => handleComplete(preset)}
            />
          )}
        </div>

        {/* Footer - hidden on step 3 since PromptStep has its own buttons */}
        {step < 3 && (
          <div className="border-input dark:border-muted flex shrink-0 justify-between border-t p-4">
            <div>
              {step > 1 && (
                <Button variant="secondary" onClick={handleBack} disabled={saving}>
                  Back
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="primary" onClick={handleNext} disabled={!canProceed()}>
                Continue
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
