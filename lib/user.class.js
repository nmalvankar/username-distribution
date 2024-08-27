'use strict'

const fs = require('fs')
const csvParser = require('csv-parser')
const assert = require('assert')
const log = require('barelog')
const config = require('../config')
const cache = require('./cache')
const { promisify } = require('util')
//const csvFilePath = 'credentials.csv'

const cacheGet = promisify(cache.get).bind(cache);
const cacheSet = promisify(cache.set).bind(cache);
const cacheDel = promisify(cache.del).bind(cache);

const csvFilePath = 'credentials.csv'
const rs = fs.createReadStream(csvFilePath)

/**
 * Data cached for a given User object
 * @typedef {Object} UserCacheEntry
 * @property {Date} assignedTs
 * @property {string} username
 * @property {string} email
 * @property {string} disabled
 * @property {string} ip
 * @property {string} password
 */

class User {
  /**
   * Create a user with the given index/number
   * @param {number} num
   */
  constructor (num) {
    if (num < 10 && config.accounts.padZeroes) {
      this.username = `${config.accounts.prefix}0${num}`
    } else {
      this.username = `${config.accounts.prefix}${num}`;
    }

    this.cacheKey = `user:${this.username}`
    this.getPasswordforUsername(this.username)

  }

  /**
   * @returns {UserCacheEntry|undefined}
   */
  async _getCachedData () {
    const result = await cacheGet(this.cacheKey)

    if (result) {
      const data = JSON.parse(result)

      return data
    } else {
      // Just return some defaults
      return {
        username: this.username
      }
    }
  }

  async _setDisabled (disabled) {
    const data = await this._getCachedData()
    await this._setCachedData(data.assignedTs, data.ip, data.email, disabled)
  }

  async enable () {
    // This will allow the user to be assigned
    await this._setDisabled(false)
  }

  async disable () {
    // This will force the user to be unassigned and set disabled to true
    await this._setDisabled(true)
  }

  /**
   * Store data for this user in the cache
   * @param {string} assignedTs
   * @param {string} ip
   * @param {string} email
   * @param {Boolean} disabled
   * @param {string} password
   */
  async _setCachedData (assignedTs, ip, email, disabled, password) {
    const data = {
      assignedTs,
      ip,
      disabled,
      email,
      username: this.username,
      password: this.password
    }

    log(`setting cached data for user ${this.username} to:`, data)
    await cacheSet(this.cacheKey, JSON.stringify(data))
  }


  /**
   * Retrieve the data for this user from cache
   * @returns {UserCacheEntry}
   */
  async getUserInfo () {
    const data = await this._getCachedData()

    return {
      ...data
    }
  }

  async isAssignable () {
    const data = await this._getCachedData()
    log(`checking if ${this.username} is assignable`, data)
    if (data && !data.assignedTs && !data.disabled) {
      return true
    } else {
      return false
    }
  }

  /**
   * Determines if this user has been assigned to someone
   */
  async isAssigned () {
    log(`checking if user ${this.username} is assigned`)
    const data = await this._getCachedData()

    if (data && data.assignedTs) {
      log(`${this.username} is assigned`)
      return true
    } else {
      log(`${this.username} is not assigned`)
      return false
    }
  }

  /**
   * Assigns this lab user to an application user requesting an account
   * @param {string} ip
   * @param {string} email
   */
  async assign (ip, email) {
    assert(ip, 'User assignment requires an IP parameter')
    assert(email, 'User assignment requires an email parameter')

    await this._setCachedData(new Date().toJSON(), ip, email, false)
  }

  /**
   * Frees this user for reassignment.
   * Reads the user state to ensure the "disabled" flag is respected
   */
  async unassign () {
    const data = await this._getCachedData()

    this._setCachedData(null, null, null, data.disabled || false, data.password)
  }

  async _setPassword (password) {
    const data = await this._getCachedData()
    await this._setCachedData(data.assignedTs, data.ip, data.email, data.disabled, data.password)
  }
  
  getPasswordforUsername(username) {
    let passwordFound = false;

    rs.pipe(csvParser())
        .on('data', (row) => {
            if (row.username === username) {
                passwordFound = true;
                this.password = row.password;
                return row.password
            }
        })
        .on('end', () => {
            if (!passwordFound) {
                log(`Password not found for username: ${this.username}`);
            }
        })
        .on('error', (err) => {
          log(err);
        });   
    }

}

module.exports = User
