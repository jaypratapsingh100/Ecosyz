/**
 * AI Client creation utilities
 */

import OpenAI from 'openai';

const AZURE_DEEPSEEK_URL = process.env.AZURE_DEEPSEEK_URL || 'http://74.225.138.116:8000';
const AZURE_DEEPSEEK_MODEL = 'deepseek-coder';

/**
 * Create OpenAI-compatible client for Azure DeepSeek
 */
export function createAzureDeepSeekClient() {
  console.log('🔧 Creating Azure DeepSeek client:', {
    baseURL: `${AZURE_DEEPSEEK_URL}/v1`,
    model: AZURE_DEEPSEEK_MODEL,
  });
  
  return new OpenAI({
    baseURL: `${AZURE_DEEPSEEK_URL}/v1`,
    apiKey: 'not-required', // FastAPI doesn't require API key
  });
}

export function getAzureDeepSeekModel() {
  return AZURE_DEEPSEEK_MODEL;
}

export function getAzureDeepSeekUrl() {
  return AZURE_DEEPSEEK_URL;
}
