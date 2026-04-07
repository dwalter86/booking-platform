#!/usr/bin/env bash
set -Eeuo pipefail

# ============================================================
# Booking Platform Deploy Script
# ============================================================
# Runs on the app server (192.168.0.72)
# Usage: bash scripts/deploy.sh
# ============================================================

REPO_DIR="/opt/booking-platform"
FRONTEND_DIR="${REPO_DIR}/frontend"
BACKEND_DIR="${REPO_DIR}/backend"
FRONTEND_SERVICE="booking-platform-admin"
BACKEND_SERVICE="booking-platform-api"

# -----------------------------
# Helpers
# -----------------------------
log() {
  echo
  echo "[$(date '+%H:%M:%S')] $*"
}

die() {
  echo
  echo "[ERROR] $*" >&2
  exit 1
}

# -----------------------------
# Safety checks
# -----------------------------
log "Checking directories exist..."
[[ -d "${FRONTEND_DIR}" ]] || die "Frontend directory not found: ${FRONTEND_DIR}"
[[ -d "${BACKEND_DIR}" ]] || die "Backend directory not found: ${BACKEND_DIR}"

# -----------------------------
# Step 1: Pull latest from Git
# -----------------------------
log "Pulling latest code from Git..."
cd "${REPO_DIR}"
git pull origin main || die "Git pull failed. Check your connection or resolve any conflicts."

# -----------------------------
# Step 2: Install backend dependencies
# -----------------------------
log "Installing backend dependencies..."
cd "${BACKEND_DIR}"
npm install --omit=dev || die "Backend npm install failed."

# -----------------------------
# Step 3: Install frontend dependencies
# -----------------------------
log "Installing frontend dependencies..."
cd "${FRONTEND_DIR}"
npm install || die "Frontend npm install failed."

# -----------------------------
# Step 4: Build frontend
# -----------------------------
log "Building frontend (this may take a minute)..."
cd "${FRONTEND_DIR}"
sudo rm -rf .next
sudo npm run build || die "Frontend build failed."

# -----------------------------
# Step 5: Copy static assets into standalone
# -----------------------------
log "Copying static assets into standalone bundle..."
sudo mkdir -p .next/standalone/.next
sudo rsync -a .next/static/ .next/standalone/.next/static/
sudo rsync -a public/ .next/standalone/public/ 2>/dev/null || true

# -----------------------------
# Step 5b: Install systemd service files if changed
# -----------------------------
log "Updating systemd service files..."
SYSTEMD_DIR="/etc/systemd/system"
CHANGED=false
for SVC in booking-platform-api.service booking-platform-admin.service; do
  SRC="${REPO_DIR}/scripts/systemd/${SVC}"
  DST="${SYSTEMD_DIR}/${SVC}"
  if ! diff -q "${SRC}" "${DST}" > /dev/null 2>&1; then
    sudo cp "${SRC}" "${DST}"
    log "Updated ${SVC}"
    CHANGED=true
  fi
done
if [[ "${CHANGED}" == "true" ]]; then
  sudo systemctl daemon-reload
  log "systemd reloaded."
fi

# -----------------------------
# Step 6: Restart backend service
# -----------------------------
log "Restarting backend service..."
sudo systemctl restart "${BACKEND_SERVICE}" || die "Failed to restart ${BACKEND_SERVICE}."
sleep 2

# Check it came back up
systemctl is-active --quiet "${BACKEND_SERVICE}" \
  || die "${BACKEND_SERVICE} did not start correctly. Check: sudo journalctl -u ${BACKEND_SERVICE} -n 50"

log "Backend service is running."

# -----------------------------
# Step 7: Restart frontend service
# -----------------------------
log "Restarting frontend service..."
sudo systemctl restart "${FRONTEND_SERVICE}" || die "Failed to restart ${FRONTEND_SERVICE}."
sleep 2

# Check it came back up
systemctl is-active --quiet "${FRONTEND_SERVICE}" \
  || die "${FRONTEND_SERVICE} did not start correctly. Check: sudo journalctl -u ${FRONTEND_SERVICE} -n 50"

log "Frontend service is running."

# -----------------------------
# Step 8: Smoke test
# -----------------------------
log "Running smoke test..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/login || true)

if [[ "${HTTP_STATUS}" == "200" ]] || [[ "${HTTP_STATUS}" == "307" ]]; then
  log "Smoke test passed (HTTP ${HTTP_STATUS})."
else
  echo
  echo "[WARN] Smoke test returned HTTP ${HTTP_STATUS} — the app may not be responding correctly."
  echo "       Check: sudo journalctl -u ${FRONTEND_SERVICE} -n 50"
fi

# -----------------------------
# Done
# -----------------------------
echo
echo "============================================================"
echo " Deploy complete"
echo "============================================================"
echo " Frontend: http://default.platform.local/login"
echo " Backend:  http://127.0.0.1:3001/api"
echo
echo " If anything looks wrong:"
echo "   sudo journalctl -u ${FRONTEND_SERVICE} -n 50"
echo "   sudo journalctl -u ${BACKEND_SERVICE} -n 50"
echo "============================================================"
