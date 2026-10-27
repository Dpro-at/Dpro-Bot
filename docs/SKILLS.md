# Skills System

Install AI skills from Skill Hub to extend your agents' capabilities.

---

## What are Skills?

Skills are structured AI prompts (`.md` files) that teach AI new capabilities.

**Example:** Email Writer skill teaches AI to write professional emails with proper structure.

---

## Skill Sources

- **bundled** - Built into Girru
- **managed** - Downloaded from Skill Hub
- **workspace** - User-created in `.data/skills/`

---

## Skill Hub

**Website:** https://www.skillhub.club/

**Thousands of community skills available:**
- Coding & Development (Python, JavaScript, SQL, etc.)
- Writing & Content (emails, articles, documentation)
- Data Analysis (Excel, charts, statistics)
- Business & Marketing (strategy, SEO, campaigns)
- Design & Creative (UI/UX, branding, copy)
- Research & Learning (summaries, Q&A, tutoring)

---

## Installing Skills

### Method 1: Via API

```bash
POST /api/skills/install
Content-Type: application/json

{
  "content": "...(skill content from Skill Hub)...",
  "name": "email-writer",
  "source": "managed"
}
```

### Method 2: Via File System

```bash
# Copy skill file to:
.data/skills/managed/email-writer.md

# Backend auto-detects and loads
```

### Method 3: From Skill Hub

1. Go to https://www.skillhub.club/
2. Browse skills by category
3. Click on skill you want
4. Copy the skill content
5. Use API or file system method above

---

## Skill File Format

```markdown
---
name: Email Writer
version: 1.0.0
description: Write professional emails
triggers: [email, write email, compose message]
settings:
  tone:
    type: select
    options: [formal, casual, friendly]
    default: formal
---

# Email Writer Skill

You are an expert email writer. When asked to write an email:

1. Ask for:
   - Recipient
   - Purpose
   - Key points

2. Use {{ settings.tone }} tone

3. Structure:
   - Clear subject line
   - Greeting
   - Body (3-5 paragraphs)
   - Professional closing

4. Review for:
   - Grammar
   - Clarity
   - Appropriate tone
```

---

## Using Skills

### In Chat

```
User: Write an email to my manager about project delay

AI: [Uses email-writer skill automatically if trigger matches]
```

### Via API

```bash
GET /api/skills
# Lists all installed skills

GET /api/skills/:id
# Get specific skill details

POST /api/skills/install
# Install new skill

PUT /api/skills/:id/enable
# Enable skill

PUT /api/skills/:id/disable
# Disable skill

DELETE /api/skills/:id
# Delete skill
```

---

## Skill Settings

Each skill can have customizable settings:

```javascript
// Get skill settings for user
GET /api/skills/:skillId/settings?userId=xxx

// Update settings
PUT /api/skills/:skillId/settings
{
  "userId": "xxx",
  "settings": {
    "tone": "formal",
    "language": "en"
  }
}
```

---

## Creating Your Own Skills

### 1. Create Skill File

`.data/skills/workspace/my-skill.md`:

```markdown
---
name: My Custom Skill
version: 1.0.0
description: My custom AI capability
triggers: [my skill, custom action]
settings:
  option1:
    type: text
    default: "value"
---

# My Custom Skill

[Your skill instructions here...]
```

### 2. Backend Auto-Loads

Backend watches `.data/skills/` and auto-loads new files.

### 3. Test Skill

Go to `/dashboard/chat` and trigger your skill:

```
User: Use my skill to do something
```

---

## Skill Categories on Skill Hub

**Popular categories:**

### Coding & Development
- Code review and refactoring
- Bug fixing assistant
- API documentation generator
- Test case writer
- Database query optimizer

### Writing & Content
- Blog post writer
- Email composer
- Social media posts
- Technical documentation
- Creative storytelling

### Data Analysis
- Excel formula helper
- Chart and graph creator
- Statistical analysis
- Data cleaning
- Report generator

### Business & Marketing
- SWOT analysis
- Marketing strategy
- SEO optimizer
- Business plan writer
- Competitor analysis

### Design & Creative
- UI/UX feedback
- Color palette generator
- Branding ideas
- Copywriting
- Design critique

---

## Best Practices

### Choosing Skills

✅ **Do:**
- Read skill description carefully
- Check triggers (what activates it)
- Review settings available
- Test with simple inputs first

❌ **Don't:**
- Install skills you won't use
- Use conflicting skills (same triggers)
- Ignore skill version updates

### Managing Skills

✅ **Do:**
- Keep skills organized by category
- Disable unused skills
- Update skills regularly
- Customize settings per user

❌ **Don't:**
- Install duplicate skills
- Leave broken skills enabled
- Ignore skill errors

---

## Examples

### Email Writer Skill

**Trigger:** "write email", "compose message"
**Settings:** tone (formal/casual), length (short/medium/long)
**Use:** "Write an email to client about project update"

### Code Review Skill

**Trigger:** "review code", "check this code"
**Settings:** language (python/javascript/etc), strictness (low/medium/high)
**Use:** "Review this Python function for bugs"

### Data Analysis Skill

**Trigger:** "analyze data", "create chart"
**Settings:** chart_type (bar/line/pie), format (simple/detailed)
**Use:** "Analyze this sales data and create a chart"

---

## Troubleshooting

### Skill not triggering

- Check trigger words match your input
- Ensure skill is enabled
- Verify skill loaded (check `/api/skills`)

### Skill errors

- Check skill file format (valid YAML frontmatter)
- Verify settings schema is correct
- Check backend logs for errors

### Skill conflicts

- Two skills with same triggers
- Disable one or change triggers
- More specific triggers win

---

## API Reference

### List Skills
```bash
GET /api/skills
```

### Get Skill
```bash
GET /api/skills/:id
```

### Install Skill
```bash
POST /api/skills/install
{
  "content": "...",
  "name": "skill-name",
  "source": "managed"
}
```

### Enable/Disable
```bash
PUT /api/skills/:id/enable
PUT /api/skills/:id/disable
```

### Delete Skill
```bash
DELETE /api/skills/:id
```

### Get Settings
```bash
GET /api/skills/:id/settings?userId=xxx
```

### Update Settings
```bash
PUT /api/skills/:id/settings
{
  "userId": "xxx",
  "settings": { ... }
}
```

---

## Resources

**Skill Hub:** https://www.skillhub.club/
- Browse thousands of community skills
- Search by category
- Free to use
- Regular updates

**Skill File Location:**
- Bundled: `packages/backend/skills/bundled/`
- Managed: `.data/skills/managed/`
- Workspace: `.data/skills/workspace/`

---

**Next:** Visit https://www.skillhub.club/ and install your first skill!
