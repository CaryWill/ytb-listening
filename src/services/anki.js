const ANKI_CONNECT_URL = 'http://localhost:8765'
const ANKI_CONNECT_VERSION = 6

/**
 * 向 AnkiConnect 发送请求
 * @param {string} action
 * @param {object} params
 * @returns {Promise<any>}
 */
async function invokeAnkiConnect(action, params = {}) {
  const response = await fetch(ANKI_CONNECT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action,
      version: ANKI_CONNECT_VERSION,
      params,
    }),
  })

  if (!response.ok) {
    throw new Error(`AnkiConnect 请求失败: ${response.status}`)
  }

  const result = await response.json()

  if (result.error) {
    throw new Error(`AnkiConnect 错误: ${result.error}`)
  }

  return result.result
}

/**
 * 检查 AnkiConnect 是否可用
 * @returns {Promise<boolean>}
 */
export async function checkAnkiConnect() {
  try {
    await invokeAnkiConnect('version')
    return true
  } catch {
    return false
  }
}

/**
 * 获取所有牌组列表
 * @returns {Promise<string[]>}
 */
export async function getDeckNames() {
  return invokeAnkiConnect('deckNames')
}

/**
 * 构建 Anki 卡片的 HTML 内容
 * 卡片正面：字幕文本 + loop 播放视频片段
 * @param {object} options
 * @param {string} options.videoId - YouTube 视频 ID
 * @param {string} options.subtitleText - 字幕文本
 * @param {number} options.startTime - 开始时间（秒）
 * @param {number} options.endTime - 结束时间（秒）
 * @param {string} options.contextText - 上下文字幕（可选）
 * @returns {{ front: string, back: string }}
 */
export function buildCardContent({ videoId, subtitleText, startTime, endTime, contextText = '' }) {
  const loopUrl = `https://www.youtube.com/embed/${videoId}?start=${Math.floor(startTime)}&end=${Math.ceil(endTime)}&autoplay=1&loop=1&playlist=${videoId}`

  const front = `
<div style="text-align:center; font-family: sans-serif;">
  <div style="margin-bottom: 16px;">
    <iframe
      width="560"
      height="315"
      src="${loopUrl}"
      frameborder="0"
      allow="autoplay; encrypted-media"
      allowfullscreen
      style="max-width:100%; border-radius:8px;"
    ></iframe>
  </div>
  ${contextText ? `<div style="color:#aaa; font-size:14px; margin-bottom:8px;">${contextText}</div>` : ''}
</div>
`.trim()

  const back = `
<div style="text-align:center; font-family: sans-serif;">
  <div style="font-size:24px; font-weight:bold; margin-bottom:16px; line-height:1.6;">
    ${subtitleText}
  </div>
  <div style="margin-bottom: 16px;">
    <iframe
      width="560"
      height="315"
      src="${loopUrl}"
      frameborder="0"
      allow="autoplay; encrypted-media"
      allowfullscreen
      style="max-width:100%; border-radius:8px;"
    ></iframe>
  </div>
  <div style="color:#888; font-size:12px;">
    ${videoId} · ${formatTimeDisplay(startTime)} - ${formatTimeDisplay(endTime)}
  </div>
</div>
`.trim()

  return { front, back }
}

function formatTimeDisplay(seconds) {
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

/**
 * 创建 Anki 卡片
 * @param {object} options
 * @param {string} options.deckName - 牌组名称
 * @param {string} options.videoId - YouTube 视频 ID
 * @param {string} options.subtitleText - 字幕文本
 * @param {number} options.startTime - 开始时间（秒）
 * @param {number} options.endTime - 结束时间（秒）
 * @param {string} options.contextText - 上下文字幕（可选）
 * @returns {Promise<number>} 新建卡片的 ID
 */
export async function createAnkiCard({
  deckName,
  videoId,
  subtitleText,
  startTime,
  endTime,
  contextText = '',
}) {
  const { front, back } = buildCardContent({ videoId, subtitleText, startTime, endTime, contextText })

  const noteId = await invokeAnkiConnect('addNote', {
    note: {
      deckName,
      modelName: 'Basic',
      fields: {
        Front: front,
        Back: back,
      },
      options: {
        allowDuplicate: false,
        duplicateScope: 'deck',
      },
      tags: ['ytb-listening', 'japanese'],
    },
  })

  return noteId
}
