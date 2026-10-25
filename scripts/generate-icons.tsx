/**
 * Génère les icônes PWA (PNG) à partir d'un SVG dessiné en code.
 * Usage : npm run icons
 */
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const SVG = (size: number, padding: number) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#8b5cf6"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="${padding > 0 ? '#7c3aed' : 'none'}" ${
    padding === 0 ? 'rx="128"' : ''
  }/>
  <g transform="translate(${padding}, ${padding}) scale(${(512 - padding * 2) / 512})">
    <rect width="512" height="512" rx="128" fill="url(#g)"/>
    <text x="256" y="360" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
      font-weight="800" font-size="300" fill="white">B</text>
  </g>
</svg>`

async function main() {
  const outDir = path.join(process.cwd(), 'public', 'icons')
  fs.mkdirSync(outDir, { recursive: true })

  const targets = [
    { file: 'icon-192.png', size: 192, padding: 0 },
    { file: 'icon-512.png', size: 512, padding: 0 },
    { file: 'icon-maskable-512.png', size: 512, padding: 64 }, // zone de sécurité maskable
    { file: 'apple-touch-icon.png', size: 180, padding: 0 },
  ]

  for (const t of targets) {
    await sharp(Buffer.from(SVG(t.size, t.padding))).resize(t.size, t.size).png().toFile(
      path.join(outDir, t.file),
    )
    console.log(`✅ ${t.file}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
