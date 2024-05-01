import {
  init,
  fetchQuery
} from "@airstack/node"
import { onlyMeIDAddress } from "../lib/types.js"

const AIRSTACK_API_KEY = process.env.AIRSTACK_API_KEY as string
init(AIRSTACK_API_KEY)

type Wallet = {
  address: string,
  blockchain: string
}

type ProfileData = {
  profileName: string,
  image: string,
  wallets: Wallet[]
}

type ProfileDataResponse = {
  profileData: ProfileData,
  error: Error
}

///////////

export async function getProfileDataFromFid(fid: number): Promise<ProfileDataResponse> {
  const query = `
    query MyQuery($userId: String!) {
      Socials(
        input: {filter: { userId: {_eq: $userId}}, blockchain: ethereum}
      ) {
        Social {
          profileName
          profileImage
          connectedAddresses {
            address
            blockchain
          }
        }
      }
    }
  `

  const { data, error } = await fetchQuery(query, { userId: fid?.toString() })
  if (error) console.log('profileData error', error)
  const profileData = {
    profileName: data.Socials.Social[0].profileName,
    image: data.Socials.Social[0].profileImage,
    wallets: data.Socials.Social[0].connectedAddresses
  }
  return { profileData, error }
}

export async function checkIfHasOnlyMeID(wallet: string) {
  const query = `
    query MyQuery($walletAddress, $onlyMeIDAddress) {
      Ethereum: TokenBalances(
        input: {filter: {owner: {_eq: $walletAddress}, tokenAddress: {_eq: $onlyMeIDAddress}}, blockchain: base, limit: 1}
      ) {
        TokenBalance {
          amount
          tokenId
        }
      }
    }
  `

  const { data, error } = await fetchQuery(query, { walletAddress: wallet, onlyMeIDAddress: onlyMeIDAddress })
  if (error) console.log('onlyMeID check error', error)
  const hasOnlyMeID = Number(data.Ethereum.TokenBalance[0].amount)
  return { hasOnlyMeID, error }
}