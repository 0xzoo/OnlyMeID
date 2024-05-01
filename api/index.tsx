import { Frog, Button } from 'frog'
import { devtools } from 'frog/dev'
import { serveStatic } from 'frog/serve-static'
import { handle } from 'frog/vercel'
// import { introScreen } from './intro.js'
// import { startScreen } from './start.js'
// import { finishScreen } from './finish.js'
// import { errorScreen } from './components/error.js'
import { abi } from './lib/abi.js'
import {
  State,
  onlyMeIDAddress
} from './lib/types.js'
import { checkIfHasOnlyMeID, getProfileDataFromFid } from './lib/airstack.js'

const AIRSTACK_API_KEY = process.env.AIRSTACK_API_KEY as string

export const app = new Frog({
  basePath: '/api',
  hub: {
    apiUrl: "https://hubs.airstack.xyz",
    fetchOptions: {
      headers: {
        "x-airstack-hubs": AIRSTACK_API_KEY,
      }
    }
  },
  assetsPath: '/',
  headers: {
    'cache-control': 'max-age=12',
  },
  imageOptions: {
    fonts: [
      {
        name: 'Libre Baskerville',
        source: 'google'
      }
    ]
  },
  initialState: {
    walletAddress: ''
  }
})

function errorScreen(error: string) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        backgroundImage: 'url(https://github.com/0xzoo/OnlyMeID/raw/main/public/rosso.jpeg)',
        backgroundSize: '100% 100%'
      }}
    >
      <text>{error}</text>
    </div>
  )
}

app.frame('/', (c) => {
  return c.res({
    image: (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          height: '100%',
          backgroundImage: 'url(https://github.com/0xzoo/OnlyMeID/raw/main/public/nero.jpeg)',
          backgroundSize: '100% 100%',
          color: '#FFFFFF'
        }}
      >
        <text
          style={{
            fontSize: '60px'
          }}
        >Claim your OnlyMeID rewards</text>
      </div>
    ),
    intents: [
      <Button action='/start'>Verify</Button>,
      <Button.Link href='https://app.demos.global'>Mint an OnlyMeID</Button.Link>
    ]
  })
})
app.frame('/start', async (c) => {
  const fid = c.frameData?.fid as number
  const { deriveState } = c
  // read contract, if totalUsers >= maxUsers, we've reached capacity, check again later
  const { profileData, error } = await getProfileDataFromFid(fid)

  if (error) {
    return c.res({
      image: (errorScreen(error.message)),
      intents: [
        <Button.Transaction target='/claim'>Try Again</Button.Transaction>
      ]
    })
  }

  const { wallets } = profileData
  // only checking primary wallet
  let primaryWallet = wallets[0]
  deriveState(previousState => {
    let newState = previousState as State
    newState.walletAddress = primaryWallet.address
  })
  // if primary wallet isnt on eth?
  // if (primaryWallet.blockchain !== 'Ethereum') {

  // }
  const { hasOnlyMeID, error: hasOMIDError } = await checkIfHasOnlyMeID(primaryWallet.address)
  if (hasOMIDError) {
    return c.res({
      image: (errorScreen(hasOMIDError.message)),
      intents: [<Button.Transaction target='/claim'>Retry</Button.Transaction>]
    })
  } else if (!hasOnlyMeID) {
    return c.res({
      image: (errorScreen('No OnlyMeID found in your connected wallet.')),
      intents: [<Button.Link href='https://app.demos.global'>Mint an OnlyMeID</Button.Link>]
    })
  }

  // intents
  let intents: JSX.Element[] = []
  hasOnlyMeID
    ? intents.push(<Button.Transaction target="/claim">Claim</Button.Transaction>)
    : intents.push(<Button.Link href='https://app.demos.global/'>Mint an OnlyMeID</Button.Link>)
  intents.push(<Button.Reset>Back</Button.Reset>)

  return c.res({
    action: '/finish',
    image: (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          height: '100%',
          backgroundImage: 'url(https://github.com/0xzoo/OnlyMeID/raw/main/public/nero.jpeg)',
          backgroundSize: '100% 100%',
          color: '#FFFFFF'
        }}
      >
        <text
          style={{
            fontSize: '60px'
          }}
        >Claim now</text>
        {/* <h1>Let's check if you have an OnlyMeID on Base</h1>
        <text>{primaryWallet.address}</text> */}
      </div>
    ),
    intents: intents
  })
})
app.frame('/finish', (c) => {
  const { transactionId } = c
  const shareUrl = ``
  const txUrl = `https://basescan.org/tx/${transactionId}`
  return c.res({
    image: (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          height: '100%',
          backgroundImage: 'url(https://github.com/0xzoo/OnlyMeID/raw/main/public/nero.jpeg)',
          backgroundSize: '100% 100%',
          color: '#FFFFFF'
        }}
      >
        <h1
          style={{
            fontSize: '60px'
          }}
        >You claimed!</h1>
        <text
          style={{
            fontSize: '45px'
          }}
        >Tx: {transactionId}</text>
      </div>
    ),
    intents: [
      <Button.Link href={shareUrl}>Share</Button.Link>,
      <Button.Link href={txUrl}>View on BaseScan</Button.Link>
    ]
  })
})

app.transaction('/claim', (c) => {
  const { previousState } = c
  const { walletAddress } = previousState as unknown as State

  return c.contract({
    abi,
    chainId: 'eip155:8453',
    functionName: 'register',
    args: [walletAddress as `0x${string}`],
    to: onlyMeIDAddress,
    // value: parseEther('.002')
  })

})

// @ts-ignore
const isEdgeFunction = typeof EdgeFunction !== 'undefined'
const isProduction = isEdgeFunction || import.meta.env?.MODE !== 'development'
devtools(app, isProduction ? { assetsPath: '/.frog' } : { serveStatic })

export const GET = handle(app)
export const POST = handle(app)
