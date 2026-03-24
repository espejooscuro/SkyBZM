#!/usr/bin/env bash

set -euo pipefail

# =========================
# Configuration
# =========================
REPO="espejooscuro/SkyBZM"
FILE_NAME="SkyBZM-linux"
BASE_URL="https://github.com/${REPO}/releases/download"

# =========================
# Functions
# =========================
print_usage() {
    echo "Usage: $0 <version> [--run]"
    echo ""
    echo "Arguments:"
    echo "  <version>    Release version (e.g., v0.2.0)"
    echo "  --run        Execute the binary after download (optional)"
}

error_exit() {
    echo "Error: $1" >&2
    exit 1
}

# =========================
# Argument Parsing
# =========================
if [[ $# -lt 1 ]]; then
    print_usage
    exit 1
fi

VERSION="$1"
RUN_AFTER=false

if [[ "${2:-}" == "--run" ]]; then
    RUN_AFTER=true
fi

# =========================
# Build URL
# =========================
DOWNLOAD_URL="${BASE_URL}/${VERSION}/${FILE_NAME}"

echo "----------------------------------------"
echo " SkyBZM Downloader"
echo "----------------------------------------"
echo "Repository : ${REPO}"
echo "Version    : ${VERSION}"
echo "File       : ${FILE_NAME}"
echo "URL        : ${DOWNLOAD_URL}"
echo "----------------------------------------"

# =========================
# Download
# =========================
echo "[INFO] Downloading..."

if ! wget --quiet --show-progress --progress=bar:force:noscroll \
    -O "${FILE_NAME}" "${DOWNLOAD_URL}"; then
    error_exit "Failed to download file. Please check the version or your connection."
fi

# =========================
# Validate Download
# =========================
if [[ ! -f "${FILE_NAME}" ]]; then
    error_exit "Downloaded file not found."
fi

# =========================
# Set Permissions
# =========================
echo "[INFO] Setting executable permissions..."
chmod +x "${FILE_NAME}"

echo "[SUCCESS] Download completed successfully."

# =========================
# Optional Execution
# =========================
if [[ "${RUN_AFTER}" == true ]]; then
    echo "[INFO] Executing ${FILE_NAME}..."
    exec "./${FILE_NAME}"
fi