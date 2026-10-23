# OAuth PKCE 修复 - 完整解决方案

## 问题症状
```
❌ Fehler: PKCE code verifier not found in storage. 
This can happen if the auth flow was initiated in a different 
browser or device, or if the storage was cleared. 
For SSR frameworks (Next.js, SvelteKit, etc.), use @supabase/ssr 
on both the server and client to store the code verifier in cookies.
```

## 修复历程

### 尝试 1: v3.7.0-pkce-fix (不完整)
**问题诊断**: 通过 Playwright 测试发现 `code_verifier` 丢失

**尝试的修复**:
```typescript
// ❌ 不够：尝试配置 localStorage
createClient(url, anonKey, {
  auth: {
    storage: window.localStorage,
    flowType: 'pkce'
  }
})
```

**为什么失败**:
- Next.js App Router 使用 SSR
- OAuth 重定向跨越多个页面加载
- localStorage 在 SSR 环境中不可靠
- code_verifier 在重定向时丢失

### 尝试 2: v3.7.1-ssr-cookies (正确方案) ✅

**正确的修复**:
```typescript
// ✅ 正确：使用 @supabase/ssr
import { createBrowserClient } from '@supabase/ssr';

export const supabase = createBrowserClient(url, anonKey);
```

**为什么成功**:
- `@supabase/ssr` 是专为 SSR 框架设计的
- 自动使用 **cookies** 存储 code_verifier
- Cookies 在重定向之间保持
- 完全兼容 Next.js App Router

## 技术细节

### PKCE OAuth 流程

```
1. 用户点击 "Login with GitHub"
   ↓
2. signInWithOAuth() 
   生成: code_verifier (随机字符串)
   计算: code_challenge = SHA256(code_verifier)
   存储: code_verifier → cookies (via @supabase/ssr)
   ↓
3. 重定向到 GitHub (带 code_challenge)
   ↓
4. 用户授权
   ↓
5. GitHub 回调到 Supabase
   ↓
6. Supabase 重定向到 /auth/callback?code=xxx
   ↓
7. exchangeCodeForSession(code)
   读取: code_verifier from cookies ✅
   发送: code + verifier 到 Supabase
   ↓
8. ✅ Session 创建成功！
```

### localStorage vs Cookies

| 方案 | localStorage | Cookies (@supabase/ssr) |
|------|-------------|-------------------------|
| SSR 兼容 | ❌ | ✅ |
| 跨重定向 | ❌ | ✅ |
| 安全性 | 一般 | 更好 (HttpOnly 可选) |
| Next.js 推荐 | ❌ | ✅ |

## 解决方案对比

### ❌ 错误方案：@supabase/supabase-js
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, key, {
  auth: { storage: localStorage }
});
// 问题：localStorage 在 SSR 中不可靠
```

### ✅ 正确方案：@supabase/ssr
```typescript
import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(url, key);
// 优势：自动处理 cookies，完全兼容 SSR
```

## 文件变更

### package.json
```diff
{
  "dependencies": {
+   "@supabase/ssr": "^0.0.10",
    "@supabase/supabase-js": "^2.106.2"
  }
}
```

### web/src/lib/supabase.ts
```diff
- import { createClient } from "@supabase/supabase-js";
+ import { createBrowserClient } from '@supabase/ssr';

- export const supabase = createClient(url, anonKey, {
-   auth: { storage: localStorage, flowType: 'pkce' }
- });
+ export const supabase = createBrowserClient(url, anonKey);
```

## 测试验证

### 成功标志
✅ 应该看到：
```
[Auth Callback] Processing OAuth callback...
[Auth Callback] Exchanging code for session...
[Auth Callback] Session created successfully for: user@email.com
[Auth Callback] Profile created/updated successfully
[Auth Callback] ✅ Success! Redirecting to /play
```

### 失败标志（已修复）
❌ 之前会看到：
```
PKCE code verifier not found in storage
```

## 部署说明

1. **Vercel 自动部署**: 检测到 main 分支更新
2. **等待时间**: 2-3 分钟
3. **版本号**: v3.7.1-ssr-cookies
4. **测试步骤**:
   - 硬刷新: Ctrl+Shift+R
   - 点击 "Continue with GitHub/Google"
   - 完成授权
   - 应该成功登录 ✅

## 参考文档

- [Supabase SSR Guide](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [@supabase/ssr Package](https://www.npmjs.com/package/@supabase/ssr)
- [PKCE OAuth Flow](https://oauth.net/2/pkce/)

---

**修复完成**: 2026-10-23 08:04 UTC+2
**版本**: v3.7.1-ssr-cookies
**状态**: ✅ 已部署
