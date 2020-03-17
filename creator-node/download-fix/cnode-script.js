const fs = require('fs')
const path = require('path')
const assert = require('assert')

const ipfsClient = require('ipfs-http-client')

const transcodeFileTo320 = require('./ffmpeg.js')


const initIPFS = async () => {
  const ipfsHost = process.env.ipfsHost
  const ipfsPort = process.env.ipfsPort
  // const ipfsHost = "localhost"
  // const ipfsPort = 6001
  if (!ipfsHost || !ipfsPort) {
    console.log('Must set ipfsHost and ipfsPort envvars.')
    process.exit(1)
  }
  const ipfs = ipfsClient(ipfsHost, ipfsPort)
  const identity = await ipfs.id()
  console.log(`Current IPFS Peer ID: ${JSON.stringify(identity)}`)
  return ipfs
}

const timeout = async (ms) => {
  console.log(`starting timeout of ${ms}`)
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * given path to sourceFileDir
 *  - get master file in sourceFileDir
 *  - transcode to 320kbps
 *  - save transcode to /file_storage/Qm..., use same saveFileToIPFSFromFs() functionality
 *  - create copy320 DB entry (consider doing in bulk after all transcodes)
 */
const processSourceFile = async (workDir, sourceFileName, ipfs, transaction = null) => {
  const fileDir = path.resolve(workDir, sourceFileName.split('.')[0])
  if (!fs.existsSync(fileDir)) {
    console.error(`Path does not exist: ${fileDir}`)
    return false
  }
  
  console.log(`transcoding ${fileDir}`)
  const dlCopyFilePath = await transcodeFileTo320(fileDir, sourceFileName)
  console.log(`Transcoded file ${sourceFileName} to ${dlCopyFilePath}.`)

  const multihash = (await ipfs.addFromFs(dlCopyFilePath, { pin: false, onlyHash: true }))[0].hash
  console.log(`Computed file IPFS CID: ${multihash}`)
  
  const dstPath = path.join(workDir, multihash)
  
  fs.renameSync(dlCopyFilePath, dstPath)
  console.log(`Moved file from ${dlCopyFilePath} to ${dstPath}`)

  return { dstPath, multihash }
}


const run = async () => {
  const dataFilePath = '/usr/src/app/scripts/final-sourcefiles-cn2.txt'
  let data = fs.readFileSync(dataFilePath, 'utf8').split('\n')

  const ipfs = await initIPFS()

  const workDir = '/file_storage'
  
  let counter = 1
  for (const row of data) {
    
    if (!row) { continue }
    
    const [sourceFile, v] = row.split(': ')
    const [cnodeUserUUID, trackUUID] = v.split(',')

    console.log(`SOURCEFILE: ${sourceFile} || CNODEUSERUUID: ${cnodeUserUUID} || TRACKUUID: ${trackUUID}`)
    continue
    
    const { dstPath, multihash } = await processSourceFile(workDir, sourceFile, ipfs)
    
    console.log(`SIDTEST SOURCEFILE: ${sourceFile} || CNODEUSERUUID: ${cnodeUserUUID} || TRACKUUID: ${trackUUID} || MULTIHASH: ${multihash} || DSTPATH: ${dstPath}`)
    console.log(`COMPLETED ROW #${counter++}`)
    await timeout(1000)
  }
}
run()