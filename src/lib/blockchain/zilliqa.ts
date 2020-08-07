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

import Multihash from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Multihash';
import Cas from '@decentralized-identity/sidetree/dist/lib/core/Cas';
import TyronAnchor from '../sidetree/protocol-files/anchor-file';
import SidetreeError from '@decentralized-identity/sidetree/dist/lib/common/SidetreeError';
import ErrorCode from '../sidetree/ErrorCode';

/** Handles the microservice that interacts with the Zilliqa blockchain platform */
export default class Zilliqa {

    /** The hash of the tyronZIL transaction */
    public readonly tyronHash: string;
        /** Sidetree Anchor string written in the transaction - max 10.000 operations */
        public readonly anchorString: string;

    /** When to write the transaction, in which block number */
    public readonly ledgerTime: number;
        /** The hash of the ledger block corresponding to the ledger time */
        public readonly ledgerHash: string;

    /** Zilliqa address that executes the tyronZIL transaction */
    public readonly ZILwallet: string;
        /** Wallet verification method - public key commitment */
        // The client needs to know it to change its ZILwallet
        public readonly tyronCommitment: string;
    
    /** The content-addressable storage */
    public static readonly CAS: Cas;

    /***            ****            ***/
   
    private constructor (
        zilliqaMicroservice: transactionOutput
    ) {
        this.tyronHash = zilliqaMicroservice.tyronHash;
        this.anchorString = zilliqaMicroservice.anchorString;
        this.ledgerTime = zilliqaMicroservice.ledgerTime;
        this.ledgerHash = zilliqaMicroservice.ledgerHash;
        this.ZILwallet = zilliqaMicroservice.ZILwallet;
        this.tyronCommitment = zilliqaMicroservice.tyronCommitment;
    }

    /** Executes a tyronZIL transaction on the Zilliqa blockchain platform */
    public static async tyronZIL (input: transactionInput): Promise<Zilliqa> {
        
        /** Validates which files are in the CAS */
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

        /** Fetches the Zilliqa latest time stamp */
        const TIME_STAMP = await this.timeStamp();
        const LATEST_TIME = TIME_STAMP.ledgerTime;
        const LEDGER_TIME = LATEST_TIME + 1;

        const LEDGER_HASH = "to-do";

        const tyronZIL_TRANSACTION = {};
        const TYRON_HASH = Multihash.canonicalizeThenHashThenEncode(tyronZIL_TRANSACTION);

        const TRANSACTION_OUTPUT: transactionOutput = {
            anchorString: input.anchor.anchorString,
            ledgerTime: LEDGER_TIME,
            ledgerHash: LEDGER_HASH,
            ZILwallet: 'to-do',
            tyronCommitment: 'to-do',
            tyronHash: TYRON_HASH,
        }

        return new Zilliqa(TRANSACTION_OUTPUT);
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
    public static async timeStamp(): Promise<BlockTimeStamp> {
        try {
            const LEDGER_TIME = 9;  // to-do
            const LEDGER_HASH = 'xxx';
            const TIME_STAMP: BlockTimeStamp = {
                ledgerTime: LEDGER_TIME,
                ledgerHash: LEDGER_HASH,
            }
            return TIME_STAMP;
        } catch (error) {
            throw new SidetreeError(ErrorCode.CouldNotFetchLedgerTime, error)
        }
        
    }
}

/***            ** interfaces **            ***/

interface transactionOutput {
    tyronHash:string;
    anchorString: string;
    ledgerTime: number;
    ledgerHash: string;
    ZILwallet: string;
    tyronCommitment: string;
}

export interface transactionInput {
    anchor: TyronAnchor;
    /** Payment for the transaction - Identity Global Token */
    // It corresponds to the number of operations times the operation cost - in ZIL => IGBT/ZIL exchange rate
    IGBT: number;
        operationCost: number;
        /** The verification method to change the operation cost */
        costCommitment: string;
    /** User addresses to call with tyron-smart-contracts (TSMs) */
    tyronAddresses: string[];
}

/** Checks if the required files are in the CAS before submitting the transaction */
interface FilesInCAS {
    anchor: undefined | true;
    map: undefined | true;
    chunk: undefined | true;
}

export interface TyronHashObject {
    exists: boolean;
    anchorString?: string;
    mapFileUri? : string;
}

export interface BlockTimeStamp {
    ledgerTime: number;
    ledgerHash: string;
}
