// React + Web3 Essentials
import { ethers } from 'ethers';

// External Packages
import axios from 'axios';
//import { parseEther, bigNumber } from 'ethers/utils'

// Internal Components
import { getReq } from 'api';
import { convertAddressToAddrCaip } from './CaipHelper';
import { IPFSGateway } from './IpfsHelper';

// Constants
const COINDESK_CHANNEL_ADDR = '0xe56f1D3EDFFF1f25855aEF744caFE7991c224FFF';
const COINDESK_HASH = '1+bafkreif643vf3cteadznccivnsk5uj26e3ls7onbshnldb3aej3omrxsau';
const ENS_CHANNEL_ADDR = '0x983110309620D911731Ac0932219af06091b6744';
const ENS_HASH = '1+bafkreiekigkyezwrspignt7l7vsrjefjmogwmigy4eqtts277cu2p23ilm';
// FeedDB Helper Function
const EPNSCoreHelper = {
  // get gas price in dollars
  getGasPriceInDollars: async (library) => {
    const ethPrice = await axios
      .get('https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD')
      .then(({ data }) => data.USD || 0);
    const gasPriceInWei = await library.getGasPrice();
    const gasPriceInEth = ethers.utils.formatEther(gasPriceInWei);
    const gasPriceInUsd = gasPriceInEth * ethPrice;
    return gasPriceInUsd;
  },

  // To get owner info
  getOwnerInfo: async (contract) => {
    const enableLogs = 0;

    return new Promise((resolve, reject) => {
      // Get User Info from Push (EPNS) Core
      contract
        .governance()
        .then((response) => {
          if (enableLogs) console.log('getOwnerInfo() --> %o', response);
          resolve(response);
        })
        .catch((err) => {
          console.log('!!!Error, getOwnerInfo() --> %o', err);
          reject(err);
        });
    });
  },
  getVotingPower: async (delegateeAddress, contract, rawFormat = false) => {
    let isAddress = await ethers.utils.isAddress(delegateeAddress);
    if (isAddress || delegateeAddress.endsWith('.eth')) {
      try {
        let decimals = await contract.decimals();
        let votes = await contract.getCurrentVotes(delegateeAddress);
        let votingPower = await Number(votes / Math.pow(10, decimals));
        let prettyVotingPower = votingPower.toString();
        return rawFormat ? votingPower : prettyVotingPower;
      } catch (err) {
        console.log('🚀 ~ file: ViewDelegateeItem.js ~ line 47 ~ getVotingPower ~ err', err);
      }
    }
    return '0.000';
  },
  // To get user info
  getUserInfo: async (user, contract) => {
    const enableLogs = 0;

    return new Promise((resolve, reject) => {
      // Get User Info from Push (EPNS) Core
      contract
        .users(user)
        .then((response) => {
          const mappings = { ...response };
          mappings.addr = user;

          if (enableLogs) console.log('getUserInfo() --> %o', mappings);
          resolve(mappings);
        })
        .catch((err) => {
          console.log('!!!Error, getUserInfo() --> %o', err);
          reject(err);
        });
    });
  },
  // To retrieve a channel address from it's id
  getChannelAddressFromID: async (channelID, contract) => {
    return new Promise((resolve, reject) => {
      // To get channel info from a channel address
      contract
        .channelById(channelID)
        .then((response) => {
          // console.log("getChannelAddressFromID() --> %o", response.toString());
          resolve(response.toString());
        })
        .catch((err) => {
          console.log('!!!Error, getChannelAddressFromID() --> %o', err);
          reject(err);
        });
    });
  },
  // To retrieve a channel's Info from channel address
  getChannelInfo: async (channel, contract) => {
    if (channel === null) return;
    const enableLogs = 0;
    return new Promise((resolve, reject) => {
      // To get channel info from a channel address
      contract
        .channels(channel)
        .then((response) => {
          // Add an extra field for future info
          const mappings = { ...response };
          mappings.addr = channel;

          if (enableLogs) console.log('getChannelInfo() --> %o', mappings);
          resolve(mappings);
        })
        .catch((err) => {
          console.log('!!!Error, getChannelInfo() --> %o', err);
          reject(err);
        });
    });
  },
  // To retrieve a channel's AddChannel event
  getChannelEvent: async (channel, startBlock, updateBlock, contract) => {
    const enableLogs = 0;

    return new Promise((resolve, reject) => {
      // To get channel ipfs hash from channel info
      let filter = contract.filters.AddChannel(channel);
      let block = startBlock;
      if (startBlock != updateBlock) {
        filter = contract.filters.UpdateChannel(channel);
        block = updateBlock;
      }

      contract
        .queryFilter(filter, block, block)
        .then((response) => {
          let filteredResponse;

          if (enableLogs) console.log('getChannelEvent() --> Finding: %s in | %o |', channel, response);

          response.forEach(function (item) {
            if (item.args.channel.toString() == channel.toString()) {
              if (enableLogs) console.log('getChannelEvent() --> Selected Channel %o: ', item);
              filteredResponse = ethers.utils.toUtf8String(item.args.identity);
            }
          });

          if (enableLogs) console.log('getChannelEvent() --> Filtered Channel: %o', filteredResponse);
          resolve(filteredResponse);
        })
        .catch((err) => {
          console.log('!!!Error, getChannelEvent() --> %o', err);
          reject(err);
        });
    });
  },
  // Retrive IPFS File from ipfshash
  getJsonFileFromIdentity: async (identity, channel) => {
    const enableLogs = 0;

    return new Promise((resolve, reject) => {
      // Split Channel Identity, delimeter of identity is "+"
      if (!identity) {
        reject('There is no identity file for channel:', channel);
      }
      const ids = identity?.split('+') || []; // First segment is storage type, second is the pointer to it

      if (ids[0] == 1) {
        // IPFS HASH
        // Form Gateway URL
        const IPFS_GATEWAY = IPFSGateway;
        const url = IPFS_GATEWAY + ids[1];
        fetch(url)
          .then((response) => response.json())
          .then((response) => {
            if (enableLogs) console.log('getJsonFileFromIdentity() --> %o', response);
            resolve(response);
          })
          .catch((err) => {
            console.log('!!!Error, getJsonFileFromIdentity() --> %o', err);
            reject(err);
          });
      }
    });
  },

  // Helper to get Channel Alias from Channel's address
  // getAliasAddressFromChannelAddress: async (channel, chainId) => {
  //   if (channel === null) return;
  //   const enableLogs = 0;

  //   return new Promise((resolve, reject) => {
  //     // To get channel info from a channel address
  //     const channelAddressInCaip = convertAddressToAddrCaip(channel, chainId);
  //     getReq(`/v1/alias/${channelAddressInCaip}/channel`)
  //       .then((response) => {
  //         if (enableLogs) console.log('getAliasAddressFromChannelAddress() --> %o', response);
  //         resolve(response?.data?.aliasAddress);
  //       })
  //       .catch((err) => {
  //         console.log('!!!Error, getAliasAddressFromChannelAddress() --> %o', err);
  //         reject(err);
  //       });
  //   });
  // },
  // Helper to get Channel from Channel's address
  getChannelJsonFromChannelAddress: async (channel, contract) => {
    if (channel === null) return;
    const enableLogs = 0;

    return new Promise((resolve, reject) => {
      // To get channel info from a channel address
      EPNSCoreHelper.getChannelInfo(channel, contract)
        .then((response) =>
          EPNSCoreHelper.getChannelEvent(
            channel,
            response.channelStartBlock.toNumber(),
            response.channelUpdateBlock.toNumber(),
            contract
          )
        )
        .then((response) => {
          // add little hack for now to change coindesk's descriptioon
          const hash =
            channel === COINDESK_CHANNEL_ADDR ? COINDESK_HASH : channel === ENS_CHANNEL_ADDR ? ENS_HASH : response;
          return EPNSCoreHelper.getJsonFileFromIdentity(hash, channel);
          // return EPNSCoreHelper.getJsonFileFromIdentity(response, channel)
        })
        .then((response) => {
          if (enableLogs) console.log('getChannelJsonFromChannelAddress() --> %o', response);
          resolve(response);
        })
        .catch((err) => {
          console.log('!!!Error, getChannelJsonFromChannelAddress() --> %o', err);
          reject(err);
        });
    });
  },
  // Helper to get Channel from User's address
  getChannelJsonFromUserAddress: async (user, contract) => {
    if (user === null) return;
    const enableLogs = 0;

    return new Promise((resolve, reject) => {
      // To get channel info from a channel address
      // EPNSCoreHelper.getUserInfo(user, contract)
      //   .then(response => EPNSCoreHelper.getChannelJsonFromChannelAddress(user, contract))
      EPNSCoreHelper.getChannelJsonFromChannelAddress(user, contract)
        .then((response) => {
          if (enableLogs) console.log('getChannelJsonFromUserAddress() --> %o', response);
          resolve(response);
        })
        .catch((err) => {
          console.log('!!!Error, getChannelJsonFromUserAddress() --> %o', err);
          reject(err);
        });
    });
  },
  // Get Total Number of Channels
  getTotalNumberOfChannels: async (contract) => {
    const enableLogs = 0;

    return new Promise((resolve, reject) => {
      // Get User Info from Push (EPNS) Core
      contract
        .channelsCount()
        .then((response) => {
          if (enableLogs) console.log('getTotalNumberOfChannels() --> %o', response.toNumber());
          resolve(response.toNumber());
        })
        .catch((err) => {
          console.log('!!!Error, getTotalNumberOfChannels() --> %o', err);
          reject(err);
        });
    });
  },
  // Get channels address given number of channels, , atIndex: -1 is start from latest, numChannels: -1 is return all
  getChannelsMetaLatestToOldest: async (atIndex, numChannels, contract) => {
    const enableLogs = 0;

    return new Promise((resolve, reject) => {
      EPNSCoreHelper.getTotalNumberOfChannels(contract)
        .then(async (response) => {
          let channelsInfo = [];
          const channelsCount = response;

          if (atIndex > channelsCount || atIndex == -1) {
            atIndex = channelsCount - 1;
          }

          if (numChannels == -1) {
            numChannels = channelsCount;
          }

          // Get channels
          let channelArrays = [];

          // prefil and then refil
          let count = 0;
          for (let i = numChannels - 1; i >= 0; i--) {
            const assignedChannelID = atIndex - i;
            channelArrays.push(assignedChannelID);
          }

          const promises = channelArrays.map(async (channelID) => {
            await EPNSCoreHelper.getChannelAddressFromID(channelID, contract)
              .then((response) => EPNSCoreHelper.getChannelInfo(response, contract))
              .then((response) => {
                if (enableLogs)
                  console.log('getChannelsMetaLatestToOldest(%d, %d) --> %o', channelID, numChannels, channelsInfo);
                channelsInfo = [response, ...channelsInfo];
              })
              .catch((err) => console.log('Error in channel: %d | skipping...', channelID));
          });

          // wait until all promises are resolved
          await Promise.all(promises);

          if (enableLogs)
            console.log(
              'getChannelsMetaLatestToOldest(Index: %d, Number: %d) --> %o',
              atIndex,
              numChannels,
              channelsInfo
            );
          resolve(channelsInfo);
        })
        .catch((err) => {
          console.log('!!!Error, getChannelsMetaLatestToOldest() --> %o', err);
          reject(err);
        });
    });
  },
  // Get Total Number of Users
  getTotalNumberOfUsers: async (contract) => {
    return new Promise((resolve, reject) => {
      // Get User Info from Push (EPNS) Core
      contract
        .usersCount()
        .then((response) => {
          console.log('getTotalNumberOfUsers() --> %o', response.toNumber());
          resolve(response.toNumber());
        })
        .catch((err) => {
          console.log('!!!Error, getTotalNumberOfUsers() --> %o', err);
          reject(err);
        });
    });
  },
  // To retrieve public key of a user
  getPublicKey: async (address, contract) => {
    const enableLogs = 0;

    return new Promise((resolve, reject) => {
      // To get channel ipfs hash from channel info
      let filteredResponse;
      contract
        .queryFilter('PublicKeyRegistered')
        .then((response) => {
          response.forEach(function (item) {
            if (item.args[0] == address) {
              filteredResponse = item;
            }
          });

          if (enableLogs) console.log('Public Key Registry Response: ' + response);
          if (enableLogs) console.log('Public Key Registry Filtered: ' + filteredResponse);

          if (!filteredResponse || filteredResponse.length == 0) {
            resolve(null);
          } else {
            resolve(filteredResponse.args[1]);
          }
        })
        .catch((err) => {
          console.log(err);
          reject(err);
        });
    });
  },
  // Get Total Subsbribed Channels
  getSubscribedStatus: async (user, channel, contract) => {
    return new Promise((resolve, reject) => {
      // Get User Info from Push (EPNS) Core
      contract
        .isUserSubscribed(channel, user)
        .then((response) => {
          // console.log("getSubscribedStatus() --> %o", {response, user, channel});
          resolve(response);
        })
        .catch((err) => {
          console.log('!!!Error, getSubscribedStatus() --> %o', err);
          reject(err);
        });
    });
  },
  // Get Total Subsbribed Channels
  getTotalSubscribedChannels: async (user, contract) => {
    return new Promise((resolve, reject) => {
      // Get User Info from Push (EPNS) Core
      contract.users[user]
        .subscribedCount()
        .then((response) => {
          console.log('getTotalSubscribedChannels() --> %o', response.toNumber());
          resolve(response.toNumber());
        })
        .catch((err) => {
          console.log('!!!Error, getTotalSubscribedChannels() --> %o', err);
          reject(err);
        });
    });
  },
  // Get Fair Share
  getFairShareOfUserAtBlock: async (user, block, contract) => {
    const enableLogs = 0;

    return new Promise((resolve, reject) => {
      // Get User Info from Push (EPNS) Core
      contract
        .users(user)
        .then((response) => {
          if (response.userActivated) {
            contract
              .calcAllChannelsRatio(user, block)
              .then((response) => {
                if (enableLogs) console.log('calcAllChannelsRatio() --> %o', response);
                resolve(response);
              })
              .catch((err) => {
                console.log('!!!Error, calcAllChannelsRatio() --> %o', err);
                reject(err);
              });
          } else {
            if (enableLogs) console.log('!!!Warning, calcAllChannelsRatio() --> User not activated');
            reject('User not activated');
          }
        })
        .catch((err) => {
          console.log('!!!Error, calcAllChannelsRatio() --> %o', err);
          reject(err);
        });
    });
  },
  // Get Pool Funds
  getPoolFunds: async (contract) => {
    const enableLogs = 0;

    return new Promise((resolve, reject) => {
      contract
        .poolFunds()
        .then((response) => {
          if (enableLogs) console.log('getPoolFunds() --> %o', response);
          resolve(response);
        })
        .catch((err) => {
          console.log('!!!Error, getPoolFunds() --> %o', err);
          reject(err);
        });
    });
  },
  // Helper Functions
  // To format Big Number
  formatBigNumberToMetric: (bignumber, convertToCurrency) => {
    try {
      if (convertToCurrency) {
        bignumber = bignumber.div(100000000000000);
        bignumber = bignumber.div(10000);
      }
      bignumber = bignumber.toNumber();
      return EPNSCoreHelper.metricFormatter(bignumber, 2);
    } catch (e) {
      console.log(e);
      return '---';
    }
  },
  // Metric Formatter, thanks: https://stackoverflow.com/questions/9461621/format-a-number-as-2-5k-if-a-thousand-or-more-otherwise-900
  metricFormatter: (num, digits) => {
    var si = [
      { value: 1, symbol: '' },
      { value: 1e3, symbol: 'k' },
      { value: 1e6, symbol: 'M' },
      { value: 1e9, symbol: 'G' },
      { value: 1e12, symbol: 'T' },
      { value: 1e15, symbol: 'P' },
      { value: 1e18, symbol: 'E' },
    ];
    var rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
    var i;
    for (i = si.length - 1; i > 0; i--) {
      if (num >= si[i].value) {
        break;
      }
    }
    return (num / si[i].value).toFixed(digits).replace(rx, '$1') + si[i].symbol;
  },
};

export default EPNSCoreHelper;
