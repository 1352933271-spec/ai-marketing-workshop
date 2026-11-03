export const LANGUAGES = {
  en: 'English (US), natural American consumer language',
  ja: '日本語（です・ます調）。自然な日本の消費者向け表現。',
  es: 'Español (Latinoamérica), natural Latin American vocabulary',
}

export const CHANNELS = {
  amazon: {
    label: 'Amazon 商品详情页',
    spec: `Write Markdown sections: Title (maximum 150 characters, main keyword and top benefit first); Bullet Points (exactly 5 bullets, each maximum 200 characters, each begins with a short benefit phrase in CAPITAL LETTERS where the language has letter case); Description (80–120 words); Search Keywords (5–8 comma-separated keywords). Be factual, informative and trustworthy. For Japanese use 200–350 characters for the description and natural Japanese benefit headings. Translate section headings into the target language.`,
  },
  tiktok: {
    label: 'TikTok 短视频脚本',
    spec: `Write a 15–30 second script as a Markdown table with columns Time, Visual, Voice-over, On-screen text, translated into the target language. Use contiguous time intervals starting at 0 seconds. The first 3 seconds have a strong hook. Keep speech short, conversational and speakable in the allotted time. End with a clear call to action and 3 relevant hashtags. Do not claim hashtags are currently trending without evidence.`,
  },
  instagram: {
    label: 'Instagram 帖子配文',
    spec: `Write a warm lifestyle caption of 60–100 words with 3–5 fitting emojis, one question inviting comments and one call to action. End with 10–15 relevant hashtags on a new line. For Japanese use 150–250 characters for the caption, excluding hashtags.`,
  },
}
