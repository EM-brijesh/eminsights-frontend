// Lightweight local sentiment using transformers.js (CPU)
// Model: cardiffnlp/twitter-roberta-base-sentiment-latest (distil via xenova pipeline name)

let pipelineInstance = null;

export async function getSentimentPipeline() {
  if (pipelineInstance) return pipelineInstance;
  const { pipeline } = await import('@xenova/transformers');
  pipelineInstance = await pipeline('sentiment-analysis');
  return pipelineInstance;
}

export async function analyseSentiments(texts) {
  if (!Array.isArray(texts) || texts.length === 0) return [];
  const pipe = await getSentimentPipeline();
  const results = await pipe(texts, { topk: 1 });
  // Map labels to our schema
  return results.map(r => {
    const label = (Array.isArray(r) ? r[0]?.label : r?.label) || '';
    const score = (Array.isArray(r) ? r[0]?.score : r?.score) || 0;
    const mapped = label.toLowerCase().includes('neg') ? 'negative'
      : label.toLowerCase().includes('pos') ? 'positive'
      : 'neutral';
    return { sentiment: mapped, confidence: score };
  });
}
