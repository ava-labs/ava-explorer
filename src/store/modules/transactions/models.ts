import { Transaction } from '@/js/Transaction'
import Big from 'big.js'

export interface TransactionsState {
    tx: Transaction | null
    txRes: TransactionQuery
    recentTxRes: TransactionQuery
    assetTxRes: TransactionQuery
    addressTxRes: TransactionQuery
    blockchainTxRes: TransactionQuery
}

/* ==========================================
   Transactions (API)
   ========================================== */

export interface TransactionQueryResponse {
    startTime: string
    endTime: string
    next: string
    transactions: TransactionResponse[]
}

export interface TransactionQuery {
    startTime: string
    endTime: string
    next: string
    transactions: Transaction[]
}

export interface TransactionResponse {
    id: string
    chainID: string
    type: string

    inputs: InputResponse[]
    outputs: OutputResponse[]

    memo: string // base64

    inputTotals: InputTotal
    outputTotals: OutputTotal
    reusedAddressTotals: string | null

    timestamp: string

    txFee: number

    genesis: boolean

    /*
    REWARD PATTERNS - tx type: delgator/validator only
        
    0.  KEYPAIR controls UTXOs
    1.  KEYPAIR issues ADD_VALIDATOR/ADD_DELEGATOR TX
        - validator = adds node to validator (nodeId, start, end, stakeAmount, addressID (rewards destination), fee they charge delegators)
        - delegator = delegates to validator
        - once the tx is put into block and accepted:
            - Input UTXOs
                - UTXOs for staking transfer custody to the protocol (they disappear)
            - Output UTXOs
                - none for staking (output.stake boolean)
                - change UTXOs only
        - you will become a validator/delegator at the startTime
    2. endTime arrives
    3. PROTOCOL automatically issues REMOVE_VALIDATOR / REMOVE_DELEGATOR TX
        - removes the validator/delegator from validator set
        - once the tx is put into block and accepted:
            - Input UTXOs
                - none
            - Output UTXO
                - UTXOs mirroring the ADD_VALIDATOR/ADD_DELGATOR Input UTXOs are created - get your stake back
                - no UTXO appears in tx for reward...        
                - no inputs or outputs for this tx. the output UTXOs are created out of thin air    
    4. PROTOCOL creates a commit or abort block
        - if uptime is good, then you receive the reward
        P-chain blocks contain 1 tx or 0 tx
            - 1 tx = commit block 
                - contains reward UTXO
            - 0 tx = abort block
                - no reward
    5. KEYPAIR spends reward UTXO (it appears in Ortelius)
        - confirm the reward tx (points at the ADD_* tx) is issued on the x-chain
        - possibly issued on p-chain and pvm_export to x-chain to be spent

    rewarded    | rewardedTime
    false       | null          = default, someone staked
    false       | number        = reward tx was rejected for some reason (double decision block = 2tx in one block)
    true        | number        = locktime up and reward submitted
    */
    rewarded: boolean // false by default, true when a reward is committed.
    rewardedTime: string | null

    epoch: number

    vertexId: string

    validatorNodeID: string
    validatorStart: number
    validatorEnd: number

    // p-chain event. you can tie transactions together (double decision block)
    txBlockId: string // p-chain hash (might be useful to lookup)

    /*
    TODOS: exception booleans
        - genesis
        - rewarded
        - frozen
        - stakable
            - stakeLockTime
        - stakableLockedOutput (wraps transfer)
            - stakeLockTime - vesting avax. we needed a way for ppl to stake but otherwise not spend it for any other purpose                
            - lockTime
    */
}

/* ==========================================
   Transactions (JS)
   ========================================== */
export interface ITransaction
    extends Omit<TransactionResponse, 'inputs' | 'outputs'> {
    inputs: Input[]
    outputs: Output[]
}

/* ==========================================
   UTXOs (API)
   ========================================== */
