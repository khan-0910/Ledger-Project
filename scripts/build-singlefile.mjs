import { copyFileSync, statSync } from 'node:fs'

// vite-plugin-singlefile already inlines JS/CSS into dist_single/index.html,
// so the QA preview is just that file under a stable name.
copyFileSync('dist_single/index.html', 'preview.html')
const kb = (statSync('preview.html').size / 1024).toFixed(0)
console.log(`preview.html written (${kb} kB)`)
