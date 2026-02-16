"""Chat API for text-in/text-out access to CAAL's LLM pipeline.

Provides HTTP endpoints that use the exact same llm_node() as the voice
path, enabling automated testing against the real CAAL stack.
"""

from .session import ChatSession, ChatSessionManager

__all__ = [
    "ChatSession",
    "ChatSessionManager",
]
