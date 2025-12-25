<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/15SC31GKYC9rZx0bTQ2nMAYv43VC_oGSQ

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set up environment variables:
   - Create a `.env.local` file in the root directory
   - Add your Supabase credentials:
     ```
     VITE_SUPABASE_URL=your_supabase_project_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```
   - Get these values from your Supabase project settings: https://app.supabase.com
   - Optionally set `GEMINI_API_KEY` for AI features
3. Run the app:
   `npm run dev`

## 🗄️ Database Setup (IMPORTANT!)

**Before using the app, you must run the database schema:**

1. Go to your Supabase dashboard → **SQL Editor**
2. Open `supabase/schema.sql` from this project
3. Copy and paste the entire file into the SQL Editor
4. Click **Run** to create all tables and policies

See `SUPABASE_BACKEND_SETUP.md` for detailed instructions.

## Supabase Setup

### Step 1: Create a Supabase Project
1. Go to https://app.supabase.com
2. Sign up or log in
3. Click "New Project"
4. Fill in your project details (name, database password, region)
5. Wait for the project to be created (takes 1-2 minutes)

### Step 2: Find Your API Credentials

There are multiple ways to find your credentials:

#### Method 1: Settings > API (Recommended)
1. Once your project is ready, click on your project
2. In the left sidebar, click on **Settings** (⚙️ gear icon at the bottom)
3. Click on **API** under Project Settings
4. You'll see two important values:
   - **Project URL** - This is your `VITE_SUPABASE_URL`
     - Located at the top of the page under "Project URL"
     - Looks like: `https://xxxxxxxxxxxxx.supabase.co`
     - You can also find this by looking at your project's reference ID in the URL bar or project settings
   - **anon public** key - This is your `VITE_SUPABASE_ANON_KEY`
     - Located in the "Project API keys" section
     - It's the long string under "anon public" (not the "service_role" key!)
     - Click the "Copy" button or eye icon to reveal/copy it
     - Looks like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

#### Method 2: Alternative Locations
- **Project URL**: You can also find it in:
  - **Settings > General** - Look for "Reference ID" and add `.supabase.co` to it
  - The URL format is: `https://[your-reference-id].supabase.co`
  - Or check the browser URL when you're in your project dashboard
  
- **API Key**: You can also find it in:
  - **Settings > API** - Scroll to "Project API keys" section
  - The "anon" key is the one labeled "anon public" or "public anon key"

#### Method 3: Quick Access
- Look at the top of your Supabase dashboard - sometimes the project URL is shown there
- Or check **Settings > General** for the project reference ID and construct the URL manually

### Step 3: Add to Your Project
1. Create a `.env.local` file in the root directory of your project
2. Add the following (replace with your actual values):
   ```
   VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
3. Save the file
4. Restart your dev server if it's running

### Step 4: Enable Email Authentication (Optional)
1. In Supabase dashboard, go to **Authentication** > **Providers**
2. Make sure **Email** is enabled (it should be by default)
3. Configure email templates if needed under **Authentication** > **Email Templates**

The app will automatically handle user authentication, sign up, sign in, and password reset!
