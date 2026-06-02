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
