/**
 * Extract Info API Route
 * 
 * AI-powered endpoint that extracts structured information from app descriptions.
 * Used by IdeaInputStep to auto-populate features, target audience, and design style.
 * 
 * Process:
 * 1. Receives app description from client
 * 2. Sends to Azure DeepSeek AI with extraction prompt
 * 3. Parses AI response (handles markdown code blocks)
 * 4. Validates and sanitizes extracted data
 * 5. Returns structured JSON with features, targetAudience, designStyle
 * 
 * Fallback:
 * If AI fails, client-side rule-based extraction is used (in IdeaInputStep)
 * 
 * @route POST /api/app-projects/extract-info
 * @body { description: string } - App description text (min 10 chars)
 * @returns { features: string[], targetAudience: string, designStyle: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Azure DeepSeek configuration - self-hosted AI model
const AZURE_DEEPSEEK_URL = process.env.AZURE_DEEPSEEK_URL || 'http://74.225.138.116:8000';
const AZURE_DEEPSEEK_MODEL = 'deepseek-coder';

/**
 * Create OpenAI-compatible client for Azure DeepSeek
 * Uses self-hosted DeepSeek API endpoint
 */
function createAzureDeepSeekClient() {
  return new OpenAI({
    baseURL: `${AZURE_DEEPSEEK_URL}/v1`,
    apiKey: 'not-required', // Self-hosted API doesn't require key
  });
}

/**
 * POST handler - Extract structured info from app description
 */
export async function POST(req: NextRequest) {
  try {
    const { description } = await req.json();

    if (!description || typeof description !== 'string' || description.trim().length < 10) {
      return NextResponse.json(
        { error: 'Description is required and must be at least 10 characters' },
        { status: 400 }
      );
    }

    const client = createAzureDeepSeekClient();

    /**
     * Create extraction prompt for AI
     * Instructs AI to analyze description and return structured JSON
     */
    const prompt = `Analyze the following app description and extract structured information. Return ONLY a valid JSON object with this exact structure:
{
  "features": ["feature1", "feature2", ...],
  "targetAudience": "target audience description",
  "designStyle": "modern|minimalist|bold|professional|playful"
}

App Description: "${description}"

Extract:
1. Features: List 3-8 key features/components mentioned or implied (e.g., "Header/Navigation", "Contact Form", "Blog Section", "Projects Portfolio")
2. Target Audience: Who would use this app? (e.g., "Business owners", "Students", "Developers", "Professionals")
3. Design Style: Choose one: modern, minimalist, bold, professional, or playful

Return ONLY the JSON object, no other text.`;

    const completion = await client.chat.completions.create({
      model: AZURE_DEEPSEEK_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that extracts structured information from app descriptions. Always return valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const responseText = completion.choices[0]?.message?.content?.trim() || '{}';
    
    /**
     * Parse JSON from AI response
     * Handles cases where AI wraps JSON in markdown code blocks
     */
    let extractedData;
    try {
      // Remove markdown code blocks if present (```json ... ```)
      const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || 
                       responseText.match(/(\{[\s\S]*\})/);
      const jsonText = jsonMatch ? jsonMatch[1] : responseText;
      extractedData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback: return empty data (client will use rule-based extraction)
      return NextResponse.json({
        features: [],
        targetAudience: '',
        designStyle: 'modern',
      });
    }

    /**
     * Validate and sanitize the AI response
     * Ensures data types are correct and values are within expected ranges
     */
    const features = Array.isArray(extractedData.features)
      ? extractedData.features
          .filter((f: any) => typeof f === 'string' && f.trim().length > 0)
          .map((f: string) => f.trim())
          .slice(0, 8)
      : [];

    const targetAudience =
      typeof extractedData.targetAudience === 'string'
        ? extractedData.targetAudience.trim()
        : '';

    const validDesignStyles = ['modern', 'minimalist', 'bold', 'professional', 'playful'];
    const designStyle = validDesignStyles.includes(extractedData.designStyle)
      ? extractedData.designStyle
      : 'modern';

    return NextResponse.json({
      features: features.length > 0 ? features : [],
      targetAudience: targetAudience || '',
      designStyle,
    });
  } catch (error: any) {
    console.error('Error extracting info:', error);
    return NextResponse.json(
      {
        error: 'Failed to extract information',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
