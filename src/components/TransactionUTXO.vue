<template>
    <section v-if="tx" class="card meta utxo">
        <article v-if="!isAssetGenesis" class="meta_row">
            <p class="label">Input UTXOs</p>
            <div v-if="inputs.length > 0">
                <div class="utxo_headers">
                    <p>Tx</p>
                    <p></p>
                    <p>Lock Time</p>
                    <p>Threshold</p>
                    <p>From</p>
                    <p>Type</p>
                    <p class="amount">Amount</p>
                </div>
                <utxo-row
                    v-for="(input, i) in inputs"
                    :key="i"
                    class="io_item"
                    :utxo="input"
                    type="input"
                ></utxo-row>
            </div>
            <div v-else>
                <p>
                    No input UTXOs found for this transaction on the Avalanche
                    Explorer.
                </p>
            </div>
        </article>
        <article class="meta_row">
            <p class="label">Output UTXOs</p>
            <div v-if="tx.outputs.length > 0">
                <div class="utxo_headers">
                    <p>Tx</p>
                    <p></p>
                    <p>Lock Time</p>
                    <p>Threshold</p>
                    <p>To</p>
                    <p class="type">Type</p>
                    <p class="amount">Amount</p>
                </div>
                <utxo-row
                    v-for="(output, i) in outputs"
                    :key="i"
                    class="io_item"
                    :utxo="output"
                    type="output"
                ></utxo-row>
            </div>
            <div v-else>
                <p>No output utxos found for this transaction.</p>
            </div>
        </article>
    </section>
</template>

<script lang="ts">
import 'reflect-metadata'
import { Vue, Component, Prop } from 'vue-property-decorator'
import CopyText from '@/components/misc/CopyText.vue'
import UtxoRow from '@/components/Transaction/UtxoRow.vue'
import {
    getMappingForType,
    Transaction,
    getTransactionOutputs,
    getTransactionInputs,
} from '../js/Transaction'
import {
    OutputValuesDict,
    IOutValuesDenominated,
} from '@/store/modules/transactions/models.ts'
import { stringToBig, toAVAX } from '../helper'
import Tooltip from '@/components/rows/Tooltip.vue'
import { getAssetType } from '@/services/assets'

@Component({
    components: {
        UtxoRow,
        Tooltip,
        CopyText,
    },
    filters: {
        getType: getMappingForType,
        toAVAX,
        getAssetType,
    },
})
export default class TransactionUTXO extends Vue {
    @Prop() tx!: Transaction

    b64DecodeHex(str: string): string {
        const raw = atob(str)
        let result = ''
        for (let i = 0; i < raw.length; i++) {
            const hex = raw.charCodeAt(i).toString(16)
            result += hex.length === 2 ? hex : '0' + hex
        }
        return result.toUpperCase()
    }

    get outputs() {
        return getTransactionOutputs(
            this.tx.outputs,
            this.tx.chainID,
            this.tx.type
        )
    }

    b64EncodeUnicode(str: string): string {
        // first we use encodeURIComponent to get percent-encoded UTF-8,
        // then we convert the percent encodings into raw bytes which
        // can be fed into btoa.
        return btoa(
            encodeURIComponent(str).replace(
                /%([0-9A-F]{2})/g,
                function toSolidBytes(match, p1) {
                    return String.fromCharCode(parseInt('0x' + p1))
                }
            )
        )
    }

    b64DecodeUnicode(str: string): string {
        // Going backwards: from bytestream, to percent-encoding, to original string.
        return decodeURIComponent(
            atob(str)
                .split('')
                .map(function (c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
                })
                .join('')
        )
    }

    get text_hex(): string {
        return this.b64DecodeHex(this.tx.memo)
    }

    get text_utf8(): string {
        return this.b64DecodeUnicode(this.tx.memo)
    }

    get isText(): boolean {
        return this.tx.memo === '' || null ? false : true
    }

    get inputs() {
        return getTransactionInputs(
            this.tx.inputs,
            this.tx.chainID,
            this.tx.type
        )
    }

    get isAssetGenesis(): boolean {
        return this.tx.type === 'create_asset'
    }

    get date(): Date {
        return new Date(this.tx.timestamp)
    }

    get assets(): any {
        return this.$store.state.assets
    }

    get outValues(): OutputValuesDict {
        const dict: OutputValuesDict = {}
        const outs = this.tx.outputs

        outs.forEach((out) => {
            const assetID = out.assetID
            const amount = out.amount
            const asset = this.assets[assetID]
            let denomination = 0
            let symbol = assetID
            if (asset) {
                denomination = asset.denomination
                symbol = asset.symbol
            } else {
                this.$store.dispatch('addUnknownAsset', assetID)
            }
            if (dict[assetID]) {
                const valNow = dict[assetID].amount
                dict[assetID].amount = valNow.plus(amount)
            } else {
                dict[assetID] = {
                    symbol,
                    amount,
                    denomination,
                }
            }
        })
        return dict
    }

    get outValuesDenominated() {
        const outValuesDenominated: IOutValuesDenominated = {}
        for (const assetId in this.outValues) {
            const val = this.outValues[assetId]
            const res = stringToBig(
                val.amount.toString(),
                val.denomination
            ).toLocaleString(val.denomination)
            outValuesDenominated[assetId] = {
                amount: res,
                symbol: val.symbol,
            }
        }
        return outValuesDenominated
    }
}
</script>

<style scoped lang="scss">
.utxo {
    margin-top: 30px;
}

.decode {
    display: inline-block;
    color: $primary-color-light;
    width: 60px;
    font-size: 12px;
}
</style>