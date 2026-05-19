# Deployment Environment Variables - Copy/Paste Ready

## 🔴 CRITICAL: Copy these exact values to your deployment platforms

---

## 📌 Render Backend - Environment Variables

**Go to:** Render Dashboard → Your Service → Environment

Copy and paste each row exactly:

```
KEY                    VALUE
========================================
SMTP_HOST              smtp-relay.brevo.com
SMTP_PORT              587
SMTP_SECURE            false
SMTP_USER              aae4db001@smtp-brevo.com
SMTP_PASS              <REDACTED_SMTP_PASS>
EMAIL_FROM             farmdirectt2026@gmail.com
CORS_ORIGIN            https://farm-direct-zeta-swart.vercel.app
FRONTEND_BASE          https://farm-direct-zeta-swart.vercel.app
NODE_ENV               production
PORT                   4000
DEBUG_OTP              false
DEBUG_LOGGING          true
AUTO_WISH_ENABLED      false
AUTO_WISH_HOUR         09
AUTO_WISH_MINUTE       00
AUTO_WISH_MESSAGE      Good morning from Farm Direct! Have a great day.
```

**IMPORTANT NOTES:**
- ⚠️ The `SMTP_PASS` is very long - copy carefully, no typos!
- ⚠️ Must have `https://` in CORS_ORIGIN
- ⚠️ After adding variables, click "Save" and then "Manual Deploy" or redeploy via git
- ⚠️ Wait 2-3 minutes for changes to take effect

---

## 🔵 Vercel Frontend - Environment Variables

**Go to:** Vercel Dashboard → Your Project → Settings → Environment Variables

For **Production**:

```
KEY                    VALUE
========================================
VITE_API_BASE          https://farm-direct-api.onrender.com/api
VITE_APP_NAME          Farm Direct
```

For **Development**:

```
KEY                    VALUE
========================================
VITE_API_BASE          http://localhost:4000/api
VITE_APP_NAME          Farm Direct
```

**IMPORTANT NOTES:**
- ✅ Already set if you haven't changed it
- ✅ After saving, redeploy your project
- ✅ Changes take effect immediately on new deployment

---

## ✅ Quick Verification

### **Test Render backend is updated:**
```bash
# Check Render logs should contain:
[SMTP] Configured for host smtp-relay.brevo.com
[CORS] Configured allowed origins: [ 'https://farm-direct-dusky.vercel.app', ... ]
```

### **Test Vercel frontend is updated:**
```
# Open browser DevTools Console (F12)
# Should see one of:
[API Config] Final API_BASE: https://farm-direct-api.onrender.com/api  (PRODUCTION)
[API Config] Final API_BASE: http://localhost:4000/api                (DEVELOPMENT)
```

### **Test OTP sending:**
```bash
curl -X POST https://farm-direct-api.onrender.com/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com"}'

# Should return:
{"success":true,"message":"OTP sent to your email"}

# Check Render logs for:
[OTP SEND] ✓ SMTP Email sent successfully to your-email@example.com
```

---

## 🔑 New Brevo SMTP Credentials (Reference)

**SMTP Server:**
```
smtp-relay.brevo.com
```

**Port:**
```
587 (TLS - not SSL)
```

**Login Email:**
```
aae4db001@smtp-brevo.com
```

**SMTP Key (Password):**
```
<REDACTED_SMTP_PASS>
```

**From Email:**
```
farmdirectt2026@gmail.com
```

⚠️ **Store these securely - never commit to GitHub!**

---

## 🚀 Deployment Steps

### Step 1: Update Render Environment
1. Go to https://render.com
2. Select your **farm-direct-api** service
3. Click **Environment** tab
4. Update all variables from the table above
5. Click **Save** 
6. Click **Manual Deploy** (or push git to auto-deploy)
7. Wait 2-3 minutes for deployment
8. Check logs for success

### Step 2: Update Vercel Environment
1. Go to https://vercel.com
2. Select your **farm-direct** project
3. Click **Settings** → **Environment Variables**
4. Update VITE_API_BASE and VITE_APP_NAME
5. Click **Save**
6. Go to **Deployments** tab
7. Click redeploy on latest deployment
8. Wait 1-2 minutes for deployment

### Step 3: Test Production
1. Open https://farm-direct-dusky.vercel.app
2. Try signup with test email
3. Click "Send OTP"
4. Check email for OTP
5. Enter OTP and verify
6. Open DevTools → Console, search for `[OTP]`
7. Should see successful messages

---

## ⚠️ Common Mistakes

❌ **Wrong:** Copying SMTP_PASS with extra spaces  
✅ **Right:** Copy exactly as shown, no spaces

❌ **Wrong:** CORS_ORIGIN without https://  
✅ **Right:** `https://farm-direct-dusky.vercel.app`

❌ **Wrong:** Forgetting to redeploy after env change  
✅ **Right:** Manually redeploy or push to git

❌ **Wrong:** Using old Brevo credentials  
✅ **Right:** Use NEW credentials from this file

---

## 📞 If Something Goes Wrong

### **OTP not sending:**
1. Check Render logs for `[OTP SEND] ✗`
2. Verify SMTP_PASS is correct (copy-paste again)
3. Set `DEBUG_OTP=true` temporarily to see actual OTP

### **CORS error in console:**
1. Check Render logs for `[CORS] ✗ Origin REJECTED`
2. Verify `CORS_ORIGIN` is exactly `https://farm-direct-dusky.vercel.app`
3. Redeploy Render after changing

### **API requests failing:**
1. Check Vercel logs for API calls
2. Verify `VITE_API_BASE` is correct
3. Open DevTools → Network tab, check request URLs

---

## ✨ That's it! You're done.

All environment variables are ready to copy-paste.  
Follow the 3 deployment steps above.  
Everything will work! 🚀
