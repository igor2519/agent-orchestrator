#!/bin/bash

# Triggered by GitHub Actions once changes are pulled onto the server.
#
# Layout: CODE_FOLDER is a git checkout that is only ever pulled; each deploy
# copies it into BUILD_FOLDER/release-<sha>-<n>, builds there, and flips the
# release-current symlink. Rolling back is re-pointing that symlink.

set -euo pipefail

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Default to the checkout this script lives in, so the script works wherever the
# repository was cloned. Override either path from the environment when the
# server uses a different layout.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CODE_FOLDER="${CODE_FOLDER:-$SCRIPT_DIR}"
BUILD_FOLDER="${BUILD_FOLDER:-$(dirname "$CODE_FOLDER")/builds}"
NUMBER_OF_RELEASES_TO_KEEP="${NUMBER_OF_RELEASES_TO_KEEP:-3}"

fail() {
  echo "deploy: $1" >&2
  exit 1
}

# Fail on the actual cause rather than several steps later.
[ -d "$CODE_FOLDER" ] || fail "CODE_FOLDER does not exist: $CODE_FOLDER"
git -C "$CODE_FOLDER" rev-parse --git-dir > /dev/null 2>&1 ||
  fail "CODE_FOLDER is not a git checkout: $CODE_FOLDER"
command -v yarn > /dev/null || fail "yarn is not installed or not on PATH"
command -v pm2 > /dev/null || fail "pm2 is not installed or not on PATH"

echo "Deploying from $CODE_FOLDER into $BUILD_FOLDER"
cd "$CODE_FOLDER"

nvm use

echo "Update app from Git"
git pull
GIT_COMMIT="$(git rev-parse HEAD)"

# Every app reads its own .env; a missing one surfaces as a confusing runtime
# crash long after the deploy reports success.
for app in api frontend ocr-service processing-service notification-service; do
  [ -f "$CODE_FOLDER/apps/$app/.env" ] ||
    fail "missing apps/$app/.env on the server - copy it from apps/$app/example.env"
done

mkdir -p "$BUILD_FOLDER"

# Numbered per commit so redeploying the same SHA does not collide.
LATEST_BUILD_NUMBER="$(
  find "$BUILD_FOLDER" -maxdepth 1 -type d -name "release-$GIT_COMMIT-*" |
    grep -Eo '[0-9]+$' | sort -n | tail -1 || true
)"
NEW_BUILD_ID="$GIT_COMMIT-$(( ${LATEST_BUILD_NUMBER:-0} + 1 ))"
RELEASE_DIR="$BUILD_FOLDER/release-$NEW_BUILD_ID"

echo "Creating build (ID:$NEW_BUILD_ID)"
mkdir -p "$RELEASE_DIR"

echo "Copying source code"
# node_modules and .git are rebuilt or unused in a release; copying them makes
# each release gigabytes larger for no benefit.
rsync -a --exclude='.git' --exclude='node_modules' --exclude='.next' \
  "$CODE_FOLDER/" "$RELEASE_DIR/"

# rsync -a preserves the source directory's mtime, so without this every release
# carries the same timestamp and the `ls -dt` retention below orders them
# arbitrarily - which can delete the newest releases instead of the oldest.
touch "$RELEASE_DIR"

cd "$RELEASE_DIR"

echo "Install app dependencies"
yarn install --frozen-lockfile

echo "Build your app"
yarn build

# Next's standalone output ships its own server but not static assets.
mkdir -p apps/frontend/.next/standalone/apps/frontend/.next/static
mkdir -p apps/frontend/.next/standalone/apps/frontend/public
cp -a apps/frontend/.next/static/. apps/frontend/.next/standalone/apps/frontend/.next/static/
cp -a apps/frontend/public/. apps/frontend/.next/standalone/apps/frontend/public/

# Before the symlink flips, so the new schema is in place when new code starts.
echo "Apply pending migrations"
yarn migration:run

echo "Create symlink to release (ID:$NEW_BUILD_ID)"
ln -sfn "$RELEASE_DIR" "$BUILD_FOLDER/release-current"

cd "$BUILD_FOLDER/release-current"

# startOrReload starts the apps when none are running (the first deploy) and
# gracefully reloads them otherwise. The previous `pm2 delete` aborted the very
# first deploy, and delete-then-reload was never zero downtime.
echo "Start or reload PM2 instances"
pm2 startOrReload ecosystem.config.js --env production --update-env

echo "Save PM2 state"
pm2 save

pm2 ls

echo "Remove outdated releases, keeping the newest $NUMBER_OF_RELEASES_TO_KEEP:"
cd "$BUILD_FOLDER"

# Two things must not be deleted: the `release-current` symlink itself, and
# whatever it points at. The glob needs both dashes so it cannot match
# `release-current`, and the live target is filtered out explicitly - deleting it
# leaves a dangling symlink and every process serving 500s.
CURRENT_TARGET="$(basename "$(readlink "$BUILD_FOLDER/release-current" 2>/dev/null || echo none)")"

# Rank first, then drop the live release from whatever the tail selected: doing
# it the other way round filters the newest entry out of the ranking and keeps
# one release too many.
STALE="$(
  ls -dt release-*-*/ 2>/dev/null |
    sed 's:/$::' |
    tail -n +$(( NUMBER_OF_RELEASES_TO_KEEP + 1 )) |
    grep -vx "$CURRENT_TARGET" || true
)"

if [ -n "$STALE" ]; then
  echo "$STALE" | sed 's/^/  /'
  echo "$STALE" | xargs rm -rf
else
  echo "  none"
fi

echo "Deployed $NEW_BUILD_ID"
