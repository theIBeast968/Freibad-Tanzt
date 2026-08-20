export async function askClaude({ model, system, question, maxTokens }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { error: 'Server misconfigured' };
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens || 500,
      system,
      messages: [{ role: 'user', content: question }],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { error: `Anthropic API error ${res.status}: ${text.slice(0, 200)}` };
  }

  const data = await res.json();
  const answer = (data.content || [])
    .map((block) => block.text || '')
    .join('')
    .trim();
  return { answer };
}
