import { chromium } from 'playwright';

async function testRegisterPage() {
  console.log('🔍 Testing /register page for OAuth buttons\n');
  
  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });
  
  const page = await browser.newPage();
  
  // 收集控制台日志
  page.on('console', msg => {
    if (msg.text().includes('[Auth') || msg.text().includes('OAuth') || msg.text().includes('Supabase')) {
      console.log(`[CONSOLE] ${msg.text()}`);
    }
  });
  
  try {
    console.log('📱 Navigating to /register page...');
    await page.goto('https://tradr-sigma.vercel.app/register', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // 查找所有按钮和链接
    const buttons = await page.locator('button, a[role="button"]').all();
    console.log(`\n🔘 Found ${buttons.length} buttons/links on page\n`);
    
    for (let i = 0; i < buttons.length; i++) {
      const text = await buttons[i].textContent();
      const isVisible = await buttons[i].isVisible();
      if (text && isVisible) {
        console.log(`Button ${i + 1}: "${text.trim()}"`);
      }
    }
    
    // 专门查找 OAuth 相关按钮
    console.log('\n🔍 Looking for OAuth buttons...');
    const githubSelectors = [
      'button:has-text("GitHub")',
      'button:has-text("github")',
      'button:has-text("Github")',
      'a:has-text("GitHub")',
      'button:has-text("Login with GitHub")',
      'button:has-text("Sign in with GitHub")',
      '[class*="github"]',
      '[id*="github"]'
    ];
    
    const googleSelectors = [
      'button:has-text("Google")',
      'button:has-text("google")',
      'a:has-text("Google")',
      'button:has-text("Login with Google")',
      'button:has-text("Sign in with Google")',
      '[class*="google"]',
      '[id*="google"]'
    ];
    
    for (const selector of githubSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`✅ Found GitHub button with selector: ${selector} (count: ${count})`);
        const text = await page.locator(selector).first().textContent();
        console.log(`   Text: "${text}"`);
      }
    }
    
    for (const selector of googleSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`✅ Found Google button with selector: ${selector} (count: ${count})`);
        const text = await page.locator(selector).first().textContent();
        console.log(`   Text: "${text}"`);
      }
    }
    
    // 截图
    await page.screenshot({ path: '/tmp/oauth-test-register.png', fullPage: true });
    console.log('\n📸 Screenshot saved: /tmp/oauth-test-register.png');
    
    // 检查 HTML 中是否有 OAuth 相关代码
    const html = await page.content();
    const hasGitHubInHTML = html.toLowerCase().includes('github');
    const hasGoogleInHTML = html.toLowerCase().includes('google');
    const hasOAuthInHTML = html.toLowerCase().includes('oauth');
    
    console.log('\n🔎 HTML Content Check:');
    console.log(`  Contains "github": ${hasGitHubInHTML ? '✅' : '❌'}`);
    console.log(`  Contains "google": ${hasGoogleInHTML ? '✅' : '❌'}`);
    console.log(`  Contains "oauth": ${hasOAuthInHTML ? '✅' : '❌'}`);
    
    console.log('\n⏸️  Browser will stay open for 10 seconds...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await browser.close();
  }
}

testRegisterPage().catch(console.error);
