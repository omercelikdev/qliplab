# qliplab - Product Context

> This document contains all the business context needed for Claude Code to fully understand the product.

---

## 🎯 Product Summary

**qliplab** = Smart Clipboard Manager + Transformation Tools + Secure Vault

Stores everything you copy, auto-detects formats, transforms content, and keeps sensitive data safe.

---

## 💡 Problem (Why Does This Product Exist?)

### Problems Everyone Faces

| Problem | Daily Impact |
|---------|-------------|
| **Clipboard holds only one item** | New copy overwrites the old one |
| **"What did I just copy?"** | Going back to re-copy content |
| **Sensitive data in clipboard** | Passwords, card numbers left insecure |
| **Frequently used texts** | Retyping the same things over and over |

### Additional Problems for Developers

| Problem | Time Wasted |
|---------|-------------|
| Opening a site to beautify JSON | 30 seconds each time |
| Using jwt.io to decode JWT | 20 seconds each time |
| Comparing two API responses | Manual diff = 2-3 minutes |
| Base64 decode/encode | Searching for separate tools |
| Storing API keys securely | Plain text in Notepad = security risk |

### Research Data

- **69% of developers** lose **8+ hours per week** due to inefficiencies (2024 State of Developer Experience)
- Average user performs **50+ copy-paste** operations daily
- Clipboard-related data leaks account for **12% of cyber attacks**

---

## ✅ Solution (What Does qliplab Do?)

### Core Features

