import { useEffect, useRef, useCallback } from 'react'
import { Tag, Tooltip } from 'antd'
import { BookOutlined } from '@ant-design/icons'
import { formatTime } from '../services/subtitle'

/**
 * 字幕面板组件
 * - 自动滚动高亮当前字幕
 * - 点击字幕跳转播放
 * - 点击制卡按钮触发 Anki 制卡
 */
export default function SubtitlePanel({
  subtitles,
  activeIndex,
  onSubtitleClick,
  onCreateCard,
}) {
  const panelRef = useRef(null)
  const activeItemRef = useRef(null)
  const userScrollingRef = useRef(false)
  const scrollTimeoutRef = useRef(null)

  // 监听用户手动滚动，暂停自动滚动 3 秒
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return

    const handleScroll = () => {
      userScrollingRef.current = true
      clearTimeout(scrollTimeoutRef.current)
      scrollTimeoutRef.current = setTimeout(() => {
        userScrollingRef.current = false
      }, 3000)
    }

    panel.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      panel.removeEventListener('scroll', handleScroll)
      clearTimeout(scrollTimeoutRef.current)
    }
  }, [])

  // 自动滚动到当前激活字幕
  useEffect(() => {
    if (userScrollingRef.current) return
    if (!activeItemRef.current || !panelRef.current) return

    activeItemRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }, [activeIndex])

  const handleSubtitleClick = useCallback(
    (subtitle, index) => {
      onSubtitleClick?.(subtitle.start, index)
    },
    [onSubtitleClick],
  )

  const handleCreateCard = useCallback(
    (event, subtitle, index) => {
      event.stopPropagation()
      onCreateCard?.(subtitle, index, subtitles)
    },
    [onCreateCard, subtitles],
  )

  if (!subtitles || subtitles.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#666',
          fontSize: 14,
        }}
      >
        暂无字幕，请输入视频链接并加载
      </div>
    )
  }

  return (
    <div
      ref={panelRef}
      style={{
        height: '100%',
        overflowY: 'auto',
        padding: '8px 4px',
      }}
    >
      {subtitles.map((subtitle, index) => {
        const isActive = index === activeIndex

        return (
          <div
            key={index}
            ref={isActive ? activeItemRef : null}
            onClick={() => handleSubtitleClick(subtitle, index)}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              padding: '8px 12px',
              marginBottom: 4,
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: isActive ? 'rgba(22, 119, 255, 0.15)' : 'transparent',
              borderLeft: isActive ? '3px solid #1677ff' : '3px solid transparent',
            }}
          >
            {/* 时间戳 */}
            <Tag
              style={{
                flexShrink: 0,
                fontSize: 11,
                color: isActive ? '#1677ff' : '#666',
                background: 'transparent',
                border: 'none',
                padding: '0 4px 0 0',
                marginRight: 0,
                fontFamily: 'monospace',
              }}
            >
              {formatTime(subtitle.start)}
            </Tag>

            {/* 字幕文本 */}
            <span
              style={{
                flex: 1,
                fontSize: 15,
                lineHeight: 1.7,
                color: isActive ? '#fff' : '#ccc',
                fontWeight: isActive ? 500 : 400,
                wordBreak: 'break-all',
              }}
            >
              {subtitle.text}
            </span>

            {/* 制卡按钮 */}
            <Tooltip title="添加到 Anki" placement="left">
              <BookOutlined
                onClick={(event) => handleCreateCard(event, subtitle, index)}
                style={{
                  flexShrink: 0,
                  fontSize: 14,
                  color: '#555',
                  padding: 4,
                  borderRadius: 4,
                  transition: 'color 0.2s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#1677ff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#555')}
              />
            </Tooltip>
          </div>
        )
      })}
    </div>
  )
}
