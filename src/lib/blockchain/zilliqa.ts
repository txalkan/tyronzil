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

import * as API from '@zilliqa-js/zilliqa';
import * as Util from '@zilliqa-js/util';
import * as Crypto from '@zilliqa-js/crypto';
import Multihash from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Multihash';
import TyronAnchor from '../sidetree/protocol-files/anchor-file';
import SidetreeError from '@decentralized-identity/sidetree/dist/lib/common/SidetreeError';
import ErrorCode from '../ErrorCode';
import { NetworkNamespace } from '../sidetree/tyronZIL-schemes/did-scheme';
import TyronStore from '../CAS/tyron-store';
import JsonAsync from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/util/JsonAsync';

/** Handles the microservice that interacts with the Zilliqa blockchain platform */
export default class TyronZIL {
    
    /** Sidetree Anchor string written in the transaction - max 10.000 operations */
    public readonly anchorString: string;
    
    /** When to write the transaction, in which block number */
    public readonly ledgerTime: number;

    /** The Zilliqa address where the `tyron-smart-contract` resides */
    public static readonly tyronAddress = 'to-do';

    /** The hash of the initialization parameter of the `tyron-smart-contract` */
    public static readonly tyronHash = 'to-do';

    /** The hash of the tyronZIL transaction */
    public readonly txHash: string;
    
    /** Zilliqa address that executes the tyronZIL transaction (ByStr20) */
    public static readonly address = 'to-do';
        /** Wallet verification method - public key commitment */
        // The client needs to know it to change its address
        public static readonly tyronCommitment = "to-do";
    
    /***            ****            ***/
   
    private constructor (
        zilliqaMicroservice: TxOutput
    ) {
        //this.address = zilliqaMicroservice.address;
        this.anchorString = zilliqaMicroservice.anchorString;
        this.ledgerTime = zilliqaMicroservice.ledgerTime;
        this.txHash = zilliqaMicroservice.txHash;
    }

