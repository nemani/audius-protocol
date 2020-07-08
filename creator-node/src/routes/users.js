const ethereumUtils = require('ethereumjs-util')
const crypto = require('crypto')
const base64url = require('base64-url')
const { promisify } = require('util')
const randomBytes = promisify(crypto.randomBytes)

const models = require('../models')
const { authMiddleware, syncLockMiddleware } = require('../middlewares')
const { handleResponse, successResponse, errorResponseBadRequest } = require('../apiHelpers')
const sessionManager = require('../sessionManager')
const utils = require('../utils')
const nucypher = require("../nucypher");

const CHALLENGE_VALUE_LENGTH = 20
const CHALLENGE_TTL_SECONDS = 120
const CHALLENGE_PREFIX = 'userLoginChallenge:'

module.exports = function (app) {
    app.get("/users/initAlice",handleResponse(async (req, res, next) => {
        metadataJson = await nucypher.initAlice({ logContext: req.logContext });
        return successResponse();
      })
    );

  app.post("/users/grantAccess", handleResponse(async (req, res, next) => {
      const { trackId, bobPublicKey } = req.body;
      const { trackUUID, metadataJSON } = await models.Track.findOne({
        attributes: ['trackUUID', 'metadataJSON'],
        where: {
          blockchainId: trackId
        }
      })

      const firstSegment = metadataJSON.track_segments[0]
      if (!firstSegment) return errorResponseServerError('No segment found for track')

      const file = await models.File.findOne({
        where: {
            multihash: firstSegment.multihash,
            trackUUID
          }
      })
      
    let data = await nucypher.grantAccess(JSON.stringify(bobPublicKey), file.sourceFile, { logContext: req.logContext });
    return successResponse({data});
    })
  );

  app.post('/users', handleResponse(async (req, res, next) => {
    let walletAddress = req.body.walletAddress
    if (!ethereumUtils.isValidAddress(walletAddress)) {
      return errorResponseBadRequest('Ethereum address is invalid')
    }

    walletAddress = walletAddress.toLowerCase()

    const existingUser = await models.CNodeUser.findOne({
      where: {
        walletPublicKey: walletAddress
      }
    })
    if (existingUser) {
      return successResponse() // do nothing if user already exists
    }

    await models.CNodeUser.create({ walletPublicKey: walletAddress })
    return successResponse()
  }))

  // TODO: to deprecate; leaving here for backwards compatibility
  app.post('/users/login', handleResponse(async (req, res, next) => {
    const { signature, data } = req.body

    if (!signature || !data) {
      return errorResponseBadRequest('Missing request body values.')
    }

    let address = utils.verifySignature(data, signature)
    address = address.toLowerCase()

    const user = await models.CNodeUser.findOne({
      where: {
        walletPublicKey: address
      }
    })
    if (!user) {
      return errorResponseBadRequest('Invalid data or signature')
    }

    const theirTimestamp = parseInt(data.split(':')[1])
    const ourTimestamp = Math.round((new Date()).getTime() / 1000)

    if (Math.abs(theirTimestamp - ourTimestamp) > 3600) {
      console.error(`Timestamp too old. User timestamp ${theirTimestamp}, Server timestamp ${ourTimestamp}`)
    }

    const sessionToken = await sessionManager.createSession(user.cnodeUserUUID)
    return successResponse({ sessionToken })
  }))

  /**
   * Return a challenge used for validating user login. Challenge value
   * is also set in redis cache with the key 'userLoginChallenge:<wallet>'.
   */
  app.get('/users/login/challenge', handleResponse(async (req, res, next) => {
    let walletPublicKey = req.query.walletPublicKey

    if (!walletPublicKey) {
      return errorResponseBadRequest('Missing wallet address.')
    }

    walletPublicKey = walletPublicKey.toLowerCase()
    const userLoginChallengeKey = `${CHALLENGE_PREFIX}${walletPublicKey}`
    const redisClient = req.app.get('redisClient')
    const challengeBuffer = await randomBytes(CHALLENGE_VALUE_LENGTH)
    const challengeBytes = base64url.encode(challengeBuffer)
    const challenge = `Click sign to authenticate with creator node: ${challengeBytes}`

    // Set challenge ttl to 2 minutes ('EX' option = sets expire time in seconds)
    // https://redis.io/commands/set
    // https://github.com/luin/ioredis/blob/master/examples/basic_operations.js#L44
    await redisClient.set(userLoginChallengeKey, challenge, 'EX', CHALLENGE_TTL_SECONDS)

    return successResponse({ walletPublicKey, challenge })
  }))

  /**
   * Checks if challenge in request body matches up with what we have stored.
   * If request challenge matches what we have, remove instance from redis to
   * prevent replay attacks. Return sessionToken upon success.
   */
  app.post('/users/login/challenge', handleResponse(async (req, res, next) => {
    const { signature, data: theirChallenge } = req.body

    if (!signature || !theirChallenge) {
      return errorResponseBadRequest('Missing request body values.')
    }

    let address
    try {
      address = utils.verifySignature(theirChallenge, signature)
      address = address.toLowerCase()
    } catch (e) {
      return errorResponseBadRequest(`Unable to verify signature: ${e}`)
    }

    const user = await models.CNodeUser.findOne({
      where: {
        walletPublicKey: address
      }
    })
    if (!user) {
      return errorResponseBadRequest('Invalid data or signature')
    }

    const redisClient = req.app.get('redisClient')
    const userLoginChallengeKey = `${CHALLENGE_PREFIX}${address}`
    const ourChallenge = await redisClient.get(userLoginChallengeKey)

    if (!ourChallenge) {
      return errorResponseBadRequest('Missing challenge key')
    }

    if (theirChallenge !== ourChallenge) {
      return errorResponseBadRequest(`Invalid response.`)
    }

    await redisClient.del(userLoginChallengeKey)

    // All checks have passed! generate a new session token for the user
    const sessionToken = await sessionManager.createSession(user.cnodeUserUUID)
    return successResponse({ sessionToken })
  }))

  app.post('/users/logout', authMiddleware, syncLockMiddleware, handleResponse(async (req, res, next) => {
    await sessionManager.deleteSession(req.get(sessionManager.sessionTokenHeader))
    return successResponse()
  }))
}
