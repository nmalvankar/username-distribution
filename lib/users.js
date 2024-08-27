'use strict'

const fs = require('fs')
const csvParser = require('csv-parser')
const config = require('../config')
const User = require('./user.class.js')
const pLocate = require('p-locate')
const log = require('barelog')

const users = generateUserList()

exports.getUserList = () => {
  return Promise.all(users.map(u => u.getUserInfo()))
}

/**
 * Verify that the username in question is still valid for usage.
 * This is useful to detect if a user that was assigned has since
 * been disabled and should no longer be used
 */
exports.isUserAssignmentValid = async (username) => {
  log(`checking if assignemnt of ${username} is still valid`)
  const userAccount = users.find(u => u.username === username)

  if (userAccount) {
    const data = await userAccount.getUserInfo()
    const isDisabled = data.disabled
    log('user data', data)
    if (isDisabled) {
      await userAccount.unassign()
      return false
    } else {
      return true
    }
  } else {
    // This user must no longer exist and is therefore invalid
    return false
  }
}

/**
 * If the user email is in use, return that one. Otherwise,
 * find the first unassigned user account, marks it assigned, and returns it
 * @returns {User}
 */
exports.getAndAssignUser = async (ip, email) => {

  // check for existing account under this email
  const existingAccount = await pLocate(users, async (u) => {
    const existingData = await u.getUserInfo();
    return (existingData.email && (existingData.email == email))
  })

  if (existingAccount) {
    await existingAccount.assign(ip, email)
    log("found existing account under " + email + ", assigning to previous entry");
    return existingAccount;
  }

  // no existing email account found, find the next assignable one and assign it
  const userAccount = await pLocate(users, async (u) => {
    const ret = await u.isAssignable()

    return ret
  })

  if (userAccount) {
    await userAccount.assign(ip, email)

    return userAccount
  } else {
    return undefined
  }
}

/**
 * Marks a user account as unassigned
 * @returns {undefined}
 */
exports.unassignUser = async (username) => {
  log(`running user unassignment for ${username}`)
  const userAccount =  users.find(u => u.username === username)

  if (!userAccount) {
    throw new Error(`unable to find user account with username ${username}`)
  }

  await userAccount.unassign()
}

/**
 * Marks a user account as blocked
 * @returns {undefined}
 */
exports.blockUser = async (username) => {
  log(`running user blocking for ${username}`)
  const userAccount =  users.find(u => u.username === username)

  if (!userAccount) {
    throw new Error(`unable to find user account with username ${username}`)
  }

  await userAccount.disable()
}

/**
 * Marks a user account as unblocked (available for assignment)
 * @returns {undefined}
 */
exports.unblockUser = async (username) => {
  log(`running user blocking for ${username}`)
  const userAccount =  users.find(u => u.username === username)

  if (!userAccount) {
    throw new Error(`unable to find user account with username ${username}`)
  }

  await userAccount.enable()
}

/**
 * Generates an initial user object list.
 * @returns {User[]}
 */
function generateUserList () {
  log('Gemerating user list')
  const list = []
  const blockedUserNums = config.accounts.blockedUsers.map(num => {
    const n = parseInt(num, 10)

    if (isNaN(n) || n <= 0) {
      throw new Error(`Failed to parse blocked user number "${num}". Blocked users must be positive integers`)
    }

    return n
  })

  for (let i = 0; i < config.accounts.number; i++) {
    log('setting user for demo')
    const userNum = i + 1
    const user = new User(userNum)

    list.push(user)

    if (blockedUserNums.includes(userNum)) {
      log(`disabling user ${user.username} due to configured blocklist`)
      user.disable()
    } else {
      user.enable()
    }
  }

  return list
}