    /** Executes a tyronZIL transaction on the Zilliqa blockchain platform */
    public static async transaction (input: TxInput): Promise<TyronZIL> {
        
        /** Validates that the necessary files are available in the content-addressable storage */
        const FILES_IN_CAS = await TyronStore.fetchFile(        
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

        /** Fetches the initialization immutable parameter from the `tyron-smart-contract` */
        const SMART_CONTRACT_INIT = await ZILLIQA.blockchain.getSmartContractInit(this.tyronAddress);
        const INIT_RESULT = SMART_CONTRACT_INIT.result;
        
        let TYRON_HASH;
        if (Array.isArray(INIT_RESULT)) {
            for (const parameter of INIT_RESULT) {
                if (parameter.vname === '_tyron_hash') {
                    TYRON_HASH = parameter.value;
                }
            }
        }

        if (TYRON_HASH !== this.tyronHash) {
            throw new SidetreeError(ErrorCode.WrongTyronHash);
        }

        /***            ****            ***/

        const LATEST_STAMP = JSON.stringify(input.latestBlockStamp);
        
        /** Fetches the client's latest `tyron-state` */
        const LATEST_TYRON_STATE = await TyronStore.fetchState(LATEST_STAMP);

        /** Fetches the tyron-state (mutable state variables) fron the `tyron-smart-contract` */
        const SMART_CONTRACT_STATE = await ZILLIQA.blockchain.getSmartContractState(this.tyronAddress);
        const STATE_RESULT = JSON.stringify(SMART_CONTRACT_STATE.result, null, 2);
        console.log(`The state fetched from the contract: ${STATE_RESULT}`);
        
        // Validates that the client's latest state matches the contract's

        if (JSON.stringify(LATEST_TYRON_STATE, null, 2) !== STATE_RESULT) {
            throw new SidetreeError(ErrorCode.IncorrectLatestState);
        }

        /***            ****            ***/
   
        const LATEST_TIME_STAMP = await this.latestTimeStamp(ZILLIQA);

        /** Schedules the transaction for the next block */
        const LEDGER_TIME = LATEST_TIME_STAMP.ledgerTime + 1;
        
        /***            ****            ***/

        /** Validates that the given private key corresponds to the client's wallet */
        const ADDRESS = Crypto.getAddressFromPrivateKey(input.privateKey);
        if (ADDRESS !== this.address) {
            throw new SidetreeError(ErrorCode.WrongKey);
        }

        /** Gets the current balance of the account ( in Qa = 10^-12 ZIL as string)
         * & the current nonce of the account (as number) */
        const BALANCE = await ZILLIQA.blockchain.getBalance(this.address);
        const RESULT = BALANCE.result;

        // The account's balance MUST be at least 100 ZIL
        if (Number(RESULT.balance) < 10**14) {
            throw new SidetreeError(ErrorCode.NotEnoughBalance)
        }

        const SUBMIT_TX: SubmitTxInput = {
            ledgerTime: LEDGER_TIME,
            privateKey: input.privateKey,
            anchorString: input.anchor.anchorString,
            api: ZILLIQA,
            chainID: CHAIN_ID,
            nonce: RESULT.nonce,
        }

        /** tyronZIL transaction */
        const tyronZIL_TX = await this.submitTx(SUBMIT_TX);

        const TX_HASH = Multihash.canonicalizeThenHashThenEncode(tyronZIL_TX);

        const TX_OUTPUT: TxOutput = {
            anchorString: input.anchor.anchorString,
            ledgerTime: LEDGER_TIME,
            txHash: TX_HASH,
        }

        return new TyronZIL(TX_OUTPUT);
    }

    /***            ****            ***/
    
    /** Fetches the latest Zilliqa blockchain time */
    private static async latestTimeStamp(zilliqa: API.Zilliqa): Promise<BlockTimeStamp> {
        try {
            /** The most recent transaction block*/
            const TX_BLOCK = await zilliqa.blockchain.getLatestTxBlock();

            const RESPONSE = await JsonAsync.parse(TX_BLOCK.toString());
            const LEDGER_TIME = RESPONSE.header.BlockNum;
            const LEDGER_HASH = RESPONSE.body.BlockHash;

            const TIME_STAMP: BlockTimeStamp = {
                ledgerTime: LEDGER_TIME,
                ledgerHash: LEDGER_HASH,
            }
            return TIME_STAMP;
        } catch (error) {
            throw new SidetreeError(ErrorCode.CouldNotFetchLatestTxBlock, error)
        }
    }

    /***            ****            ***/

    /** Generates a new transaction object and sends it to the Zilliqa network for processing */
    private static async submitTx(input: SubmitTxInput): Promise<TxResponse> {

        const MSG_VERSION = 1;
        const VERSION = Util.bytes.pack(input.chainID, MSG_VERSION);
        
        const AMOUNT = new Util.BN('to-do');
        const GAS_PRICE = new Util.BN('1');
        const GAS_LIMIT = new Util.Long(100000);

        const TX_OBJECT: ZilliqaTxObject = {
            version: VERSION,
            nonce: input.nonce,
            toAddr: "tyronAddress",
            amount: AMOUNT,
            pubKey: 'string',
            gasPrice: GAS_PRICE,
            gasLimit: GAS_LIMIT,
            code: 'string',
            data: 'string',
            signature: 'string',
            priority: true,
        }

        //const TX = 
        input.api.transactions.new(TX_OBJECT);

        const TIME_STAMP: BlockTimeStamp = {
            ledgerTime: 999,
            ledgerHash: 'to-do',
        }

        const TX_RESPONSE: TxResponse = {
            success: true,
            timeStamp: TIME_STAMP,
            anchorString: 'string',
            zilHash: 'string',
        }

        return TX_RESPONSE;
    }
}

/***            ** interfaces **            ***/

interface TxOutput {
    anchorString: string;
    ledgerTime: number;
    txHash:string;
}

export interface TxInput {

    latestBlockStamp: BlockTimeStamp;

    /** The client's private key to submit a transaction */
    privateKey: string;
    anchor: TyronAnchor;
    /** Payment for the transaction - Identity Global Token */
    // It corresponds to the number of operations times the operation cost - in ZIL => IGBT/ZIL exchange rate
    IGBT: number;
        operationCost: number;
        /** The verification method to change the operation cost */
        costCommitment: string;
    /** User addresses to call with tyron-smart-contracts (TSMs) */
    tyronAddresses?: string[];
}

enum ZilliqaEndpoint {
    Mainnet = 'https://api.zilliqa.com/',
    Testnet = 'https://dev-api.zilliqa.com/',
}

enum ZilliqaChainID {
    Mainnet = 1,
    Testnet = 333,
}

export interface BlockTimeStamp {
    ledgerTime: number;
    ledgerHash: string;
}

interface SubmitTxInput {
    ledgerTime: number;
    privateKey: string;
    anchorString: string;
    api: API.Zilliqa;
    chainID: ZilliqaChainID;
    nonce: number;
}

interface ZilliqaTxObject {
    version: number;
    nonce: number;
    toAddr: string;
    amount: Util.BN;
    pubKey: string;
    gasPrice: Util.BN;
    gasLimit: Util.Long;
    code?: string;
    data?: string;
    signature: string;
    priority?: boolean;
}

interface TxResponse {
    success: boolean;
    timeStamp: BlockTimeStamp;
    anchorString: string;
    zilHash: string;        // Zilliqa transaction hash
}
