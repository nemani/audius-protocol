const config = require('./config')
const fs = require('fs')
const path = require('path')
const ffmpeg = require('ffmpeg-static').path
const spawn = require('child_process').spawn
const { logger: genericLogger } = require('./logging')


function initAlice({logContext}){
    const logger = genericLogger.child(logContext)
    return new Promise((resolve, reject) => {
        logger.info(`Calling initAlice...`)

        const args = [
            '/usr/src/app/nucypher/run.py',
            'initialize_alice'
        ]

        const proc = spawn('python3', args)

        // capture output
        let stdout = ''
        let stderr = ''
        proc.stdout.on('data', (data) => (stdout += data.toString()))
        proc.stderr.on('data', (data) => (stderr += data.toString()))

        proc.on('close', (code) => {
            if (code === 0) {
                resolve()
            } else {
                logger.error('Error while init')
                logger.error('Command stdout:', stdout, '\nCommand stderr:', stderr)
                reject(new Error('nucypher Error'))
            }
        })
    })
}
/** 
 * Given a dir containing track segments and the keys of the creators
 * Encrypt all of the files 
 */
function getPolicyEncryptKey(song_title, { logContext }) {
    const logger = genericLogger.child(logContext)
    return new Promise((resolve, reject) => {
        logger.info(`Calling getPolicyEncryptKey...`)

        const args = [
            '/usr/src/app/nucypher/run.py',
            'get_policy_pubkey',
            '--label', song_title
        ]

        const proc = spawn('python3', args)

        // capture output
        let stdout = ''
        let stderr = ''
        proc.stdout.on('data', (data) => (stdout += data.toString()))
        proc.stderr.on('data', (data) => (stderr += data.toString()))

        proc.on('close', (code) => {
            if (code === 0) {
                hexPolicy = stdout;
                resolve(hexPolicy)
            } else {
                logger.error('Error while init')
                logger.error('Command stdout:', stdout, '\nCommand stderr:', stderr)
                reject(new Error('nucypher Error'))
            }
        })
    })
}

function grantAccess(bob_pubkeys, fileName, { logContext }) {
    const logger = genericLogger.child(logContext)
    return new Promise((resolve, reject) => {
        logger.info(`Granting Access to bob for label ${fileName}...`)

        const args = [
            '/usr/src/app/nucypher/run.py',
            'grant_access_policy',
            '--label', fileName,
            '--bobpubkeys', bob_pubkeys
        ]

        const proc = spawn('python3', args)

        // capture output
        let stdout = ''
        let stderr = ''
        proc.stdout.on('data', (data) => (stdout += data.toString()))
        proc.stderr.on('data', (data) => (stderr += data.toString()))

        proc.on('close', (code) => {
            if (code === 0) {
                resolve(stdout);
            } else {
                logger.error('Error while init')
                logger.error('Command stdout:', stdout, '\nCommand stderr:', stderr)
                reject(new Error('nucypher Error'))
            }
        })
    })
}

/** 
 * Given a dir containing track segments and the keys of the creators
 * Encrypt all of the files 
 */
function encryptDir(dirPath, fileName, { logContext }) {
    const logger = genericLogger.child(logContext)
    return new Promise((resolve, reject) => {
        logger.info(`Encrypting DIR ${dirPath}...`)

        const args = [
            '/usr/src/app/nucypher/run.py',
            'encrypt_track_segments',
            '--dirPath', dirPath + '/segments',
            '--policypubkeyHex', getPolicyEncryptKey(fileName)
        ]

        const proc = spawn('python3', args)

        // capture output
        let stdout = ''
        let stderr = ''
        proc.stdout.on('data', (data) => (stdout += data.toString()))
        proc.stderr.on('data', (data) => (stderr += data.toString()))

        proc.on('close', (code) => {
            if (code === 0) {
                const encryptedFilePaths = fs.readdirSync(fileDir + '/segments_encrypted')
                resolve(encryptedFilePaths)
            } else {
                logger.error('Error while init')
                logger.error('Command stdout:', stdout, '\nCommand stderr:', stderr)
                reject(new Error('nucypher Error'))
            }
        })
    })
}

module.exports = { encryptDir, getPolicyEncryptKey, initAlice }
