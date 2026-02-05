# Requirements: CAAL v1.2

**Defined:** 2025-02-05
**Core Value:** Users can have natural voice conversations with an AI assistant using their preferred LLM provider

## v1.2 Requirements

Requirements for milestone v1.2 — Additional LLM Providers.

### OpenAI-Compatible Provider

- [ ] **OPENAI-01**: User can configure custom base URL for OpenAI-compatible servers
- [ ] **OPENAI-02**: User can optionally provide API key for authenticated servers
- [ ] **OPENAI-03**: Agent streams responses from OpenAI-compatible provider
- [ ] **OPENAI-04**: Agent executes tool calls with OpenAI-compatible provider
- [ ] **OPENAI-05**: User can test connection before saving settings
- [ ] **OPENAI-06**: System discovers available models via /v1/models endpoint
- [ ] **OPENAI-07**: User can manually enter model name when discovery unavailable

### OpenRouter Provider

- [ ] **OPENROUTER-01**: User can configure OpenRouter API key
- [ ] **OPENROUTER-02**: System fetches available models from OpenRouter API
- [ ] **OPENROUTER-03**: User can search/filter models in selection dropdown
- [ ] **OPENROUTER-04**: Agent streams responses from OpenRouter
- [ ] **OPENROUTER-05**: Agent executes tool calls with OpenRouter
- [ ] **OPENROUTER-06**: User can test connection before saving settings

### Frontend - Settings Panel

- [ ] **UI-01**: Settings panel shows OpenAI-compatible provider option
- [ ] **UI-02**: Settings panel shows OpenRouter provider option
- [ ] **UI-03**: OpenAI-compatible settings include base URL, API key, model fields
- [ ] **UI-04**: OpenRouter settings include API key and model selection
- [ ] **UI-05**: Model dropdown supports search for OpenRouter (400+ models)

### Frontend - Setup Wizard

- [ ] **WIZARD-01**: Setup wizard includes OpenAI-compatible provider choice
- [ ] **WIZARD-02**: Setup wizard includes OpenRouter provider choice
- [ ] **WIZARD-03**: Setup wizard tests connection before proceeding

## Future Requirements

Deferred to later milestones.

### OpenRouter Enhanced

- **OPENROUTER-FUTURE-01**: Display per-token pricing for models
- **OPENROUTER-FUTURE-02**: Show provider routing information
- **OPENROUTER-FUTURE-03**: Automatic fallback configuration

## Out of Scope

Explicitly excluded from this milestone.

| Feature | Reason |
|---------|--------|
| Pricing display | Complexity, not essential for MVP |
| Provider routing info | Nice-to-have, not core functionality |
| Auto-fallback | Complex feature, defer to future |
| Hot-swap providers | Requires agent restart by design |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| OPENAI-01 | TBD | Pending |
| OPENAI-02 | TBD | Pending |
| OPENAI-03 | TBD | Pending |
| OPENAI-04 | TBD | Pending |
| OPENAI-05 | TBD | Pending |
| OPENAI-06 | TBD | Pending |
| OPENAI-07 | TBD | Pending |
| OPENROUTER-01 | TBD | Pending |
| OPENROUTER-02 | TBD | Pending |
| OPENROUTER-03 | TBD | Pending |
| OPENROUTER-04 | TBD | Pending |
| OPENROUTER-05 | TBD | Pending |
| OPENROUTER-06 | TBD | Pending |
| UI-01 | TBD | Pending |
| UI-02 | TBD | Pending |
| UI-03 | TBD | Pending |
| UI-04 | TBD | Pending |
| UI-05 | TBD | Pending |
| WIZARD-01 | TBD | Pending |
| WIZARD-02 | TBD | Pending |
| WIZARD-03 | TBD | Pending |

**Coverage:**
- v1.2 requirements: 21 total
- Mapped to phases: 0
- Unmapped: 21 (pending roadmap)

---
*Requirements defined: 2025-02-05*
*Last updated: 2025-02-05 after initial definition*