export interface InputResponse {
    credentials: CredentialResponse
    output: OutputResponse
}
export interface OutputResponse {
    id: string
    transactionID: string // INPUTS - the prev tx that generated this input UTXO. OUTPUTS - this tx
    redeemingTransactionID: string // INPUTS - this tx. OUTPUTS - "" if unspent, or the txID that spent this UTXO
    outputIndex: number // INPUTS - reference the UTXO index from the prev tx that generated this UTXO.
    chainID: string
    assetID: string
    timestamp: string // time of ingestion by Ortelius
    amount: string // 0 in the case of NFTs

    outputType: number
    groupID: number

    // RELEVANT TO P-CHAIN
    stake: boolean // if true, UTXO was in the staking output set (ins/outs/staking)
    stakeableout: boolean // if true, UTXO is/was subject to vesting. connected to stakeLocktime
    stakeLocktime: number // if before stakeLockTime, UTXO is vesting (locked), and can only used as input UTXO to stake in addValidator/addDelegator tx
    rewardUtxo: boolean // if true, this UTXO is the validation/delegation reward

    // RELEVANT TO X-CHAIN
    genesisutxo: boolean
    frozen: boolean // TODO: Apricot
    locktime: number
    threshold: number
    payload: string | null // NFTs

    // RELEVANT TO P-CHAIN & X-CHAIN
    addresses: string[] // notice the output UTXO address is blank. an exception for c-chain is handled in the transaction class

    // RELEVANT TO C-CHAIN
    caddresses: string[]
    block: string // https://cchain.explorer.avax.network/blocks/33726/transactions - broken block/tx
    nonce: number
    /*        
    X > SHARED DB > P/C
        1. EXPORT = move UTXO from X to SHARED DB (https://explorerapi.avax.network/v2/transactions/wQwXqfXKyoHSMCP4QVrfZgU9V7cBShJGgkZmGvkLQbHTRjhAS)
        2. ATOMIC_IMPORT = move UTXO from SHARED DB to P/C (https://explorerapi.avax.network/v2/transactions/9TMCg4ZRfa91NHJE7LgMFK6UHKP83uopHBFL3zyDc55acfMUF)
            - normally, we'd see an output UTXO, but in lieu of output UTXO, we see a C-address
                - inputs.addresses = [avax...]
                - outputs.address  = null
                - outputs.caddress = [0x..]
            - if you have hex C-addresses, then the output represented as atomic import address, you will see the actual block that wrapped that atomic import/export tx
    
    P/C > SHARED DB > X
        1. ATOMIC_EXPORT = move UTXO from P/C to SHARED DB 
        2. IMPORT = move UTXO from SHARED DB to X                                                    
    
    note: "chainID": "2q9e4r6Mu3U68nU1fYjgbR6JvwrRx36CohpAX5UQxse55x1Q5", is messed up    
    */
}

export interface CredentialResponse {
    signature: string
    public_key: string
    address: string
}

/* ==========================================
   UTXOs (JS)
   ========================================== */
export interface Input {
    credentials: CredentialResponse
    output: Output
}

export interface Output extends Omit<OutputResponse, 'timestamp' | 'amount'> {
    timestamp: Date
    amount: Big
}

export interface InputTotal {
    [key: string]: number
}

export interface OutputTotal {
    [key: string]: number
}

export interface OutputValuesDict {
    [key: string]: {
        symbol: string
        amount: Big
        denomination: number
        isNFT: boolean
    }
}

export interface OutValuesDenominated {
    [assetId: string]: {
        amount: string
        symbol: string
        assetID: string
        isNFT: boolean
    }
}

export enum OutputType {
    TRANSFERABLE = '',
    NFT_TRANSFERABLE = 'NFT',
    MINT = 'Mint',
    NFT_MINT = 'NFT Minting Rights',
    ATOMIC_EXPORT_TX = 'Atomic Export',
    ATOMIC_IMPORT_TX = 'Atomic Import',
}

export enum BlockType {
    PROPOSAL = 'Proposal',
    ABORT = 'Abort',
    COMMIT = 'Commit',
    STANDARD = 'Standard',
    ATOMIC = 'Atomic',
}