```
┌─────────────────────────────────────────────────────────────┐
│  📋 CLIPBOARD HISTORY                                       │
│  ─────────────────────                                      │
│  EVERYTHING you copy is saved. Nothing is ever lost.        │
│  • Text, images, files                                      │
│  • Source app tracking                                      │
│  • Search and filtering                                     │
│  • Pinning (keep important items at top)                    │
├─────────────────────────────────────────────────────────────┤
│  🔍 AUTO-DETECT (Automatic Format Detection)                │
│  ───────────────────────────────────────────                │
│  Instantly detects the format of copied content:            │
│  • JSON → Suggests beautify                                 │
│  • JWT Token → Suggests decode, shows expiry                │
│  • Base64 → Decode/Encode options                           │
│  • URL → Open in browser option                             │
│  • SQL → Suggests formatting                                │
│  • Sensitive data → "Save to Vault?" prompt                 │
├─────────────────────────────────────────────────────────────┤
│  ⚡ TRANSFORMS (Transformations)                            │
│  ─────────────────────────────                              │
│  One-click transforms, no external sites needed:            │
│  • JSON Beautify / Minify / Validate                        │
│  • JWT Decode (Header, Payload, Expiry)                     │
│  • Base64 Encode / Decode                                   │
│  • URL Encode / Decode                                      │
│  • SQL Format                                               │
│  • Unix Timestamp → Date                                    │
├─────────────────────────────────────────────────────────────┤
│  🔀 DIFF (Comparison)                                       │
│  ────────────────────                                       │
│  Compare two contents side-by-side:                         │
│  • API responses                                            │
│  • Config files                                             │
│  • Any two texts                                            │
│  • Differences highlighted in color                         │
├─────────────────────────────────────────────────────────────┤
│  📝 SNIPPETS (Code Snippets)                                │
│  ───────────────────────────                                │
│  Save your frequently used texts:                           │
│  • Email signatures                                         │
│  • Code templates                                           │
│  • Common replies                                           │
│  • Categorize and favorite                                  │
├─────────────────────────────────────────────────────────────┤
│  🔐 SECURE VAULT (Encrypted Storage)                        │
│  ───────────────────────────────────                        │
│  Store sensitive information encrypted:                     │
│  • Credit card details                                      │
│  • Address information                                      │
│  • Bank account numbers                                     │
│  • API keys                                                 │
│  • Personal information (SSN, tax ID)                       │
│  • AES-256-GCM encryption                                   │
│  • Master password protection                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 👥 Target Users (Not Just Developers!)

### Segment 1: General Users (Everyone)

| User | Use Case |
|------|----------|
| **Office worker** | Frequently used email texts, address info |
| **Student** | Research notes, quotes, references |
| **Writer/Blogger** | Text snippets, quotes, references |
| **Social media manager** | Hashtags, bio texts, links |
| **Customer service rep** | Canned responses, template messages |
| **Everyone** | Secure storage for passwords, card info |

### Segment 2: Developers

| User | Use Case |
|------|----------|
| **Backend Developer** | API response debugging, JSON beautify |
| **Frontend Developer** | Response comparison, mock data |
| **DevOps Engineer** | Config snippets, secret management |
| **QA Engineer** | Test data, response diff |
| **Mobile Developer** | API integration, token debugging |

### Segment 3: Non-Technical Professionals

| User | Use Case |
|------|----------|
| **Accountant** | IBANs, tax numbers |
| **Sales representative** | Customer info, proposal templates |
| **HR specialist** | Resume notes, standard responses |
| **Lawyer** | Contract clauses, legal texts |

---

## 🎬 Use Case Scenarios

### Scenario 1: General User - Email Template
```
1. Save frequently sent message to Snippets
2. When writing new email, press Cmd+Shift+V
3. Snippets tab → Click relevant template
4. Auto-paste → Email ready
```

### Scenario 2: General User - Online Shopping
```
1. Card details stored securely in Vault
2. On payment page, press Cmd+Shift+V
3. Vault → Select card → Click relevant field
4. Secure paste, card info doesn't stay in clipboard
```

### Scenario 3: Developer - API Debug
```
1. Copy response from Postman
2. qliplab opens → "JSON detected"
3. Cmd+T → Beautified view appears
4. Error immediately visible
```

### Scenario 4: Developer - JWT Token
```
1. Copy token
2. qliplab → "JWT detected"
3. One-click decode
4. "Token expires in 2 hours" warning
5. Payload content visible
```

### Scenario 5: Developer - Response Comparison
```
1. Copy first API response
2. After bug fix, copy new response
3. Select both → Cmd+D
4. Diff panel → Differences highlighted
5. Bug location identified
```

### Scenario 6: Sensitive Data Protection
```
1. AWS Secret Key copied
2. qliplab "⚠️ Sensitive data detected!"
3. "Save to Vault?" suggestion
4. Saved to Vault
5. Automatically removed from clipboard history
```

---

## 🏆 Competitor Comparison

### macOS/Windows Native Clipboard

| Feature | Native | qliplab |
|---------|--------|---------|
| Clipboard History | ❌ Single item | ✅ Unlimited |
| Search | ❌ | ✅ |
| Format Detection | ❌ | ✅ |
| Transform | ❌ | ✅ |
| Diff | ❌ | ✅ |
| Snippets | ❌ | ✅ |
| Encrypted Vault | ❌ | ✅ |
| Cross-platform | ❌ | ✅ |

### Paste (macOS - $24.99)

| Feature | Paste | qliplab |
|---------|-------|---------|
| Clipboard History | ✅ | ✅ |
| Search | ✅ | ✅ |
| Format Detection | ❌ | ✅ |
| JSON Beautify | ❌ | ✅ |
| JWT Decode | ❌ | ✅ |
| Diff | ❌ | ✅ |
| Snippets | Partial | ✅ |
| Encrypted Vault | ❌ | ✅ |
| Cross-platform | ❌ macOS only | ✅ |
| Price | $24.99 | Free |

### Alfred (macOS - £34)

| Feature | Alfred | qliplab |
|---------|--------|---------|
| Clipboard History | ✅ | ✅ |
| Search | ✅ | ✅ |
| Format Detection | ❌ | ✅ |
| Transform | ❌ | ✅ |
| Diff | ❌ | ✅ |
| Snippets | ✅ | ✅ |
| Encrypted Vault | ❌ | ✅ |
| Developer Focus | ❌ | ✅ |
| Cross-platform | ❌ macOS only | ✅ |

### Ditto (Windows - Free)

| Feature | Ditto | qliplab |
|---------|-------|---------|
| Clipboard History | ✅ | ✅ |
| Search | ✅ | ✅ |
| Format Detection | ❌ | ✅ |
| Transform | ❌ | ✅ |
| Diff | ❌ | ✅ |
| Modern UI | ❌ Outdated | ✅ |
| Cross-platform | ❌ Windows only | ✅ |

### 1Password / Bitwarden

| Feature | Password Managers | qliplab |
|---------|-------------------|---------|
| Encrypted Vault | ✅ | ✅ |
| Clipboard History | ❌ | ✅ |
| Format Detection | ❌ | ✅ |
| Transform | ❌ | ✅ |
| Diff | ❌ | ✅ |
| Snippets | ❌ | ✅ |
| Speed | Slow (heavy) | ✅ Fast |

### Summary: What Makes qliplab Different

```
┌─────────────────────────────────────────────────────────────┐
│                    qliplab DIFFERENCE                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✅ ALL-IN-ONE: History + Transform + Diff + Vault          │
│     (Competitors only offer 1-2 features)                   │
│                                                             │
│  ✅ SMART DETECTION: Auto format, auto suggestions          │
│     (No competitor does this)                               │
│                                                             │
│  ✅ CROSS-PLATFORM: macOS + Windows + Linux                 │
│     (Paste, Alfred are macOS only)                          │
│                                                             │
│  ✅ MODERN UI: Glassmorphism, smooth animations             │
│     (Ditto, Alfred look outdated)                           │
│                                                             │
│  ✅ DEVELOPER + EVERYONE: Appeals to both segments          │
│     (Competitors target one or the other)                   │
│                                                             │
│  ✅ FREE & OPEN SOURCE                                      │
│     (Paste $25, Alfred £34)                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 💰 Business Model (Optional)

