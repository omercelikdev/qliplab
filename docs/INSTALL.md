# Installing QlipLab

QlipLab is free and open source. Download the build for your platform, then
follow the notes below.

---

## macOS

**Download:** `QlipLab_<version>_universal.dmg` (works on both Apple Silicon and Intel)

1. Open the `.dmg` and drag **QlipLab** into **Applications**.
2. Launch it. That's it — no warnings.

The app is code-signed with an Apple Developer ID and **notarized by Apple**, so
Gatekeeper accepts it out of the box.

### Grant Accessibility permission

QlipLab pastes into the app you were last using (like Ditto). macOS requires
explicit permission for this:

**System Settings → Privacy & Security → Accessibility → enable QlipLab**

Without it, the global shortcut and auto-paste will not work.

---

## Windows

**Download:** `QlipLab_<version>_x64-setup.exe`

The installer runs per-user — **no administrator prompt** — and installs in a
couple of clicks.

Windows will show a blue **"Windows protected your PC"** screen:

1. Click **More info**
2. Click **Run anyway**

### Why does this appear?

This is Microsoft **SmartScreen**, and it is a *reputation* check, not a virus
warning. SmartScreen has simply never seen this installer before, because
QlipLab is a new project from a new publisher. It shows the same screen for
almost every new independent app until enough people have downloaded it.

QlipLab is not currently code-signed (a code-signing certificate is a paid,
recurring cost, and this app is free). The full source is public — you can read
it, build it yourself, or verify the release on
[GitHub](https://github.com/omercelikdev/qliplab).

---

## Linux

**Download:** `.AppImage` (portable) or `.deb` (Debian/Ubuntu)

**AppImage:**
```bash
chmod +x QlipLab_<version>_amd64.AppImage
./QlipLab_<version>_amd64.AppImage
```

**Debian / Ubuntu:**
```bash
sudo dpkg -i QlipLab_<version>_amd64.deb
sudo apt-get install -f   # if dependencies are missing
```

---

## Updating

QlipLab checks for updates from **Settings → About → Check for updates**.
Updates are cryptographically signed and verified before they are applied.
