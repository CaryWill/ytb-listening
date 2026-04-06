/**
 * 从后端代理获取 YouTube 字幕
 * @param {string} videoUrl - YouTube 视频链接或视频 ID
 * @param {string} lang - 字幕语言，默认 'ja'（日语）
 * @returns {Promise<Array<{text: string, start: number, duration: number}>>}
 */
export async function fetchSubtitles(videoUrl, lang = 'ja') {
  const params = new URLSearchParams({ url: videoUrl, lang })
  const response = await fetch(`/api/transcript?${params}`)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `请求失败: ${response.status}`)
  }

  const data = await response.json()
  return data.subtitles
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
