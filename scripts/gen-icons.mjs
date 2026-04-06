// 生成最小合法 PNG 图标（蓝色背景 + 白色播放按钮）
// 使用纯 Node.js Buffer 手写 PNG 二进制，无需额外依赖
import { writeFileSync } from 'fs'
import { deflateSync } from 'zlib'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function crc32(buf) {
  let crc = 0xffffffff
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c
  }
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function uint32BE(n) {
  const buf = Buffer.alloc(4)
  buf.writeUInt32BE(n, 0)
  return buf
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const crcInput = Buffer.concat([typeBytes, data])
  const crcValue = crc32(crcInput)
  return Buffer.concat([uint32BE(data.length), typeBytes, data, uint32BE(crcValue)])
}

function generatePNG(size) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR chunk
  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(size, 0)   // width
  ihdrData.writeUInt32BE(size, 4)   // height
  ihdrData[8] = 8                   // bit depth
  ihdrData[9] = 2                   // color type: RGB
  ihdrData[10] = 0                  // compression
  ihdrData[11] = 0                  // filter
  ihdrData[12] = 0                  // interlace

  // 生成像素数据（RGB，每行前加 filter byte 0）
  const rowSize = size * 3
  const rawData = Buffer.alloc((rowSize + 1) * size)

  for (let y = 0; y < size; y++) {
    rawData[y * (rowSize + 1)] = 0 // filter type: None

    for (let x = 0; x < size; x++) {
      const offset = y * (rowSize + 1) + 1 + x * 3

      // 圆角矩形背景判断（简单距离判断）
      const radius = size * 0.2
      const dx = Math.max(0, Math.abs(x - size / 2) - (size / 2 - radius))
      const dy = Math.max(0, Math.abs(y - size / 2) - (size / 2 - radius))
      const inBackground = dx * dx + dy * dy <= radius * radius

      if (!inBackground) {
        // 透明区域用深色背景（PNG RGB 无透明通道，用黑色代替）
        rawData[offset] = 20
        rawData[offset + 1] = 20
        rawData[offset + 2] = 20
        continue
      }

      // 播放三角形区域
      const nx = x / size
      const ny = y / size
      const triLeft = 0.28
      const triRight = 0.72
      const triTop = 0.25
      const triBottom = 0.75
      const triMid = 0.48

      // 三角形：左边两点 (triLeft, triTop) (triLeft, triBottom)，右顶点 (triRight, triMid)
      const inTriangle =
        nx >= triLeft &&
        nx <= triRight &&
        ny >= triTop &&
        ny <= triBottom &&
        ny >= triTop + ((nx - triLeft) / (triRight - triLeft)) * (triMid - triTop) &&
        ny <= triBottom - ((nx - triLeft) / (triRight - triLeft)) * (triBottom - triMid)

      if (inTriangle) {
        rawData[offset] = 255
        rawData[offset + 1] = 255
        rawData[offset + 2] = 255
      } else {
        // 蓝色背景 #1677ff
        rawData[offset] = 22
        rawData[offset + 1] = 119
        rawData[offset + 2] = 255
      }
    }
  }

  const compressed = deflateSync(rawData)
  const idatChunk = chunk('IDAT', compressed)
  const iendChunk = chunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, chunk('IHDR', ihdrData), idatChunk, iendChunk])
}

const icon192 = generatePNG(192)
const icon512 = generatePNG(512)

writeFileSync(join(__dirname, '../public/icon-192.png'), icon192)
writeFileSync(join(__dirname, '../public/icon-512.png'), icon512)

console.log('✅ 图标生成成功：public/icon-192.png, public/icon-512.png')
