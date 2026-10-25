---
name: weather
description: "Get weather forecast for any location worldwide using wttr.in"
metadata:
  agent-player:
    emoji: "🌤️"
    version: "1.0.0"
    author: "Dpro Bot Team"
    category: "utilities"
    tags: ["weather", "forecast", "wttr.in"]
    triggers:
      - weather
      - forecast
      - temperature
      - "what's the weather"
      - "how's the weather"
    settings:
      - key: units
        type: select
        label: "Temperature Units"
        default: metric
        options:
          - value: metric
            label: "Celsius (°C)"
          - value: imperial
            label: "Fahrenheit (°F)"
      - key: format
        type: select
        label: "Output Format"
        default: short
        options:
          - value: short
            label: "Short summary"
          - value: full
            label: "Full forecast"
      - key: default_location
        type: string
        label: "Default Location"
    requires:
      bins: ["curl"]
      apis: ["wttr.in"]
---

# Weather Skill

Get current weather and forecast for any location worldwide using wttr.in.

## Usage

Ask about weather naturally:

```
What's the weather in London?
Weather forecast for Tokyo
Temperature in New York
How's the weather in Dubai?
```

## API

Uses free [wttr.in](https://wttr.in) service:

```bash
# Short format
curl -s "wttr.in/London?format=1"
# Output: London: ⛅️ +18°C

# Full format
curl -s "wttr.in/London?format=3"
```

### Parameters

| Parameter | Description |
|-----------|-------------|
| `format=1` | One-line summary |
| `format=3` | Detailed with wind/visibility |
| `u` | Imperial units (Fahrenheit) |
| `m` | Metric units (Celsius) |
| `lang=ar` | Arabic language |

## Output Formats

### Short Format

```
London: ☀️ +22°C
```

### Full Format

```
London

      \  /       Partly cloudy
    _ /"".-.     18 °C
      \_(   ).   ↑ 15 km/h
      /(___(__)  10 km
                 0.0 mm
```

### 3-Day Forecast

```
┌─────────────┬─────────────┬─────────────┐
│   Today     │  Tomorrow   │   Day 3     │
├─────────────┼─────────────┼─────────────┤
│ ☀️ 22°C    │ ⛅ 20°C     │ 🌧️ 18°C    │
│ Wind: 10km │ Wind: 15km  │ Wind: 20km  │
└─────────────┴─────────────┴─────────────┘
```

## Examples

**User:** "What's the weather in Paris?"

**Response:**
```
🌤️ Weather in Paris

Paris: ☀️ +22°C
Wind: 12 km/h
Humidity: 55%
```

**User:** "3-day forecast for Tokyo"

**Response:**
```
🌤️ Tokyo Weather Forecast

Today: ☀️ Sunny, 25°C
Tomorrow: ⛅ Partly Cloudy, 23°C
Day 3: 🌧️ Light Rain, 20°C
```

## Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `units` | select | metric | Celsius or Fahrenheit |
| `format` | select | short | Short or full forecast |
| `default_location` | string | - | Your default city |

## Notes

- No API key required
- Works for any city worldwide
- Supports multiple languages
- No rate limiting (use responsibly)
- Requires `curl` command
