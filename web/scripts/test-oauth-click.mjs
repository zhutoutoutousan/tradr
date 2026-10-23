import { chromium } from 'playwright';

async function testOAuthClick() {
  console.log('🚀 Testing actual OAuth button click flow\n');
  
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // 收集所有控制台日志
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push({ type: msg.type(), text });
    console.log(`[${msg.type().toUpperCase()}] ${text}`);
  });
  
  // 收集网络错误
  page.on('pageerror', error => {
    console.log(`[PAGE ERROR] ${error.message}`);
  });
  
  try {
    console.log('📱 Step 1: Navigate to /register');
    await page.goto('https://tradr-sigma.vercel.app/register', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    console.log('\n🔘 Step 2: Click "Continue with GitHub" button');
    const githubButton = page.locator('button:has-text("Continue with GitHub")');
    
    // 确认按钮存在且可见
    await githubButton.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✅ GitHub button is visible');
    
    // 监听新页面/弹窗
    const popupPromise = context.waitForEvent('page', { timeout: 10000 }).catch(() => null);
    
    // 监听导航
    const navigationPromise = page.waitForNavigation({ timeout: 10000 }).catch(() => null);
    
    // 点击按钮
    await githubButton.click();
    console.log('✅ Clicked GitHub button');
    
    await page.waitForTimeout(3000);
    
    // 检查是否打开了新页面或弹窗
    const popup = await popupPromise;
    if (popup) {
      console.log('\n✅ New page/popup opened');
      console.log(`   URL: ${popup.url()}`);
      
      // 检查是否是 GitHub OAuth 页面
      if (popup.url().includes('github.com')) {
        console.log('✅ Redirected to GitHub OAuth page!');
        await popup.screenshot({ path: '/tmp/oauth-test-github-page.png', fullPage: true });
        console.log('📸 Screenshot saved: /tmp/oauth-test-github-page.png');
      } else if (popup.url().includes('supabase.co')) {
        console.log('⚠️ Redirected to Supabase (intermediate step)');
      }
    } else {
      console.log('\n⚠️ No popup opened');
    }
    
    // 检查当前页面URL
    await navigationPromise;
    const currentUrl = page.url();
    console.log(`\n📍 Current page URL: ${currentUrl}`);
    
    if (currentUrl.includes('github.com')) {
      console.log('✅ Same page redirected to GitHub!');
      await page.screenshot({ path: '/tmp/oauth-test-github-redirect.png', fullPage: true });
    } else if (currentUrl.includes('supabase.co')) {
      console.log('✅ Redirected to Supabase auth endpoint');
      await page.waitForTimeout(2000);
      const finalUrl = page.url();
      console.log(`   Final URL: ${finalUrl}`);
      
      if (finalUrl.includes('github.com')) {
        console.log('✅ Supabase redirected to GitHub!');
        await page.screenshot({ path: '/tmp/oauth-test-github-via-supabase.png', fullPage: true });
      }
    } else if (currentUrl === 'https://tradr-sigma.vercel.app/register') {
      console.log('❌ Still on register page - button might not be working!');
      
      // 检查是否有错误
      const authCallbackLogs = consoleLogs.filter(log => log.text.includes('[Auth'));
      if (authCallbackLogs.length > 0) {
        console.log('\n📋 Auth-related console logs:');
        authCallbackLogs.forEach(log => console.log(`   ${log.text}`));
      }
    }
    
    // 打印所有 Auth 相关的日志
    console.log('\n📋 All Auth Callback Logs:');
    const authLogs = consoleLogs.filter(log => log.text.includes('[Auth Callback]'));
    if (authLogs.length > 0) {
      authLogs.forEach(log => console.log(`   ${log.text}`));
    } else {
      console.log('   (None found)');
    }
    
    console.log('\n⏸️  Keeping browser open for 15 seconds for inspection...');
    await page.waitForTimeout(15000);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({ path: '/tmp/oauth-test-error-click.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('\n🏁 Test completed');
  }
}

testOAuthClick().catch(console.error);
