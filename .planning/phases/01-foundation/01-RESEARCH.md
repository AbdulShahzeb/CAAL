# Phase 1: Foundation - Research

**Researched:** 2026-01-25
**Domain:** Settings infrastructure, backward compatibility
**Confidence:** HIGH

## Summary

This research focuses on implementing a global language setting in CAAL's settings infrastructure. The investigation covered the existing settings.py architecture, API propagation patterns, frontend/mobile consumption, and backward compatibility requirements.

The settings system is well-designed with clear patterns: `DEFAULT_SETTINGS` defines all keys with defaults, `load_settings()` merges user settings over defaults, and `save_settings()` persists only known keys. Adding a new setting requires minimal changes - add to `DEFAULT_SETTINGS` and the system handles migration automatically.

The key finding is that CAAL's settings architecture already supports backward compatibility by design. When `load_settings()` runs on an existing installation without the new `language` key, it automatically applies the default value. No explicit migration code is needed.

**Primary recommendation:** Add `"language": "en"` to `DEFAULT_SETTINGS` in `settings.py`. This single change provides the foundation for all downstream i18n work while maintaining full backward compatibility.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `settings.py` | N/A | Settings management | Existing CAAL infrastructure - already handles defaults, persistence, API exposure |
| `webhooks.py` | N/A | Settings API | Existing FastAPI endpoints - `/settings` GET/POST already work |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `pydantic` | 2.x | API validation | Already used in webhooks.py for request/response models |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Add to existing settings | Separate language config file | Complexity for no benefit - settings.json already handles this pattern |
| ISO 639-1 codes | Full locale codes (en-US) | ISO 639-1 (en, fr) is simpler and sufficient for voice language |

**Installation:**

No new dependencies required. This phase uses existing infrastructure.

## Architecture Patterns

### Current Settings Flow

```
settings.json (file)
      |
      v
load_settings() --> merges with DEFAULT_SETTINGS --> returns dict
      |
      v
Webhook API: GET /settings --> SettingsResponse
      |
      v
Frontend/Mobile: fetch('/api/settings') --> settings.language
```

### Pattern 1: Default Settings with Auto-Migration

**What:** New settings added to `DEFAULT_SETTINGS` are automatically available with default values for existing installations.

**When to use:** Always - this is the established CAAL pattern.

**Example:**
```python
# Source: /Users/mmaudet/work/CAAL/src/caal/settings.py

DEFAULT_SETTINGS = {
    # ... existing settings ...
    "language": "en",  # ISO 639-1 code: "en" | "fr"
}
```

**How it works (from settings.py lines 90-138):**
```python
def load_settings() -> dict:
    settings = DEFAULT_SETTINGS.copy()  # Start with all defaults

    if SETTINGS_PATH.exists():
        with open(SETTINGS_PATH) as f:
            user_settings = json.load(f)
        # Only apply keys that exist in defaults (ignore unknown keys)
        for key in DEFAULT_SETTINGS:
            if key in user_settings:
                settings[key] = user_settings[key]

    return settings  # Missing keys get default values automatically
```

### Pattern 2: Settings API Response

**What:** Settings are exposed via webhooks.py endpoints, consumed by frontend/mobile.

**When to use:** All settings are available to clients via this pattern.

**Example:**
```python
# Source: /Users/mmaudet/work/CAAL/src/caal/webhooks.py lines 341-357

@app.get("/settings", response_model=SettingsResponse)
async def get_settings() -> SettingsResponse:
    settings = settings_module.load_settings_safe()  # Excludes sensitive keys
    # ... returns all settings including language
```

### Pattern 3: Frontend Settings Consumption

**What:** Frontend fetches settings via `/api/settings` and maintains local state.

**When to use:** Settings panel loads settings on open.

**Example:**
```typescript
// Source: /Users/mmaudet/work/CAAL/frontend/components/settings/settings-panel.tsx lines 158-176

const loadSettings = useCallback(async () => {
  const settingsRes = await fetch('/api/settings');
  if (settingsRes.ok) {
    const data = await settingsRes.json();
    const loadedSettings = data.settings || DEFAULT_SETTINGS;
    setSettings(loadedSettings);
    // loadedSettings.language is now available
  }
}, []);
```

### Anti-Patterns to Avoid

- **Separate config files for language:** Don't create a new `language.json` - use the existing settings system
- **Environment variables for language:** Language is a user preference, not infrastructure config - don't use `.env`
- **Hardcoding default in multiple places:** Only `DEFAULT_SETTINGS` should define the default value

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Settings persistence | Custom file handling | `save_settings()` | Already handles JSON serialization, key filtering |
| API endpoint | New endpoint for language | Existing `/settings` | Already exposes all settings |
| Migration logic | Explicit migration script | `DEFAULT_SETTINGS` pattern | Auto-migration is built into `load_settings()` |
| Type validation | Manual checks | Pydantic models | Already used in webhooks.py |

**Key insight:** The settings infrastructure is complete. Adding a new setting requires only adding it to `DEFAULT_SETTINGS`.

## Common Pitfalls

### Pitfall 1: Adding language key without default value

**What goes wrong:** Settings without defaults cause KeyError when accessed.

**Why it happens:** Developer adds key to interface/type but forgets `DEFAULT_SETTINGS`.

**How to avoid:** Always add to `DEFAULT_SETTINGS` first - this is the single source of truth.

**Warning signs:** KeyError in logs, undefined in frontend console.

### Pitfall 2: Using locale codes (en-US) instead of language codes (en)

