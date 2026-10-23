# OAuth Callback 构建冲突修复总结

## 时间线

### 07:05 (UTC+2) - PR #42 合并到 main
- PR #42 "fix: OAuth callback session handling for GitHub and Google login" 被合并
- 包含新的 `web/src/app/auth/callback/page.tsx`

### 07:06 - Vercel 构建失败
```
Error: Turbopack build failed with 1 errors:
Conflicting route and page at /auth/callback: 
route at /auth/callback/route and page at /auth/callback/page
```

## 根本原因

main 分支上**同时存在**两个文件：
- `web/src/app/auth/callback/route.ts` (旧的服务端处理)
- `web/src/app/auth/callback/page.tsx` (新的客户端处理)

Next.js 不允许同一路由同时有 route 和 page 文件。

## 解决方案

1. ✅ 在 main 分支删除了 `route.ts`
2. ✅ 保留 `page.tsx` (新的 OAuth 回调处理)
3. ✅ 推送修复到 main: commit `cca40c0`
4. ✅ 构建验证通过

## 技术细节

### 为什么会有冲突？
- PR #42 创建了 `page.tsx`
- 但 main 分支上已经有 `route.ts` (来自之前的提交)
- 合并时 Git 不会自动删除 `route.ts`，因为这是新增文件，不是修改

### 正确的 OAuth 实现 (page.tsx)
```typescript
// 客户端 OAuth 回调处理
- 使用 supabase.auth.exchangeCodeForSession(code)
- 自动创建 user profile
- 包含 Suspense 边界
- 正确的错误处理和重定向
```

### 已删除的实现 (route.ts)
```typescript
// 旧的服务端实现 - 已删除
- 手动 fetch token endpoint
- Cookie 设置不标准
- 缺少 profile 创建逻辑
```

## 当前状态

✅ **main 分支已修复**
- 只有 `page.tsx`
- 构建成功
- Vercel 部署应该会自动重新触发

## Vercel 部署配置提醒

确保在 Vercel Dashboard 的 **tradr** 项目中设置：
- Root Directory: `web`
- Framework: Next.js
- 环境变量已配置

## 下一步

Vercel 会自动检测到 main 分支的更新并重新构建。
如果没有自动触发，可以手动点击 **Redeploy**。
