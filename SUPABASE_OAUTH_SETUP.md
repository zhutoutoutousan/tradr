# Supabase & OAuth Configuration Guide

## 🚨 Critical: Fix Email Confirmation URLs

### 1. Supabase Dashboard Settings

Go to your Supabase project dashboard:
**Authentication → URL Configuration**

Set the following URLs:

```
Site URL: https://tradr-sigma.vercel.app

Redirect URLs (允许的重定向URL列表):
  - https://tradr-sigma.vercel.app/**
  - http://localhost:3000/** (for local development)
```

⚠️ **注意**: 
- Site URL 是你的**应用域名**
- OAuth 回调URL是你的**Supabase项目URL** (在下面OAuth配置中设置)
- 不要混淆这两个！

### 2. Email Templates (Optional)

Go to **Authentication → Email Templates**

For "Confirm signup" template, ensure the link uses:
```
{{ .ConfirmationURL }}
```

This will automatically use the Site URL configured above.

---

## 🔐 OAuth Setup

### 📖 OAuth 流程说明

理解整个流程很重要：

```
1. 用户点击"Login with GitHub" 
   → 应用调用 supabase.auth.signInWithOAuth()
   
2. 跳转到 GitHub 授权页
   → 用户点击"Authorize"
   
3. GitHub 回调到 Supabase
   → https://bcwxvyomuoolrolspgzn.supabase.co/auth/v1/callback?code=xxx
   
4. Supabase 处理 OAuth 并重定向到你的应用
   → https://tradr-sigma.vercel.app/auth/callback?code=xxx
   
5. 你的应用用 code 交换 session
   → supabase.auth.exchangeCodeForSession(code)
   
6. 成功后重定向到 /play
```

⚠️ **关键点**: 
- GitHub/Google OAuth App 的回调URL **必须指向 Supabase**，不是你的应用！
- 你的应用 `/auth/callback` 页面负责交换 code 为 session

### GitHub OAuth

1. **Create GitHub OAuth App**
   - Go to: https://github.com/settings/developers
   - Click "New OAuth App"
   - Fill in:
     - Application name: `Tradr`
     - Homepage URL: `https://tradr-sigma.vercel.app` (你的生产域名)
     - **Authorization callback URL**: `https://bcwxvyomuoolrolspgzn.supabase.co/auth/v1/callback`
       
       ⚠️ **重要**: 这必须是你的 Supabase 项目URL，不是你的应用URL！
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
   - **Authorized redirect URIs**:
     - `https://bcwxvyomuoolrolspgzn.supabase.co/auth/v1/callback`
     
     ⚠️ **重要**: 只需要 Supabase URL，不需要你的应用URL！
   - **Authorized JavaScript origins**:
     - `https://tradr-sigma.vercel.app`
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

### OAuth 回调失败 - 卡在登录页

**症状**: 点击OAuth登录后，授权完成但回到应用后仍显示未登录

**可能原因**:

1. **GitHub/Google OAuth App 回调URL配置错误**
   
   ❌ 错误配置:
   ```
   Authorization callback URL: https://tradr-sigma.vercel.app/auth/callback
   ```
   
   ✅ 正确配置:
   ```
   Authorization callback URL: https://bcwxvyomuoolrolspgzn.supabase.co/auth/v1/callback
   ```
   
   **解决**: 去 GitHub Settings → OAuth Apps 或 Google Cloud Console，修改回调URL为 Supabase URL

2. **Supabase Site URL 未设置**
   
   检查 Supabase Dashboard → Authentication → URL Configuration:
   - Site URL 必须是: `https://tradr-sigma.vercel.app`
   - Redirect URLs 必须包含: `https://tradr-sigma.vercel.app/**`

3. **浏览器控制台显示具体错误**
   
   按 F12 打开控制台，查看 `[Auth Callback]` 开头的日志：
   - "OAuth error" → 授权被拒绝或配置错误
   - "Exchange error" → code 交换失败
   - "No session returned" → Supabase 无法创建 session

### "localhost" appears in email confirmation link
- Check Supabase Site URL is set to production domain
- Re-deploy after changing Supabase settings

### OAuth "redirect_uri_mismatch" error
- ❌ 不要把应用URL配置到 OAuth App
- ✅ 使用 Supabase URL: `https://bcwxvyomuoolrolspgzn.supabase.co/auth/v1/callback`

### User profile not created after OAuth login
- Profile creation is triggered by callback page
- Check browser console for errors
- Profile table permissions must allow authenticated users to insert/update
