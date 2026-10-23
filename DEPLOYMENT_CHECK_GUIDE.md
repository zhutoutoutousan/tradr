# Vercel 部署检查和强制刷新指南

## 当前状态
- ✅ OAuth 修复已推送到 main: commit `b8ce9b9`
- ✅ 版本号已更新到 v3.6.2-oauth-fix: commit `7b7e72a`
- 📦 等待 Vercel 自动部署

## 如果版本号仍然是 3.6.1

### 方案 1: 检查 Vercel 部署状态（推荐）

1. 打开 Vercel Dashboard: https://vercel.com/dashboard
2. 进入 **tradr** 项目
3. 点击 **Deployments** 标签
4. 检查最新部署：
   - 如果**正在构建** (Building): 等待 2-3 分钟
   - 如果**成功但是旧 commit**: 点击右上角 **Deploy** → 选择 main 分支 → Deploy
   - 如果**失败**: 查看日志，可能需要检查配置

### 方案 2: 手动触发部署

在 Vercel Dashboard 中：
1. 点击右上角 **Deploy** 按钮
2. 选择 **Branch**: `main`
3. 点击 **Deploy** 确认
4. 等待构建完成（通常 2-3 分钟）

### 方案 3: 清除浏览器缓存

即使 Vercel 已经部署新版本，浏览器可能缓存了旧版本：

**Chrome / Edge:**
- Windows: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

**Firefox:**
- Windows: `Ctrl + F5`
- Mac: `Cmd + Shift + R`

**Safari:**
- `Cmd + Option + R`

**或者完全清除缓存:**
1. 打开开发者工具 (F12)
2. 右键点击刷新按钮
3. 选择 "清空缓存并硬性重新加载"

## 如何验证新版本已部署

### 方法 1: 检查版本号
打开网站，页面底部应该显示：
```
v3.6.2-oauth-fix
```

### 方法 2: 检查控制台日志
1. 打开浏览器开发者工具 (F12)
2. 进入 Console 标签
3. 刷新页面
4. 应该看不到错误
5. OAuth 登录后应该看到：
   ```
   [Auth Callback] Processing OAuth callback...
   [Auth Callback] Session created successfully for: your@email.com
   [Auth Callback] Profile created/updated
   [Auth Callback] Redirecting to /play with full page reload
   ```

### 方法 3: 测试 OAuth 登录
1. 清除浏览器缓存 (Ctrl+Shift+R)
2. 访问网站
3. 点击 GitHub 或 Google 登录
4. 完成授权
5. **应该看到登录态并显示 Profile 卡片**

## 最近的提交

```
7b7e72a - chore: Bump version to v3.6.2-oauth-fix (最新)
2b7c58f - docs: Add OAuth state fix final documentation
b8ce9b9 - fix: Force full page reload after OAuth login ← 关键修复
8e3556b - docs: Add OAuth callback conflict fix summary
cca40c0 - fix: Remove conflicting route.ts in auth callback
```

## 如果还是不行

1. **检查 Vercel 环境变量**
   - Settings → Environment Variables
   - 确认 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 已配置

2. **检查 Root Directory**
   - Settings → General → Build & Development Settings
   - Root Directory 应该是 `web`

3. **查看构建日志**
   - Deployments → 最新部署 → View Build Logs
   - 检查是否有错误

---

**预计部署时间**: 2-5 分钟
**当前时间**: 07:34 (UTC+2)
**预计完成**: 07:37-07:39

等待 Vercel 部署完成后，**硬刷新浏览器** (Ctrl+Shift+R)，然后测试 OAuth 登录！
