const fs = require('fs')
const path = require('path')
const assert = require('assert')

const transcodeFileTo320 = require('./ffmpeg.js')
const ipfsClient = require('ipfs-http-client')

const models = require('./db.js')

// const ROOTDIR = '/Users/sid/Documents/Audius/code/audius/audius-protocol/creator-node/download-fix'
const ROOTDIR = '/Users/sid/Documents/Audius/code/audius/sid-test/download-fix'

const prodDBSFCN1Path = path.join(ROOTDIR, '/prod/cn1-files-db.txt')
const prodDBSFCN2Path = path.join(ROOTDIR, '/prod/cn2-files-db.txt')
const prodDBSFCN3Path = path.join(ROOTDIR, '/prod/cn3-files-db.txt')
const prodDiskSFCN1Path = path.join(ROOTDIR, '/prod/cn1-files-disk.txt')
const prodDiskSFCN2Path = path.join(ROOTDIR, '/prod/cn2-files-disk.txt')
const prodDiskSFCN3Path = path.join(ROOTDIR, '/prod/cn3-files-disk.txt')

const stageDBSFCN1Path = path.join(ROOTDIR, '/staging/cn1-files-db.txt')
const stageDBSFCN2Path = path.join(ROOTDIR, '/staging/cn2-files-db.txt')
const stageDBSFCN3Path = path.join(ROOTDIR, '/staging/cn3-files-db.txt')
const stageDiskSFCN1Path = path.join(ROOTDIR, '/staging/cn1-files-disk.txt')
const stageDiskSFCN2Path = path.join(ROOTDIR, '/staging/cn2-files-disk.txt')
const stageDiskSFCN3Path = path.join(ROOTDIR, '/staging/cn3-files-disk.txt')

const fn = async (env = 'staging') => {
  let dbSFCN1Path, dbSFCN2Path, dbSFCN3Path, diskSFCN1Path, diskSFCN2Path, diskSFCN3Path
  if (env === 'prod') {
    dbSFCN1Path = prodDBSFCN1Path
    dbSFCN2Path = prodDBSFCN2Path
    dbSFCN3Path = prodDBSFCN3Path
    diskSFCN1Path = prodDiskSFCN1Path
    diskSFCN2Path = prodDiskSFCN2Path
    diskSFCN3Path = prodDiskSFCN3Path
  }
  else {
    dbSFCN1Path = stageDBSFCN1Path
    dbSFCN2Path = stageDBSFCN2Path
    dbSFCN3Path = stageDBSFCN3Path
    diskSFCN1Path = stageDiskSFCN1Path
    diskSFCN2Path = stageDiskSFCN2Path
    diskSFCN3Path = stageDiskSFCN3Path
  }

  /** get sourceFiles of all tracks on all CNodes that don't have copy320 file entry on DB */

  let dbSFCN1 = fs.readFileSync(dbSFCN1Path, 'utf8').split('\n')
  console.log(`dbSFCN1 Original length: ${dbSFCN1.length}`)
  const dbSFCN1Map = {}
  dbSFCN1.map(row => {
    let [sourceFile, cnodeUserUUID, trackUUID] = row.split('\t')
    dbSFCN1Map[sourceFile] = [cnodeUserUUID, trackUUID]
  })
  dbSFCN1 = Object.keys(dbSFCN1Map)
  console.log(`dbSFCN1Map Length: ${dbSFCN1.length}`)

  let dbSFCN2 = fs.readFileSync(dbSFCN2Path, 'utf8').split('\n')
  console.log(`dbSFCN2 Original length: ${dbSFCN2.length}`)
  const dbSFCN2Map = {}
  dbSFCN2.map(row => {
    let [sourceFile, cnodeUserUUID, trackUUID] = row.split('\t')
    dbSFCN2Map[sourceFile] = [cnodeUserUUID, trackUUID]
  })
  dbSFCN2 = Object.keys(dbSFCN2Map)
  console.log(`dbSFCN2Map Length: ${dbSFCN2.length}`)

  let dbSFCN3 = fs.readFileSync(dbSFCN3Path, 'utf8').split('\n')
  console.log(`dbSFCN3 Original length: ${dbSFCN3.length}`)
  const dbSFCN3Map = {}
  dbSFCN3.map(row => {
    let [sourceFile, cnodeUserUUID, trackUUID] = row.split('\t')
    dbSFCN3Map[sourceFile] = [cnodeUserUUID, trackUUID]
  })
  dbSFCN3 = Object.keys(dbSFCN3Map)
  console.log(`dbSFCN3Map Length: ${dbSFCN3.length}`)


  /** dedupe all DB sourceFiles into single Set */
  let dbSourceFilesAll = dbSFCN1.concat(dbSFCN2.concat(dbSFCN3))
  assert.equal(dbSFCN1.length + dbSFCN2.length + dbSFCN3.length, dbSourceFilesAll.length, 'fuck')
  dbSourceFilesAll = new Set(dbSourceFilesAll)
  console.log(`Unique track SourceFile DB entries: ${dbSourceFilesAll.size}\n`)
  
  /** get all sourceFile dirs from each disk */
  let diskSFCN1 = fs.readFileSync(diskSFCN1Path, 'utf8').split('\n')
  console.log(`diskSFCN1 length: ${diskSFCN1.length}`)
  let diskSFCN2 = fs.readFileSync(diskSFCN2Path, 'utf8').split('\n')
  console.log(`diskSFCN2 length: ${diskSFCN2.length}`)
  let diskSFCN3 = fs.readFileSync(diskSFCN3Path, 'utf8').split('\n')
  console.log(`diskSFCN3 length: ${diskSFCN3.length}`)

  /** search all CNodes for every sourceFile for dir with matching name */
  diskSFCN1 = new Set([...diskSFCN1])
  diskSFCN2 = new Set([...diskSFCN2])
  diskSFCN3 = new Set([...diskSFCN3])
  let sfCN1 = new Set([...dbSourceFilesAll].filter(sf => diskSFCN1.has(sf.split('.')[0])))
  console.log(`recoverable sourceFiles (on DB and Disk) sfCN1: ${sfCN1.size}`)
  let sfCN2 = new Set([...dbSourceFilesAll].filter(sf => diskSFCN2.has(sf.split('.')[0])))
  console.log(`recoverable sourceFiles (on DB and Disk) sfCN2: ${sfCN2.size}`)
  let sfCN3 = new Set([...dbSourceFilesAll].filter(sf => diskSFCN3.has(sf.split('.')[0])))
  console.log(`recoverable sourceFiles (on DB and Disk) sfCN3: ${sfCN3.size}`)
  console.log(`total number of recoverable sourceFiles: ${sfCN1.size + sfCN2.size + sfCN3.size}`)

  let allSF = new Set([...sfCN1, ...sfCN2, ...sfCN3])
  console.log(`final set size of recoverable sourceFiles: ${allSF.size} out of total DB sourcefiles ${dbSourceFilesAll.size}`)
  Array.from(sfCN3).forEach(elem => console.log(`${elem}: ${dbSFCN3Map[elem]}`))

}

const run = async () => {
  const env = 'prod'
  fn(env)

  console.log('Exiting...')
  // process.exit(0)
}
run()
