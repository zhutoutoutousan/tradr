# OAuth 登录态问题最终修复

## 问题描述
**用户反馈**: "登录Google GitHub完了之后没有更新登录态"

虽然 OAuth 登录流程成功完成，session 创建正常，但返回应用后用户仍然显示为未登录状态。

## 根本原因

使用 Next.js App Router 的 `router.push('/play')` 进行**客户端路由导航**时：
- 页面组件会重新渲染
- 但 Supabase client 实例**不会重新初始化**
- 旧的 client 实例仍然持有 OAuth 登录前的空 session 状态
- 即使 localStorage 中已经有新的 session token，client 也不会自动读取

## 解决方案

将所有 OAuth callback 重定向改为**完整页面刷新**：

```typescript
// ❌ 错误：客户端路由 (session 不更新)
router.push('/play');

// ✅ 正确：完整页面刷新 (强制重新初始化 Supabase client)
window.location.href = '/play';
```

### 修改的文件
- `web/src/app/auth/callback/page.tsx`
  - 成功登录后：`window.location.href = '/play'`
  - 错误情况：`window.location.href = '/register?error=...'`

## 技术细节

### Supabase Client 初始化流程
1. 页面加载时创建 Supabase client 实例
2. Client 从 localStorage 读取 `supabase.auth.token`
3. 如果 token 存在，自动恢复 session

### 为什么需要完整刷新？
- `router.push()` = React 组件重新渲染，但全局 client 实例保持不变
- `window.location.href` = 完整页面刷新，重新创建 client 实例
- 新的 client 实例会从 localStorage 读取新的 token

## 测试验证

### 登录流程
1. 点击 GitHub/Google 登录按钮
2. 完成 OAuth 授权
3. 回调到 `/auth/callback`
4. 交换 code 为 session ✅
5. 创建 user profile ✅
6. **完整页面刷新到 `/play`** ✅
7. ModeSelect 检测到登录状态 ✅
8. 显示用户信息和 Profile 卡片 ✅

## 部署

- Commit: `b8ce9b9`
- 已推送到 main 分支
- Vercel 会自动部署
- 预计生效时间：2-3 分钟

## 预期结果

用户通过 OAuth 登录后：
- ✅ Session 正确创建
- ✅ 页面完整刷新
- ✅ Supabase client 读取新 session
- ✅ ModeSelect 显示登录状态
- ✅ Profile 卡片正常显示
- ✅ 可以访问 `/profile` 页面

---

**修复状态**: ✅ 已完成并部署
**版本**: v3.6.2 (预计)
