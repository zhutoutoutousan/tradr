#!/usr/bin/env node

/**
 * OAuth Callback Flow Test
 * 模拟 OAuth 回调流程并检测问题
 */

const SUPABASE_URL = 'https://bcwxvyomuoolrolspgzn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjd3h2eW9tdW9vbHJvbHNwZ3puIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk0NTU5MjksImV4cCI6MjA0NTAzMTkyOX0.Bw8RRhF_0xVLKqJGPfbJk1HUkD9zcxxSH4Wqcwqy0aI';

console.log('🔍 OAuth Callback Flow Test\n');

// Test 1: Check if we can reach Supabase
console.log('Test 1: Checking Supabase connection...');
fetch(`${SUPABASE_URL}/auth/v1/health`, {
  headers: {
    'apikey': SUPABASE_ANON_KEY
  }
})
  .then(res => {
    console.log(`✅ Supabase reachable: ${res.status} ${res.statusText}\n`);
    return res.json();
  })
  .then(data => {
    console.log('Health check response:', data);
  })
  .catch(err => {
    console.error('❌ Cannot reach Supabase:', err.message);
  });

// Test 2: Check OAuth redirect flow
console.log('\nTest 2: Checking OAuth provider configuration...');
fetch(`${SUPABASE_URL}/auth/v1/authorize?provider=github`, {
  method: 'GET',
  headers: {
    'apikey': SUPABASE_ANON_KEY
  },
  redirect: 'manual'
})
  .then(res => {
    if (res.status === 302 || res.status === 301) {
      const location = res.headers.get('location');
      console.log('✅ GitHub OAuth redirect configured');
      console.log('   Redirects to:', location?.substring(0, 80) + '...');
    } else {
      console.log(`⚠️ Unexpected status: ${res.status}`);
    }
  })
  .catch(err => {
    console.error('❌ OAuth check failed:', err.message);
  });

// Test 3: Simulate callback with fake code
console.log('\nTest 3: Simulating callback with invalid code (expected to fail)...');
fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=pkce`, {
  method: 'POST',
  headers: {
    'apikey': SUPABASE_ANON_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    auth_code: 'fake_code_for_testing_only'
  })
})
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      console.log(`✅ Error handling works: ${data.error}`);
      console.log('   This is expected - we used a fake code');
    } else {
      console.log('⚠️ Unexpected success with fake code');
    }
  })
  .catch(err => {
    console.error('❌ Token exchange test failed:', err.message);
  });

console.log('\n📊 Summary:');
console.log('If all tests pass, the Supabase configuration is correct.');
console.log('The OAuth callback issue is likely in the client-side code flow.');
console.log('\nNext step: Check browser console logs during actual OAuth login.');
