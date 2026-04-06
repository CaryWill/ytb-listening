import express from 'express'
import cors from 'cors'
import { YoutubeTranscript } from 'youtube-transcript'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

/**
 * 从 YouTube 视频 URL 中提取视频 ID
 */
function extractVideoId(urlOrId) {
  if (!urlOrId) return null

  // 已经是纯 ID（11位字母数字）
  if (/^[a-zA-Z0-9_-]{11}$/.test(urlOrId)) {
    return urlOrId
  }

  try {
    const url = new URL(urlOrId)
    // youtu.be 短链
    if (url.hostname === 'youtu.be') {
      return url.pathname.slice(1)
    }
    // youtube.com/watch?v=xxx
    if (url.hostname.includes('youtube.com')) {
      return url.searchParams.get('v')
    }
  } catch {
    // 非合法 URL，直接返回 null
  }

  return null
}

/**
 * GET /api/transcript?url=<youtube_url>&lang=ja
 * 获取 YouTube 视频字幕（优先日语，回退英语）
 */
app.get('/api/transcript', async (req, res) => {
  const { url, lang = 'ja' } = req.query

  const videoId = extractVideoId(url)
  if (!videoId) {
    return res.status(400).json({ error: '无效的 YouTube 链接或视频 ID' })
  }

  try {
    // 优先获取指定语言字幕，失败则获取任意可用字幕
    let transcript
    try {
      transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang })
    } catch {
      console.log(`[transcript] 未找到 ${lang} 字幕，尝试获取默认字幕...`)
      transcript = await YoutubeTranscript.fetchTranscript(videoId)
    }

    // 标准化字幕格式：{ text, start, duration }
    const subtitles = transcript.map((item) => ({
      text: item.text,
      start: item.offset / 1000,       // 转换为秒
      duration: item.duration / 1000,  // 转换为秒
    }))

    res.json({ videoId, lang, subtitles })
  } catch (error) {
    console.error('[transcript] 获取字幕失败:', error.message)
    res.status(500).json({
      error: '获取字幕失败，该视频可能没有字幕或字幕被禁用',
      detail: error.message,
    })
  }
})

/**
 * GET /api/health
 * 健康检查
 */
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`[server] 字幕代理服务已启动: http://localhost:${PORT}`)
})
