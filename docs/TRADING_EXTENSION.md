# Trading Extension Documentation

Complete documentation for the Stock & Crypto Trading Extension.

## Overview

The Trading Extension enables users to trade stocks and cryptocurrencies directly from Dpro Bot using their Alpaca accounts. It supports both Paper Trading (demo mode with virtual money) and Live Trading (real money).

## Architecture

### Extension Type
- **Type**: `app` (full dashboard integration)
- **Location**: `packages/backend/extensions/trading/`
- **Frontend Route**: `/dashboard/trading`
- **Icon**: `TrendingUp` (lucide-react)

### Technology Stack
- **API Provider**: Alpaca Markets
- **SDK**: `@alpacahq/alpaca-trade-api` v3.1.3
- **Database**: SQLite (9 tables)
- **Encryption**: AES-256-GCM via CredentialManager
- **UI Framework**: React + Tailwind CSS
- **Real-time**: WebSocket (Alpaca data streams)

## File Structure

```
packages/backend/extensions/trading/
├── agentplayer.plugin.json       # Extension manifest
├── index.js                      # Entry point
├── README.md                     # Extension documentation
├── migrations/
│   └── 001_trading_tables.sql    # Database schema
└── src/
    ├── routes.js                 # 25 API routes
    ├── alpaca-client.js          # Alpaca API wrapper (14 functions)
    ├── portfolio-sync.js         # Background sync service
    ├── trading-bot.js            # Trading bot engine
    └── tool.js                   # AI trading tools
```

## Installation

