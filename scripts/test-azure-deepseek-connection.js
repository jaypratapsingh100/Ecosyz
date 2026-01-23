#!/usr/bin/env node
/**
 * Test script to diagnose Azure DeepSeek connection issues
 */

const AZURE_DEEPSEEK_URL = process.env.AZURE_DEEPSEEK_URL || 'http://74.225.138.116:8000';

async function testConnection() {
  console.log('🔍 Testing Azure DeepSeek Connection...\n');
  console.log(`URL: ${AZURE_DEEPSEEK_URL}\n`);

  // Test 1: Health check
  console.log('1. Testing /health endpoint...');
  try {
    const healthResponse = await fetch(`${AZURE_DEEPSEEK_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check passed:', JSON.stringify(healthData, null, 2));
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return;
  }

  // Test 2: Test /v1/models endpoint
  console.log('\n2. Testing /v1/models endpoint...');
  try {
    const modelsResponse = await fetch(`${AZURE_DEEPSEEK_URL}/v1/models`);
    const modelsData = await modelsResponse.json();
    console.log('✅ Models endpoint works:', JSON.stringify(modelsData, null, 2));
  } catch (error) {
    console.error('❌ Models endpoint failed:', error.message);
  }

  // Test 3: Test /v1/chat/completions endpoint
  console.log('\n3. Testing /v1/chat/completions endpoint...');
  try {
    const chatResponse = await fetch(`${AZURE_DEEPSEEK_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-coder',
        messages: [
          { role: 'user', content: 'Hello, this is a test message.' }
        ],
        max_tokens: 50,
      }),
    });

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.error(`❌ Chat completions failed: ${chatResponse.status} ${chatResponse.statusText}`);
      console.error('Response:', errorText);
      return;
    }

    const chatData = await chatResponse.json();
    console.log('✅ Chat completions works:', JSON.stringify(chatData, null, 2));
  } catch (error) {
    console.error('❌ Chat completions failed:', error.message);
    console.error('Full error:', error);
  }

  // Test 4: Test with OpenAI SDK format
  console.log('\n4. Testing URL format that OpenAI SDK would use...');
  const baseURL = AZURE_DEEPSEEK_URL.replace(/\/v1\/?$/, '').replace(/\/+$/, '');
  const expectedEndpoint = `${baseURL}/v1/chat/completions`;
  console.log(`Base URL (after cleanup): ${baseURL}`);
  console.log(`Expected endpoint: ${expectedEndpoint}`);
  
  try {
    const testResponse = await fetch(expectedEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-coder',
        messages: [
          { role: 'user', content: 'Test' }
        ],
        max_tokens: 20,
      }),
    });

    if (testResponse.ok) {
      const testData = await testResponse.json();
      console.log('✅ OpenAI SDK format works!');
    } else {
      const errorText = await testResponse.text();
      console.error(`❌ OpenAI SDK format failed: ${testResponse.status}`);
      console.error('Response:', errorText);
    }
  } catch (error) {
    console.error('❌ OpenAI SDK format test failed:', error.message);
  }

  console.log('\n✅ All tests completed!');
}

testConnection().catch(console.error);
