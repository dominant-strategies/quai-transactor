const winston = require('winston')

const customFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${level.toUpperCase()} [${formatDate(new Date(timestamp))}] ${message} `
  for (const key in metadata) {
    msg += `${key}:= ${metadata[key]} `
  }
  return msg
})
function formatDate (date) {
  const pad = (num) => num.toString().padStart(2, '0')
  const padMilliseconds = (num) => num.toString().padStart(3, '0')

  const day = pad(date.getDate())
  const month = pad(date.getMonth() + 1)
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  const seconds = pad(date.getSeconds())
  const milliseconds = padMilliseconds(date.getMilliseconds())

  return `${month}-${day}|${hours}:${minutes}:${seconds}.${milliseconds}`
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.ms(),
    customFormat
  ),
  transports: [
    new winston.transports.Console()
  ]
})

module.exports = logger
