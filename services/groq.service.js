const { Groq } = require('groq-sdk');
require('dotenv').config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

/**
 * Validates user input using Llama Prompt Guard
 * Detects potentially harmful, jailbreak, or off-topic prompts
 * @param {string} userInput - The user's question or input
 * @returns {Promise<Object>} { isValid: boolean, risk: string, message: string }
 */
async function validatePrompt(userInput) {
  try {
    const response = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: userInput
        }
      ],
      model: "meta-llama/llama-prompt-guard-2-86m",
      temperature: 1,
      max_completion_tokens: 1,
      top_p: 1,
      stream: false,
      stop: null
    });

    const rawResponse = response.choices[0].message.content.trim();
    
    // Llama Prompt Guard returns:
    // "safe" - safe prompt
    // "unsafe" - unsafe prompt
    // [category] - specific unsafe category
    
    const isSafe = rawResponse.toLowerCase() === "safe";
    
    return {
      isValid: isSafe,
      risk: isSafe ? "none" : rawResponse,
      message: isSafe 
        ? "Prompt is safe" 
        : `Prompt detected as unsafe: ${rawResponse}`,
      rawResponse
    };
  } catch (error) {
    console.error('Groq Prompt Guard error:', error.message);
    return {
      isValid: false,
      risk: "service_error",
      message: `Error validating prompt: ${error.message}`,
      error: error.message
    };
  }
}

/**
 * Quick check if a prompt is safe for financial analysis
 * @param {string} userInput - The question
 * @returns {Promise<boolean>}
 */
async function isSafePrompt(userInput) {
  const result = await validatePrompt(userInput);
  return result.isValid;
}

module.exports = {
  validatePrompt,
  isSafePrompt,
  groq
};
