# Supabase & OAuth Configuration Guide

## 🚨 Critical: Fix Email Confirmation URLs

### 1. Supabase Dashboard Settings

Go to your Supabase project dashboard:
**Authentication → URL Configuration**

Set the following URLs:

```
Site URL: https://www.tradr.it.com

Redirect URLs:
  - https://www.tradr.it.com/**
  - https://www.tradr.it.com/auth/callback
  - http://localhost:3000/** (for local development)
```

### 2. Email Templates (Optional)

Go to **Authentication → Email Templates**

For "Confirm signup" template, ensure the link uses:
```
{{ .ConfirmationURL }}
```

This will automatically use the Site URL configured above.

---

## 🔐 OAuth Setup

### GitHub OAuth

1. **Create GitHub OAuth App**
   - Go to: https://github.com/settings/developers
   - Click "New OAuth App"
   - Fill in:
     - Application name: `Tradr`
     - Homepage URL: `https://www.tradr.it.com`
     - Authorization callback URL: `https://www.tradr.it.com/auth/callback`
   - Copy **Client ID** and **Client Secret**

2. **Configure in Supabase**
   - Go to **Authentication → Providers → GitHub**
   - Enable GitHub
   - Paste Client ID and Client Secret
   - Save

### Google OAuth

1. **Create Google OAuth 2.0 Client**
   - Go to: https://console.cloud.google.com/apis/credentials
   - Create a new project or select existing
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Name: `Tradr`
   - Authorized redirect URIs:
     - `https://www.tradr.it.com/auth/callback`
     - `https://<your-supabase-project>.supabase.co/auth/v1/callback`
   - Copy **Client ID** and **Client Secret**

2. **Configure in Supabase**
   - Go to **Authentication → Providers → Google**
   - Enable Google
   - Paste Client ID and Client Secret
   - Save

---

## ✅ Testing

1. **Local Development**
   - Add to Redirect URLs: `http://localhost:3000/**`
   - Test email signup → check confirmation link
   - Should redirect to localhost during dev

2. **Production**
   - Deploy latest code
   - Test GitHub login
   - Test Google login
   - Test email signup → check confirmation link points to tradr.it.com

---

## 🐛 Troubleshooting

### "localhost" appears in email confirmation link
- Check Supabase Site URL is set to production domain
- Re-deploy after changing Supabase settings

### OAuth "redirect_uri_mismatch" error
- Ensure callback URL in OAuth provider matches: `https://www.tradr.it.com/auth/callback`
- Check Supabase Redirect URLs includes the auth callback

### User profile not created after OAuth login
- Profile creation is triggered by `onAuthStateChange` 
- Check browser console for errors
- Profile is created lazily on first game save
