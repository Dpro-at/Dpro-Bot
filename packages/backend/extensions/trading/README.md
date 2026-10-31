# Trading Extension

Stock & Crypto trading integration with Alpaca API for Girru.

## Features

- **Paper Trading** (Demo) and **Live Trading** (Real Money)
- Support for **Stocks** and **Cryptocurrencies**
- Real-time portfolio sync via WebSocket
- AI-powered trading tools and strategies
- Multi-account support

## Installation

The extension auto-installs when enabled in `/dashboard/extensions`.

**Dependencies**: None. The Alpaca connection is Girru's own (`src/alpaca-rest.js`, built-in fetch and WebSocket).

## Configuration

### 1. Get Alpaca API Keys

1. Sign up at [alpaca.markets](https://alpaca.markets)
2. Generate API keys (Paper or Live)
3. Copy API Key and API Secret

### 2. Connect Account

1. Open `/dashboard/trading`
2. Click "Connect Account"
3. Fill in:
   - Account Name: Any name you want
   - Mode: Paper Trading or Live Trading
   - API Key: Your Alpaca API Key
   - API Secret: Your Alpaca API Secret
4. Click "Connect"

## Usage

### Portfolio Overview

View your account balance:
- **Cash**: Available funds
- **Portfolio Value**: Total value (cash + positions)
- **Buying Power**: Maximum buying capacity (includes leverage)
- **Equity**: Net worth

### Trading

**Manual Trading**:
1. Go to "Trade" tab
2. Enter stock symbol (e.g., AAPL, TSLA, BTC/USD)
3. Choose quantity and order type (Market/Limit)
4. Click Buy or Sell

**AI Trading**:
Use the `trading_execute` tool in chat:
```
Buy 10 shares of Apple
Show my portfolio
Sell all Tesla positions
```

### Strategies

The extension includes 4 built-in strategies:
1. **Moving Average Crossover**: Buy when short MA crosses above long MA
2. **RSI Trading**: Buy oversold, sell overbought
3. **Breakout Strategy**: Trade on resistance breakouts
4. **AI-Powered Analysis**: Claude analyzes market data

## API Endpoints

All routes under `/api/ext/trading/`:

**Accounts**:
- `GET /accounts` - List user's accounts
- `POST /accounts` - Connect new account
- `PUT /accounts/:id` - Update account
- `DELETE /accounts/:id` - Remove account
- `POST /accounts/:id/activate` - Set as active

**Portfolio**:
- `GET /portfolio` - Get current portfolio
- `GET /positions` - Get holdings
- `POST /sync` - Manually sync from Alpaca

**Orders**:
- `GET /orders` - Get order history
- `POST /orders` - Place new order
- `DELETE /orders/:id` - Cancel pending order

**Market Data**:
- `GET /quote/:symbol` - Get real-time quote
- `GET /bars/:symbol` - Get historical data

**Watchlist**:
- `GET /watchlist` - Get saved symbols
- `POST /watchlist` - Add symbol
- `DELETE /watchlist/:symbol` - Remove

**Strategies**:
- `GET /strategies` - List all strategies
- `POST /strategies` - Create new strategy
- `PUT /strategies/:id` - Update strategy
- `DELETE /strategies/:id` - Delete strategy
- `POST /strategies/:id/start` - Start strategy
- `POST /strategies/:id/stop` - Stop strategy

**Signals**:
- `GET /signals` - Get trading signals
- `POST /signals/:id/execute` - Execute signal
- `POST /signals/:id/reject` - Reject signal

**Activity**:
- `GET /activity` - Get trading activity log

## AI Tools

### 1. `trading_execute`

Execute trading operations:

**Actions**:
- `get_portfolio` - View account balance
- `get_positions` - List holdings
- `get_quote` - Get stock price
- `place_order` - Buy/sell stocks
- `get_orders` - View order history
- `cancel_order` - Cancel pending order

**Example**:
```json
{
  "action": "place_order",
  "symbol": "AAPL",
  "qty": 10,
  "side": "buy",
  "order_type": "market"
}
```

### 2. `trading_analyze`

AI-powered technical analysis:

**Returns**:
- Current price and 24h change
- Support/resistance levels
- RSI, MACD, Bollinger Bands
- Trading recommendation (Buy/Sell/Hold)
- Risk assessment

## Database Schema

**9 Tables**:
1. `trading_accounts` - Connected accounts
2. `trading_portfolio_snapshots` - Historical portfolio
3. `trading_positions` - Current holdings
4. `trading_orders` - Order history
5. `trading_history` - Completed trades
6. `trading_watchlist` - Favorite symbols
7. `trading_strategies` - Saved strategies
8. `trading_signals` - AI signals
9. `trading_activity_log` - Audit trail

## Security

- API keys encrypted with AES-256-GCM
- Keys stored as credential IDs (never plaintext)
- Decrypted keys NEVER sent to frontend
- All routes JWT-authenticated
- User isolation enforced (WHERE user_id = ?)
- Audit logging for all operations

## Warnings

⚠️ **Risk Disclosure**:
- Trading involves risk of loss
- Only trade with money you can afford to lose
- This is not financial advice
- Past performance doesn't guarantee future results

## Support

For issues, check:
1. API keys are valid (test at alpaca.markets)
2. Account is active (status = ACTIVE)
3. Market is open (stocks trade 9:30 AM - 4:00 PM ET, Mon-Fri)
4. Backend logs: `packages/backend/` console

## Version

Current version: **1.0.0**

---

## 🚀 TODO: UI/UX Enhancements

### Phase 1: Essential Features (Priority: HIGH)

**Trade Tab Improvements**:
- [ ] **Stock Search with Autocomplete**
  - Search bar at top of page
  - Autocomplete suggestions (top 100 stocks)
  - Recent searches history
  - Click symbol → auto-fills Trade form

- [ ] **Live Price Display**
  - Real-time current price
  - Bid/Ask prices
  - Last update timestamp
  - Price change (+/- $) and percentage
  - Auto-refresh every 5 seconds

- [ ] **Order Cost Calculator**
  - Estimated Cost display
  - Buying Power check
  - Available cash warning
  - Commission fees (if any)

- [ ] **Time in Force Options**
  - DAY (expires end of day)
  - GTC (Good Till Cancelled)
  - IOC (Immediate or Cancel)
  - FOK (Fill or Kill)

- [ ] **Order Preview Dialog**
  - Confirm before submit
  - Show: Symbol, Qty, Side, Type, Est. Cost
  - Warning for large orders
  - "Are you sure?" confirmation

**Positions Tab Improvements**:
- [ ] **Enhanced Table**
  - Cost Basis column
  - Today's P/L (separate from Total P/L)
  - Market Value with live updates
  - Quick Action buttons (Sell 25%, 50%, 100%)

- [ ] **Position Details Modal**
  - Click position → open details
  - Show: Entry date, avg price, current P/L
  - Mini chart of price movement
  - Quick sell form

### Phase 2: Advanced Features (Priority: MEDIUM)

**Charts Integration**:
- [ ] **TradingView Widget**
  - Embed TradingView chart in Trade tab
  - Timeframes: 1m, 5m, 15m, 1h, 1d, 1w
  - Technical indicators (MA, RSI, MACD)
  - Drawing tools (trendlines, support/resistance)

- [ ] **Mini Charts in Positions**
  - Small sparkline charts for each position
  - Show 24h price movement
  - Hover for details

**Advanced Order Types**:
- [ ] **Bracket Orders**
  - Set stop loss and take profit simultaneously
  - Auto-exit on profit or loss targets

- [ ] **Trailing Stop**
  - Stop loss that follows price
  - Configurable trail amount ($) or (%)

- [ ] **OCO Orders** (One-Cancels-Other)
  - Place two orders, if one executes, cancel other

**Market Data**:
- [ ] **Level 2 Data** (if Alpaca supports)
  - Order book depth
  - Bid/Ask volume
  - Market maker info

- [ ] **News Feed**
  - Real-time stock news
  - Earnings announcements
  - SEC filings

### Phase 3: Professional Features (Priority: LOW)

**Portfolio Analytics**:
- [ ] **Performance Charts**
  - Portfolio value over time
  - Profit/Loss graph
  - Benchmark comparison (vs SPY)

- [ ] **Risk Metrics**
  - Sharpe Ratio
  - Beta (volatility)
  - Max Drawdown
  - Win Rate percentage

**Options Trading** (requires Alpaca approval):
- [ ] Options chain display
- [ ] Call/Put orders
- [ ] Greeks calculator
- [ ] Strategy builder (spreads, straddles)

**Backtesting**:
- [ ] Historical strategy testing
- [ ] Performance simulation
- [ ] Risk analysis
- [ ] Optimization suggestions

**Social Trading**:
- [ ] Share trades with team
- [ ] Copy trading (follow other users)
- [ ] Leaderboard
- [ ] Trade ideas feed

---

## 📋 Implementation Checklist

### This Week (Priority 1)
```
[ ] Stock Search autocomplete
[ ] Live price display with auto-refresh
[ ] Order cost calculator
[ ] Time in Force dropdown
[ ] Order preview confirmation dialog
```

### Next Week (Priority 2)
```
[ ] TradingView chart widget
[ ] Enhanced Positions table
[ ] Position details modal
[ ] Quick action buttons (Sell %, Sell All)
```

### Future (Priority 3)
```
[ ] Portfolio analytics dashboard
[ ] Advanced order types (Bracket, Trailing)
[ ] Options trading support
[ ] Backtesting framework
```

---

## 🎨 Design References

**Inspiration**:
- Alpaca Web Interface (clean, professional)
- Robinhood (simple, mobile-first)
- TradingView (powerful charts)
- Webull (feature-rich)

**UI Principles**:
- Clean and minimal design
- Real-time data updates
- Mobile-responsive
- Accessibility (WCAG 2.1)
- Fast performance (<100ms interactions)

---

## License

Same as Girru project
