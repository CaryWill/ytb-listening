import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'

/**
 * YouTube 播放器组件，基于 YouTube IFrame API
 * 通过 ref 暴露 seekTo / getCurrentTime / getPlayer 方法
 */
const VideoPlayer = forwardRef(function VideoPlayer({ videoId, onTimeUpdate, onReady }, ref) {
  const containerRef = useRef(null)
  const playerRef = useRef(null)
  const timeUpdateIntervalRef = useRef(null)

  useImperativeHandle(ref, () => ({
    seekTo(seconds) {
      playerRef.current?.seekTo(seconds, true)
    },
    getCurrentTime() {
      return playerRef.current?.getCurrentTime() ?? 0
    },
    getPlayer() {
      return playerRef.current
    },
  }))

  useEffect(() => {
    if (!videoId) return

    // 加载 YouTube IFrame API（如果尚未加载）
    if (!window.YT) {
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.async = true
      document.head.appendChild(script)
    }

    const initPlayer = () => {
      // 销毁旧播放器
      if (playerRef.current) {
        clearInterval(timeUpdateIntervalRef.current)
        playerRef.current.destroy()
        playerRef.current = null
      }

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          autoplay: 1,
          rel: 0,
          modestbranding: 1,
          cc_load_policy: 1,   // 强制显示字幕
          cc_lang_pref: 'ja',  // 优先日语字幕
        },
        events: {
          onReady: (event) => {
            onReady?.(event)
            // 每 500ms 轮询当前播放时间，用于字幕同步
            timeUpdateIntervalRef.current = setInterval(() => {
              const currentTime = event.target.getCurrentTime()
              onTimeUpdate?.(currentTime)
            }, 500)
          },
          onStateChange: (event) => {
            // 暂停或结束时停止轮询
            if (
              event.data === window.YT.PlayerState.PAUSED ||
              event.data === window.YT.PlayerState.ENDED
            ) {
              clearInterval(timeUpdateIntervalRef.current)
            }
            // 播放时恢复轮询
            if (event.data === window.YT.PlayerState.PLAYING) {
              clearInterval(timeUpdateIntervalRef.current)
              timeUpdateIntervalRef.current = setInterval(() => {
                const currentTime = event.target.getCurrentTime()
                onTimeUpdate?.(currentTime)
              }, 500)
            }
          },
        },
      })
    }

    if (window.YT && window.YT.Player) {
      initPlayer()
    } else {
      // 等待 API 加载完成
      const previousCallback = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        previousCallback?.()
        initPlayer()
      }
    }

    return () => {
      clearInterval(timeUpdateIntervalRef.current)
    }
  }, [videoId])

  // videoId 变化时销毁旧播放器
  useEffect(() => {
    return () => {
      clearInterval(timeUpdateIntervalRef.current)
      if (playerRef.current) {
        playerRef.current.destroy()
        playerRef.current = null
      }
    }
  }, [])

  return (
    <div
      style={{
        width: '100%',
        aspectRatio: '16 / 9',
        background: '#000',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
})

export default VideoPlayer