### Freemium Options

| Tier | Features | Price |
|------|----------|-------|
| **Free** | History (500 items), Transform, Diff, 10 Snippets | Free |
| **Pro** | Unlimited history, Unlimited snippets, Vault, Sync | $4.99/mo |
| **Team** | Pro + Shared snippets, Team vault | $9.99/user/mo |

### Or Fully Open Source
- GitHub Sponsors
- Donation-based
- Enterprise support

---

## 📊 Success Metrics

| Metric | Target |
|--------|--------|
| Daily Active Users (DAU) | 40% of installs |
| Daily Paste Count | 20+ per user |
| Transform Usage | 5+ daily (developers) |
| Snippet Saves | 10+ per user |
| Vault Usage | 30% of users |
| Retention (30 days) | 60%+ |

---

## 🚀 Vision

**Short-term (v1.0):**
- Core clipboard history
- Format detection + transform
- Diff
- Snippets
- Local vault

**Mid-term (v2.0):**
- Cloud sync
- Mobile companion app
- Team features
- Browser extension

**Long-term (v3.0):**
- AI-powered suggestions
- Smart categorization
- Workflow automation
- API/Integrations

---

## 🎨 Brand Identity

| Element | Value |
|---------|-------|
| **Name** | qliplab (clip + lab) |
| **Tagline** | "Your clipboard, supercharged" |
| **Tone** | Professional yet friendly |
| **Color** | Dark theme default, purple/blue accent |
| **Logo** | Clipboard + lab/beaker combination |

---

## 📝 What Is This Document For?

This PRODUCT.md document serves as:

1. **Context for Claude Code** - Why each feature exists, who it's for
2. **Reference for UX decisions** - Refer to user scenarios
3. **Prioritization guide** - What matters for which segment
4. **Consistency anchor** - Stay true to the vision across all phases

**Claude Code should read this document at every phase and make decisions accordingly.**
