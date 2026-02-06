# Phase 9: Settings Schema Extension - Research

**Researched:** 2026-02-06
**Domain:** Python Settings Schema Management and URL Validation
**Confidence:** HIGH

## Summary

This phase extends the existing settings system to support the new LLM providers created in Phase 8. The work is straightforward because:

1. **Phase 8 already defined the settings keys** in `create_provider_from_settings()`:
   - `openai_api_key`, `openai_base_url`, `openai_model` (for `openai_compatible`)
   - `openrouter_api_key`, `openrouter_model` (for `openrouter`)

2. **The codebase has an established migration pattern** via `DEFAULT_SETTINGS` and `_migrate_env_to_settings()`:
   - New keys added to `DEFAULT_SETTINGS` are automatically available
   - Existing users get defaults merged with their saved settings
   - Keys not in `DEFAULT_SETTINGS` are filtered out on save

3. **URL validation should use `urllib.parse`** following existing patterns (`.rstrip("/")` seen throughout codebase). Python's stdlib `urlparse` doesn't validate, so a simple validation function is needed.

**Primary recommendation:** Add the five new keys to `DEFAULT_SETTINGS` with sensible defaults, add a `validate_url()` helper function, and the factory already works.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| json | stdlib | JSON serialization | Already used in settings.py |
| urllib.parse | stdlib | URL parsing for validation | Already available, no dependencies |
| logging | stdlib | Debug/error logging | Already used in settings.py |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| os | stdlib | Environment variable fallback | Already used in create_provider_from_settings |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| urllib.parse | pydantic | Pydantic adds dependency, overkill for simple URL check |
| Manual validation | validators library | Extra dependency for one function |

**Installation:**
```bash
# No installation needed - all stdlib
```

## Architecture Patterns

### Recommended Pattern: DEFAULT_SETTINGS Extension

**What:** Add new keys to the existing DEFAULT_SETTINGS dict in settings.py
**When to use:** Any new configuration that should persist across restarts
**Example:**
```python
# Source: src/caal/settings.py (existing pattern)
DEFAULT_SETTINGS = {
    # ... existing keys ...

    # OpenAI-compatible settings (Phase 9 additions)
    "openai_api_key": "",         # API key for authenticated servers
    "openai_base_url": "",        # Server URL (empty = not configured)
    "openai_model": "",           # Model name (empty = use server default)

    # OpenRouter settings (Phase 9 additions)
    "openrouter_api_key": "",     # OpenRouter API key (required for openrouter provider)
    "openrouter_model": "openai/gpt-4",  # Default model
}
```

### Pattern 1: URL Validation at Save Time
**What:** Validate URLs when settings are saved via webhook, not at load time
**When to use:** User-entered URLs that need format validation
**Example:**
```python
# Source: Derived from existing webhook patterns
from urllib.parse import urlparse

def validate_url(url: str) -> tuple[bool, str]:
    """Validate URL format.

    Args:
        url: URL to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    if not url:
        return True, ""  # Empty is valid (not configured)

    try:
        parsed = urlparse(url)
        if not parsed.scheme:
            return False, "URL must include scheme (http:// or https://)"
        if parsed.scheme not in ("http", "https"):
            return False, f"URL scheme must be http or https, got {parsed.scheme}"
        if not parsed.netloc:
            return False, "URL must include host"
        return True, ""
    except Exception as e:
        return False, f"Invalid URL format: {e}"
```

### Pattern 2: Webhook Validation Before Save
**What:** Validate settings in the webhook before calling save_settings()
**When to use:** Any user-supplied configuration that could be malformed
**Example:**
```python
# Source: src/caal/webhooks.py (existing update_settings pattern)
@app.post("/settings")
async def update_settings(req: SettingsUpdateRequest) -> SettingsResponse:
    # Validate URL settings if provided
    if "openai_base_url" in req.settings:
        is_valid, error = validate_url(req.settings["openai_base_url"])
        if not is_valid:
            raise HTTPException(status_code=400, detail=error)

    # ... rest of existing save logic ...
```

### Anti-Patterns to Avoid
- **Validating at load_settings():** Would crash existing installations with invalid data
- **Validating at provider creation time only:** Error happens too late, hard to surface to UI
- **Making base_url required in DEFAULT_SETTINGS:** Would force unconfigured users to provide a value
- **Schema version numbers in settings.json:** Overkill - DEFAULT_SETTINGS merge pattern handles migration

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL parsing | Regex patterns | urllib.parse.urlparse | Handles edge cases, RFC compliant |
| Settings migration | Version numbers + migrations | DEFAULT_SETTINGS merge | Already works, battle-tested in codebase |
| JSON schema validation | Manual field checks | DEFAULT_SETTINGS.keys() filtering | save_settings already filters unknown keys |

**Key insight:** The existing `load_settings()` function already handles migration perfectly. It loads defaults, then overlays user settings for known keys only. New keys get defaults automatically, removed keys are ignored.

## Common Pitfalls

### Pitfall 1: Non-Empty Default for base_url
**What goes wrong:** Users see "http://localhost:8000/v1" in UI even if they never configured OpenAI-compatible
**Why it happens:** Default value suggests something is configured when it isn't
**How to avoid:** Use empty string as default, treat empty as "not configured"
**Warning signs:** Confused users, failed connections to localhost

### Pitfall 2: Forgetting to Update llm_provider Options
**What goes wrong:** Frontend or validation doesn't recognize "openai_compatible" or "openrouter"
**Why it happens:** New providers added to factory but not to allowed values list
**How to avoid:** Search for "ollama.*groq" patterns in codebase, update all
**Warning signs:** 400 errors when selecting new providers

