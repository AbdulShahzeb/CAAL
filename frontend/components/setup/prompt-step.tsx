'use client';

import { useState } from 'react';
import { Button } from '@/components/livekit/button';

export type PromptPreset = 'default' | 'hass' | 'custom';

interface PromptStepProps {
  initialPreset?: PromptPreset;
  hassEnabled?: boolean;
  onBack: () => void;
  onComplete: (preset: PromptPreset) => void;
}

export function PromptStep({
  initialPreset = 'default',
  hassEnabled = false,
  onBack,
  onComplete,
}: PromptStepProps) {
  const [preset, setPreset] = useState<PromptPreset>(initialPreset);

  const handleComplete = () => {
    onComplete(preset);
  };

  const presets: { value: PromptPreset; label: string; description: string; disabled?: boolean }[] =
    [
      {
        value: 'default',
        label: 'Default',
        description:
          'General-purpose voice assistant. Good for most use cases - handles conversations, answers questions, and executes tools when available.',
      },
      {
        value: 'hass',
        label: hassEnabled ? 'Home Assistant' : 'Home Assistant (requires integration)',
        description:
          'Optimized for smart home control. Uses device names directly, ignores areas/floors, and provides concise responses suited for voice interaction.',
        disabled: !hassEnabled,
      },
      {
        value: 'custom',
        label: 'Custom',
        description:
          "Start with the default prompt and customize it in Settings. Choose this if you want full control over your assistant's personality and behavior.",
      },
    ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-base font-medium">Choose a Prompt Preset</h3>
        <p className="text-muted-foreground text-sm">
          The prompt defines how your assistant behaves. You can customize it later in Settings.
        </p>
      </div>

      <div className="space-y-3">
        {presets.map((p) => (
          <div
            key={p.value}
            className={`rounded-lg border p-4 transition-colors ${
              p.disabled
                ? 'cursor-not-allowed opacity-50'
                : preset === p.value
                  ? 'border-primary bg-primary/5 cursor-pointer'
                  : 'hover:bg-muted/50 cursor-pointer'
            }`}
            onClick={() => !p.disabled && setPreset(p.value)}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  preset === p.value && !p.disabled
                    ? 'border-primary bg-primary'
                    : 'border-muted-foreground/50'
                }`}
              >
                {preset === p.value && !p.disabled && (
                  <div className="bg-primary-foreground h-2 w-2 rounded-full" />
                )}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{p.label}</div>
                <p className="text-muted-foreground mt-1 text-sm">{p.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button variant="primary" onClick={handleComplete}>
          Complete Setup
        </Button>
      </div>
    </div>
  );
}
