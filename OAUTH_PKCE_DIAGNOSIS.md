# OAuth PKCE 问题诊断报告

## 🔍 通过 Playwright 测试发现的问题

### 测试结果摘要

✅ **正常工作的部分**:
1. OAuth 按钮存在且可点击 ("Continue with GitHub", "Continue with Google")
2. 点击后正确跳转到 GitHub/Google 授权页面
3. 回调 URL 配置正确：`https://bcwxvyomuoolrolspgzn.supabase.co/auth/v1/callback`
4. 错误处理正确工作（假 code 和 error 参数都能正确重定向）
5. 调试日志系统工作正常

❌ **发现的核心问题**:
```
[Auth Callback] Exchange error: AuthApiError: invalid request: 
both auth code and code verifier should be non-empty
```

## 🎯 根本原因：PKCE Code Verifier 丢失

### PKCE OAuth 流程

Supabase 使用 PKCE (Proof Key for Code Exchange) 流程：

```
1. 客户端生成 code_verifier (随机字符串)
   ├── 计算 code_challenge = BASE64URL(SHA256(code_verifier))
   └── 存储 code_verifier 到 localStorage
   
2. 跳转到 OAuth provider (GitHub/Google)
   └── 带上 code_challenge 参数
   
3. 用户授权后回调到 Supabase
   └── Supabase 验证 code_challenge
   
4. Supabase 重定向到应用 /auth/callback?code=xxx
   
5. 应用调用 exchangeCodeForSession(code)
   ├── Supabase client 从 localStorage 读取 code_verifier
   ├── 发送 code + code_verifier 到 Supabase
   └── ❌ 如果 verifier 丢失，返回错误！
```

### 为什么 verifier 会丢失？

可能的原因：

1. **localStorage 被清除**
   - 用户使用无痕模式
   - 浏览器自动清理
   - Service Worker 更新导致的刷新

2. **跨域问题**
   - OAuth 跳转过程中 localStorage 访问被阻止
   - 第三方 cookie 被禁用

3. **Supabase client 实例不一致**
   - signInWithOAuth 和 exchangeCodeForSession 使用不同的 client
   - SSR vs Client-side 渲染问题

4. **时序问题**
   - 页面在 OAuth 流程中途刷新
   - Service Worker 控制权变化

## 🔧 解决方案

### 当前代码问题

`web/src/lib/supabase.ts`:
```typescript
export const supabase: SupabaseClient | null = supabaseEnabled
  ? createClient(url as string, anonKey as string, {
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null;
```

**问题**: 没有配置 auth storage 选项！

### 推荐修复

#### 方案 1: 显式配置 localStorage (推荐)

```typescript
import { createClient } from "@supabase/supabase-js";

export const supabase = supabaseEnabled
  ? createClient(url as string, anonKey as string, {
      auth: {
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'sb-auth-token',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true, // 自动从 URL 中检测 session
        flowType: 'pkce' // 显式声明使用 PKCE
      },
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null;
```

#### 方案 2: 使用 @supabase/ssr (Next.js 推荐)

对于 Next.js App Router，应该使用 `@supabase/ssr` 包：

```typescript
import { createBrowserClient } from '@supabase/ssr';

export const supabase = supabaseEnabled
  ? createBrowserClient(url as string, anonKey as string)
  : null;
```

`@supabase/ssr` 专门处理 SSR 场景下的 session 管理。

## 🧪 验证修复

修复后应该看到：
```
[Auth Callback] Processing OAuth callback...
[Auth Callback] Exchanging code for session...
[Auth Callback] Session created successfully for: user@email.com
[Auth Callback] Profile created/updated successfully
[Auth Callback] ✅ Success! Redirecting to /play
```

## 📊 测试脚本

可用的 Playwright 测试脚本：
- `scripts/test-oauth-live.mjs` - 测试首页和基本流程
- `scripts/test-register-page.mjs` - 检查 OAuth 按钮
- `scripts/test-oauth-click.mjs` - 实际点击并跟踪跳转
- `scripts/test-oauth-callback-simulation.mjs` - 模拟回调处理

运行：`node scripts/test-oauth-click.mjs`

## 🎯 下一步

1. ✅ 已诊断问题
2. 🔧 需要修复 supabase.ts 配置
3. 🧪 测试修复是否解决问题
4. 📝 更新文档

---

**诊断完成时间**: 2026-10-23 07:57 UTC+2
**使用工具**: Playwright + Chrome DevTools
**测试 URL**: https://tradr-sigma.vercel.app
