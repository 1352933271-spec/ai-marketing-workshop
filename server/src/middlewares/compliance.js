const BANNED = [
  /最(好|佳|强|低|高|大|优|先进)/gu, /第一|顶级|极致|史上|万能|国家级|唯一/gu,
  /100\s*[%％]|百分之百|根治|治愈|包治|药效|永久/gu,
  /\b(best(?: in the world)?|no\.?\s*1|guaranteed|miracle|cure[sd]?|risk[- ]free)\b/giu,
  // 扩充：中文6项、英文6项，另加入日语与西语兜底。
  /全网最低|零风险|绝对安全|无副作用|包赚|立即见效/gu,
  /\b(world[- ]class|unbeatable|flawless|perfect|instant results|clinically proven)\b/giu,
  /世界一|絶対|必ず効く|副作用なし|完治/gu,
  /\b(el mejor|sin riesgos|garantizado|milagroso|cura definitiva)\b/giu,
]

export function findViolations(text = '') {
  return [...new Set(BANNED.flatMap((re) => { re.lastIndex = 0; return String(text).normalize('NFKC').match(re) || [] }))]
}

export function maskViolations(text = '') {
  return BANNED.reduce((value, re) => { re.lastIndex = 0; return value.replace(re, (hit) => '*'.repeat(hit.length)) }, String(text).normalize('NFKC'))
}

export function inputGuard(fields = ['extra']) {
  return (req, res, next) => {
    for (const field of fields) {
      const value = req.body?.[field] ?? ''
      if (typeof value !== 'string' || value.length > 2000) return res.status(400).json({ code: 4001, message: '补充要求须为不超过2000字的文本', data: null })
      const hits = findViolations(value)
      if (hits.length) return res.status(400).json({ code: 4003, message: `补充要求包含敏感或极端营销词：${hits.join('、')}`, data: null })
    }
    next()
  }
}
