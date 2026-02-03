"""CAAL Memory System.

Provides memory capabilities for the voice agent:
    - Short-term: Session/task context with TTL-based expiry
    - Long-term (future): Knowledge graph with semantic search

Example:
    >>> from caal.memory import ShortTermMemory
    >>> memory = ShortTermMemory()
    >>> memory.store("flight_number", "UA1234")
    >>> memory.get("flight_number")
    'UA1234'
"""

from .base import (
    DEFAULT_TTL_SECONDS,
    MEMORY_DIR,
    MemoryEntry,
    MemorySource,
    MemoryStore,
)
from .short_term import ShortTermMemory

__all__ = [
    # Classes
    "ShortTermMemory",
    # Types
    "MemoryEntry",
    "MemorySource",
    "MemoryStore",
    # Constants
    "DEFAULT_TTL_SECONDS",
    "MEMORY_DIR",
]
