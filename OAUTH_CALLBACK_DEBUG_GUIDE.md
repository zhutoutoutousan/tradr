# OAuth 回调卡住问题诊断指南

## 当前问题
**症状**: OAuth 登录后永远卡在登录/注册页面，无法进入应用

## 新版本：v3.6.3-oauth-debug
已部署详细调试版本，包含完整的诊断日志。

## 🔍 如何诊断问题

### Step 1: 打开浏览器开发者工具
1. 按 `F12` 打开开发者工具
2. 切换到 **Console（控制台）** 标签
3. 清空现有日志（点击 🚫 图标）

### Step 2: 开始 OAuth 登录
1. 点击 GitHub 或 Google 登录按钮
2. 完成授权
3. **观察控制台日志**

### Step 3: 查看日志输出

#### ✅ 成功的日志应该是：
```
[Auth Callback] Processing OAuth callback...
[Auth Callback] Full URL: https://...
[Auth Callback] Exchanging code for session...
[Auth Callback] Session created successfully for: your@email.com
[Auth Callback] Session details: { userId: "...", email: "...", provider: "..." }
[Auth Callback] Creating/updating profile for: username
[Auth Callback] Profile created/updated successfully
[Auth Callback] Waiting 500ms before redirect...
[Auth Callback] ✅ Success! Redirecting to /play with full page reload
```

#### ❌ 失败的日志会显示错误：
```
[Auth Callback] OAuth error: [具体错误]
或
[Auth Callback] Exchange error: [具体错误]
或
[Auth Callback] No session returned
或
[Auth Callback] Profile creation error: [具体错误]
```

## 常见错误及解决方案

### 错误 1: "OAuth error: access_denied"
**原因**: 用户在 OAuth 授权页面点击了取消
**解决**: 重新登录并点击"授权"

### 错误 2: "Exchange error: Invalid code"
**原因**: OAuth code 已过期或被使用过
**解决**: 清除浏览器缓存，重新登录

### 错误 3: "No session returned"
**原因**: Supabase 无法创建 session
**可能原因**:
- OAuth redirect URL 配置不正确
- Supabase 项目配置问题
- 浏览器阻止了第三方 cookies

**检查**:
1. Supabase Dashboard → Authentication → URL Configuration
2. 确认 Site URL: `https://tradr-sigma.vercel.app`
3. 确认 Redirect URLs 包含: `https://tradr-sigma.vercel.app/auth/callback`

### 错误 4: "Profile creation error"
**原因**: 数据库写入失败（通常不会阻止登录）
**检查**: Supabase Dashboard → Database → user_profiles 表是否存在

## 📱 发送诊断信息

如果问题仍然存在，请截图或复制以下信息：

1. **完整的控制台日志**（从 `[Auth Callback] Processing...` 开始）
2. **浏览器**: Chrome / Firefox / Safari
3. **登录方式**: GitHub / Google
4. **页面版本号**: 底部应该显示 `v3.6.3-oauth-debug`

## 🔧 临时解决方案

如果 OAuth 登录一直失败，可以尝试：

1. **使用邮箱密码注册**
   - 点击 "Register with Email" 
   - 创建账户后会收到确认邮件
   
2. **清除浏览器数据**
   - Chrome: Settings → Privacy → Clear browsing data
   - 选择 "Cookies" 和 "Cached images"
   - 时间范围: "All time"
   - 清除后重试

3. **使用无痕/隐私模式**
   - Chrome: Ctrl+Shift+N
   - 在无痕窗口中尝试登录

## Supabase OAuth 配置检查清单

### GitHub OAuth
在 Supabase Dashboard → Authentication → Providers → GitHub:
- ✅ GitHub enabled: `true`
- ✅ Client ID: (来自 GitHub OAuth App)
- ✅ Client Secret: (来自 GitHub OAuth App)

在 GitHub OAuth App Settings:
- ✅ Authorization callback URL: `https://bcwxvyomuoolrolspgzn.supabase.co/auth/v1/callback`
- ✅ Application name: tradr
- ✅ Homepage URL: `https://tradr-sigma.vercel.app`

### Google OAuth
在 Supabase Dashboard → Authentication → Providers → Google:
- ✅ Google enabled: `true`
- ✅ Client ID: (来自 Google Cloud Console)
- ✅ Client Secret: (来自 Google Cloud Console)

在 Google Cloud Console → OAuth 2.0 Client:
- ✅ Authorized redirect URIs: `https://bcwxvyomuoolrolspgzn.supabase.co/auth/v1/callback`
- ✅ Authorized JavaScript origins: `https://tradr-sigma.vercel.app`

## 下一步

1. 等待 Vercel 部署完成（2-3 分钟）
2. **硬刷新页面**: `Ctrl + Shift + R`
3. 确认版本号是 **v3.6.3-oauth-debug**
4. 打开 F12 控制台
5. 尝试 OAuth 登录
6. **截图控制台日志并分享**

---

**部署时间**: 2026-10-23 07:42 UTC+2
**版本**: v3.6.3-oauth-debug
**Commit**: 8444367
