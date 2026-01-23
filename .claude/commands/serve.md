Start the local dev server with Netlify Functions.

Steps:
1. Kill any existing processes on ports 8888 and 5174 (use `netstat -ano | grep -E "8888|5174" | grep LISTENING` to find PIDs, then `taskkill //F //PID <pid>` for each)
2. Run the server in bash background (NOT `run_in_background`): `cd C:/WORKSPACE/AITOOLS/AiTools && node "/c/Users/chris/AppData/Roaming/npm/node_modules/netlify-cli/bin/run.js" dev < /dev/null > /tmp/netlify-dev.log 2>&1 & echo "PID: $!"`
3. dont wait just tell the user to wait a few seconds and test the server
