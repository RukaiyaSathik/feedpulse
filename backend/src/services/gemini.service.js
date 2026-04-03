const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const analyzeFeedback = async (title, description) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Analyse this product feedback. Return ONLY valid JSON with no extra text, no markdown, no code blocks.

Title: ${title}
Description: ${description}

Return exactly this JSON structure:
{
  "category": "Bug",
  "sentiment": "Positive",
  "priority_score": 8,
  "summary": "Brief summary here",
  "tags": ["tag1", "tag2"]
}

Rules:
- category must be one of: Bug, Feature Request, Improvement, Other
- sentiment must be one of: Positive, Neutral, Negative
- priority_score must be a number from 1 to 10
- tags must be an array of 2-4 short strings
- Return ONLY the JSON object, nothing else`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    // Clean response in case Gemini adds markdown
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      ai_category: parsed.category,
      ai_sentiment: parsed.sentiment,
      ai_priority: parsed.priority_score,
      ai_summary: parsed.summary,
      ai_tags: parsed.tags,
      ai_processed: true,
    };
  } catch (error) {
    console.error('❌ Gemini API error:', error.message);
    // Return null so feedback still saves even if AI fails
    return null;
  }
};

const getWeeklySummary = async (feedbackList) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const feedbackText = feedbackList
      .map((f) => `- ${f.title}: ${f.ai_summary || f.description}`)
      .join('\n');

    const prompt = `Based on these product feedback items from the last 7 days, identify the top 3 themes. Return ONLY valid JSON.

Feedback:
${feedbackText}

Return exactly this JSON:
{
  "themes": [
    { "theme": "Theme name", "description": "Brief description", "count": 5 },
    { "theme": "Theme name", "description": "Brief description", "count": 3 },
    { "theme": "Theme name", "description": "Brief description", "count": 2 }
  ],
  "overall_summary": "One sentence overall summary"
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    const cleaned = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('❌ Gemini weekly summary error:', error.message);
    return null;
  }
};

module.exports = { analyzeFeedback, getWeeklySummary };