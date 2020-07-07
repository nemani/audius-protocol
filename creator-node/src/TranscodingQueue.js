const Bull = require('bull')
const os = require('os')
const config = require('./config')
const ffmpeg = require('./ffmpeg')
const { logger: genericLogger } = require('./logging')
const nucypher = require('./nucypher')

const transcodingMaxConcurrency = config.get('transcodingMaxConcurrency')

// Maximum concurrency set to config var if provided
// Otherwise, uses the number of CPU cores available to node
const MAX_CONCURRENCY = transcodingMaxConcurrency !== -1
  ? transcodingMaxConcurrency
  : os.cpus().length

const PROCESS_NAMES = Object.freeze({
  segment: 'segment',
  transcode320: 'transcode_320'
})

class TranscodingQueue {
  constructor () {
    this.queue = new Bull(
      'transcoding-queue',
      {
        redis: {
          port: config.get('redisPort'),
          host: config.get('redisHost')
        }
      })

    // NOTE: Specifying max concurrency here dictates the max concurrency for
    // *any* process fn below
    // See https://github.com/OptimalBits/bull/blob/develop/REFERENCE.md#queueprocess
    this.queue.process(PROCESS_NAMES.segment, MAX_CONCURRENCY, async (job, done) => {
      const { fileDir, fileName, logContext } = job.data

      this.logStatus(logContext, `segmenting ${fileDir} ${fileName}`)

      const filePaths = await ffmpeg.segmentFile(
        fileDir,
        fileName,
        { logContext }
      )

      const encryptedFilePaths = await nucypher.encryptDir(fileDir, fileName);
      done(null, { encryptedFilePaths, filePaths })
    })

    this.queue.process(PROCESS_NAMES.transcode320, /* inherited */ 0, async (job, done) => {
      const { fileDir, fileName, logContext } = job.data

      this.logStatus(logContext, `transcoding to 320kbps ${fileDir} ${fileName}`)

      const filePath = await ffmpeg.transcodeFileTo320(
        fileDir,
        fileName,
        { logContext }
      )

      const encryptedFileDir = await nucypher.encryptDir(fileDir, fileName);
      const encryptedFilePath = encryptedFileDir + fileName
      done(null, { encryptedFilePath, filePath })
    })

    this.logStatus = this.logStatus.bind(this)
    this.segment = this.segment.bind(this)
    this.transcode320 = this.transcode320.bind(this)
  }

  /**
   * Logs a status message and includes current queue info
   * @param {object} logContext to create a logger.child(logContext) from
   * @param {string} message
   */
  async logStatus (logContext, message) {
    const logger = genericLogger.child(logContext)
    const count = await this.queue.count()
    logger.info(`Transcoding Queue: ${message}`)
    logger.info(`Transcoding Queue: count: ${count}`)
  }

  /**
   * Adds a task to the queue that segments up an audio file
   * @param {string} fileDir
   * @param {string} fileName
   * @param {object} logContext to create a logger.child(logContext) from
   */
  async segment (fileDir, fileName, { logContext }) {
    const job = await this.queue.add(
      PROCESS_NAMES.segment,
      { fileDir, fileName, logContext }
    )
    const result = await job.finished()
    return result
  }

  /**
   * Adds a task to the queue that transcodes an audio file to 320kpbs mp3
   * @param {string} fileDir
   * @param {string} fileName
   * @param {object} logContext to create a logger.child(logContext) from
   */
  async transcode320 (fileDir, fileName, { logContext }) {
    const job = await this.queue.add(
      PROCESS_NAMES.transcode320,
      { fileDir, fileName, logContext }
    )
    const result = await job.finished()
    return result
  }
}

module.exports = new TranscodingQueue()
