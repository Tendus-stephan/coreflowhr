# Development Environment Setup

## Prerequisites
- Node.js v20
- npm

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory with the following placeholder values:

```env
VITE_SUPABASE_URL=https://placeholder.supabase.co
VITE_SUPABASE_ANON_KEY=placeholder-anon-key
```

**Note:** These are placeholder values for development. The app will load and render the UI, but authentication features will not work without valid Supabase credentials. This allows developers to work on the frontend without needing database access.

### 3. Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:3002`.

## Verification

The development environment is working correctly if you can:
- ✅ Navigate to `http://localhost:3002` and see the landing page
- ✅ Click "Get Started" and navigate to the signup page
- ✅ Fill out the signup form (forms are interactive)
- ✅ Scroll through the landing page to see features, integrations, and pricing sections

## Expected Behavior

With placeholder Supabase credentials:
- **Working:** UI rendering, navigation, form inputs, landing page sections
- **Not Working:** Authentication (signup/login), database operations
- **Expected Errors:** "Failed to fetch" when attempting to create an account

This is the intended behavior for frontend development without backend access.

## Testing Checklist

- [x] Landing page loads with CoreFlow branding and navigation
- [x] Hero section displays "Built for Recruitment Agencies" heading
- [x] Dashboard preview shows recruitment metrics and pipeline
- [x] "Get Started" button navigates to signup page
- [x] Signup form accepts user input (name, email, password)
- [x] Form validation and submission work (fails gracefully without Supabase)
- [x] "Why Agencies Choose CoreFlow" features section displays
- [x] "Everything you need to hire the best" features section displays
- [x] "Seamless Integrations" section shows Slack, Google Workspace, Zoom
- [x] "Choose Your Perfect Plan" pricing section displays with Basic ($49) and Professional ($99) tiers

## Browser Compatibility

Tested and verified in:
- ✅ Google Chrome (latest)

## Development Server Details

- **Port:** 3002
- **HMR:** Enabled on port 3002
- **Build Tool:** Vite
- **Framework:** React + TypeScript
