# Home Assistant Integration

CAAL integrates with Home Assistant via MCP (Model Context Protocol) using simplified wrapper tools that provide a consistent interface for voice control.

## Quick Start

1. Enable Home Assistant in the setup wizard or settings
2. Enter your Home Assistant URL (e.g., `http://homeassistant.local:8123`)
3. Add a Long-Lived Access Token from HA (Settings → Security → Long-lived access tokens)

## How It Works

CAAL connects to Home Assistant's MCP server but exposes only two simplified tools to the LLM:

| Wrapper Tool | Purpose |
|--------------|---------|
| `hass_control(action, target, value)` | Control devices |
| `hass_get_state(target)` | Get device status |

This simplification (from 15+ raw MCP tools to 2 wrapper tools) dramatically improves LLM tool-calling reliability.

### Automatic Prefix Detection

Different Home Assistant MCP implementations use different tool naming conventions:
- Official HA MCP: bare names like `HassTurnOn`
- Some community servers: prefixed names like `assist__HassTurnOn`

CAAL automatically detects which prefix your server uses at startup, so you don't need to configure anything.

### Domain-Aware Intent Mapping

CAAL caches device information from Home Assistant to provide intelligent intent mapping. For example:
- "open the garage door" → Uses `HassOpenCover` (not `HassTurnOn`) because it's a cover device
- "turn on the office lamp" → Uses `HassTurnOn` for lights/switches
- "set thermostat to 72" → Uses `HassClimateSetTemperature` for climate devices

This domain-aware approach significantly improves reliability for devices like garage doors, blinds, and thermostats.

## hass_control

Control Home Assistant devices with a simple action/target interface.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | string | Yes | The action to perform (see table below) |
| `target` | string | Yes | Device name (e.g., "office lamp", "garage door", "thermostat") |
| `value` | integer | No | Value for `set_volume`/`set_brightness` (0-100) or `set_temperature` (degrees) |

### Supported Actions

| Action | HASS MCP Tool | Description |
|--------|---------------|-------------|
| `turn_on` | HassTurnOn / HassOpenCover* | Turn on a device/switch (or open a cover) |
| `turn_off` | HassTurnOff / HassCloseCover* | Turn off a device/switch (or close a cover) |
| `open` | HassOpenCover | Open a cover (garage door, blinds, etc.) |
| `close` | HassCloseCover | Close a cover |
| `stop` | HassStopMoving | Stop a cover mid-motion |
| `toggle` | HassToggle | Toggle device state |
| `set_brightness` | HassLightSet | Set light brightness (requires `value` 0-100) |
| `set_temperature` | HassClimateSetTemperature | Set thermostat temperature (requires `value`) |
| `pause` | HassMediaPause | Pause media playback |
| `play` | HassMediaUnpause | Resume media playback |
| `next` | HassMediaNext | Skip to next track |
| `previous` | HassMediaPrevious | Go to previous track |
| `volume_up` | HassSetVolumeRelative | Increase volume |
| `volume_down` | HassSetVolumeRelative | Decrease volume |
| `set_volume` | HassSetVolume | Set volume to specific level (requires `value` 0-100) |
| `mute` | HassMediaPlayerMute | Mute audio |
| `unmute` | HassMediaPlayerUnmute | Unmute audio |

*Domain-aware: `turn_on`/`turn_off` automatically use cover intents for cover devices.

### Examples

```
"Turn on the office lamp"
→ hass_control(action="turn_on", target="office lamp")

"Open the garage door"
→ hass_control(action="open", target="garage door")

"Close the blinds"
→ hass_control(action="close", target="blinds")

"Set the thermostat to 72"
→ hass_control(action="set_temperature", target="thermostat", value=72)

"Set bedroom lights to 50 percent"
→ hass_control(action="set_brightness", target="bedroom lights", value=50)

"Pause the Apple TV"
→ hass_control(action="pause", target="apple tv")

"Set the soundbar volume to 30"
→ hass_control(action="set_volume", target="soundbar", value=30)

"Mute the living room speaker"
→ hass_control(action="mute", target="living room speaker")
```

## hass_get_state

Get the current state of Home Assistant devices.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `target` | string | No | Device name to filter (omit for all devices) |

### Examples

```
"What's the status of the garage door?"
→ hass_get_state(target="garage door")

"What devices are on?"
→ hass_get_state()
```

## Prompt Configuration

The default prompt (`prompt/default.md`) includes instructions for using these tools:

```markdown
# Home Control (hass_control)

Control devices with: `hass_control(action, target, value)`
- **action**: turn_on, turn_off, open, close, toggle, volume_up, volume_down, set_volume, mute, unmute, pause, play, next, previous, set_brightness, set_temperature, stop
- **target**: Device name like "office lamp", "garage door", or "thermostat"
- **value**: For set_volume/set_brightness (0-100), set_temperature (degrees)

Examples:
- "turn on the office lamp" → `hass_control(action="turn_on", target="office lamp")`
- "open the garage door" → `hass_control(action="open", target="garage door")`
- "set thermostat to 72" → `hass_control(action="set_temperature", target="thermostat", value=72)`
- "set apple tv volume to 50" → `hass_control(action="set_volume", target="apple tv", value=50)`

Act immediately - don't ask for confirmation. Confirm AFTER the action completes.
```

## Advanced: Raw MCP Tools

For power users who need full access to all 15 HASS MCP tools:

1. Add Home Assistant manually via `mcp_servers.json`:

```json
{
  "servers": [
    {
      "name": "hass_raw",
      "url": "http://homeassistant.local:8123/api/mcp",
      "token": "your-long-lived-token",
      "transport": "streamable_http"
    }
  ]
}
```

2. Create a custom prompt (`prompt/custom.md`) with instructions for the full tool set

Note: The wrapper tools will still be available alongside raw tools when using wizard-configured HASS.

## Troubleshooting

### "Home Assistant is not connected"

- Check that HASS URL is reachable from the CAAL container
- Verify the Long-Lived Access Token is valid
- Check HASS logs for MCP connection errors

### Device not found

- Device names must match exactly as shown in Home Assistant
- Use `hass_get_state()` to see available devices and their names
- Names are case-insensitive

### Action not working

- Ensure the device supports the action (e.g., lights don't support `pause`)
- Check Home Assistant for device-specific requirements
