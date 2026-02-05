# Phase 8: Backend Provider Foundation - Research

**Researched:** 2026-02-05
**Domain:** LLM Provider Integration (OpenAI-compatible and OpenRouter APIs)
**Confidence:** HIGH

## Summary

This phase implements two new LLM providers following the established `LLMProvider` abstract base class pattern. The existing codebase has `GroqProvider` and `OllamaProvider` implementations that demonstrate the exact architecture to follow.

Both new providers use the OpenAI Python library (`openai` 2.8.1, already installed) with `AsyncOpenAI` client. The key difference is:
- **OpenAI-compatible provider**: Custom `base_url` pointing to any OpenAI-compatible server (LiteLLM, vLLM, LocalAI, etc.)
- **OpenRouter provider**: Fixed `base_url="https://openrouter.ai/api/v1"` with additional headers for attribution

The OpenRouter API is fully OpenAI-compatible for chat completions, streaming, and tool calling. Both providers can share nearly identical implementation code, differing only in initialization and optional features (OpenRouter model discovery).

**Primary recommendation:** Implement `OpenAICompatibleProvider` first, then create `OpenRouterProvider` as a thin subclass that adds OpenRouter-specific headers and model discovery via the `/models` endpoint.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| openai | 2.8.1+ | AsyncOpenAI client for API calls | Already in dependencies, proven pattern with Groq |
| httpx | (via openai) | HTTP client for API requests | Bundled with openai library |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| json | stdlib | Parse tool call arguments | Always - arguments come as JSON strings |
| logging | stdlib | Debug and error logging | Always - follow GroqProvider pattern |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| openai library | Raw httpx | More control but reimplements wheel; openai handles SSE parsing |
| AsyncOpenAI | Sync OpenAI | Must be async to fit LLMProvider interface |

**Installation:**
```bash
# Already installed - no action needed
uv pip show openai  # Confirms 2.8.1 installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/caal/llm/providers/
├── __init__.py                    # Add exports and factory functions
├── base.py                        # LLMProvider ABC (unchanged)
├── groq_provider.py               # Existing reference implementation
├── ollama_provider.py             # Existing reference implementation
├── openai_compatible_provider.py  # NEW: OpenAI-compatible servers
└── openrouter_provider.py         # NEW: OpenRouter (subclasses above or standalone)
```

### Pattern 1: Provider Implementation
**What:** Follow GroqProvider's structure exactly
**When to use:** All new providers
**Example:**
```python
# Source: src/caal/llm/providers/groq_provider.py (existing pattern)
class OpenAICompatibleProvider(LLMProvider):
    """OpenAI-compatible LLM provider.

    Works with any server exposing OpenAI-compatible API:
    - LiteLLM proxy
    - vLLM
    - LocalAI
    - text-generation-inference
    - Any OpenAI API clone

    Args:
        model: Model name (server-specific)
        base_url: Server URL (e.g., "http://localhost:8000/v1")
        api_key: Optional API key (some servers require it)
        temperature: Sampling temperature (0.0-2.0)
        max_tokens: Maximum tokens to generate
    """

    def __init__(
        self,
        model: str,
        base_url: str,
        api_key: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> None:
        self._model = model
        self._base_url = base_url
        self._api_key = api_key or "not-needed"  # Some servers require non-empty
        self._temperature = temperature
        self._max_tokens = max_tokens

        self._client = AsyncOpenAI(
            base_url=base_url,
            api_key=self._api_key,
        )

        logger.debug(f"OpenAICompatibleProvider initialized: {model} @ {base_url}")
```

### Pattern 2: Streaming with tool_choice="none"
**What:** Prevent tool calls during streaming (text-only responses)
**When to use:** Always in `chat_stream()` when tools are in message history
**Example:**
```python
# Source: src/caal/llm/providers/groq_provider.py lines 164-171
# Set tool_choice="none" to prevent the model from making tool calls
# in streaming mode - streaming is used for text responses only.
# Without this, the model may generate tool call deltas instead of
# content deltas, producing zero text output and a silent session.
if tools:
    request_kwargs["tools"] = tools
    request_kwargs["tool_choice"] = "none"
```

