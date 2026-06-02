# 📋 The MAPIT Manual Deployment Playbook

## 1. One-Time Setup: Lock Keys into GitHub
To stop your terminal from forgetting your logins when the session closes, save them as Codespaces Secrets in your GitHub Repository Settings:
* Go to **Settings -> Secrets and variables -> Codespaces**.
* Add a new secret named `CLOUDFLARE_API_TOKEN` with your token value.
* Add a new secret named `CLOUDFLARE_ACCOUNT_ID` with your ID (`8cb468d0dae016094c99457e601ff46b`).

---

## 2. Every Time You Open Codespaces (The Cold Start)
Because it is a clean cloud machine, always run the install command with the peer dependency override flag before building:

```bash
npm install --legacy-peer-deps
3. Making Your Code ChangesOpen up your files in the left sidebar editor to make adjustments.To tighten vertical layout gaps: Look for the top <section> or <div> containers in client/src/pages/Home.tsx and lower the spacing values (e.g., change py-48 or py-32 down to py-20 or py-16).Save your work: Press Ctrl + S (or Cmd + S).4. Compiling & Deploying Live 🚀When you are ready to push your modifications live to your users, run the direct folder deployment command:Bashnpx wrangler pages deploy dist
When the terminal prompts you:Use your arrow keys to select mapit-skyveedrones and press Enter.Press Enter again to confirm the directory if it asks.5. Saving Your Source Code to GitHubKeep your GitHub repository updated with your latest changes by running these three quick commands in the terminal:Bashgit add .
git commit -m "optimize homepage padding and layout spacing"
git push origin main
🔗 Quick Reference URLsYour Live Production Site: mapit.skyveedrones.comYour Deployment Dashboard: Cloudflare Pages Account Home
### Step 3: Save Your Changes
1. Click the green **Commit changes...** button at the top right.
2. Hit **Commit changes** again on the popup to save.

Once that is done, your playbook will be permanent
