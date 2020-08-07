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
import Cas from '@decentralized-identity/sidetree/dist/lib/core/Cas';
import TyronAnchor from '../sidetree/protocol-files/anchor-file';
import SidetreeError from '@decentralized-identity/sidetree/dist/lib/common/SidetreeError';
import ErrorCode from '../ErrorCode';
import JsonAsync from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/util/JsonAsync';
import { NetworkNamespace } from '../sidetree/tyronZIL-schemes/did-scheme';

/** Handles the microservice that interacts with the Zilliqa blockchain platform */
export default class TyronZIL {
    
    /** Sidetree Anchor string written in the transaction - max 10.000 operations */
    public readonly anchorString: string;
    
    /** When to write the transaction, in which block number */
    public readonly ledgerTime: number;
    /** The hash of the block corresponding to the ledger time */
    public readonly ledgerHash: string;

    /** The Zilliqa address where the `tyron` smart contract resides */
    public static readonly tyronAddress = 'to-do';

    /** The hash of the tyronZIL transaction */
    public readonly hash: string;
    
    /** Zilliqa address that executes the tyronZIL transaction (ByStr20) */
    public static readonly address = 'to-do';
        /** Wallet verification method - public key commitment */
        // The client needs to know it to change its address
        public static readonly tyronCommitment = "to-do";
    
    /** The content-addressable storage */
    public static readonly CAS: Cas;

    /***            ****            ***/
   
    private constructor (
        zilliqaMicroservice: TxOutput
    ) {
        //this.address = zilliqaMicroservice.address;
        this.anchorString = zilliqaMicroservice.anchorString;
        this.ledgerTime = zilliqaMicroservice.timeStamp.ledgerTime;
        this.ledgerHash = zilliqaMicroservice.timeStamp.ledgerHash;
        this.hash = zilliqaMicroservice.hash;
    }

    /** Executes a tyronZIL transaction on the Zilliqa blockchain platform */
    public static async transaction (input: TxInput): Promise<TyronZIL> {
        
        /** Validates that the necessary files are available in the content-addressable storage */
        const FILES_IN_CAS = await this.fetchFile(        
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

        /** Fetches the Zilliqa latest time stamp */
        //const LATEST_TIME_STAMP = 
        await this.timeStamp(ZILLIQA);
        // Verifies DID states up to the latest time stamp: to-do
        
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
            privateKey: input.privateKey,
            chainID: CHAIN_ID,
            api: ZILLIQA,
            nonce: RESULT.nonce,
        }

        /** tyronZIL transaction */
        const tyronZIL_TX = await this.submitTx(SUBMIT_TX);

        const TYRON_HASH = Multihash.canonicalizeThenHashThenEncode(tyronZIL_TX);

        const TX_OUTPUT: TxOutput = {
            anchorString: input.anchor.anchorString,
            timeStamp: tyronZIL_TX.timeStamp,
            address: this.address,
            tyronCommitment: this.tyronCommitment,
            hash: TYRON_HASH,
        }

        return new TyronZIL(TX_OUTPUT);
    }

    /***            ****            ***/

    /** Validates which files are in the CAS */
    private static async fetchFile(
        anchorFileUri: string,
        maxSize: number,
        mapFileUri: string | undefined,
        chunkFileUri: string | undefined,
        maxSizeChunk: number
        ): Promise<FilesInCAS> {
    
        const FILES_IN_CAS: FilesInCAS = {
            anchor: undefined,
            map: undefined,
            chunk: undefined,
        }
        
        try {
            await this.CAS.read(anchorFileUri, maxSize);
            FILES_IN_CAS.anchor = true;
        } catch (error) {
            FILES_IN_CAS.anchor = undefined;
        }

        if (mapFileUri !== undefined) {
            try {
                await this.CAS.read(mapFileUri, maxSize);
                FILES_IN_CAS.map = true;
            } catch (error) {
                FILES_IN_CAS.map = undefined;
            }
        }

        if (chunkFileUri !== undefined) {
            try {
                await this.CAS.read(chunkFileUri, maxSizeChunk);
                FILES_IN_CAS.chunk = true;
            } catch (error) {
                FILES_IN_CAS.chunk = undefined;
            }
        }
        return FILES_IN_CAS;
    }

    /** Fetches the latest Zilliqa blockchain time */
    private static async timeStamp(zilliqa: API.Zilliqa): Promise<BlockTimeStamp> {
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
            throw new SidetreeError(ErrorCode.CouldNotFetchLedgerTime, error)
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
    timeStamp: BlockTimeStamp;
    address: string;
    tyronCommitment: string;
    hash:string;
}

export interface TxInput {
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

interface BlockTimeStamp {
    ledgerTime: number;
    ledgerHash: string;
}

interface SubmitTxInput {
    privateKey: string;
    chainID: ZilliqaChainID;
    api: API.Zilliqa;
    nonce: number;
}

/** Checks if the required files are in the CAS before submitting the transaction */
interface FilesInCAS {
    anchor: undefined | true;
    map: undefined | true;
    chunk: undefined | true;
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


