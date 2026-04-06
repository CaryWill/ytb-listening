import { useState } from 'react'
import { Modal, Input, Button, Space, Typography, Alert, Tabs } from 'antd'
import { FileTextOutlined, CopyOutlined } from '@ant-design/icons'
import { parseManualSubtitle } from '../services/subtitle'

const { TextArea } = Input
const { Text, Paragraph } = Typography

const SRT_PLACEHOLDER = `1
00:00:01,000 --> 00:00:03,500
こんにちは、世界！

2
00:00:04,000 --> 00:00:06,000
今日はいい天気ですね。`

const PLAIN_PLACEHOLDER = `こんにちは、世界！
今日はいい天気ですね。
どこへ行きますか？`

/**
 * 手动输入字幕弹窗
 * 支持粘贴 SRT 格式或纯文本，自动识别并解析
 */
export default function ManualSubtitleModal({ open, onClose, onSubtitlesLoaded }) {
  const [inputText, setInputText] = useState('')
  const [parseError, setParseError] = useState('')
  const [activeTab, setActiveTab] = useState('srt')

  const handleConfirm = () => {
    setParseError('')
    const trimmed = inputText.trim()
    if (!trimmed) {
      setParseError('请先粘贴字幕内容')
      return
    }

    const subtitles = parseManualSubtitle(trimmed)
    if (subtitles.length === 0) {
      setParseError('未能解析出任何字幕，请检查格式是否正确')
      return
    }

    onSubtitlesLoaded(subtitles)
    setInputText('')
    setParseError('')
    onClose()
  }

  const handleClose = () => {
    setInputText('')
    setParseError('')
    onClose()
  }

  const tabItems = [
    {
      key: 'srt',
      label: 'SRT 格式',
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size={8}>
          <Text style={{ color: '#aaa', fontSize: 12 }}>
            从字幕文件或工具导出的标准 SRT 格式，包含时间轴，字幕会与视频精准同步。
          </Text>
          <Paragraph style={{ color: '#666', fontSize: 12, margin: 0 }}>
            获取方式：浏览器安装{' '}
            <Text style={{ color: '#1677ff', fontSize: 12 }}>YouTube Transcript</Text>{' '}
            等插件，或在 YouTube 视频页面点击「···」→「打开字幕」后复制。
          </Paragraph>
          <TextArea
            value={activeTab === 'srt' ? inputText : ''}
            onChange={(e) => {
              setActiveTab('srt')
              setInputText(e.target.value)
              setParseError('')
            }}
            placeholder={SRT_PLACEHOLDER}
            rows={12}
            style={{
              background: '#1a1a1a',
              borderColor: '#3a3a3a',
              color: '#fff',
              fontFamily: 'monospace',
              fontSize: 13,
              resize: 'vertical',
            }}
          />
        </Space>
      ),
    },
    {
      key: 'plain',
      label: '纯文本',
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size={8}>
          <Text style={{ color: '#aaa', fontSize: 12 }}>
            每行一句字幕，无时间轴。字幕会按每行 3 秒均匀分配时间，适合配合视频手动对照使用。
          </Text>
          <Paragraph style={{ color: '#666', fontSize: 12, margin: 0 }}>
            获取方式：在 YouTube 视频页面点击「···」→「显示字幕」，然后全选复制字幕文字。
          </Paragraph>
          <TextArea
            value={activeTab === 'plain' ? inputText : ''}
            onChange={(e) => {
              setActiveTab('plain')
              setInputText(e.target.value)
              setParseError('')
            }}
            placeholder={PLAIN_PLACEHOLDER}
            rows={12}
            style={{
              background: '#1a1a1a',
              borderColor: '#3a3a3a',
              color: '#fff',
              fontSize: 14,
              resize: 'vertical',
            }}
          />
        </Space>
      ),
    },
  ]

  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined style={{ color: '#1677ff' }} />
          <span style={{ color: '#fff' }}>手动输入字幕</span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      width={600}
      styles={{
        content: { background: '#1f1f1f', padding: '20px 24px' },
        header: { background: '#1f1f1f', borderBottom: '1px solid #2a2a2a' },
        footer: { background: '#1f1f1f', borderTop: '1px solid #2a2a2a' },
        mask: { backdropFilter: 'blur(2px)' },
      }}
      footer={
        <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
          <Button onClick={handleClose} style={{ borderColor: '#3a3a3a', color: '#aaa' }}>
            取消
          </Button>
          <Button
            type="primary"
            icon={<CopyOutlined />}
            onClick={handleConfirm}
            disabled={!inputText.trim()}
          >
            导入字幕
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size={12}>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key)
            setInputText('')
            setParseError('')
          }}
          items={tabItems}
          style={{ color: '#aaa' }}
        />

        {parseError && (
          <Alert message={parseError} type="error" showIcon style={{ marginTop: 4 }} />
        )}
      </Space>
    </Modal>
  )
}
