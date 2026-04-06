/**
 * 生成 PWA 图标脚本
 * 运行：node scripts/generate-icons.js
 * 需要安装：npm install canvas（可选，如果没有则手动放置图标）
 *
 * 如果不想安装 canvas，可以直接使用任意 192x192 和 512x512 的 PNG 图片
 * 放到 public/ 目录下，命名为 icon-192.png 和 icon-512.png
 */

import { createCanvas } from 'canvas'
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function generateIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // 背景
  ctx.fillStyle = '#1677ff'
  const radius = size * 0.2
  ctx.beginPath()
  ctx.moveTo(radius, 0)
  ctx.lineTo(size - radius, 0)
  ctx.quadraticCurveTo(size, 0, size, radius)
  ctx.lineTo(size, size - radius)
  ctx.quadraticCurveTo(size, size, size - radius, size)
  ctx.lineTo(radius, size)
  ctx.quadraticCurveTo(0, size, 0, size - radius)
  ctx.lineTo(0, radius)
  ctx.quadraticCurveTo(0, 0, radius, 0)
  ctx.closePath()
  ctx.fill()

  // 播放三角形
  ctx.fillStyle = '#ffffff'
  const cx = size * 0.5
  const cy = size * 0.45
  const triSize = size * 0.3
  ctx.beginPath()
  ctx.moveTo(cx - triSize * 0.5, cy - triSize * 0.6)
  ctx.lineTo(cx - triSize * 0.5, cy + triSize * 0.6)
  ctx.lineTo(cx + triSize * 0.7, cy)
  ctx.closePath()
  ctx.fill()

  // 底部横线（字幕象征）
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  const lineY = size * 0.8
  const lineH = size * 0.06
  const lineX = size * 0.2
  const lineW = size * 0.6
  const lineR = lineH / 2
  ctx.beginPath()
  ctx.moveTo(lineX + lineR, lineY)
  ctx.lineTo(lineX + lineW - lineR, lineY)
  ctx.quadraticCurveTo(lineX + lineW, lineY, lineX + lineW, lineY + lineR)
  ctx.lineTo(lineX + lineW, lineY + lineH - lineR)
  ctx.quadraticCurveTo(lineX + lineW, lineY + lineH, lineX + lineW - lineR, lineY + lineH)
  ctx.lineTo(lineX + lineR, lineY + lineH)
  ctx.quadraticCurveTo(lineX, lineY + lineH, lineX, lineY + lineH - lineR)
  ctx.lineTo(lineX, lineY + lineR)
  ctx.quadraticCurveTo(lineX, lineY, lineX + lineR, lineY)
  ctx.closePath()
  ctx.fill()

  return canvas.toBuffer('image/png')
}

try {
  const icon192 = generateIcon(192)
  const icon512 = generateIcon(512)

  writeFileSync(join(__dirname, '../public/icon-192.png'), icon192)
  writeFileSync(join(__dirname, '../public/icon-512.png'), icon512)

  console.log('✅ 图标生成成功：public/icon-192.png, public/icon-512.png')
} catch (error) {
  console.error('❌ 图标生成失败（需要安装 canvas 包）:', error.message)
  console.log('💡 你可以手动将 192x192 和 512x512 的 PNG 图片放到 public/ 目录')
}