### Pattern 3: Robust parse_tool_arguments
**What:** Handle both string JSON and dict arguments
**When to use:** Tool call response parsing
**Example:**
```python
# Source: src/caal/llm/providers/groq_provider.py lines 179-199
def parse_tool_arguments(self, arguments: Any) -> dict[str, Any]:
    """Parse tool arguments from JSON string.

    OpenAI-compatible APIs return tool call arguments as a JSON string.

    Args:
        arguments: JSON string or dict of arguments

    Returns:
        Parsed arguments dict
    """
    if isinstance(arguments, str):
        try:
            return json.loads(arguments)
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse tool arguments: {arguments}")
            return {}
    if isinstance(arguments, dict):
        return arguments
    return {}
```

### Pattern 4: Tool Result Format with name
**What:** Include `name` field in tool result messages
**When to use:** OpenAI API requires name field (like Groq)
**Example:**
```python
# Source: src/caal/llm/providers/groq_provider.py lines 201-224
def format_tool_result(
    self,
    content: str,
    tool_call_id: str | None,
    tool_name: str,
) -> dict[str, Any]:
    """Format tool result message.

    OpenAI API requires the tool name in addition to tool_call_id.
    """
    return {
        "role": "tool",
        "content": content,
        "tool_call_id": tool_call_id,
        "name": tool_name,  # Required by OpenAI API
    }
```

### Pattern 5: OpenRouter-specific Headers
**What:** Add attribution headers for OpenRouter API
**When to use:** OpenRouterProvider only
**Example:**
```python
# Source: https://openrouter.ai/docs/quickstart (verified)
self._client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=api_key,
    default_headers={
        "HTTP-Referer": "https://github.com/your-org/caal",  # Optional but recommended
        "X-Title": "CAAL Voice Assistant",  # Optional but recommended
    },
)
```

### Anti-Patterns to Avoid
- **Streaming tool calls:** Never try to accumulate tool call deltas in streaming mode - use `tool_choice="none"` to force text output during streaming
- **Empty API keys:** Some servers reject empty strings - use `"not-needed"` as placeholder
- **Missing name in tool results:** OpenAI API requires `name` field unlike Ollama

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSE parsing | Custom event stream parser | `AsyncOpenAI` stream iterator | Handles reconnection, chunking, errors |
| Tool call accumulation | Manual delta assembly | Non-streaming `chat()` for tool calls | Streaming tool calls are error-prone |
| JSON argument parsing | Custom parser | `json.loads()` with fallback | Standard, handles edge cases |
| HTTP client | Raw requests/httpx | `AsyncOpenAI` client | Handles auth, retries, base URL |

**Key insight:** The OpenAI Python library handles all the complexity of streaming, SSE parsing, and response normalization. Use `chat()` for tool calls, `chat_stream()` for text output only.

## Common Pitfalls

### Pitfall 1: Streaming Returns Empty Content
**What goes wrong:** Model returns tool call deltas instead of text
**Why it happens:** Tools are registered but `tool_choice` not set to "none"
**How to avoid:** Always set `tool_choice="none"` in `chat_stream()` when tools are in history
**Warning signs:** Silent agent, no TTS output, streaming yields nothing

### Pitfall 2: Tool Arguments as Wrong Type
**What goes wrong:** `arguments` field is string instead of dict (or vice versa)
**Why it happens:** Different providers return different formats
**How to avoid:** Always use `parse_tool_arguments()` which handles both
**Warning signs:** `TypeError` when accessing `arguments["key"]`, KeyError

### Pitfall 3: Missing tool_call_id
**What goes wrong:** API rejects tool result message
**Why it happens:** Forgot to pass through the original call ID
**How to avoid:** Always capture `tc.id` and pass to `format_tool_result()`
**Warning signs:** 400 errors mentioning missing or invalid tool_call_id

### Pitfall 4: OpenRouter API Key Not Set
**What goes wrong:** 401 Unauthorized errors
**Why it happens:** Unlike some OpenAI-compatible servers, OpenRouter always requires API key
**How to avoid:** Validate API key in `__init__`, raise clear error if missing
**Warning signs:** Authentication failures, 401 status codes

### Pitfall 5: Base URL Trailing Slash Issues
**What goes wrong:** 404 errors or double slashes in URL
**Why it happens:** Inconsistent base_url formatting
**How to avoid:** Strip trailing slash: `base_url = base_url.rstrip("/")`
**Warning signs:** 404 Not Found, malformed URLs in logs

## Code Examples

Verified patterns from official sources and existing codebase:

### AsyncOpenAI Initialization with Custom Base URL
```python
# Source: https://github.com/openai/openai-python (verified)
from openai import AsyncOpenAI

client = AsyncOpenAI(
    base_url="http://localhost:8000/v1",
    api_key="your-api-key",  # or "not-needed" for local servers
)
```

