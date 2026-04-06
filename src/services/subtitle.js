/**
 * 解析 YouTube 字幕 XML 文本
 * @param {string} xmlText
 * @returns {Array<{text: string, start: number, duration: number}>}
 */
function parseTranscriptXml(xmlText) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlText, 'text/xml')
  const textNodes = doc.querySelectorAll('text')

  return Array.from(textNodes).map((node) => {
    const start = parseFloat(node.getAttribute('start') || '0')
    const duration = parseFloat(node.getAttribute('dur') || '0')
    // 解码 HTML 实体（&amp; &quot; 等）
    const textarea = document.createElement('textarea')
    textarea.innerHTML = node.textContent || ''
    const text = textarea.value.trim()
    return { text, start, duration }
  }).filter((item) => item.text.length > 0)
}

/**
 * 从 YouTube 视频页面获取字幕 track 列表
 * 通过 Vite 代理 /ytb-watch 转发请求，解决 CORS 问题
 * @param {string} videoId
 * @returns {Promise<Array>} 字幕 track 列表
 */
async function fetchCaptionTracks(videoId) {
  const response = await fetch(`/ytb-watch?v=${videoId}`)

  if (!response.ok) {
    throw new Error(`无法访问 YouTube 视频页面: ${response.status}`)
  }

  const html = await response.text()

  // 从页面 HTML 中提取 captionTracks JSON
  const match = html.match(/"captionTracks":(\[.*?\])/)
  if (!match) {
    throw new Error('该视频没有可用字幕')
  }

  try {
    return JSON.parse(match[1])
  } catch {
    throw new Error('字幕数据解析失败')
  }
}

/**
 * 直接在浏览器端获取 YouTube 字幕（绕过后端，走浏览器系统代理）
 * 优先获取日语字幕，回退到自动生成字幕，最后回退到任意可用字幕
 * @param {string} videoUrl - YouTube 视频链接或视频 ID
 * @param {string} lang - 字幕语言，默认 'ja'（日语）
 * @returns {Promise<Array<{text: string, start: number, duration: number}>>}
 */
export async function fetchSubtitles(videoUrl, lang = 'ja') {
  const videoId = extractVideoId(videoUrl)
  if (!videoId) {
    throw new Error('无效的 YouTube 链接或视频 ID')
  }

  const tracks = await fetchCaptionTracks(videoId)

  if (tracks.length === 0) {
    throw new Error('该视频没有可用字幕')
  }

  // 按优先级选择字幕 track：
  // 1. 指定语言的手动字幕
  // 2. 指定语言的自动生成字幕（kind: asr）
  // 3. 任意语言的手动字幕
  // 4. 任意可用字幕
  const manualTrack = tracks.find((t) => t.languageCode === lang && t.kind !== 'asr')
  const asrTrack = tracks.find((t) => t.languageCode === lang && t.kind === 'asr')
  const anyManualTrack = tracks.find((t) => t.kind !== 'asr')
  const selectedTrack = manualTrack || asrTrack || anyManualTrack || tracks[0]

  console.log(
    `[subtitle] 使用字幕: ${selectedTrack.name?.simpleText || selectedTrack.languageCode}`,
    selectedTrack.kind === 'asr' ? '(自动生成)' : '(手动)',
  )

  // 获取字幕 XML 内容
  // baseUrl 是完整的 YouTube URL，通过 /ytb-api 代理转发解决 CORS 问题
  const subtitleUrl = selectedTrack.baseUrl.replace('https://www.youtube.com', '/ytb-api')
  const xmlResponse = await fetch(subtitleUrl)
  if (!xmlResponse.ok) {
    throw new Error(`字幕内容获取失败: ${xmlResponse.status}`)
  }

  const xmlText = await xmlResponse.text()
  return parseTranscriptXml(xmlText)
}

/**
 * 从 YouTube URL 中提取视频 ID
 * @param {string} urlOrId
 * @returns {string|null}
 */
export function extractVideoId(urlOrId) {
  if (!urlOrId) return null

  if (/^[a-zA-Z0-9_-]{11}$/.test(urlOrId)) {
    return urlOrId
  }

  try {
    const url = new URL(urlOrId)
    if (url.hostname === 'youtu.be') {
      return url.pathname.slice(1)
    }
    if (url.hostname.includes('youtube.com')) {
      return url.searchParams.get('v')
    }
  } catch {
    // 非合法 URL
  }

  return null
}

/**
 * 根据当前播放时间找到对应的字幕索引
 * @param {Array} subtitles
 * @param {number} currentTime - 当前播放时间（秒）
 * @returns {number} 字幕索引，-1 表示未找到
 */
export function findActiveSubtitleIndex(subtitles, currentTime) {
  if (!subtitles || subtitles.length === 0) return -1

  for (let i = subtitles.length - 1; i >= 0; i--) {
    if (currentTime >= subtitles[i].start) {
      return i
    }
  }

  return -1
}

/**
 * 格式化时间为 mm:ss 格式
 * @param {number} seconds
 * @returns {string}
 */
export function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}
