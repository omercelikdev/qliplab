#!/usr/bin/env bash
#
# Bump the app version in every place that must agree, in one shot.
#
#   scripts/bump-version.sh 0.1.22
#
# Then review, commit, and tag to cut a release:
#
#   git commit -am "chore: bump version to 0.1.22"
#   git tag v0.1.22 && git push origin main --tags
#
# Pushing the tag triggers .github/workflows/release.yml, which builds all
# three platforms and publishes a GitHub Release with an updater manifest.
set -euo pipefail

VERSION="${1:-}"
if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "usage: scripts/bump-version.sh <major.minor.patch>   e.g. 0.1.22" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

python3 - "$VERSION" <<'PY'
import json, re, sys
version = sys.argv[1]

# package.json — the single field, kept exact to avoid reformatting the file.
with open("package.json") as f:
    pkg = f.read()
pkg = re.sub(r'("version":\s*)"[^"]+"', r'\1"%s"' % version, pkg, count=1)
open("package.json", "w").write(pkg)

# tauri.conf.json — top-level "version".
conf = json.load(open("src-tauri/tauri.conf.json"))
conf["version"] = version
json.dump(conf, open("src-tauri/tauri.conf.json", "w"), indent=2)
open("src-tauri/tauri.conf.json", "a").write("\n")

# Cargo.toml — the [package] version (first `version = "..."` line).
with open("src-tauri/Cargo.toml") as f:
    cargo = f.read()
cargo = re.sub(r'(?m)^version = "[^"]+"', 'version = "%s"' % version, cargo, count=1)
open("src-tauri/Cargo.toml", "w").write(cargo)
print(f"set version to {version}")
PY

# Keep Cargo.lock in step so CI's --locked builds don't fail.
if command -v cargo >/dev/null 2>&1; then
  (cd src-tauri && cargo update -p qliplab --precise "$VERSION" 2>/dev/null) || true
fi

echo
echo "Updated: package.json, src-tauri/tauri.conf.json, src-tauri/Cargo.toml"
echo "Next:"
echo "  git commit -am \"chore: bump version to $VERSION\""
echo "  git tag v$VERSION && git push origin main --tags"
