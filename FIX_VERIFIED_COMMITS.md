# Fix: Deployment Canceled - Unverified Commit

## Problem
Vercel canceled the deployment because "Require Verified Commits" is enabled in your project settings, but your commits aren't GPG signed.

## Solution Options

### Option 1: Disable Verified Commits Requirement (Recommended for Quick Fix)

1. Go to https://vercel.com/dashboard
2. Click on your project (`coreflow`)
3. Go to **Settings** → **Git**
4. Scroll down to find **"Require Verified Commits"** setting
5. **Disable** (turn off) the "Require Verified Commits" toggle
6. Save the changes
7. **Redeploy** your latest deployment:
   - Go to **Deployments** tab
   - Click the "..." menu on the latest deployment
   - Select **"Redeploy"**

### Option 2: Redeploy from Vercel Dashboard (May Bypass Check)

1. Go to https://vercel.com/dashboard
2. Click on your project
3. Go to **Deployments** tab
4. Find the deployment that was canceled (or the latest one)
5. Click the **"..."** menu (three dots)
6. Select **"Redeploy"**
7. This may bypass the verified commit check

### Option 3: Set Up GPG Signing (For Long-term Solution)

If you want to keep verified commits enabled, you'll need to sign your commits:

#### On Windows (Git Bash or PowerShell):

1. **Install GPG** (if not already installed):
   - Download from: https://www.gpg4win.org/
   - Or use: `winget install GnuPG.GnuPG`

2. **Generate a GPG key**:
   ```bash
   gpg --full-generate-key
   ```
   - Choose RSA and RSA (default)
   - Key size: 4096
   - Set expiration (or 0 for no expiration)
   - Enter your name and email (must match GitHub email)
   - Set a passphrase

3. **List your GPG keys**:
   ```bash
   gpg --list-secret-keys --keyid-format=long
   ```

4. **Copy the key ID** (the long string after `sec rsa4096/`)

5. **Configure Git to use GPG**:
   ```bash
   git config --global user.signingkey YOUR_KEY_ID
   git config --global commit.gpgsign true
   ```

6. **Add GPG key to GitHub**:
   - Export public key: `gpg --armor --export YOUR_KEY_ID`
   - Copy the output (starts with `-----BEGIN PGP PUBLIC KEY BLOCK-----`)
   - Go to GitHub → Settings → SSH and GPG keys → New GPG key
   - Paste the key and save

7. **Test signing a commit**:
   ```bash
   git commit --allow-empty -m "Test signed commit"
   ```

## Quick Fix (Recommended Now)

**Just disable "Require Verified Commits" in Vercel settings** - this is the fastest way to get your deployments working again.

After disabling it:
1. The canceled deployment should automatically retry, OR
2. Manually redeploy from the Deployments tab