### Streaming Chat Completion
```python
# Source: https://github.com/openai/openai-cookbook (verified)
async def chat_stream(self, messages, tools=None, **kwargs):
    request_kwargs = {
        "model": self._model,
        "messages": messages,
        "temperature": self._temperature,
        "max_tokens": self._max_tokens,
        "stream": True,
    }

    if tools:
        request_kwargs["tools"] = tools
        request_kwargs["tool_choice"] = "none"

    stream = await self._client.chat.completions.create(**request_kwargs)

    async for chunk in stream:
        if chunk.choices and chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content
```

### Non-Streaming with Tool Calls
```python
# Source: src/caal/llm/providers/groq_provider.py (existing pattern)
async def chat(self, messages, tools=None, **kwargs):
    request_kwargs = {
        "model": self._model,
        "messages": messages,
        "temperature": self._temperature,
        "max_tokens": self._max_tokens,
        "stream": False,
    }

    if tools:
        request_kwargs["tools"] = tools
        request_kwargs["tool_choice"] = "auto"

    response = await self._client.chat.completions.create(**request_kwargs)

    message = response.choices[0].message
    tool_calls = []
    if message.tool_calls:
        for tc in message.tool_calls:
            args = self.parse_tool_arguments(tc.function.arguments)
            tool_calls.append(ToolCall(
                id=tc.id,
                name=tc.function.name,
                arguments=args,
            ))

    return LLMResponse(content=message.content, tool_calls=tool_calls)
```

### OpenRouter Models API
```python
# Source: https://openrouter.ai/docs/api/api-reference/models/get-models (verified)
import httpx

async def list_models(api_key: str) -> list[dict]:
    """Fetch available models from OpenRouter."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://openrouter.ai/api/v1/models",
            headers={"Authorization": f"Bearer {api_key}"},
        )
        response.raise_for_status()
        data = response.json()
        return data.get("data", [])

# Filter for models with tool support
models_with_tools = [
    m for m in models
    if "tools" in m.get("supported_parameters", [])
]
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| openai 0.x sync API | openai 1.x+ async API | 2023 | Must use AsyncOpenAI, new response structure |
| functions parameter | tools parameter | 2023 | Use `tools` not `functions` |
| Manual SSE parsing | Library handles streaming | 2023 | Use async for loop on stream |

**Deprecated/outdated:**
- `openai.ChatCompletion.create()`: Replaced by `client.chat.completions.create()`
- `functions` parameter: Replaced by `tools` parameter
- Sync `OpenAI()` in async contexts: Use `AsyncOpenAI()` instead

## Open Questions

Things that couldn't be fully resolved:

1. **OpenRouter streaming tool calls**
   - What we know: OpenRouter supports tool calling and streaming separately
   - What's unclear: Whether streaming + tool calls work together (docs don't show example)
   - Recommendation: Use same pattern as Groq - non-streaming for tool calls, streaming for text only

2. **Model-specific parameter compatibility**
   - What we know: Different models support different parameters (reasoning_effort, etc.)
   - What's unclear: Which OpenRouter models support which extra parameters
   - Recommendation: Start with standard parameters only, add model-specific handling later if needed

## Sources

### Primary (HIGH confidence)
- `src/caal/llm/providers/groq_provider.py` - Existing implementation pattern
- `src/caal/llm/providers/base.py` - LLMProvider interface definition
- [OpenRouter Quickstart](https://openrouter.ai/docs/quickstart) - Base URL, authentication
- [OpenRouter Tool Calling](https://openrouter.ai/docs/guides/features/tool-calling) - Tool format
- [OpenRouter Models API](https://openrouter.ai/docs/api/api-reference/models/get-models) - Model discovery

### Secondary (MEDIUM confidence)
- [OpenAI Python Library](https://github.com/openai/openai-python) - AsyncOpenAI usage
- [OpenAI Cookbook Streaming](https://github.com/openai/openai-cookbook/blob/main/examples/How_to_stream_completions.ipynb) - Streaming patterns
- [PyPI openai 2.17.0](https://pypi.org/project/openai/) - Current version info

### Tertiary (LOW confidence)
- Community discussions on streaming + tool calls - conflicting reports on edge cases

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - openai library already in use, patterns proven
- Architecture: HIGH - follows existing GroqProvider exactly
- Pitfalls: HIGH - derived from existing codebase fixes and official docs

**Research date:** 2026-02-05
**Valid until:** 2026-03-05 (stable domain, 30 days)
