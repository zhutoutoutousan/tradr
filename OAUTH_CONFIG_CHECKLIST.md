# OAuth 配置快速检查清单

## 🚨 当前问题："登录回调之后永远卡在登录注册页面上"

## ✅ 配置检查清单

### 1. GitHub OAuth App 设置
打开 https://github.com/settings/developers → 找到你的 OAuth App

必须配置：
```
✅ Application name: tradr (或任意名称)
✅ Homepage URL: https://tradr-sigma.vercel.app
✅ Authorization callback URL: https://bcwxvyomuoolrolspgzn.supabase.co/auth/v1/callback
```

⚠️ **最常见错误**:
```
❌ Authorization callback URL: https://tradr-sigma.vercel.app/auth/callback
   这是错的！必须是 Supabase URL，不是你的应用URL！
```

### 2. Google OAuth Client 设置
打开 https://console.cloud.google.com/apis/credentials

必须配置：
```
✅ Application type: Web application
✅ Authorized JavaScript origins: https://tradr-sigma.vercel.app
✅ Authorized redirect URIs: https://bcwxvyomuoolrolspgzn.supabase.co/auth/v1/callback
```

⚠️ **不要添加**:
```
❌ https://tradr-sigma.vercel.app/auth/callback (不需要！)
```

### 3. Supabase Dashboard 设置
打开 Supabase Dashboard → Authentication

#### URL Configuration:
```
✅ Site URL: https://tradr-sigma.vercel.app
✅ Redirect URLs: 
   - https://tradr-sigma.vercel.app/**
```

#### Providers → GitHub:
```
✅ GitHub enabled: ON
✅ Client ID: (从 GitHub OAuth App 复制)
✅ Client Secret: (从 GitHub OAuth App 复制)
```

#### Providers → Google:
```
✅ Google enabled: ON
✅ Client ID: (从 Google Cloud Console 复制)
✅ Client Secret: (从 Google Cloud Console 复制)
```

## 🔍 快速测试步骤

### 测试 1: 检查 OAuth 流程

1. 打开 https://tradr-sigma.vercel.app
2. 按 F12 打开控制台
3. 清空日志
4. 点击 "Login with GitHub"
5. **不要关闭控制台**
6. 完成 GitHub 授权
7. 观察控制台输出

**期望的日志**:
```
[Auth Callback] Processing OAuth callback...
[Auth Callback] Full URL: https://tradr-sigma.vercel.app/auth/callback?code=...
[Auth Callback] Exchanging code for session...
[Auth Callback] Session created successfully for: your@email.com
[Auth Callback] ✅ Success! Redirecting to /play
```

**如果看到错误**:
```
[Auth Callback] OAuth error: ... 
→ 授权被拒绝或配置错误

[Auth Callback] Exchange error: Invalid code
→ code 已过期或被重复使用

[Auth Callback] No session returned
→ Supabase 无法创建 session，检查回调URL配置
```

### 测试 2: 直接检查 GitHub OAuth 配置

在浏览器输入：
```
https://github.com/login/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=https://bcwxvyomuoolrolspgzn.supabase.co/auth/v1/callback
```

- 如果出现 "redirect_uri_mismatch" → GitHub OAuth App 回调URL配置错误
- 如果正常跳转到授权页 → 配置正确

## 🔧 修复步骤

### 如果回调URL配置错误

1. **修复 GitHub OAuth App**
   - 打开 https://github.com/settings/developers
   - 点击你的 OAuth App
   - 修改 "Authorization callback URL" 为:
     ```
     https://bcwxvyomuoolrolspgzn.supabase.co/auth/v1/callback
     ```
   - 点击 "Update application"

2. **修复 Google OAuth Client**
   - 打开 https://console.cloud.google.com/apis/credentials
   - 点击你的 OAuth 2.0 Client
   - 修改 "Authorized redirect URIs" 为:
     ```
     https://bcwxvyomuoolrolspgzn.supabase.co/auth/v1/callback
     ```
   - 移除任何 tradr-sigma.vercel.app/auth/callback 的配置
   - 保存

3. **清除浏览器缓存并重试**
   - Ctrl + Shift + R (硬刷新)
   - 或使用无痕模式
   - 重新测试 OAuth 登录

## 📊 预期结果

修复后，OAuth 流程应该是：

```
1. 用户点击 "Login with GitHub"
   ↓
2. 跳转到 GitHub 授权页
   ↓
3. 用户点击 "Authorize"
   ↓
4. GitHub 回调到: https://bcwxvyomuoolrolspgzn.supabase.co/auth/v1/callback?code=xxx
   ↓
5. Supabase 处理后重定向到: https://tradr-sigma.vercel.app/auth/callback?code=xxx
   ↓
6. 应用交换 code 为 session
   ↓
7. 页面刷新并跳转到 /play
   ↓
8. ✅ 用户已登录，显示 Profile 卡片
```

## 🆘 如果还是不行

发送以下信息：

1. **浏览器控制台完整日志** (从 `[Auth Callback]` 开始的所有行)
2. **GitHub OAuth App 截图** (显示回调URL配置)
3. **Supabase URL Configuration 截图**
4. **网站版本号** (页面底部，应该是 v3.6.3-oauth-debug)

---

**当前版本**: v3.6.3-oauth-debug
**最后更新**: 2026-10-23 07:47 UTC+2
