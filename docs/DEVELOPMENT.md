# qliplab - Claude Code Terminal Commands

## 📁 Setup (Once)

```bash
# Create project folder
mkdir qliplab
cd qliplab

# Copy prompts folder and PRODUCT.md here
# Your structure should be:
# qliplab/
# ├── prompts/
# │   ├── COMMON.md
# │   ├── PHASE_1.md
# │   ├── PHASE_2.md
# │   ├── ...
# │   └── PHASE_8.md
# └── PRODUCT.md
```

---

## 🚀 Phase Commands

### PHASE 1: Project Setup + UI Shell
```bash
claude "Read prompts/COMMON.md first, then prompts/PHASE_1.md. 
Implement PHASE 1 step by step. 
After completion, ask me to confirm with 'OK' before updating docs."
```

### PHASE 2: Clipboard + Database
```bash
claude "Read CLAUDE.md, docs/PROGRESS.md, prompts/COMMON.md, then prompts/PHASE_2.md.
Implement PHASE 2. Follow Master Instructions."
```

### PHASE 3: Transform + Preview
```bash
claude "Read context files and prompts/PHASE_3.md.
Implement PHASE 3. Follow Master Instructions."
```

### PHASE 4: Diff Feature
```bash
claude "Read context files and prompts/PHASE_4.md.
Implement PHASE 4. Follow Master Instructions."
```

### PHASE 5: Snippets
```bash
claude "Read context files and prompts/PHASE_5.md.
Implement PHASE 5. Follow Master Instructions."
```

### PHASE 6: Secure Vault
```bash
claude "Read context files and prompts/PHASE_6.md.
Implement PHASE 6. Follow Master Instructions."
```

### PHASE 7: Settings + Polish
```bash
claude "Read context files and prompts/PHASE_7.md.
Implement PHASE 7. Follow Master Instructions."
```

### PHASE 8: Build
```bash
claude "Read context files and prompts/PHASE_8.md.
Implement PHASE 8. Follow Master Instructions."
```

---

## 🔄 Utility Commands

### Check Status
```bash
claude "Read CLAUDE.md and docs/PROGRESS.md. 
What's the current status? What phase is next?"
```

### Continue After Break
```bash
claude "Read all context files. 
Continue from where we left off."
```

### Fix an Issue
```bash
claude "Read context files. 
There's an issue: [describe problem]. Fix it."
```

### New Session
```bash
cd qliplab
claude "New session. Read CLAUDE.md and docs/PROGRESS.md.
Show current status and next phase."
```

---

## 📋 Quick Reference

| Phase | Content | Command File |
|-------|---------|--------------|
| 1 | Project Setup + UI | `prompts/PHASE_1.md` |
| 2 | Clipboard + Database | `prompts/PHASE_2.md` |
| 3 | Transform + Preview | `prompts/PHASE_3.md` |
| 4 | Diff Feature | `prompts/PHASE_4.md` |
| 5 | Snippets | `prompts/PHASE_5.md` |
| 6 | Secure Vault | `prompts/PHASE_6.md` |
| 7 | Settings | `prompts/PHASE_7.md` |
| 8 | Build | `prompts/PHASE_8.md` |

---

## ⚠️ Important Notes

1. **Always test after each phase:** `npm run tauri dev`
2. **Say "OK" when asked** to let Claude update docs
3. **Don't skip phases** - they build on each other
4. **If token error:** Close session, start new one with next phase
