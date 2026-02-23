# qliplab - Common Rules (Read First!)

## 🚨 MASTER INSTRUCTIONS

### Before Starting
```
1. Read these files IN ORDER:
   ├── PRODUCT.md      → Business context (WHY)
   ├── CLAUDE.md       → Project rules (WHAT) - if exists
   └── This phase file → Implementation steps (HOW)
```

### After Completing Phase

**DO NOT just finish. You MUST:**

1. **Ask for Confirmation:**
```
"PHASE X complete. Created: [list files]
Test with: npm run tauri dev
Type 'OK' to confirm, or describe issues."
```

2. **Wait for "OK"**

3. **Update docs/PROGRESS.md:**
```markdown
## Completed Phases
- [x] PHASE X - [name] ✅ (date)
- [ ] PHASE X+1 - [name] (next)

## Latest Changes
- Added: [files]
- Modified: [files]
```

4. **Update CLAUDE.md** with new components/stores

5. **Confirm:**
```
"Documentation updated. Ready for next phase?"
```

---

## Tech Stack (2025)
- Tauri v2.5+ (latest stable)
- React 19
- TypeScript 5.6+
- Vite 6+
- Tailwind CSS 4 (@tailwindcss/vite)
- shadcn/ui (latest)
- Framer Motion 12+
- Zustand 5+
- Lucide React (icons)
- SQLite (Tauri plugin)
- AES-256-GCM encryption

---

## Project Structure
```
qliplab/
├── PRODUCT.md         # Business context
├── CLAUDE.md          # Project rules (created in Phase 1)
├── prompts/           # Phase files
├── docs/
│   ├── PROGRESS.md    # Track progress
│   └── ...
├── src/               # React frontend
└── src-tauri/         # Rust backend
```