### Prerequisites
1. Node.js 18+ and pnpm
2. Alpaca account (free at [alpaca.markets](https://alpaca.markets))
3. Dpro Bot backend running

### Enable Extension

1. Open `/dashboard/extensions`
2. Find "Trading" extension
3. Click "Enable"
4. Backend will auto-restart
5. Extension appears in sidebar as "Trading"

### Install Dependencies

The extension auto-installs dependencies:
```bash
@alpacahq/alpaca-trade-api@^3.1.3
```

If manual installation needed:
```bash
cd packages/backend
pnpm add @alpacahq/alpaca-trade-api
```

## Configuration

### Step 1: Get Alpaca API Keys

**Paper Trading** (Recommended for Testing):
1. Sign up at [alpaca.markets](https://alpaca.markets)
2. Go to Dashboard → API Keys (Paper)
3. Click "Generate New Key"
4. Copy API Key ID and Secret Key
5. Starting balance: $100,000 virtual USD

**Live Trading** (Real Money):
1. Complete KYC verification at Alpaca
2. Fund your account
3. Generate Live API keys
4. ⚠️ Use with caution - real money at risk

### Step 2: Connect Account

1. Navigate to `/dashboard/trading`
2. Click "Connect Account" button
3. Fill the form:
   ```
   Account Name: My Paper Account
   Mode: Paper Trading (or Live Trading)
   API Key: PKXXXXXXXXXXXXXXXX
   API Secret: xxxxxxxxxxxxxxxxx
   ```
4. Click "Connect"
5. Extension tests credentials with Alpaca
6. On success, account appears in dashboard

### Step 3: Verify Connection

Check if portfolio loads:
- Cash should show (e.g., $100,000.00)
- Portfolio Value displayed
- Buying Power shown (usually 2x cash)
- Equity calculated

## Usage Guide

### 1. Portfolio Overview

**What it shows**:
- 💵 **Cash**: Available funds for trading
- 📊 **Portfolio Value**: Total value (cash + holdings)
- 💰 **Buying Power**: Maximum you can buy (includes margin)
- 📈 **Equity**: Net account value

**How it updates**:
- Auto-syncs every 60 seconds during market hours
- Click "Sync" button for manual refresh
- Real-time updates via WebSocket (coming soon)

### 2. Positions Tab

**Shows your holdings**:
```
Symbol | Qty | Avg Price | Current | Market Value | P&L
AAPL   | 10  | $150.00   | $155.00 | $1,550.00    | +$50.00 (3.33%)
```

**Features**:
- Color-coded P&L (green = profit, red = loss)
- Click symbol to view details
- Sort by column (symbol, qty, P&L)

### 3. Trade Tab

**Place Orders**:

**Market Order** (immediate execution):
```
Symbol: AAPL
Quantity: 10
Side: Buy
Order Type: Market
→ Executes at current market price
```

**Limit Order** (price-specific):
```
Symbol: TSLA
Quantity: 5
Side: Sell
Order Type: Limit
Limit Price: $200.00
→ Only executes if price reaches $200
```

**Supported Assets**:
- **US Stocks**: AAPL, TSLA, MSFT, GOOGL, AMZN, etc.
- **Crypto**: BTC/USD, ETH/USD, DOGE/USD, etc.
- **ETFs**: SPY, QQQ, VOO, etc.

### 4. Orders Tab

**Order History**:
```
Time       | Symbol | Side | Qty | Type   | Status   | Price
10:30 AM   | AAPL   | Buy  | 10  | Market | Filled   | $155.00
11:15 AM   | TSLA   | Sell | 5   | Limit  | Pending  | $200.00
```

**Order Status**:
- ✅ **Filled**: Order completed
- ⏳ **Pending**: Waiting for execution
- ❌ **Cancelled**: Order cancelled
- ⚠️ **Rejected**: Order rejected by broker

**Actions**:
- Cancel pending orders
- View order details
- Filter by status

### 5. Strategies Tab

**Built-in Strategies**:

**1. Moving Average Crossover**
- Buy when 50-day MA crosses above 200-day MA
- Sell when 50-day MA crosses below 200-day MA
- Best for: Trend following

**2. RSI Trading**
- Buy when RSI < 30 (oversold)
- Sell when RSI > 70 (overbought)
- Best for: Mean reversion

**3. Breakout Strategy**
- Buy when price breaks above resistance
- Sell when price breaks below support
- Best for: Momentum trading

**4. AI-Powered Analysis**
- Claude analyzes technical indicators
- Recommends Buy/Sell/Hold
- Provides reasoning and risk assessment

**Create Custom Strategy**:
1. Click "Create Strategy"
2. Choose strategy type
3. Set parameters (e.g., RSI thresholds)
4. Define risk limits (max position, stop loss)
5. Click "Start" to enable

## AI Integration

### Chat Commands

Ask the AI agent:
```
"Buy 10 shares of Apple"
→ Places market order for AAPL

"Show my portfolio"
→ Displays cash, equity, buying power

"What's the price of Tesla?"
→ Gets real-time TSLA quote

"Sell all my Microsoft shares"
→ Closes MSFT position

"Analyze Bitcoin"
→ Technical analysis with recommendation
```

### AI Tools

**1. trading_execute**

Programmatic tool for trading operations:
```javascript
{
  "action": "place_order",
  "symbol": "AAPL",
  "qty": 10,
  "side": "buy",
  "order_type": "market"
}
```

**Available Actions**:
- `get_portfolio`
- `get_positions`
- `get_quote`
- `place_order`
- `get_orders`
- `cancel_order`

**2. trading_analyze**

Technical analysis tool:
```javascript
{
  "symbol": "TSLA",
  "timeframe": "1D"
}
```

**Returns**:
- Price and 24h change
- Support/resistance levels
- Technical indicators (RSI, MACD, Bollinger)
- Buy/Sell/Hold recommendation
- Risk score (0-100)

## API Reference

All endpoints require JWT authentication.

### Accounts

**GET /api/ext/trading/accounts**
- List user's connected accounts
- Returns: `{ accounts: [...] }`

**POST /api/ext/trading/accounts**
- Connect new trading account
- Body: `{ platform, account_name, account_mode, api_key, api_secret }`
- Returns: `{ success: true, account: {...} }`

**PUT /api/ext/trading/accounts/:id**
- Update account settings
- Body: `{ account_name?, is_default? }`

**DELETE /api/ext/trading/accounts/:id**
- Remove account and delete credentials

**POST /api/ext/trading/accounts/:id/activate**
- Set account as default

### Portfolio & Positions

**GET /api/ext/trading/portfolio**
- Get current portfolio snapshot
- Returns: `{ portfolio: { cash, equity, buying_power, ... } }`

**GET /api/ext/trading/positions**
- Get current holdings
- Returns: `{ positions: [...] }`

**POST /api/ext/trading/sync**
- Manually sync from Alpaca

### Orders

**GET /api/ext/trading/orders**
- Get order history
- Query: `?status=all|pending|filled&limit=50`
- Returns: `{ orders: [...] }`

**POST /api/ext/trading/orders**
- Place new order
- Body: `{ symbol, qty, side, order_type, limit_price? }`
- Returns: `{ success: true, order: {...} }`

**DELETE /api/ext/trading/orders/:id**
- Cancel pending order

### Market Data

**GET /api/ext/trading/quote/:symbol**
- Get real-time quote
- Returns: `{ symbol, price, change, changePercent, ... }`

**GET /api/ext/trading/bars/:symbol**
- Get historical bars
- Query: `?timeframe=1D&limit=30`

### Watchlist

**GET /api/ext/trading/watchlist**
- Get saved symbols

**POST /api/ext/trading/watchlist**
- Add symbol
- Body: `{ symbol, notes? }`

**DELETE /api/ext/trading/watchlist/:symbol**
- Remove symbol

### Strategies

**GET /api/ext/trading/strategies**
- List all strategies

**POST /api/ext/trading/strategies**
- Create new strategy
- Body: `{ name, strategy_type, config, risk_limits }`

**PUT /api/ext/trading/strategies/:id**
- Update strategy

**DELETE /api/ext/trading/strategies/:id**
- Delete strategy

**POST /api/ext/trading/strategies/:id/start**
- Start strategy execution

**POST /api/ext/trading/strategies/:id/stop**
- Stop strategy

### Signals

**GET /api/ext/trading/signals**
- Get pending signals
- Query: `?status=pending|executed|rejected`

**POST /api/ext/trading/signals/:id/execute**
- Execute trading signal

**POST /api/ext/trading/signals/:id/reject**
- Reject signal

### Activity

**GET /api/ext/trading/activity**
- Get audit log
- Query: `?action_type=&limit=100`

## Database Schema

### trading_accounts
```sql
id                      TEXT PRIMARY KEY
user_id                 TEXT NOT NULL
platform                TEXT NOT NULL  -- 'alpaca'
account_name            TEXT NOT NULL
account_mode            TEXT NOT NULL  -- 'paper' | 'live'
api_key_credential_id   TEXT NOT NULL  -- FK to credentials
api_secret_credential_id TEXT NOT NULL
is_active               INTEGER DEFAULT 1
is_default              INTEGER DEFAULT 0
alpaca_account_id       TEXT
account_status          TEXT  -- 'ACTIVE' | 'INACTIVE'
created_at              TEXT NOT NULL
updated_at              TEXT NOT NULL
```

### trading_portfolio_snapshots
```sql
id                  TEXT PRIMARY KEY
account_id          TEXT NOT NULL  -- FK to trading_accounts
cash                REAL NOT NULL
equity              REAL NOT NULL
buying_power        REAL NOT NULL
portfolio_value     REAL NOT NULL
unrealized_pl       REAL
realized_pl         REAL
snapshot_time       TEXT NOT NULL
```

### trading_positions
```sql
id                  TEXT PRIMARY KEY
account_id          TEXT NOT NULL
symbol              TEXT NOT NULL
asset_class         TEXT  -- 'us_equity' | 'crypto'
qty                 REAL NOT NULL
avg_entry_price     REAL NOT NULL
current_price       REAL NOT NULL
market_value        REAL NOT NULL
unrealized_pl       REAL
unrealized_plpc     REAL
side                TEXT  -- 'long' | 'short'
updated_at          TEXT NOT NULL
```

### trading_orders
```sql
id                  TEXT PRIMARY KEY
account_id          TEXT NOT NULL
symbol              TEXT NOT NULL
asset_class         TEXT
qty                 REAL NOT NULL
side                TEXT NOT NULL  -- 'buy' | 'sell'
order_type          TEXT NOT NULL  -- 'market' | 'limit'
limit_price         REAL
status              TEXT NOT NULL  -- 'pending' | 'filled' | 'cancelled'
filled_qty          REAL DEFAULT 0
filled_price        REAL
placed_by           TEXT  -- 'user' | 'agent' | agent_id
placed_at           TEXT NOT NULL
filled_at           TEXT
alpaca_order_id     TEXT
```

### trading_history
```sql
id                  TEXT PRIMARY KEY
account_id          TEXT NOT NULL
symbol              TEXT NOT NULL
asset_class         TEXT
entry_date          TEXT NOT NULL
exit_date           TEXT NOT NULL
entry_price         REAL NOT NULL
exit_price          REAL NOT NULL
qty                 REAL NOT NULL
realized_pl         REAL NOT NULL
strategy_id         TEXT  -- FK to trading_strategies
```

### trading_watchlist
```sql
id                  TEXT PRIMARY KEY
user_id             TEXT NOT NULL
symbol              TEXT NOT NULL
notes               TEXT
added_at            TEXT NOT NULL
```

### trading_strategies
```sql
id                  TEXT PRIMARY KEY
user_id             TEXT NOT NULL
name                TEXT NOT NULL
strategy_type       TEXT NOT NULL  -- 'ma_crossover' | 'rsi' | etc.
config              TEXT NOT NULL  -- JSON
risk_limits         TEXT  -- JSON
is_active           INTEGER DEFAULT 0
created_at          TEXT NOT NULL
updated_at          TEXT NOT NULL
```

### trading_signals
```sql
id                  TEXT PRIMARY KEY
strategy_id         TEXT NOT NULL
symbol              TEXT NOT NULL
signal_type         TEXT NOT NULL  -- 'buy' | 'sell' | 'hold'
confidence          REAL NOT NULL  -- 0-100
reasoning           TEXT
status              TEXT DEFAULT 'pending'  -- 'pending' | 'executed' | 'rejected'
signal_time         TEXT NOT NULL
executed_at         TEXT
```

### trading_activity_log
```sql
id                  TEXT PRIMARY KEY
user_id             TEXT NOT NULL
account_id          TEXT
action_type         TEXT NOT NULL  -- 'connect_account', 'place_order', etc.
details             TEXT  -- JSON
ip_address          TEXT
user_agent          TEXT
created_at          TEXT NOT NULL
```

## Security

### Credential Encryption

API keys are encrypted using AES-256-GCM:

1. **Storage**: Keys stored as credential IDs (references to encrypted credentials table)
2. **Encryption**: `CredentialManager.create({ userId, name, value, type })`
3. **Decryption**: `CredentialManager.getValue(credentialId)` (backend only)
4. **Deletion**: `CredentialManager.delete(credentialId)` (when account removed)

### Authentication

All routes require JWT token:
```javascript
headers: {
  'Authorization': `Bearer ${token}`
}
```

### User Isolation

All queries enforce user isolation:
```sql
WHERE user_id = ?
```

### Audit Logging

All trading operations logged to `trading_activity_log`:
- Account connections
- Order placements
- Strategy executions
- Signal generations

## Testing

### Test Scripts

Located in `packages/backend/scripts/`:
- `test-trading-extension.js` - Full integration test
- `test-alpaca-api.js` - API connectivity test

### Manual Testing Checklist

- [ ] Connect Paper Trading account
- [ ] Verify portfolio loads (cash, equity, buying power)
- [ ] Place market buy order (1 share)
- [ ] Verify order in Orders tab (status: filled)
- [ ] Verify position in Positions tab
- [ ] Place market sell order
- [ ] Verify position removed
- [ ] Test limit order + cancel
- [ ] Test invalid orders (qty=0, invalid symbol)
- [ ] Test AI tool: "Show my portfolio"

## Troubleshooting

### Portfolio not loading
- Check if account is set as default: `is_default = 1`
- Verify API keys are valid
- Check backend logs for errors

### Orders not executing
- Verify market is open (Mon-Fri, 9:30 AM - 4:00 PM ET)
- Check buying power is sufficient
- Ensure symbol is valid (e.g., AAPL not Apple)

### Connection errors
- Test API keys at alpaca.markets
- Check internet connection
- Verify Alpaca API status

### WebSocket issues
- Check firewall settings
- Ensure port 41522 is accessible
- Restart backend

## Future Enhancements

### Phase 2 (Optional)
- [ ] Stock charts (TradingView widget)
- [ ] Watchlist alerts (price targets)
- [ ] Advanced orders (bracket, trailing stop)
- [ ] Options trading (requires Alpaca approval)
- [ ] Backtesting framework
- [ ] Portfolio analytics (Sharpe ratio, volatility)
- [ ] Multi-broker support (IBKR, TD Ameritrade)

## Version History

**v1.0.0** (2026-02-26)
- Initial release
- Paper and Live trading support
- Stocks and crypto support
- AI trading tools
- 4 built-in strategies

## Support

For issues:
1. Check extension logs in backend console
2. Verify Alpaca API status
3. Review database schema for data integrity
4. Test with Paper Trading first

## License

Same as Dpro Bot project
