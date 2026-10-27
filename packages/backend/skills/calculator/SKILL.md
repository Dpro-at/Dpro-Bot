---
name: calculator
description: "Perform mathematical calculations, unit conversions, and solve math problems"
metadata:
  agent-player:
    emoji: "🧮"
    version: "1.0.0"
    author: "Dpro"
    category: "utilities"
    tags: ["math", "calculator", "conversion"]
    triggers:
      - calculate
      - compute
      - math
      - convert
      - "how much is"
      - "what is"
    settings:
      - key: decimal_places
        type: number
        label: "Decimal Places"
        default: 2
        validation: { min: 0, max: 10 }
      - key: show_steps
        type: boolean
        label: "Show Calculation Steps"
        default: false
    requires:
      libs: ["mathjs"]
      apis: ["exchangerate-api.com"]
---

# Calculator Skill

Perform mathematical calculations, conversions, and solve math problems.

## Usage

Ask math questions naturally:

```
Calculate 15% of 200
What is 25 * 4 + 10?
Convert 100 USD to EUR
Square root of 144
How much is 5 miles in kilometers?
```

## Supported Operations

### Basic Math

| Operation | Syntax | Example |
|-----------|--------|---------|
| Addition | `a + b` | `2 + 3` → 5 |
| Subtraction | `a - b` | `10 - 5` → 5 |
| Multiplication | `a * b` | `4 * 6` → 24 |
| Division | `a / b` | `20 / 4` → 5 |
| Power | `a ^ b` | `2 ^ 8` → 256 |
| Modulo | `a % b` | `17 % 5` → 2 |

### Advanced Math

```bash
sqrt(144)      # Square root → 12
pow(2, 10)     # Power → 1024
log(100)       # Logarithm → 2
sin(45)        # Sine
cos(90)        # Cosine
tan(30)        # Tangent
pi             # 3.14159...
e              # 2.71828...
```

### Percentages

```bash
15% of 200     # → 30
200 + 15%      # → 230
200 - 10%      # → 180
```

### Unit Conversions

**Length:**
```bash
5 miles to km      # → 8.05 km
10 feet to meters  # → 3.05 m
```

**Weight:**
```bash
10 pounds to kg    # → 4.54 kg
100 grams to oz    # → 3.53 oz
```

**Temperature:**
```bash
100 fahrenheit to celsius  # → 37.78°C
25 celsius to fahrenheit   # → 77°F
```

**Currency** (live rates):
```bash
100 USD to EUR    # → ~92.50 EUR
50 GBP to JPY     # → ~9,500 JPY
```

## Examples

**User:** "Calculate 15% of 200"

**Response:**
```
🧮 Calculation: 15% of 200

Result: 30

Breakdown:
200 × 0.15 = 30
```

**User:** "Convert 5 miles to kilometers"

**Response:**
```
📏 Unit Conversion

5 miles = 8.05 kilometers

Formula: 1 mile = 1.609344 km
```

## Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `decimal_places` | number | 2 | Precision (0-10 decimals) |
| `show_steps` | boolean | false | Show calculation steps |

## Security

Uses `mathjs` library for safe expression evaluation. No `eval()` or code injection possible.
