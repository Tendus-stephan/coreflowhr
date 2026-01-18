# 🔗 Railway: Share Variables with Your Service

## ✅ You're in the Right Place!

You're on Railway's **Shared Variables** page. You've already created:
- ✅ `APIFY_API_TOKEN`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `SUPABASE_URL`

## ⚠️ Important: Share Variables with Your Service

**Shared Variables** are available to use, but you need to **add them to your service** for them to work.

### Option 1: From the Notification (Easiest)

1. Click **"Share with services >"** in the green notification at the bottom
2. Select your scraper server service
3. The variables will be added automatically

### Option 2: From Your Service Page

1. Go to your **service** (the scraper server deployment)
2. Click on the service name
3. Go to **Variables** tab
4. Click **+ New Variable** or **Add from Shared**
5. Select the shared variables you want to use
6. They'll be available to your service

### Option 3: Add Directly to Service

1. Go to your service page
2. Click **Variables** tab
3. Click **+ New Variable**
4. For each variable:
   - **Name**: `APIFY_API_TOKEN`
   - **Value**: Use the shared variable reference: `${{APIFY_API_TOKEN}}`
   - Or just enter the value directly

---

## 🔍 How to Check if Variables Are Active

After sharing variables with your service:

1. Go to your **service** page
2. Click **Variables** tab
3. You should see all your variables listed
4. They should show the actual values (or be marked as shared)

---

## 📋 Quick Checklist

- [ ] Variables created in Shared Variables ✅ (You've done this!)
- [ ] Variables shared with your scraper server service
- [ ] Service deployed with variables
- [ ] Test: Visit `https://your-app.railway.app/api/diagnostic`

---

## 🚀 After Sharing Variables

1. **Redeploy your service** (if it's already deployed):
   - Go to your service
   - Click **Deploy** or **Redeploy**
   - Or push a new commit

2. **Verify variables are working**:
   - Visit: `https://your-app.railway.app/api/diagnostic`
   - Should show `apify.configured: true` if APIFY_API_TOKEN is working

---

## 💡 Pro Tip

If you see yellow warning icons, they might indicate:
- Variable not shared with service yet
- Variable value might be empty
- Variable needs to be referenced properly

After sharing with your service, the warnings should go away.
