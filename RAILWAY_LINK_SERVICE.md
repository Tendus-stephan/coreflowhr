# 🔗 Railway: Link to Service

## The Issue
```
No service linked
Run `railway service` to link a service
```

You need to link your Railway project to a service before setting variables.

## ✅ Solution: Link to Your Service

### Option 1: Interactive CLI (Easiest)

```bash
# Run this command and select your service
railway service
```

You'll see a list:
- Select `coreflowhr` (or whatever service you created)

### Option 2: Link by Service Name

```bash
# If you know the service name
railway link --service coreflowhr
```

### Option 3: Link via Project First

If you haven't initialized Railway yet:

```bash
# Initialize Railway project
railway init

# Then link to service
railway service
```

---

## 📋 Complete Flow

```bash
# 1. Login (if not already)
railway login

# 2. Initialize project (if not already)
railway init

# 3. Link to service
railway service
# Select: coreflowhr

# 4. NOW you can set variables
railway variables --set "APIFY_API_TOKEN=your-token"
railway variables --set "SUPABASE_URL=https://..."
railway variables --set "SUPABASE_SERVICE_ROLE_KEY=your-key"

# 5. Verify
railway variables

# 6. Deploy
railway up
```

---

## 🎯 Quick Fix

**Just run:**
```bash
railway service
```

**Then select `coreflowhr` from the list.**

After that, your `railway variables --set` commands will work!
