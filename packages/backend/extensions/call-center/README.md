# Call Center Extension

Professional AI-powered call center with multi-provider support (Twilio, Microsoft Teams Phone, Vonage).

## Overview

This extension enables your AI agents to handle phone calls, both inbound and outbound. It integrates with Twilio (primary) and Google Voice (coming soon) to provide enterprise-grade telephony features.

## Features

- ✅ **Multi-Provider Support**: Twilio, Microsoft Teams Phone, Vonage
- ✅ **Inbound Call Handling**: Receive calls on purchased phone numbers
- ✅ **Outbound Calling**: Make calls to customers/users
- ✅ **IVR Menu Builder**: Create press-1-for-X menus
- ✅ **Call Recording**: Automatic recording with transcription
- ✅ **Call Analytics**: Sentiment analysis, CSAT surveys, cost tracking
- ✅ **Queue Management**: VIP priority, estimated wait times
- ✅ **AI Agent Integration**: AI handles conversations naturally
- ✅ **Industry Templates**: Pre-configured setups for support, sales, restaurant, medical, etc.
- ✅ **Knowledge Base**: FAQ and scripts per call point
- ✅ **Workflow Automation**: Trigger workflows based on call events
- ✅ **Multi-language**: Auto-detect or force language (Arabic/English)
- ✅ **Business Hours**: Route calls differently based on time

## Supported Providers

### Twilio (Primary)
- **Coverage**: 100+ countries
- **Voice**: $0.013/min (US)
- **Numbers**: $1/month (US)
- **Best for**: Worldwide availability, reliable

### Microsoft Teams Phone
- **Coverage**: Enterprise customers with Microsoft 365
- **Voice**: Included in Calling Plan ($12-15/user/month)
- **Best for**: Businesses already using Microsoft Teams

### Vonage
- **Coverage**: 100+ countries
- **Voice**: $0.0084/min (US)
- **Numbers**: $0.90/month (US)
- **Best for**: Cost-effective alternative to Twilio

## Quick Start

### 1. Access Dashboard
Navigate to: http://localhost:41521/dashboard/call-center

### 2. Configure Provider Credentials

**Go to Credentials tab:**
1. Select provider from dropdown (e.g., "Twilio - $0.013/min")
2. Enter API credentials:
   - **Twilio**: Account SID, Auth Token, Phone Number (optional)
   - **Microsoft Teams**: Tenant ID, Client ID, Client Secret
   - **Vonage**: API Key, API Secret, Application ID (optional)
3. Click **"Save Credentials"**
4. ✅ Provider is auto-enabled and set as default

### 3. Purchase Phone Number

