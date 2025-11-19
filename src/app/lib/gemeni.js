export async function analyzeWithGemini(query, platform, data) {
    const apiKey = process.env.GEMINI_API_KEY;
  
    const prompt = `
      Analyze the following ${platform} data related to the query "${query}". 
      Provide: 
      - Sentiment Analysis 
      - Engagement Trends 
      - Key Themes or Common Patterns
      - Recommendations or Insights for content strategy.
  
      Sample Data:
      ${JSON.stringify(data.slice(0, 5), null, 2)}
    `;
  
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + apiKey, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });
  
    const result = await response.json();
    const output = result.candidates?.[0]?.content?.parts?.[0]?.text;
  
    if (!output) throw new Error("No response from Gemini");
  
    return output;
  }
  