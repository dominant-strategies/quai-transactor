const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')

const logsDir = path.join(__dirname, 'logs')

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir)
}

for (let i = 0; i < 3; i++) {
  for (let j = 0; j < 3; j++) {
    const cmd = `node index.js -g group-0 -z zone-${i}-${j}`
    const logStream = fs.createWriteStream(`${logsDir}/zone-${i}-${j}.log`, { flags: 'a' })

    const proc = exec(cmd)

    proc.stdout.pipe(logStream)
    proc.stderr.pipe(logStream)

    proc.on('error', (error) => {
      console.error(`Error: ${error.message}`)
    })
  }
}
