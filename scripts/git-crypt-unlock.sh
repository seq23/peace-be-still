#!/usr/bin/env bash
# Unlocks the encrypted chat prompts, test question sets and crisis lists (the filter=git-crypt paths in
# .gitattributes) with the key from the Boss OS vault (PBS_GIT_CRYPT_KEY, base64). The ONE way to unlock:
#   CI:     .github/actions/unlock (the key from the repo secret of the same name)
#   local:  cd ~/GitHub/boss-os && npm run -s vault:run -- bash ~/GitHub/peace-be-still/scripts/git-crypt-unlock.sh
#   deploy and worker:dev call it themselves (they already run under vault:run).
# Never `git-crypt unlock` here: it keeps the key per worktree but writes the filter into the shared
# .git/config, so every other worktree's checkout then fails. This puts the key ONCE in the common git
# dir and points the filter at it, so every worktree of this clone decrypts.
set -euo pipefail
cd "$(git -C "$(dirname "$0")/.." rev-parse --show-toplevel)"
command -v git-crypt >/dev/null || { echo "NAMED STOP GIT_CRYPT_NOT_INSTALLED: brew install git-crypt (CI: sudo apt-get install -y git-crypt)"; exit 3; }
COMMON="$(cd "$(git rev-parse --git-common-dir)" && pwd)"
KEY="$COMMON/git-crypt/keys/default"
if [ ! -s "$KEY" ]; then
  [ -n "${PBS_GIT_CRYPT_KEY:-}" ] || { echo "NAMED STOP PBS_GIT_CRYPT_KEY_MISSING: the chat prompts, test sets and crisis lists stay encrypted; run under the vault: cd ~/GitHub/boss-os && npm run -s vault:run -- bash $PWD/scripts/git-crypt-unlock.sh (CI: the PBS_GIT_CRYPT_KEY repo secret)"; exit 3; }
  mkdir -p "$COMMON/git-crypt/keys"
  umask 077
  node -e 'const b = Buffer.from(process.env.PBS_GIT_CRYPT_KEY.trim(), "base64"); if (!b.subarray(0, 12).equals(Buffer.from("\0GITCRYPTKEY"))) { console.log("NAMED STOP PBS_GIT_CRYPT_KEY_INVALID: the value is not a base64 git-crypt key"); process.exit(3); } process.stdout.write(b)' > "$KEY.tmp" || { rm -f "$KEY.tmp"; exit 3; }
  mv "$KEY.tmp" "$KEY"
fi
git config filter.git-crypt.smudge "\"git-crypt\" smudge --key-file \"$KEY\""
git config filter.git-crypt.clean "\"git-crypt\" clean --key-file \"$KEY\""
git config filter.git-crypt.required true
git config diff.git-crypt.textconv "\"git-crypt\" diff --key-file \"$KEY\""
# Re-check-out only the files still locked (their bytes equal the commit, so nothing local is lost).
locked=()
while IFS= read -r -d '' f; do locked+=("$f"); done < <(node scripts/check-encrypted.mjs --locked)
if [ ${#locked[@]} -gt 0 ]; then
  rm -f -- "${locked[@]}"
  git checkout -- "${locked[@]}"
fi
left=$(node scripts/check-encrypted.mjs --locked | tr -cd '\0' | wc -c | tr -d ' ')
[ "$left" = 0 ] || { echo "NAMED STOP GIT_CRYPT_STILL_LOCKED: $left files did not decrypt (wrong key in the vault?)"; exit 3; }
echo "OUTPUT git-crypt: unlocked (${#locked[@]} files decrypted now)"
