import { chromium } from 'playwright';

async function testOAuthFlow() {
  console.log('🚀 Starting OAuth Flow Test\n');
  
  const browser = await chromium.launch({
    headless: false, // 显示浏览器
    slowMo: 500 // 慢速执行，方便观察
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  // 收集控制台日志
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);
    console.log(`[CONSOLE] ${text}`);
  });
  
  // 收集网络请求
  page.on('request', request => {
    if (request.url().includes('auth') || request.url().includes('supabase')) {
      console.log(`[REQUEST] ${request.method()} ${request.url()}`);
    }
  });
  
  // 收集网络响应
  page.on('response', response => {
    if (response.url().includes('auth') || response.url().includes('supabase')) {
      console.log(`[RESPONSE] ${response.status()} ${response.url()}`);
    }
  });
  
  try {
    // 1. 访问生产网站
    console.log('\n📱 Step 1: Navigating to production site...');
    await page.goto('https://tradr-sigma.vercel.app/', { waitUntil: 'networkidle' });
    
    // 等待页面加载
    await page.waitForTimeout(2000);
    
    // 检查版本号
    const version = await page.textContent('body').catch(() => 'version not found');
    console.log(`Version on page: ${version.includes('v3.6.3') ? 'v3.6.3-oauth-debug ✅' : 'version not detected'}`);
    
    // 2. 查找登录按钮
    console.log('\n🔍 Step 2: Looking for OAuth login buttons...');
    
    // 尝试找到 GitHub 或 Google 登录按钮
    const githubButton = page.locator('button:has-text("GitHub"), button:has-text("github"), a:has-text("GitHub")');
    const googleButton = page.locator('button:has-text("Google"), button:has-text("google"), a:has-text("Google")');
    
    const hasGithub = await githubButton.count() > 0;
    const hasGoogle = await googleButton.count() > 0;
    
    console.log(`GitHub button found: ${hasGithub ? '✅' : '❌'}`);
    console.log(`Google button found: ${hasGoogle ? '✅' : '❌'}`);
    
    // 截图当前页面
    await page.screenshot({ path: '/tmp/oauth-test-homepage.png', fullPage: true });
    console.log('📸 Screenshot saved: /tmp/oauth-test-homepage.png');
    
    // 3. 检查 /auth/callback 页面直接访问
    console.log('\n🔗 Step 3: Testing /auth/callback page directly...');
    await page.goto('https://tradr-sigma.vercel.app/auth/callback', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    const finalUrl = page.url();
    console.log(`Final URL after callback: ${finalUrl}`);
    
    // 检查是否被重定向
    if (finalUrl.includes('/register')) {
      console.log('✅ Correctly redirected to /register (no code parameter)');
      
      // 检查是否有错误参数
      const url = new URL(finalUrl);
      const error = url.searchParams.get('error');
      if (error) {
        console.log(`   Error parameter: ${error}`);
      }
    } else if (finalUrl.includes('/auth/callback')) {
      console.log('⚠️ Still on /auth/callback page');
      const pageContent = await page.textContent('body');
      console.log(`   Page content: ${pageContent.substring(0, 200)}`);
    }
    
    await page.screenshot({ path: '/tmp/oauth-test-callback.png', fullPage: true });
    console.log('📸 Screenshot saved: /tmp/oauth-test-callback.png');
    
    // 4. 打印收集到的控制台日志
    console.log('\n📋 Console Logs Summary:');
    const authLogs = consoleLogs.filter(log => log.includes('[Auth Callback]'));
    if (authLogs.length > 0) {
      console.log('Auth Callback logs found:');
      authLogs.forEach(log => console.log(`  ${log}`));
    } else {
      console.log('No [Auth Callback] logs found');
    }
    
    // 5. 检查 localStorage
    console.log('\n💾 Checking localStorage...');
    const localStorage = await page.evaluate(() => {
      const keys = Object.keys(window.localStorage);
      const data = {};
      keys.forEach(key => {
        if (key.includes('supabase') || key.includes('auth')) {
          data[key] = window.localStorage.getItem(key)?.substring(0, 100) + '...';
        }
      });
      return data;
    });
    console.log('LocalStorage auth data:', localStorage);
    
    console.log('\n✅ Test completed. Browser will stay open for 10 seconds...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('\n❌ Error during test:', error);
    await page.screenshot({ path: '/tmp/oauth-test-error.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('\n🏁 Test finished');
  }
}

testOAuthFlow().catch(console.error);