**What goes wrong:** Over-engineering for region variants when only language matters for voice.

**Why it happens:** Conflating UI localization (which needs regions) with voice language (which doesn't).

**How to avoid:** Use ISO 639-1 two-letter codes (en, fr) for this setting. Whisper, Piper, and Kokoro all use simple language codes.

**Warning signs:** Unnecessary complexity in voice mapping logic.

### Pitfall 3: Breaking existing settings.json files

**What goes wrong:** Existing installations fail to load settings after upgrade.

**Why it happens:** Changing settings structure in incompatible ways.

**How to avoid:**
- Only ADD new keys, never remove or rename existing ones
- Always provide defaults in `DEFAULT_SETTINGS`
- The `load_settings()` pattern handles missing keys automatically

**Warning signs:** Load failures in logs, settings reset to defaults unexpectedly.

### Pitfall 4: Duplicating DEFAULT_SETTINGS in frontend

**What goes wrong:** Frontend and backend have different default values.

**Why it happens:** Frontend defines its own `DEFAULT_SETTINGS` constant (settings-panel.tsx line 55).

**How to avoid:**
- Backend `DEFAULT_SETTINGS` is authoritative
- Frontend defaults are only fallback for failed API calls
- Keep them in sync when adding new settings

**Warning signs:** Different behavior when settings panel fails to load vs after save.

### Pitfall 5: Forgetting to update TypeScript interface

**What goes wrong:** TypeScript compiler doesn't know about new setting, no autocomplete.

**Why it happens:** Adding Python default but forgetting TypeScript interface.

**How to avoid:** Update both:
1. `src/caal/settings.py` - `DEFAULT_SETTINGS`
2. `frontend/components/settings/settings-panel.tsx` - `Settings` interface and `DEFAULT_SETTINGS`

**Warning signs:** TypeScript errors when accessing `settings.language`.

## Code Examples

### Adding Language Setting to Backend

```python
# Source: Pattern from /Users/mmaudet/work/CAAL/src/caal/settings.py lines 32-81

DEFAULT_SETTINGS = {
    # First-launch flag
    "first_launch_completed": False,
    # Agent identity
    "agent_name": "Cal",
    "prompt": "default",
    "wake_greetings": [...],

    # NEW: Global language setting
    "language": "en",  # ISO 639-1: "en" | "fr"

    # Provider settings
    "stt_provider": "speaches",
    # ... rest of settings
}
```

### Reading Language Setting

```python
# Using get_setting helper (settings.py lines 229-242)
from caal.settings import get_setting

language = get_setting("language", "en")  # Returns "en" if not set
```

### Frontend Type Update

```typescript
// Source: Pattern from /Users/mmaudet/work/CAAL/frontend/components/settings/settings-panel.tsx

interface Settings {
  agent_name: string;
  // ... existing fields

  // NEW: Language setting
  language: string;  // "en" | "fr"
}

const DEFAULT_SETTINGS: Settings = {
  agent_name: 'Cal',
  // ... existing defaults

  // NEW
  language: 'en',
};
```

### Mobile Type Update

```dart
// Source: Pattern from /Users/mmaudet/work/CAAL/mobile/lib/screens/settings_screen.dart

// Add to state fields (around line 36)
String _language = 'en';

// Add to settings map construction (around line 487)
final settings = {
  // ... existing fields
  'language': _language,
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded English | Configurable language setting | This phase | All components can read user's language preference |

**No deprecated patterns:** This is new functionality, not replacing existing i18n.

## Open Questions

1. **Should SetupCompleteRequest include language?**
   - What we know: Setup wizard sets initial provider/integration settings
   - What's unclear: Should first-launch wizard ask for language preference?
   - Recommendation: Add to Phase 1 scope - include language in setup flow for new users. Existing users get "en" default.

2. **Should wake_greetings be language-specific?**
   - What we know: wake_greetings array is currently hardcoded English phrases
   - What's unclear: Should there be `wake_greetings_fr` or dynamic lookup?
   - Recommendation: Defer to Phase 4 (Voice Pipeline) - greetings localization is voice UX, not infrastructure

## Sources

### Primary (HIGH confidence)

- `/Users/mmaudet/work/CAAL/src/caal/settings.py` - Full implementation of settings pattern
- `/Users/mmaudet/work/CAAL/src/caal/webhooks.py` - API endpoints for settings
- `/Users/mmaudet/work/CAAL/frontend/components/settings/settings-panel.tsx` - Frontend consumption pattern

### Secondary (MEDIUM confidence)

- `.planning/research/ARCHITECTURE.md` - Component boundaries and data flow
- `.planning/research/PITFALLS.md` - Backward compatibility warnings (Pitfall #3)

### Tertiary (LOW confidence)

None - all findings verified from codebase.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Direct codebase analysis
- Architecture: HIGH - Existing patterns documented from source
- Pitfalls: HIGH - Derived from actual code structure

**Research date:** 2026-01-25
**Valid until:** 60 days (stable infrastructure, no external dependencies)

---

## Implementation Checklist for Planner

Based on this research, Phase 1 tasks should include:

1. **settings.py** - Add `"language": "en"` to `DEFAULT_SETTINGS`
2. **webhooks.py** - Add `language` to `SetupCompleteRequest` model (optional field, defaults to "en")
3. **settings-panel.tsx** - Add `language: string` to `Settings` interface and `DEFAULT_SETTINGS`
4. **settings_screen.dart** - Add `_language` state field
5. **Verification** - Existing settings.json without `language` key still loads correctly
6. **Verification** - New installation gets `language: "en"` default
