/*
    TyronZIL-js: Decentralized identity client for the Zilliqa blockchain platform
    Copyright (C) 2020 Julio Cesar Cabrapan Duarte

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.
*/

import  TyronContract, { ContractInitialization } from './tyron-contract';
import TyronAnchor from '../sidetree/protocol-files/anchor-file';
import { NetworkNamespace } from '../sidetree/tyronZIL-schemes/did-scheme';
import TyronStore, { TransactionStore } from '../CAS/tyron-store';
import * as API from '@zilliqa-js/zilliqa';
import * as Util from '@zilliqa-js/util';
import * as Crypto from '@zilliqa-js/crypto';
import Multihash from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Multihash';
import SidetreeError from '@decentralized-identity/sidetree/dist/lib/common/SidetreeError';
import ErrorCode from '../ErrorCode';
import TyronState, { StateModel } from './tyron-state';

/** Handles the microservice that interacts with the Zilliqa blockchain platform */
export default class TyronZIL extends TyronContract {
    
    /** Sidetree Anchor string written in the transaction
     * 
     * Composed of the CAS URI of an Anchor file prefixed with the declared operation count - max 10.000 operations */
    public readonly anchorString: string;

    /** The `tyron state` corresponding to the transaction and written into the `tyron-smart-contract` */
    public readonly tyronState: TyronState;
    
    /** When the transaction got written, in which block number and its hash 
     * & the hash of the tyronZIL transaction */
    public readonly transaction: TransactionStore;
    
    /***            ****            ***/
   
    private constructor (
        zilliqaMicroservice: Tx
    ) {
        super(zilliqaMicroservice.init);
        this.anchorString = zilliqaMicroservice.anchorString;
        this.tyronState = zilliqaMicroservice.tyronState;
        this.transaction = zilliqaMicroservice.transaction;
    }

