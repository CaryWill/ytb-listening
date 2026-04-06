/**
 * 通过 youtube-transcript-api vercel 服务获取字幕（纯前端，无需 API Key，免费）
 * 返回纯文本，无时间戳，用 parsePlainText 均匀分配时间
 * @param {string} videoId
 * @returns {Promise<Array<{text: string, start: number, duration: number}>>}
 */
async function fetchSubtitlesViaVercel(videoId) {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`
  const response = await fetch('https://youtube-transcript-api-tau-one.vercel.app/transcript', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ video_url: videoUrl }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`字幕服务请求失败 (${response.status})：${errorText}`)
  }

  const data = await response.json()
  if (!data.transcript) {
    throw new Error('字幕服务未返回字幕内容')
  }

  console.log('[subtitle] 通过 vercel 服务获取字幕成功')
  return parsePlainText(data.transcript)
}

/**
 * 获取 YouTube 字幕（纯前端方案，调用 vercel 开源字幕服务）
 * 失败时抛出错误，提示用户手动导入字幕
 * @param {string} videoUrl - YouTube 视频链接或视频 ID
 * @returns {Promise<Array<{text: string, start: number, duration: number}>>}
 */
export async function fetchSubtitles(videoUrl) {
  const videoId = extractVideoId(videoUrl)
  if (!videoId) {
    throw new Error('无效的 YouTube 链接或视频 ID')
  }

  try {
    return await fetchSubtitlesViaVercel(videoId)
  } catch (error) {
    console.warn('[subtitle] 自动获取字幕失败:', error.message)
    throw new Error('自动获取字幕失败，请点击「手动字幕」按钮粘贴字幕内容')
  }
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

/**
 * 将 SRT 时间字符串（00:01:23,456）转换为秒数
 * @param {string} timeStr
 * @returns {number}
 */
function parseSrtTime(timeStr) {
  const [hms, ms] = timeStr.trim().split(',')
  const [hours, minutes, seconds] = hms.split(':').map(Number)
  return hours * 3600 + minutes * 60 + seconds + Number(ms || 0) / 1000
}

/**
 * 解析 SRT 格式字幕文本
 * @param {string} srtText
 * @returns {Array<{text: string, start: number, duration: number}>}
 */
export function parseSrt(srtText) {
  const blocks = srtText.trim().split(/\n\s*\n/)
  const result = []

  for (const block of blocks) {
    const lines = block.trim().split('\n')
    if (lines.length < 2) continue

    // 找到时间轴行（格式：00:00:00,000 --> 00:00:00,000）
    const timeLineIndex = lines.findIndex((line) => line.includes('-->'))
    if (timeLineIndex === -1) continue

    const timeLine = lines[timeLineIndex]
    const timeParts = timeLine.split('-->')
    if (timeParts.length !== 2) continue

    const start = parseSrtTime(timeParts[0])
    const end = parseSrtTime(timeParts[1])
    const duration = end - start

    // 时间轴之后的所有行都是字幕文本
    const text = lines
      .slice(timeLineIndex + 1)
      .join('\n')
      .replace(/<[^>]+>/g, '') // 去除 HTML 标签（如 <i>、<b>）
      .trim()

    if (text.length > 0) {
      result.push({ text, start, duration })
    }
  }

  return result
}

/**
 * 解析纯文本字幕（每行一句，自动分配时间）
 * 适合从 YouTube 字幕面板直接复制的纯文字内容
 * @param {string} plainText
 * @param {number} secondsPerLine - 每行默认时长（秒），默认 3 秒
 * @returns {Array<{text: string, start: number, duration: number}>}
 */
export function parsePlainText(plainText, secondsPerLine = 3) {
  const lines = plainText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  return lines.map((text, index) => ({
    text,
    start: index * secondsPerLine,
    duration: secondsPerLine,
  }))
}

/**
 * 自动检测字幕格式并解析
 * 支持 SRT 格式和纯文本格式
 * @param {string} rawText
 * @returns {Array<{text: string, start: number, duration: number}>}
 */
export function parseManualSubtitle(rawText) {
  const trimmed = rawText.trim()
  if (!trimmed) return []

  // 检测是否为 SRT 格式（包含 --> 时间轴）
  if (/\d{2}:\d{2}:\d{2}[,\.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,\.]\d{3}/.test(trimmed)) {
    return parseSrt(trimmed)
  }

  // 否则按纯文本处理
  return parsePlainText(trimmed)
}