### Pitfall 3: URL Without Trailing Slash Normalization
**What goes wrong:** Double slashes in URL paths, 404 errors
**Why it happens:** User enters "http://localhost:8000/v1/", provider appends "/chat/completions"
**How to avoid:** Already handled - OpenAICompatibleProvider does `base_url.rstrip("/")`
**Warning signs:** 404 errors, malformed URLs in logs

### Pitfall 4: OpenRouter API Key Left Empty
**What goes wrong:** Provider creation fails at runtime, no clear error to user
**Why it happens:** User selects openrouter provider but forgets to enter API key
**How to avoid:** Validation in webhook OR clear error message in factory (already there)
**Warning signs:** Runtime ValueError about missing API key

### Pitfall 5: STT Provider Coupling for New Providers
**What goes wrong:** STT provider set incorrectly for new LLM providers
**Why it happens:** Existing webhook has STT/LLM coupling logic for Ollama/Groq only
**How to avoid:** Extend coupling logic to handle openai_compatible and openrouter
**Warning signs:** Wrong STT selected, or coupling breaks

## Code Examples

### Adding Keys to DEFAULT_SETTINGS
```python
# Source: src/caal/settings.py (extend existing dict)
DEFAULT_SETTINGS = {
    # ... existing keys through line 76 ...

    # OpenAI-compatible settings (any OpenAI-compatible server)
    "openai_api_key": "",         # Optional API key
    "openai_base_url": "",        # Required: server URL (e.g., http://localhost:8000/v1)
    "openai_model": "",           # Required: model name (e.g., "mistral", "gpt-3.5-turbo")

    # OpenRouter settings (cloud API)
    "openrouter_api_key": "",     # Required: OpenRouter API key
    "openrouter_model": "openai/gpt-4",  # Default to popular model
}
```

### URL Validation Function
```python
# Source: Derived from urllib.parse docs + codebase patterns
from urllib.parse import urlparse

def validate_url(url: str, require_scheme: bool = True) -> tuple[bool, str]:
    """Validate URL format for settings.

    Args:
        url: URL string to validate
        require_scheme: If True, URL must have http/https scheme

    Returns:
        Tuple of (is_valid, error_message). Empty error_message if valid.
    """
    if not url or not url.strip():
        return True, ""  # Empty is valid (not configured)

    url = url.strip()

    try:
        parsed = urlparse(url)
    except Exception as e:
        return False, f"Could not parse URL: {e}"

    if require_scheme:
        if not parsed.scheme:
            return False, "URL must include scheme (http:// or https://)"
        if parsed.scheme.lower() not in ("http", "https"):
            return False, f"URL scheme must be http or https, got '{parsed.scheme}'"

    if not parsed.netloc:
        return False, "URL must include host (e.g., localhost:8000)"

    return True, ""
```

### Factory Already Works (Phase 8)
```python
# Source: src/caal/llm/providers/__init__.py (already implemented)
elif provider_name == "openai_compatible":
    api_key = settings.get("openai_api_key") or os.environ.get("OPENAI_API_KEY")
    return OpenAICompatibleProvider(
        model=settings.get("openai_model", "gpt-3.5-turbo"),
        base_url=settings.get("openai_base_url", "http://localhost:8000/v1"),
        api_key=api_key,
        temperature=settings.get("temperature", 0.7),
    )
```

### Webhook Validation Extension
```python
# Source: src/caal/webhooks.py (extend update_settings)
@app.post("/settings", response_model=SettingsResponse)
async def update_settings(req: SettingsUpdateRequest) -> SettingsResponse:
    # Validate URL settings if provided
    url_fields = ["openai_base_url", "ollama_host", "hass_host", "n8n_url"]
    for field in url_fields:
        if field in req.settings and req.settings[field]:
            is_valid, error = validate_url(req.settings[field])
            if not is_valid:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid {field}: {error}"
                )

    # ... existing logic ...
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Schema versioning | DEFAULT_SETTINGS merge | Established in codebase | No version tracking needed |
| Pydantic validation | Simple urllib.parse | N/A | Lighter weight, no dependencies |

**Deprecated/outdated:**
- Schema migration frameworks: Overkill for simple key-value settings

## Open Questions

1. **STT Provider Coupling for New Providers**
   - What we know: Existing webhook couples STT to LLM (Ollama->Speaches, Groq->Groq)
   - What's unclear: Should openai_compatible/openrouter use Speaches or Groq STT?
   - Recommendation: Default to Speaches for openai_compatible (local assumption), Groq for openrouter (cloud assumption). Allow user override.

2. **Empty vs Fallback Defaults for model fields**
   - What we know: Factory has fallback defaults ("gpt-3.5-turbo", "openai/gpt-4")
   - What's unclear: Should DEFAULT_SETTINGS have same fallbacks or empty strings?
   - Recommendation: Use empty strings in DEFAULT_SETTINGS to indicate "not configured", let factory apply fallbacks only when actually creating provider. This way UI shows empty field until user configures.

## Sources

### Primary (HIGH confidence)
- `src/caal/settings.py` - Existing settings implementation with DEFAULT_SETTINGS pattern
- `src/caal/llm/providers/__init__.py` - Factory function with exact key names
- [Python urllib.parse documentation](https://docs.python.org/3/library/urllib.parse.html) - URL parsing functions
- `src/caal/webhooks.py` - Existing validation patterns in update_settings

### Secondary (MEDIUM confidence)
- [Pydantic URL Types](https://docs.pydantic.dev/2.2/usage/types/urls/) - Alternative approach (not used)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All stdlib, patterns already in codebase
- Architecture: HIGH - Follows existing DEFAULT_SETTINGS pattern exactly
- Pitfalls: HIGH - Derived from codebase analysis and existing migration code

**Research date:** 2026-02-06
**Valid until:** 2026-03-06 (stable domain, 30 days)