    /** Executes a tyronZIL transaction on the Zilliqa blockchain platform */
    public static async executeTransaction(input: TxInput): Promise<TyronZIL | undefined> {
        try {
            const CONTRACT_INIT = new TyronContract(input.init);
        
        /** Validates that the necessary files are available in the content-addressable storage */
        /*const FILES_IN_CAS = await TyronStore.fetchFile(        
            input.anchor.casUri,
            input.anchor.maxSize,
            input.anchor.mapFileUri,
            input.anchor.chunkFileUri,
            input.anchor.maxSizeChunk
        );

        if (FILES_IN_CAS.anchor === undefined) {
            throw new SidetreeError(ErrorCode.AnchorNotCAS)
        }

        if (input.anchor.mapFile !== undefined && FILES_IN_CAS.map === undefined) {
            throw new SidetreeError(ErrorCode.MapNotCAS)
        }

        if (input.anchor.chunkFile !== undefined && FILES_IN_CAS.chunk === undefined) {
            throw new SidetreeError(ErrorCode.ChunkNotCAS)
        }

        /***            ****            ***/

        const NETWORK_NAMESPACE = input.anchor.network;

        // Defaults to testnet
        let NETWORK_ENDPOINT = ZilliqaEndpoint.Testnet;
        let CHAIN_ID = ZilliqaChainID.Testnet;
        if (NETWORK_NAMESPACE === NetworkNamespace.Mainnet) {
            NETWORK_ENDPOINT = ZilliqaEndpoint.Mainnet;
            CHAIN_ID = ZilliqaChainID.Mainnet
        }

        const ZILLIQA = new API.Zilliqa(NETWORK_ENDPOINT);

        /***            ****            ***/

        //const LATEST_STAMP = JSON.stringify(input.latestBlockStamp);
        
        /** Fetches the client's latest `tyron state` */
        //const LATEST_TYRON_STATE = await TyronStore.fetchState(LATEST_STAMP);

        /** Fetches the `tyron state` (mutable state variable) fron the `tyron-smart-contract` */
        const SMART_CONTRACT_STATE = await ZILLIQA.blockchain.getSmartContractState(CONTRACT_INIT.tyronAddress);
        const STATE_RESULT = JSON.stringify(SMART_CONTRACT_STATE.result, null, 2);
        console.log(`The latest state fetched from the smart-contract: ${STATE_RESULT}`);
        
        // Validates that the client's latest state matches the contract's

        if ("EiAUZnDAiDuctCwNGJDpCUiq_b9SiwCyGdn6rv3R4vuc2A" !== JSON.parse(STATE_RESULT).tyron_hash) {
            throw new SidetreeError(ErrorCode.IncorrectLatestState);
        }

        /***            ****            ***/

        /** Validates that the given private key corresponds to the client's wallet */
        const CLIENT_ADDRESS = Crypto.getAddressFromPrivateKey(input.privateKey);
        if (CLIENT_ADDRESS !== CONTRACT_INIT.clientAddress) {
            throw new SidetreeError(ErrorCode.WrongKey);
        }

        /** Gets the current balance of the account ( in Qa = 10^-12 ZIL as string)
         * & the current nonce of the account (as number) */
        const GET_BALANCE = await ZILLIQA.blockchain.getBalance(CONTRACT_INIT.clientAddress);
        const BALANCE_RESULT = GET_BALANCE.result;

        /** Fetches the initialization immutable parameters from the `tyron-smart-contract` */
        const SMART_CONTRACT_INIT = await ZILLIQA.blockchain.getSmartContractInit(CONTRACT_INIT.tyronAddress);
        const INIT_RESULT = SMART_CONTRACT_INIT.result;
        
        let OPERATION_COST;
        if (Array.isArray(INIT_RESULT)) {
            for (const parameter of INIT_RESULT) {
                if (parameter.vname === 'operation_cost') {
                    OPERATION_COST = parameter.value;
                }
            }
        }

        /** The number of operations to be processed */
        const COUNT = input.anchor.count;

        /** The payment to process the tyronZIL transaction */
        const PAYMENT = Number(OPERATION_COST) * COUNT;

        // The account's balance MUST be enough for the payment
        if (Number(BALANCE_RESULT.balance) < PAYMENT) {
            throw new SidetreeError(ErrorCode.NotEnoughBalance)
        }

        /***            ****            ***/

        const NEW_STATE_MODEL: StateModel = {
            anchorString: input.anchor.anchorString,
            previousTransaction: input.previousTransaction,
            previousTyronHash: input.previousTyronState.tyronHash,
        }

        const NEW_TYRON_STATE: TyronState = await TyronState.write(JSON.stringify(NEW_STATE_MODEL));

        const SUBMIT_TX: SubmitTxInput = {
            contractInit: CONTRACT_INIT,
            anchorString: input.anchor.anchorString,
            count: COUNT,
            payment: PAYMENT,
            api: ZILLIQA,
            chainID: CHAIN_ID,
            nonce: BALANCE_RESULT.nonce,
            privateKey: input.privateKey,
            address: CLIENT_ADDRESS,
            tyronHash: NEW_TYRON_STATE.tyronHash,
        }

        /** tyronZIL transaction */
        const tyronZIL_TX = await this.submitTx(SUBMIT_TX);
        
        const CUMULATIVE_GAS = tyronZIL_TX?.receipt.cumulative_gas;
        console.log(`The total gas consumed in this transaction is: ${CUMULATIVE_GAS}`);

        const EPOCH_NUM = tyronZIL_TX?.receipt.epoch_num;
        const LEDGER_TIME = Number(EPOCH_NUM);
        
        const EVENT_LOGS = tyronZIL_TX?.receipt.event_logs;
        console.log(`An array of event logs emitted by the contract during processing: ${JSON.stringify(EVENT_LOGS, null, 2)}`);
        const EVENT_PARAMS = EVENT_LOGS[0].params;

        let TX_NUMBER;
        if (Array.isArray(EVENT_PARAMS)) {
            for (const parameter of EVENT_PARAMS) {
                if (parameter.vname === 'sidetree_transaction_number') {
                    TX_NUMBER = parameter.value;
                }
            }
        }

        const TX_HASH = Multihash.canonicalizeThenHashThenEncode(tyronZIL_TX!);

        /** The block where the transaction got written */
        const GET_TX_BLOCK = await ZILLIQA.blockchain.getTxBlock(LEDGER_TIME);
        const LEDGER_HASH = GET_TX_BLOCK.result?.body.BlockHash;

        const TIME_STAMP: BlockTimeStamp = {
            ledgerTime: LEDGER_TIME,
            ledgerHash: LEDGER_HASH!,
        };

        const NEW_TRANSACTION: TransactionStore = {
            timeStamp: TIME_STAMP,
            txHash: TX_HASH,
        };

        const TX_OUTPUT: Tx = {
            init: CONTRACT_INIT,
            anchorString: input.anchor.anchorString,    //to-do change this to event log info
            tyronState: NEW_TYRON_STATE,        //to-do fetch it from event
            transaction: NEW_TRANSACTION,
        }
        const STORAGE = new Map([
            [NEW_TRANSACTION, NEW_TYRON_STATE]
        ]);
        await TyronStore.write(TX_NUMBER, STORAGE);

        return new TyronZIL(TX_OUTPUT);

        } catch (error) {
            console.log(error);
            return undefined;
        }
    }

    /***            ****            ***/
    
