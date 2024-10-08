'use strict'

const { randomBytes } = require('crypto')
const env = require('env-var').from({
  // Default values to use if not defined in the environment
  LAB_SESSION_SECRET: randomBytes(8).toString(),
  LAB_TITLE: 'OpenShift Space Adventure',
  LAB_DURATION_HOURS: '2h',
  LAB_USER_COUNT: '50',
  LAB_USER_PASS: 'openshift',
  LAB_USER_ACCESS_TOKEN: 'redhatlabs',
  LAB_BLOCKLIST: '',
  LAB_USER_PREFIX: 'player',
  LAB_USER_PAD_ZERO: 'false',
  LAB_ADMIN_PASS: 'pleasechangethis',
  LAB_MODULE_URLS: 'https:red.ht/island;OCP Space Adventure',
  LAB_EXTRA_URLS: '',

  // If you plan to use redis uncomment and set these,
  // or provide in values for them in the environment
  // LAB_REDIS_HOST: 'some.redis.host',
  // LAB_REDIS_PASS: 'somepassword',

  // Include environment values. These will take precedence over
  // the defaults defined above if defined
  ...process.env
})

module.exports = {
  redis: {
    // host: 'localhost',//env.get('LAB_REDIS_HOST').asString(),
    // password: 'mypassword',//env.get('LAB_REDIS_PASS').asString()
    host: env.get('LAB_REDIS_HOST').asString(),
    password: env.get('LAB_REDIS_PASS').asString()
  },
  adminPassword: env.get('LAB_ADMIN_PASS').asString(),
  sessionSecret: env.get('LAB_SESSION_SECRET').asString(),
  eventTitle: env.get('LAB_TITLE').asString(),
  eventHours: env.get('LAB_DURATION_HOURS').asString(),
  accounts: {
    accessToken: env.get('LAB_USER_ACCESS_TOKEN').asString(),
    number: env.get('LAB_USER_COUNT').asIntPositive(),
    password: env.get('LAB_USER_PASS').asString(),
    // Can be set as a comma separated list of names
    blockedUsers: env.get('LAB_BLOCKLIST').asArray(),
    prefix: env.get('LAB_USER_PREFIX').asString(),
    padZeroes: env.get('LAB_USER_PAD_ZERO').asBool()
  },
  // Comma separated list of URLS
  modules: env.get('LAB_MODULE_URLS').asArray(),
  extraUrls: env.get('LAB_EXTRA_URLS').asArray()
}
