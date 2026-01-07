"""MCP Server Configuration Loader

Loads MCP server definitions from settings, environment variables, and optional JSON config file.
Settings take priority, then env vars, then JSON file.
"""

import json
import logging
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal

from livekit.agents import mcp

logger = logging.getLogger(__name__)


@dataclass
class MCPServerConfig:
    """Configuration for a single MCP server."""
    name: str
    url: str
    auth_token: str | None = None
    transport: Literal["sse", "streamable_http"] | None = None
    timeout: float = 10.0


def load_mcp_config(settings: dict[str, Any] | None = None) -> list[MCPServerConfig]:
    """Load MCP server configurations from settings, env vars, and optional JSON file.

    Priority order:
    1. Settings (from frontend/settings.json)
    2. Environment variables
    3. JSON config file (mcp_servers.json)

    Args:
        settings: Optional settings dict. If not provided, attempts to load from settings module.

    Environment variables (fallback):
        N8N_MCP_URL: n8n MCP server URL
        N8N_MCP_TOKEN: Bearer token for n8n (optional)
        N8N_MCP_TIMEOUT: Request timeout in seconds (optional, default 10.0)

    JSON file (mcp_servers.json):
        {
            "servers": [
                {
                    "name": "server_name",
                    "url": "http://...",
                    "token": "optional_token",
                    "transport": "sse" | "streamable_http",
                    "timeout": 10.0
                }
            ]
        }

    Returns:
        List of MCPServerConfig objects
    """
    servers = []

    # Try to load settings if not provided
    if settings is None:
        try:
            from .. import settings as settings_module
            settings = settings_module.load_settings()
        except Exception:
            settings = {}

    # 1. n8n MCP Server - settings first, then env vars
    n8n_enabled = settings.get("n8n_enabled", False)
    n8n_url = settings.get("n8n_url") if n8n_enabled else None
    n8n_token = settings.get("n8n_token") if n8n_enabled else None

    # Fall back to env vars if settings not configured
    if not n8n_url:
        n8n_url = os.environ.get("N8N_MCP_URL")
        n8n_token = os.environ.get("N8N_MCP_TOKEN")

    if n8n_url:
        servers.append(MCPServerConfig(
            name="n8n",
            url=n8n_url,
            auth_token=n8n_token,
            transport="streamable_http",  # n8n uses /http suffix which needs explicit transport
            timeout=float(os.environ.get("N8N_MCP_TIMEOUT", "10.0")),
        ))
        logger.debug(f"Loaded MCP server config: n8n ({n8n_url})")
    else:
        logger.info("n8n not configured - n8n MCP tools will not be available")

    # 2. Additional MCP servers from JSON config (optional)
    config_path = Path("mcp_servers.json")
    if config_path.exists():
        try:
            with open(config_path) as f:
                data = json.load(f)
                for server in data.get("servers", []):
                    name = server.get("name")
                    url = server.get("url")
                    if not name or not url:
                        logger.warning(f"Skipping MCP server with missing name or url: {server}")
                        continue

                    servers.append(MCPServerConfig(
                        name=name,
                        url=url,
                        auth_token=server.get("token"),
                        transport=server.get("transport"),
                        timeout=server.get("timeout", 10.0),
                    ))
                    logger.debug(f"Loaded MCP server config from JSON: {name} ({url})")
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse mcp_servers.json: {e}")
        except Exception as e:
            logger.error(f"Failed to load mcp_servers.json: {e}")

    if not servers:
        logger.warning("No MCP servers configured - no MCP tools will be available")

    return servers


async def initialize_mcp_servers(
    configs: list[MCPServerConfig]
) -> dict[str, mcp.MCPServerHTTP]:
    """Initialize MCP servers from config list.

    Args:
        configs: List of MCPServerConfig objects

    Returns:
        Dict mapping server name to initialized MCPServerHTTP instance
    """
    servers = {}

    for config in configs:
        try:
            headers = {}
            if config.auth_token:
                headers["Authorization"] = f"Bearer {config.auth_token}"

            server = mcp.MCPServerHTTP(
                url=config.url,
                headers=headers if headers else None,
                timeout=config.timeout,
            )

            # Set transport type if specified
            # Newer LiveKit versions use transport_type param, older use private attr
            if config.transport == "streamable_http":
                server._use_streamable_http = True
            elif config.transport == "sse":
                server._use_streamable_http = False
            # If transport not specified, let LiveKit auto-detect from URL

            await server.initialize()
            servers[config.name] = server
            logger.info(f"Initialized MCP server: {config.name}")

        except Exception as e:
            logger.error(f"Failed to initialize MCP server {config.name}: {e}", exc_info=True)

    return servers