**Option A: From Provider Console (Recommended)**
- [Twilio Console](https://www.twilio.com/console/phone-numbers/search)
- [Vonage Dashboard](https://dashboard.nexmo.com/buy-numbers)
- Purchase a number with Voice capability

**Option B: From Dashboard**
- Go to **"My Numbers"** tab
- Numbers purchased from provider console will appear here automatically

### 4. Test Outbound Calls

**No webhook configuration needed for testing!**

Use the AI agent's `make_call` tool or call the API directly:

```bash
curl -X POST http://localhost:41522/api/ext/call-center/make-call \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "to": "+1234567890",
    "message": "Hello, this is a test call from your AI assistant"
  }'
```

### 5. Deploy to Production (Optional)

When ready to handle inbound calls:
1. Deploy backend to server
2. Update Twilio webhook URL (see Webhooks section below)
3. Test inbound calls

## Supported Countries

### Coverage: 100+ countries via Twilio

The extension uses the **Twilio SDK** which supports phone numbers in:

#### 🌟 Popular (Best support)
- 🇺🇸 United States
- 🇨🇦 Canada
- 🇬🇧 United Kingdom
- 🇸🇦 Saudi Arabia
- 🇦🇪 United Arab Emirates

#### 🕌 Middle East & North Africa (11 countries)
- 🇧🇭 Bahrain
- 🇪🇬 Egypt
- 🇮🇱 Israel
- 🇯🇴 Jordan
- 🇰🇼 Kuwait
- 🇱🇧 Lebanon
- 🇴🇲 Oman
- 🇶🇦 Qatar
- 🇹🇳 Tunisia
- 🇹🇷 Turkey

#### 🇪🇺 Europe (28 countries)
Austria, Belgium, Bulgaria, Croatia, Cyprus, Czech Republic, Denmark, Estonia, Finland, **France**, **Germany**, Greece, Hungary, Ireland, **Italy**, Latvia, Lithuania, Luxembourg, Malta, **Netherlands**, Norway, Poland, Portugal, Romania, Slovakia, Slovenia, **Spain**, Sweden, **Switzerland**

#### 🌏 Asia Pacific (14 countries)
Australia, China, Hong Kong, India, Indonesia, Japan, Malaysia, New Zealand, Philippines, Singapore, South Korea, Taiwan, Thailand, Vietnam

#### 🌎 Americas (13 countries)
Argentina, Brazil, Chile, Colombia, Costa Rica, Dominican Republic, El Salvador, Mexico, Panama, Peru, Puerto Rico, Uruguay, Venezuela

#### 🌍 Africa (5 countries)
Kenya, Nigeria, South Africa, Tanzania, Uganda

**Total: 80+ countries** (see full list in UI when purchasing)

## NPM Packages Used

### 1. **`twilio`** (Official Twilio SDK)
```bash
npm install twilio
```
**What it provides:**
- Phone number purchase & management
- Make/receive calls (PSTN)
- SMS/MMS messaging
- Call recording & transcription
- TwiML generation (call flow control)
- Webhook signature validation

**API Connection:**
```javascript
import twilio from 'twilio';

const client = twilio(accountSid, authToken);

// Search available numbers
const numbers = await client.availablePhoneNumbers('US')
  .local.list({ areaCode: '415' });

// Purchase a number
const number = await client.incomingPhoneNumbers.create({
  phoneNumber: '+14155551234',
  voiceUrl: 'https://yourapp.com/voice-webhook'
});

// Make a call
const call = await client.calls.create({
  from: '+14155551234',
  to: '+14155556789',
  url: 'https://yourapp.com/call-instructions'
});
```

### 2. **`googleapis`** (Google Cloud SDK) - Coming Soon
```bash
npm install googleapis
npm install @google-cloud/speech
npm install @google-cloud/text-to-speech
```
**What it provides:**
- Google Voice number management
- Speech-to-Text (Whisper alternative)
- Text-to-Speech (better voices)
- Dialogflow integration

## How to Connect Twilio API

### Step 1: Create Twilio Account
1. Go to [twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Sign up (free trial gives $15 credit)
3. Verify your phone number

### Step 2: Get Credentials
1. Go to [Twilio Console](https://console.twilio.com)
2. Copy **Account SID** (starts with `AC...`)
3. Copy **Auth Token** (click "View" to reveal)

### Step 3: Configure in Dpro Bot
1. Enable Call Center extension
2. Go to `/dashboard/call-center` → **Settings** tab
3. Paste Account SID and Auth Token
4. Click "Test Connection" → Should show ✅

### Step 4: Purchase a Number
1. Go to **Phone Numbers** tab
2. Click "Purchase Number"
3. Select country (US recommended for testing - $1/month)
4. Enter area code (optional): `415` for San Francisco
5. Click "Search" → Pick a number → "Purchase"

### Step 5: Create Call Point
1. Go to **Call Points** tab
2. Click "Create Call Point"
3. Follow 4-step wizard:
   - Basic Info: Name + Phone Number
   - AI Config: Select Agent + Voice
   - Call Flow: Greeting message
   - Settings: Recording, transcription, etc.
4. Click "Create" → ✅ Ready to receive calls!

## Webhooks (How Calls Connect)

### Development (localhost)

**For local testing, keep Twilio's demo webhook - no changes needed!**

```
Voice Webhook URL: https://demo.twilio.com/welcome/voice/
```

**Benefits:**
- No ngrok/tunnel needed for initial testing
- Works immediately with outbound calls
- Inbound calls play demo message
- Perfect for testing API integration

### Production Deployment

When deploying to a server, update the webhook URL in Twilio Console:

**Steps:**
1. Go to: https://console.twilio.com/
2. Navigate to: **Phone Numbers → Manage → Active Numbers**
3. Select your phone number
4. Under **"Voice Configuration"**:
   - Change "A call comes in" webhook URL **from:**
     ```
     https://demo.twilio.com/welcome/voice/
     ```
   - **To your production URL:**
     ```
     https://yourdomain.com/api/ext/call-center/webhooks/voice
     ```
5. Click **"Save configuration"**

**Webhook Endpoints:**
```
Voice:      POST /api/ext/call-center/webhooks/voice
Status:     POST /api/ext/call-center/webhooks/status
Recording:  POST /api/ext/call-center/webhooks/recording
```

**Alternative for localhost testing (advanced):**

If you need to test inbound calls locally:

```bash
# Option 1: ngrok
ngrok http 41522
# → https://abc123.ngrok.io/api/ext/call-center/webhooks/voice

# Option 2: Cloudflare Tunnel (free, stable)
cloudflared tunnel --url http://localhost:41522
# → https://xyz.trycloudflare.com/api/ext/call-center/webhooks/voice
```

## Cost Breakdown (Twilio Pricing)

### Phone Numbers
- 🇺🇸 US Local: **$1.00/month**
- 🇬🇧 UK Local: **$2.00/month**
- 🇸🇦 Saudi: **$15-20/month** (higher due to telecom regulations)
- 🇦🇪 UAE: **$10-15/month**
- 🇩🇪 Germany: **$2.50/month**
- 🇫🇷 France: **$2.50/month**

### Calls (per minute)
- **Inbound**: $0.0085/min (US), $0.01-0.05/min (international)
- **Outbound**: $0.013/min (US), $0.05-0.20/min (international)
- **Recording**: $0.0025/min
- **Transcription**: $0.05/min (or use Whisper for free!)

### Example Monthly Bill
**Light usage** (100 calls/month, 5 min avg):
- 1 US number: $1
- 500 call minutes: $4.25 (inbound) + $6.50 (outbound)
- Recording: $1.25
- **Total: ~$13/month**

**Heavy usage** (1000 calls/month, 3 min avg):
- 5 US numbers: $5
- 3000 call minutes: ~$50
- Recording: $7.50
- **Total: ~$62.50/month**

## AI Agent Tools

When this extension is enabled, AI agents get 2 new tools:

### `make_call`
Make an outbound call from a call point.

**Example:**
```
User: "Call John at +14155551234 to remind him about the meeting"

Agent uses tool:
{
  "callPointId": "cp_abc123",
  "toNumber": "+14155551234",
  "customGreeting": "Hi John, this is a reminder about your meeting at 3pm today."
}
```

### `hangup_call`
End an active call.

**Example:**
```
User: "End the call with call SID CA123"

Agent uses tool:
{
  "callSid": "CA123abc"
}
```

## Database Tables

The extension creates 4 tables:

1. **`phone_numbers`**: Purchased phone numbers
2. **`call_points`**: Virtual call center employees
3. **`call_sessions`**: Call history + recordings
4. **`call_messages`**: Conversation transcripts

## Frontend Integration

The extension includes a full dashboard at:
```
/dashboard/call-center
```

**Navigation**: The Call Center link appears in the main sidebar with a Phone icon.

With 5 tabs:
- **Call Points**: Manage virtual agents
- **Phone Numbers**: Purchase/release numbers
- **Active Calls**: Monitor live calls
- **Call History**: View recordings + transcripts
- **Settings**: Configure Twilio credentials

## Troubleshooting

### ❌ "Twilio credentials not configured"
→ Go to Settings tab → Add Account SID + Auth Token → Test Connection

### ❌ "Webhook validation failed"
→ Make sure Public URL is set correctly (use ngrok for local)
→ Check Twilio webhook signature validation

### ❌ "No numbers available"
→ Some countries have restrictions (e.g., China requires business verification)
→ Try US/UK/CA for guaranteed availability

### ❌ "Call not connecting"
→ Check call point is **enabled** (green power button)
→ Check phone number is assigned to call point
→ Check agent is configured

## Security

- ✅ Webhook signature validation (prevents spoofing)
- ✅ Credentials encrypted in database (AES-256)
- ✅ JWT authentication for API routes
- ✅ Call recordings stored locally (encrypted at rest)
- ⚠️ Recording consent: Automatically plays disclosure before recording

## License

MIT - Part of Dpro Bot
