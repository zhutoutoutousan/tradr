# Vercel 部署配置说明

## ⚠️ 重要：使用现有项目而非新建

**不要创建新的 Vercel 项目！** 请在现有的 `tradr` (tradr-sigma.vercel.app) 项目中配置。

如果不小心创建了 `web` 项目，请：
1. 进入错误的项目 Settings → Advanced → Delete Project
2. 然后在正确的 `tradr` 项目中配置

## 问题
```
Build Failed
No Next.js version detected. Make sure your package.json has "next" 
in either "dependencies" or "devDependencies".
```

## 原因
项目是 monorepo 结构，Next.js 应用在 `web/` 子目录中，而 Vercel 默认在根目录查找 `package.json`。

## 解决方案

### 在现有的 `tradr` 项目 (tradr-sigma.vercel.app) 中配置

1. 打开 **tradr** 项目（不是 web 项目）
2. 进入 **Settings** → **General**
3. 找到 **Build & Development Settings**
4. 设置以下配置：

   ```
   Framework Preset: Next.js
   Root Directory: web              ← 关键！
   Build Command: npm run build
   Output Directory: (留空，使用默认)
   Install Command: npm install
   ```

5. 保存并重新部署（Deployments → Redeploy）

### 方案 2：使用 vercel.json（已配置）

项目已经创建了 `web/vercel.json` 配置文件。如果你在 Vercel Dashboard 中正确设置了 Root Directory 为 "web"，这个配置会自动生效。

### ❌ 如果不小心创建了错误的项目

1. 进入错误的 `web` 项目
2. Settings → Advanced → Delete Project
3. 确认删除
4. 回到正确的 `tradr` 项目进行配置

### 环境变量

确保在 Vercel 项目设置中配置以下环境变量：

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_key (可选)
```

### 验证步骤

1. 确认 Root Directory 设置为 `web`
2. 确认环境变量已配置
3. 点击 **Redeploy** 重新部署

### 项目结构

```
/workspace/
├── web/                    ← Next.js 应用所在目录
│   ├── package.json       ← 包含 next 依赖
│   ├── next.config.ts
│   ├── src/
│   └── vercel.json        ← Vercel 配置文件
├── cluster-latest/
└── vercel.json            ← 根目录配置（用于 monorepo）
```

## 常见问题

**Q: 为什么不能自动检测？**  
A: Vercel 默认在项目根目录查找配置，而我们的 Next.js 应用在子目录中。

**Q: 我需要改代码吗？**  
A: 不需要，只需要在 Vercel Dashboard 中设置 Root Directory。

**Q: 部署后环境变量在哪里？**  
A: Settings → Environment Variables

## 立即行动

### Step 1: 删除错误的 `web` 项目（如果创建了）
1. 在 Vercel Dashboard 中打开 `web` 项目
2. Settings → Advanced → Delete Project → 确认删除

### Step 2: 在正确的 `tradr` 项目中配置
**在 tradr-sigma.vercel.app 项目中：**
1. Settings → General → Root Directory → 输入 `web`
2. Framework Preset → 选择 `Next.js`
3. Settings → Environment Variables → 添加 Supabase 配置
4. Deployments → 最新失败的部署 → **Redeploy**

完成后，部署应该会成功！🚀
