#!/usr/bin/env bash
# Deploy all activities to game.knywong.com (project: learning-activities-kny).
# Run from learning-activities/ root.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PUBLIC="$ROOT/public"

echo "==> Copying impact-bingo..."
mkdir -p "$PUBLIC/impactbingo"
cp -r "$ROOT/impact-bingo/public/." "$PUBLIC/impactbingo/"

echo "==> Copying reflective-journal..."
mkdir -p "$PUBLIC/reflectivejournal"
cp -r "$ROOT/reflective-journal/public/." "$PUBLIC/reflectivejournal/"

echo "==> Copying learning-passport..."
mkdir -p "$PUBLIC/passport"
cp -r "$ROOT/learning-passport/public/." "$PUBLIC/passport/"

echo "==> Deploying to Firebase (project: learning-activities-kny)..."
(cd "$ROOT" && firebase deploy --only hosting,firestore,functions)

echo "==> Done. https://game.knywong.com"
