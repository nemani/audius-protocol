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
                logger.info(stdout.split(/\r?\n/).slice(-2)[0]);
                hexPolicy = stdout.split(/\r?\n/).slice(-2)[0];
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
                logger.info(stdout.split(/\r?\n/).slice(-2)[0]);
                resolve(stdout.split(/\r?\n/).slice(-2)[0]);
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
function encryptDir(dirPath, policyKey, { logContext }) {
    const logger = genericLogger.child(logContext)
    return new Promise((resolve, reject) => {
        logger.info(`Encrypting DIR ${dirPath}...`)

        const args = [
            '/usr/src/app/nucypher/run.py',
            'encrypt_track_segments',
            '--dirPath', dirPath + '/segments',
            '--policypubkeyHex', policyKey
        ]

        const proc = spawn('python3', args)

        // capture output
        let stdout = ''
        let stderr = ''
        proc.stdout.on('data', (data) => (stdout += data.toString() + "\n"))
        proc.stderr.on('data', (data) => (stderr += data.toString() + "\n"))

        proc.on('close', (code) => {
            if (code === 0) {
                logger.info(
                    "Command stdout:",
                    stdout,
                    "\nCommand stderr:",
                    stderr
                );
                const encryptedFilePaths = fs.readdirSync(dirPath + '/segments_encrypted')
                resolve(encryptedFilePaths)
            } else {
                logger.error('Error while init')
                logger.error('Command stdout:', stdout, '\nCommand stderr:', stderr)
                reject(new Error('nucypher Error'))
            }
        })
    })
}

function encryptFile(filePath, policyKey, { logContext }) {
    const logger = genericLogger.child(logContext)
    return new Promise((resolve, reject) => {
        logger.info(`Encrypting File ${filePath}...`)

        const args = [
            '/usr/src/app/nucypher/run.py',
            'encrypt_file',
            '--dirPath', filePath,
            '--policypubkeyHex', policyKey
        ]

        const proc = spawn('python3', args)

        // capture output
        let stdout = ''
        let stderr = ''
        proc.stdout.on('data', (data) => (stdout += data.toString() + "\n"))
        proc.stderr.on('data', (data) => (stderr += data.toString() + "\n"))

        proc.on('close', (code) => {
            if (code === 0) {
                logger.info(
                    "Command stdout:",
                    stdout,
                    "\nCommand stderr:",
                    stderr
                );
                const encryptedFilePath = filePath + '_encrypted'
                resolve(encryptedFilePath)
            } else {
                logger.error('Error while init')
                logger.error('Command stdout:', stdout, '\nCommand stderr:', stderr)
                reject(new Error('nucypher Error'))
            }
        })
    })
}
module.exports = { encryptDir, getPolicyEncryptKey, initAlice, grantAccess, encryptFile }
