#!/usr/bin/env bash
# Render secret update template
# Fill RENDER_API_KEY and SERVICE_ID then run the curl command printed below.
# This script only prints a template; it does not execute the API call.

if [ -z "$RENDER_API_KEY" ] || [ -z "$SERVICE_ID" ] || [ -z "$NEW_VALUE" ]; then
  echo "Set RENDER_API_KEY, SERVICE_ID and NEW_VALUE environment variables before running this script."
  echo "Example: RENDER_API_KEY=... SERVICE_ID=svc-xxxxx NEW_VALUE=secret ./render-update-secret-template.sh SMTP_PASS"
  exit 1
fi

ENV_NAME=${1:-SMTP_PASS}

cat <<EOF
# Run this command after filling RENDER_API_KEY, SERVICE_ID, and NEW_VALUE.
# This is a template for Render's API; verify the API endpoint if your Render account differs.

curl -X POST \
  -H "Authorization: Bearer \$RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"${ENV_NAME}","value":"'"\$NEW_VALUE"'","isSecret":true}' \
  https://api.render.com/v1/services/\$SERVICE_ID/env

# After running, redeploy or restart your service in the Render dashboard.
EOF
