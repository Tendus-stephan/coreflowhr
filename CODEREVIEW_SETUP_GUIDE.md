# CodeRabbit Code Review Setup Guide

This guide will help you set up CodeRabbit to automatically review your code on GitHub pull requests.

## What is CodeRabbit?

CodeRabbit is an AI-powered code review tool that:
- Reviews pull requests automatically
- Detects bugs, security issues, and code quality problems
- Provides inline suggestions and fixes
- Learns your coding style over time
- Works directly in GitHub pull requests

## Setup Steps

### 1. Install CodeRabbit GitHub App

1. Go to [CodeRabbit.ai](https://www.coderabbit.ai/)
2. Click "Sign Up" or "Get Started"
3. Sign in with your **GitHub account**
4. Authorize CodeRabbit to access your GitHub repositories

### 2. Add Your Repository

1. In CodeRabbit dashboard, click **"Add Repository"** or **"Connect Repository"**
2. Select `coreflow` repository (or your repository name)
3. Grant necessary permissions:
   - ✅ Read pull requests
   - ✅ Write comments on pull requests
   - ✅ Read repository code
   - ✅ Access repository metadata

### 3. Configure CodeRabbit Settings (Optional)

You can configure CodeRabbit via:

**Option A: Dashboard Settings**
1. Go to your CodeRabbit dashboard
2. Select your repository
3. Configure:
   - **Review Style**: Full reviews, concise reviews, or custom
   - **Focus Areas**: Security, performance, style, etc.
   - **Branch Protection**: Which branches to review (e.g., `main`, `master`)
   - **Review Triggers**: Automatic or on-request

**Option B: Configuration File** (Recommended for team consistency)

Create a `.coderabbit.yaml` file in your repository root:

```yaml
# .coderabbit.yaml
language: typescript
reviews:
  pull_requests:
    enabled: true
    review_type: full  # full | concise | changed
    request_changes_workflow: false
    high_level_summary: true
    poem_generation: false

# Focus areas
focus:
  - security
  - performance
  - code_quality
  - maintainability
  - style

# Ignore patterns
ignore:
  - "*.test.ts"
  - "*.spec.ts"
  - "dist/**"
  - "node_modules/**"
  - "supabase/migrations/**"

# Custom instructions
custom_instructions: |
  - Focus on React/TypeScript best practices
  - Check for proper error handling
  - Verify API security best practices
  - Ensure proper TypeScript types
  - Check for accessibility issues in UI components
```

### 4. How to Use CodeRabbit

#### Automatic Reviews (Default)

CodeRabbit will **automatically review** every pull request you create:

1. Create a pull request on GitHub
2. CodeRabbit bot will automatically add a review comment
3. Wait a few minutes for the review to complete
4. Check the PR comments for CodeRabbit's feedback

#### Manual Review Requests

You can request a review manually by commenting on your PR:

```
@coderabbitai review
```

For a more comprehensive review:

```
@coderabbitai full review
```

#### Review Updated PRs

When you push new commits to an existing PR, CodeRabbit will:
- Review the new changes
- Update previous comments if issues are fixed
- Add new comments for new issues

### 5. Understanding CodeRabbit Comments

CodeRabbit provides several types of feedback:

#### 🔍 **Change Summary**
- High-level overview of what changed
- Impact analysis
- Potential risks

#### 📝 **Inline Comments**
- Specific line-by-line feedback
- Code suggestions
- Bug detection
- Security warnings

#### ✅ **Suggestions**
- One-click fixes for simple issues
- Code improvements
- Best practice recommendations

#### 📊 **File-by-File Breakdown**
- Review of each modified file
- Dependency analysis
- Logic flow review

### 6. Using CodeRabbit in Your IDE (Optional)

You can also use CodeRabbit **locally** in your IDE:

#### VS Code / Cursor Extension

1. Install "CodeRabbit" extension from marketplace
2. Sign in with your GitHub account
3. Open a file you're editing
4. Click "Review with CodeRabbit" or use command palette
5. Get instant feedback without creating a PR

#### CLI Tool (Terminal)

```bash
# Install CodeRabbit CLI
npm install -g @coderabbitai/cli

# Review uncommitted changes
coderabbit review

# Review specific files
coderabbit review src/components/

# Get concise output
coderabbit review --plain
```

### 7. Best Practices

#### ✅ Do:

- **Start with automatic reviews** on PRs - it's the easiest way
- **Read the summary first** to understand high-level changes
- **Apply simple fixes** using CodeRabbit's suggestions
- **Use manual reviews** for complex changes: `@coderabbitai full review`
- **Train CodeRabbit** by marking suggestions as helpful/unhelpful

#### ❌ Don't:

- Don't blindly accept all suggestions - review them carefully
- Don't ignore security warnings
- Don't disable CodeRabbit entirely if it's too noisy - configure it instead

### 8. Customizing for Your Project

Since this is a **React/TypeScript** project with **Supabase**, here's a recommended config:

```yaml
# .coderabbit.yaml
language: typescript
reviews:
  pull_requests:
    enabled: true
    review_type: full

focus:
  - security
  - performance
  - type_safety
  - api_security
  - react_best_practices

ignore:
  - "dist/**"
  - "node_modules/**"
  - "supabase/migrations/**"
  - "*.test.ts"
  - "*.test.tsx"
  - "build/**"

custom_instructions: |
  This is a React + TypeScript recruitment platform (CoreFlowHR) with:
  - Supabase backend (PostgreSQL, Auth, Edge Functions)
  - Stripe payment integration
  - AI/ML features (Gemini API)
  - Email workflows (Resend)
  
  Focus on:
  - React hooks best practices
  - TypeScript type safety
  - API security (auth checks, RLS policies)
  - Stripe webhook security
  - Error handling patterns
  - Accessibility in UI components
  - Performance optimization for large candidate lists
```

### 9. Troubleshooting

**CodeRabbit not reviewing PRs?**
- Check that CodeRabbit app is installed on your repository
- Verify repository permissions in CodeRabbit dashboard
- Check if PR is targeting the right branch (main/master)

**Too many comments?**
- Adjust `review_type` to `concise` in config
- Disable specific focus areas you don't need
- Add more ignore patterns

**Want CodeRabbit to ignore specific code?**
- Add comment: `// coderabbit: ignore` above the code
- Or add file patterns to `ignore` in config

### 10. Quick Start Checklist

- [ ] Sign up at coderabbit.ai with GitHub
- [ ] Install CodeRabbit GitHub App
- [ ] Add `coreflow` repository
- [ ] (Optional) Create `.coderabbit.yaml` config file
- [ ] Create a test PR to verify it's working
- [ ] Review CodeRabbit's feedback
- [ ] Configure settings based on your needs

---

## Next Steps

1. **Try it now**: Create a small test PR and see CodeRabbit in action
2. **Customize**: Add `.coderabbit.yaml` to match your team's preferences
3. **Integrate**: Use it on all future PRs for automated code reviews

## Resources

- **Documentation**: https://docs.coderabbit.ai/
- **Dashboard**: https://app.coderabbit.ai/
- **Support**: Check CodeRabbit docs or their Discord/community

---

**Note**: CodeRabbit has a free tier for open source projects and paid tiers for private repositories. Check their pricing page for details.
