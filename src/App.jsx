import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Layout,
  Input,
  Button,
  Space,
  Typography,
  Spin,
  Alert,
  Badge,
  Tooltip,
  message,
} from 'antd'
import {
  PlayCircleOutlined,
  LoadingOutlined,
  WifiOutlined,
  DisconnectOutlined,
} from '@ant-design/icons'
import VideoPlayer from './components/VideoPlayer'
import SubtitlePanel from './components/SubtitlePanel'
import AnkiModal from './components/AnkiModal'
import { fetchSubtitles, extractVideoId, findActiveSubtitleIndex } from './services/subtitle'
import { checkAnkiConnect } from './services/anki'
import './App.css'

const { Header, Content, Sider } = Layout
const { Title, Text } = Typography

export default function App() {
  const [videoUrl, setVideoUrl] = useState('')
  const [videoId, setVideoId] = useState(null)
  const [subtitles, setSubtitles] = useState([])
  const [activeSubtitleIndex, setActiveSubtitleIndex] = useState(-1)
  const [loadingSubtitles, setLoadingSubtitles] = useState(false)
  const [subtitleError, setSubtitleError] = useState('')
  const [ankiConnected, setAnkiConnected] = useState(false)

  // Anki 制卡弹窗状态
  const [ankiModalOpen, setAnkiModalOpen] = useState(false)
  const [ankiCardData, setAnkiCardData] = useState(null)

  const playerRef = useRef(null)
  const [messageApi, contextHolder] = message.useMessage()

  // 定期检查 AnkiConnect 连接状态
  useEffect(() => {
    const checkConnection = async () => {
      const connected = await checkAnkiConnect()
      setAnkiConnected(connected)
    }

    checkConnection()
    const interval = setInterval(checkConnection, 10000)
    return () => clearInterval(interval)
  }, [])

  // 加载视频和字幕
  const handleLoadVideo = useCallback(async () => {
    const trimmedUrl = videoUrl.trim()
    if (!trimmedUrl) {
      messageApi.warning('请输入 YouTube 视频链接')
      return
    }

    const id = extractVideoId(trimmedUrl)
    if (!id) {
      messageApi.error('无效的 YouTube 链接，请检查后重试')
      return
    }

    setVideoId(id)
    setSubtitles([])
    setActiveSubtitleIndex(-1)
    setSubtitleError('')
    setLoadingSubtitles(true)

    try {
      const fetchedSubtitles = await fetchSubtitles(trimmedUrl, 'ja')
      setSubtitles(fetchedSubtitles)
      messageApi.success(`已加载 ${fetchedSubtitles.length} 条字幕`)
    } catch (error) {
      setSubtitleError(error.message || '字幕加载失败')
    } finally {
      setLoadingSubtitles(false)
    }
  }, [videoUrl, messageApi])

  // 按 Enter 键加载视频
  const handleInputKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter') {
        handleLoadVideo()
      }
    },
    [handleLoadVideo],
  )

  // 播放时间更新 → 同步字幕高亮
  const handleTimeUpdate = useCallback(
    (currentTime) => {
      const index = findActiveSubtitleIndex(subtitles, currentTime)
      setActiveSubtitleIndex(index)
    },
    [subtitles],
  )

  // 点击字幕 → 跳转播放
  const handleSubtitleClick = useCallback((startTime) => {
    playerRef.current?.seekTo(startTime)
  }, [])

  // 点击制卡按钮 → 打开 Anki 弹窗
  const handleCreateCard = useCallback(
    (subtitle, index, allSubtitles) => {
      if (!videoId) return

      // 计算时间范围：当前字幕 start → 下一条字幕 start（或当前字幕 start + duration）
      const startTime = subtitle.start
      const nextSubtitle = allSubtitles[index + 1]
      const endTime = nextSubtitle
        ? nextSubtitle.start
        : subtitle.start + (subtitle.duration || 5)

      // 上下文：前一条 + 后一条字幕
      const prevText = index > 0 ? allSubtitles[index - 1].text : ''
      const nextText = nextSubtitle ? nextSubtitle.text : ''
      const contextText = [prevText, nextText].filter(Boolean).join(' / ')

      setAnkiCardData({
        videoId,
        subtitleText: subtitle.text,
        startTime,
        endTime,
        contextText,
      })
      setAnkiModalOpen(true)
    },
    [videoId],
  )

  return (
    <Layout style={{ height: '100vh', background: '#141414' }}>
      {contextHolder}

      {/* 顶部导航栏 */}
      <Header
        style={{
          background: '#1a1a1a',
          borderBottom: '1px solid #2a2a2a',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          height: 56,
        }}
      >
        {/* Logo */}
        <Space align="center" style={{ flexShrink: 0 }}>
          <PlayCircleOutlined style={{ fontSize: 22, color: '#1677ff' }} />
          <Title level={5} style={{ margin: 0, color: '#fff', fontWeight: 600 }}>
            YTB Listening
          </Title>
        </Space>

        {/* URL 输入框 */}
        <Space.Compact style={{ flex: 1, maxWidth: 640 }}>
          <Input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="粘贴 YouTube 视频链接，按 Enter 或点击加载..."
            style={{ background: '#2a2a2a', borderColor: '#3a3a3a', color: '#fff' }}
            allowClear
          />
          <Button
            type="primary"
            onClick={handleLoadVideo}
            loading={loadingSubtitles}
            icon={loadingSubtitles ? <LoadingOutlined /> : <PlayCircleOutlined />}
          >
            加载
          </Button>
        </Space.Compact>

        {/* AnkiConnect 状态指示 */}
        <Tooltip
          title={ankiConnected ? 'AnkiConnect 已连接' : 'AnkiConnect 未连接（请启动 Anki）'}
        >
          <Badge
            status={ankiConnected ? 'success' : 'error'}
            text={
              <Space style={{ color: ankiConnected ? '#52c41a' : '#ff4d4f', fontSize: 12 }}>
                {ankiConnected ? <WifiOutlined /> : <DisconnectOutlined />}
                <span style={{ display: 'none' }}>Anki</span>
              </Space>
            }
          />
        </Tooltip>
      </Header>

      {/* 主内容区 */}
      <Layout style={{ flex: 1, overflow: 'hidden', background: '#141414' }}>
        {/* 左侧：视频播放器 */}
        <Content
          style={{
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            overflow: 'hidden',
          }}
        >
          {videoId ? (
            <VideoPlayer
              videoId={videoId}
              ref={playerRef}
              onTimeUpdate={handleTimeUpdate}
            />
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#1a1a1a',
                borderRadius: 8,
                border: '1px dashed #333',
                color: '#555',
                gap: 12,
              }}
            >
              <PlayCircleOutlined style={{ fontSize: 48 }} />
              <Text style={{ color: '#555' }}>输入 YouTube 链接开始学习</Text>
            </div>
          )}

          {/* 字幕加载错误提示 */}
          {subtitleError && (
            <Alert
              message="字幕加载失败"
              description={subtitleError}
              type="error"
              showIcon
              closable
              onClose={() => setSubtitleError('')}
            />
          )}
        </Content>

        {/* 右侧：字幕面板 */}
        <Sider
          width={380}
          style={{
            background: '#1a1a1a',
            borderLeft: '1px solid #2a2a2a',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* 字幕面板标题 */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #2a2a2a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            <Text style={{ color: '#aaa', fontSize: 13 }}>
              日语字幕
              {subtitles.length > 0 && (
                <Text style={{ color: '#555', fontSize: 12, marginLeft: 8 }}>
                  {subtitles.length} 条
                </Text>
              )}
            </Text>
            {loadingSubtitles && <Spin size="small" />}
          </div>

          {/* 字幕列表 */}
          <div style={{ flex: 1, overflow: 'hidden', height: 0, flexGrow: 1 }}>
            <SubtitlePanel
              subtitles={subtitles}
              activeIndex={activeSubtitleIndex}
              onSubtitleClick={handleSubtitleClick}
              onCreateCard={handleCreateCard}
            />
          </div>
        </Sider>
      </Layout>

      {/* Anki 制卡弹窗 */}
      <AnkiModal
        open={ankiModalOpen}
        onClose={() => setAnkiModalOpen(false)}
        cardData={ankiCardData}
      />
    </Layout>
  )
}
