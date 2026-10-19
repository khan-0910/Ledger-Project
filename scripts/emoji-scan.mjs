import fs from 'node:fs'
import path from 'node:path'

const re = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{2190}-\u{21FF}]/u
const dir = process.argv[2] ?? 'src'
const hits = []
function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f)
    const st = fs.statSync(p)
    if (st.isDirectory()) walk(p)
    else if (/\.tsx?$/.test(p)) {
      const lines = fs.readFileSync(p, 'utf8').split('\n')
      lines.forEach((l, i) => {
        if (re.test(l)) hits.push(p.split(path.sep).join('/') + ':' + (i + 1) + ': ' + l.trim().slice(0, 110))
      })
    }
  }
}
walk(dir)
console.log('TOTAL', hits.length)
const byFile = {}
hits.forEach((h) => { const f = h.split(':')[0]; byFile[f] = (byFile[f] || 0) + 1 })
console.log(byFile)
if (process.argv[3] === '-v') console.log(hits.join('\n'))