    /** Generates a new transaction object and sends it to the Zilliqa network for processing */
    private static async submitTx(input: SubmitTxInput): Promise<TxResponse | undefined> {
        try {
            const MSG_VERSION = 1;
            const VERSION = Util.bytes.pack(input.chainID, MSG_VERSION);
            
            const AMOUNT = new Util.BN(input.payment);
            const MIN_GAS_PRICE = await input.api.blockchain.getMinimumGasPrice();
            const GAS_PRICE = new Util.BN(MIN_GAS_PRICE.result!);
            const GAS_LIMIT = new Util.Long(2500);

            const PUB_KEY = Crypto.getPubKeyFromPrivateKey(input.privateKey);
            
            const TYRON_HASH: TransitionParams = {
                vname: "tyronHash",
                type: "String",
                value: input.tyronHash,
            }

            const SIDETREE_ANCHOR: TransitionParams = {
                vname: "sidetreeAnchor",
                type: "String",
                value: input.anchorString,
            }

            const COUNT: TransitionParams = {
                vname: "count",
                type: "Uint128",
                value: String(input.count),
            }

            const DATA: Transition = {
                _tag: "UpdateData",
                _amount: String(input.payment),
                _sender: input.address,
                params: [TYRON_HASH, SIDETREE_ANCHOR, COUNT]
            }

            const TX_OBJECT: ZilliqaTxObject = {
                version: VERSION,
                amount: AMOUNT,
                nonce: input.nonce + 1,
                gasLimit: GAS_LIMIT,
                gasPrice: GAS_PRICE,
                toAddr: input.contractInit.tyronAddress,
                pubKey: PUB_KEY,
                data: JSON.stringify(DATA),
            }

            const RAW_TX = input.api.transactions.new(TX_OBJECT);
            input.api.wallet.addByPrivateKey(input.privateKey);
            const SIGNED_TX = await input.api.wallet.signWith(RAW_TX, input.address);

            /** Sends the transaction to the Zilliqa blockchain platform */
            const TX = await input.api.provider.send('CreateTransaction', SIGNED_TX.txParams);

            const TX_RESULT = TX.result;
            console.log(`The transaction result is: ${JSON.stringify(TX_RESULT, null, 2)}`);

            const ZIL_HASH = TX_RESULT.TranID;

            const _TX = await SIGNED_TX.confirm(ZIL_HASH, 33, 1000)
            console.log(`The TX is: ${JSON.stringify(_TX, null, 2)}`);

            const STATUS = SIGNED_TX.isConfirmed();
            console.log(`Status of the transaction is: ${STATUS}`);

            const GET_TRANSACTION = await input.api.blockchain.getTransaction(ZIL_HASH);
            const TX_RECEIPT = GET_TRANSACTION.getReceipt();

            const TX_RESPONSE: TxResponse = {
                result: TX_RESULT,
                zilHash: ZIL_HASH,
                status: STATUS,
                receipt: TX_RECEIPT,
            }
            return TX_RESPONSE;

        } catch (error) {
            console.log(error); 
            return undefined;           
        }
    }
}

/***            ** interfaces **            ***/

/** The output of a tyronZIL transaction */
interface Tx {
    init: ContractInitialization;
    anchorString: string;
    tyronState: TyronState;
    transaction: TransactionStore;
}

export interface BlockTimeStamp {
    ledgerTime: number;
    ledgerHash: string;
}

export interface TxInput {
    init: ContractInitialization;
    //latestBlockStamp: BlockTimeStamp;
    /** The client's private key to submit a transaction on Zilliqa */
    privateKey: string;
    anchor: TyronAnchor;
    previousTyronState: TyronState;
    previousTransaction: TransactionStore;
}

enum ZilliqaEndpoint {
    Mainnet = 'https://api.zilliqa.com/',
    Testnet = 'https://dev-api.zilliqa.com/',
}

enum ZilliqaChainID {
    Mainnet = 1,
    Testnet = 333,
}

interface SubmitTxInput {
    contractInit: TyronContract;
    anchorString: string;
    count: number;
    payment: number;
    api: API.Zilliqa;
    chainID: ZilliqaChainID;
    nonce: number;
    privateKey: string;
    address: string;
    tyronHash: string;
}

interface ZilliqaTxObject {
    version: number;
    amount: Util.BN;
    nonce: number;
    gasLimit: Util.Long;
    gasPrice: Util.BN;
    toAddr: string;
    pubKey: string;
    code?: string;
    data?: string;
    priority?: boolean;
}

interface Transition {
    _tag: string;               // transition to be invoked
    _amount: string; 	        // number of QA to be transferred
    _sender: string;	        // address of the invoker
    params: TransitionParams[] 	// an array of parameter objects
}

interface TransitionParams {
    vname: string;
    type: string;
    value: string;
}

interface TxResponse {
    result: unknown;
    zilHash: string;        // Zilliqa transaction ID
    status: boolean;
    receipt: any;
}
