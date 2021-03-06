import { Module } from 'vuex'
import { IRootState } from '@/store/types'
import {
    TransactionResponse,
    TransactionQueryResponse,
    TransactionsState,
    TransactionQuery,
} from './models'
import { getTransaction, ITransactionPayload } from '@/services/transactions'
import { Transaction } from '@/js/Transaction'
import { parseTxs } from './helpers'

const defaultState = {
    tx: null,
    txRes: {
        startTime: '',
        endTime: '',
        next: '',
        transactions: [],
    },
    recentTxRes: {
        startTime: '',
        endTime: '',
        next: '',
        transactions: [],
    },
    assetTxRes: {
        startTime: '',
        endTime: '',
        next: '',
        transactions: [],
    },
    addressTxRes: {
        startTime: '',
        endTime: '',
        next: '',
        transactions: [],
    },
    blockchainTxRes: {
        startTime: '',
        endTime: '',
        next: '',
        transactions: [],
    },
}

const transactions_module: Module<TransactionsState, IRootState> = {
    namespaced: true,
    modules: {},
    state: defaultState,
    mutations: {
        addTx(state, tx: Transaction) {
            state.tx = tx
        },
        addTxs(state, txRes: TransactionQuery) {
            state.txRes = txRes
        },
        addRecentTxs(state, txRes: TransactionQuery) {
            state.recentTxRes = txRes
        },
        addAssetTxs(state, txRes: TransactionQuery) {
            state.assetTxRes = txRes
        },
        addAddressTxs(state, txRes: TransactionQuery) {
            state.addressTxRes = txRes
        },
        addBlockchainTxs(state, txRes: TransactionQuery) {
            state.blockchainTxRes = txRes
        },
    },
    actions: {
        async getTx(store, payload: ITransactionPayload) {
            const txRes: TransactionResponse = await getTransaction(payload.id)
            if (txRes) store.commit('addTx', new Transaction(txRes))
        },
        async getTxs(store, payload: ITransactionPayload) {
            const txRes: TransactionQueryResponse = await getTransaction(
                payload.id,
                payload.params
            )
            store.commit('addTxs', parseTxs(txRes))
        },
        async getRecentTxs(store, payload: ITransactionPayload) {
            const txRes: TransactionQueryResponse = await getTransaction(
                payload.id,
                payload.params
            )
            store.commit('addRecentTxs', parseTxs(txRes))
        },
        async getTxsByAddress(store, payload: ITransactionPayload) {
            const txRes: TransactionQueryResponse = await getTransaction(
                payload.id,
                payload.params
            )
            store.commit('addAddressTxs', parseTxs(txRes))
        },
        async getTxsByAsset(store, payload: ITransactionPayload) {
            const txRes: TransactionQueryResponse = await getTransaction(
                payload.id,
                payload.params
            )
            store.commit('addAssetTxs', parseTxs(txRes))
        },
        async getTxsByBlockchain(store, payload: ITransactionPayload) {
            const txRes: TransactionQueryResponse = await getTransaction(
                payload.id,
                payload.params
            )
            store.commit('addBlockchainTxs', parseTxs(txRes))
        },
        async getNFTPayloads(store, payload: ITransactionPayload) {
            // get the asset creation tx
            const txRes: TransactionResponse = await getTransaction(payload.id)
            // find the NFT Minting Right UTXO
            const NFTMintUTXO = txRes.outputs.find(
                (utxo) => utxo.outputType === 10
            )
            // the redeemedTx of the NFT Minting Right UTXO has the payloads
            const txResNFT: TransactionResponse = await getTransaction(
                NFTMintUTXO?.redeemingTransactionID
            )
            // get a list of payload tuples [payload, groupID]
            // remove empty strings and duplicates
            const payloads = txResNFT.outputs
                .map((utxo) => [utxo.payload, utxo.groupID])
                .filter((payload: (string | number | null)[]) => {
                    if (payload[0]) return (payload[0] as string).length !== 0
                })
                .filter((value, index, self) => self.indexOf(value) === index)
            return payloads
        },
    },
}
export default transactions_module
