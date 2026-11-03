export function checkCopyQuality(content, { language, channel, product }) {
  const issues = []
  if (language !== 'ja' && /[\u3400-\u9fff\u3040-\u30ff]/u.test(content)) issues.push('Use only the target language; remove all Chinese/Japanese characters.')
  if (!Object.values(product.verifiedFacts || {}).some(v => typeof v === 'string' && v.trim())) {
    const unsupported = content.match(/\b(fold(?:able|ing|s|ed)?|unfold\w*|portab\w*|lightweight|no assembly|no tools|without sliding|anti-slip|eye[- ]level|ergonomic\w*|no wobble|weighted|neck strain|non[- ]adjustable|fixed)\b/giu)
    if (unsupported) issues.push(`Remove unverified features and actions: ${[...new Set(unsupported)].join(', ')}.`)
  }
  if (channel === 'amazon') {
    if ((content.match(/^\s*[-*] /gm) || []).length !== 5) issues.push('Use exactly five Markdown bullet lines starting with - .')
    if ((content.match(/^#{1,3} /gm) || []).length < 4) issues.push('Add four explicit Markdown headings: title, bullet points, description, search keywords, all in the target language.')
    if (/(^|\s)#[\p{L}\p{N}]/u.test(content)) issues.push('Remove social hashtags from the Amazon listing.')
  }
  if (channel === 'tiktok' && (content.match(/^\s*\|/gm) || []).length < 4) issues.push('Return a Markdown storyboard TABLE with four columns: Time, Visual, Voice-over, On-screen text. This is TikTok, not an Amazon listing.')
  const hashtags = content.match(/#[\p{L}\p{N}_]+/gu) || []
  if (channel === 'tiktok' && hashtags.length !== 3) issues.push('End with exactly 3 relevant hashtags after the table.')
  if (channel === 'instagram' && (hashtags.length < 10 || hashtags.length > 15)) issues.push('End with 10–15 relevant hashtags on a new line.')
  return issues
}
