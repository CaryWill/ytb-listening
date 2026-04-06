import { useState, useEffect } from 'react'
import { Modal, Form, Select, Input, Alert, Button, Space, Typography, Tag } from 'antd'
import { BookOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { checkAnkiConnect, getDeckNames, createAnkiCard } from '../services/anki'
import { formatTime } from '../services/subtitle'

const { Text } = Typography

/**
 * Anki 制卡弹窗
 * 展示字幕内容、时间范围，选择牌组后创建卡片
 */
export default function AnkiModal({ open, onClose, cardData }) {
  const [form] = Form.useForm()
  const [ankiStatus, setAnkiStatus] = useState('checking') // 'checking' | 'connected' | 'disconnected'
  const [deckNames, setDeckNames] = useState([])
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // 检查 AnkiConnect 连接状态并加载牌组列表
  useEffect(() => {
    if (!open) return

    setSuccessMessage('')
    setAnkiStatus('checking')

    const initAnki = async () => {
      const isConnected = await checkAnkiConnect()
      if (!isConnected) {
        setAnkiStatus('disconnected')
        return
      }

      setAnkiStatus('connected')

      try {
        const decks = await getDeckNames()
        setDeckNames(decks)
        // 默认选中第一个牌组
        if (decks.length > 0) {
          form.setFieldValue('deckName', decks[0])
        }
      } catch (error) {
        console.error('[AnkiModal] 获取牌组失败:', error)
      }
    }

    initAnki()
  }, [open, form])

  // 填充卡片数据
  useEffect(() => {
    if (open && cardData) {
      form.setFieldsValue({
        subtitleText: cardData.subtitleText,
        contextText: cardData.contextText || '',
      })
    }
  }, [open, cardData, form])

  const handleSubmit = async () => {
    if (!cardData) return

    try {
      const values = await form.validateFields()
      setLoading(true)

      await createAnkiCard({
        deckName: values.deckName,
        videoId: cardData.videoId,
        subtitleText: values.subtitleText,
        startTime: cardData.startTime,
        endTime: cardData.endTime,
        contextText: values.contextText,
      })

      setSuccessMessage(`卡片已成功添加到「${values.deckName}」！`)
    } catch (error) {
      if (error?.errorFields) return // 表单校验失败
      Modal.error({
        title: '制卡失败',
        content: error.message || '未知错误，请检查 AnkiConnect 是否正常运行',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    form.resetFields()
    setSuccessMessage('')
    onClose?.()
  }

  return (
    <Modal
      title={
        <Space>
          <BookOutlined />
          <span>添加到 Anki</span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      footer={
        successMessage ? (
          <Button type="primary" onClick={handleClose} icon={<CheckCircleOutlined />}>
            完成
          </Button>
        ) : (
          <Space>
            <Button onClick={handleClose}>取消</Button>
            <Button
              type="primary"
              loading={loading}
              disabled={ankiStatus !== 'connected'}
              onClick={handleSubmit}
              icon={<BookOutlined />}
            >
              创建卡片
            </Button>
          </Space>
        )
      }
      width={560}
    >
      {/* AnkiConnect 状态提示 */}
      {ankiStatus === 'checking' && (
        <Alert message="正在连接 AnkiConnect..." type="info" showIcon style={{ marginBottom: 16 }} />
      )}
      {ankiStatus === 'disconnected' && (
        <Alert
          message="无法连接到 AnkiConnect"
          description={
            <span>
              请确保 Anki 已启动且安装了{' '}
              <a href="https://ankiweb.net/shared/info/2055492159" target="_blank" rel="noreferrer">
                AnkiConnect 插件
              </a>
              （插件代码：2055492159）
            </span>
          }
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 成功提示 */}
      {successMessage && (
        <Alert
          message={successMessage}
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 时间范围展示 */}
      {cardData && (
        <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            视频片段：
          </Text>
          <Tag color="blue">
            {formatTime(cardData.startTime)} → {formatTime(cardData.endTime)}
          </Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>
            时长 {(cardData.endTime - cardData.startTime).toFixed(1)}s
          </Text>
        </div>
      )}

      <Form form={form} layout="vertical" disabled={ankiStatus !== 'connected' || !!successMessage}>
        {/* 牌组选择 */}
        <Form.Item
          name="deckName"
          label="选择牌组"
          rules={[{ required: true, message: '请选择牌组' }]}
        >
          <Select
            placeholder="选择 Anki 牌组"
            options={deckNames.map((name) => ({ label: name, value: name }))}
            showSearch
            filterOption={(input, option) =>
              option.label.toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>

        {/* 字幕文本（可编辑） */}
        <Form.Item
          name="subtitleText"
          label="字幕内容（卡片背面）"
          rules={[{ required: true, message: '请输入字幕内容' }]}
        >
          <Input.TextArea rows={3} placeholder="字幕文本" />
        </Form.Item>

        {/* 上下文字幕（可选） */}
        <Form.Item name="contextText" label="上下文提示（可选，显示在卡片正面）">
          <Input.TextArea rows={2} placeholder="可添加前后文字幕作为提示" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
