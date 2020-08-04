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


/** Handles the microservice that interacts with the Zilliqa blockchain platform */
export default class Zilliqa {
    /** What to write */
    public readonly tyronHash: string;
        /** Sidetree Anchor file string - max 10.000 operations */
        public readonly anchorString: string;

    /** When to write it */
    public ledgerTime: number;
        //** Sidetree's ledgerTime hash */
        public ledgerHash: string;

    /** Wallet address for Zilliqa */
    public ZILwallet: string;
        /** Wallet verification method - encoded */
        // The client needs to know it to use its tyronWallet
        public tyronCommitment: string;

    private constructor (
        zilliqaMicroservice: transactionOutput
    ) {
        this.tyronHash = zilliqaMicroservice.tyronHash;
        this.anchorString = zilliqaMicroservice.anchorString;
        this.ledgerTime = zilliqaMicroservice.ledgerTime;
        this.ledgerHash = zilliqaMicroservice.ledgerHash;
        this.tyronHash = zilliqaMicroservice.tyronHash;
        this.ZILwallet = zilliqaMicroservice.ZILwallet;
        this.tyronCommitment = zilliqaMicroservice.tyronCommitment;
    }

    /** Executes the transaction on the Zilliqa blockchain platform and saves its hash */
    public static async execute(input: transactionInput): Promise<Zilliqa> {
        /** Validates that Map file is on CAS */
        let MAP_FILE_OBJECT: MapFileObject = {
            exists: false,
        };
        try {
            MAP_FILE_OBJECT = await this.fetchMapFile(input.anchorString)
            if (!MAP_FILE_OBJECT.exists) {
                throw console.error('The corresponding Map File is not in the content-addressable-storage');
            }
        } catch (error) {
            return new error // ZilliqaError(ErrorCode.MapFileNotInCAS) - todo
        }

        /** The Anchor object */
        const ANCHOR_FILE_OBJECT: AnchorFileObject = {
            exists: true,
            anchorString: input.anchorString,
            mapFileUri: MAP_FILE_OBJECT.casUri,
        }

        /** Turns the Anchor string object into its corresponding hash */
        const ANCHOR_STRING = Multihash.canonicalizeThenHashThenEncode(ANCHOR_FILE_OBJECT);
        
        /** Fetches the Zilliqa latest time stamp */
        const TIME_STAMP = await this.timeStamp();
        const LATEST_TIME = TIME_STAMP.ledgerTime!;
        const LEDGER_TIME = LATEST_TIME + 1;


        /** Fetches the latest block hash */
        const LEDGER_HASH = TIME_STAMP.ledgerHash!;

        const TYRON_HASH_OBJECT: TyronHashObject = {
            exists: true,
            anchorString: ANCHOR_STRING,
            mapFileUri: MAP_FILE_OBJECT.casUri,
        }
        const TYRON_HASH = Multihash.canonicalizeThenHashThenEncode(TYRON_HASH_OBJECT);

        const TRANSACTION_OUTPUT: transactionOutput = {
            anchorString: ANCHOR_STRING,
            ledgerTime: LEDGER_TIME,
            ledgerHash: LEDGER_HASH,
            tyronHash: TYRON_HASH,
            ZILwallet: 'xxx',
            tyronCommitment: 'xxx',
        }

        return new Zilliqa(TRANSACTION_OUTPUT);
    }

    /***            ****            ***/

    /** Validates that Map file is in CAS */
    public static async fetchMapFile(anchorString: string): Promise<MapFileObject> {
        try {
            const MAP_FILE_URI = anchorString // await CAS.mapFile(anchorString); todo
            const MAP_FILE_OBJECT: MapFileObject = {
                exists: true,
                casUri: MAP_FILE_URI,
            }
            return MAP_FILE_OBJECT;
        } catch (error) {
            const MAP_FILE_OBJECT: MapFileObject = {
                exists: false,
                casUri: undefined,
            }
            return MAP_FILE_OBJECT;
        }
    }

    /** Fetches the latest Zilliqa blockchain time */
    public static async timeStamp(): Promise<BlockTimeStamp> {
        try {
            const LEDGER_TIME = 9;  // to-do
            const LEDGER_HASH = 'xxx';
            const TIME_STAMP: BlockTimeStamp = {
                exists: true,
                ledgerTime: LEDGER_TIME,
                ledgerHash: LEDGER_HASH,
            }
            return TIME_STAMP;
        } catch (error) {
            const TIME_STAMP = {
                exists: false
            }
            return TIME_STAMP;
            
        }
        
    }
}

/***            ** interfaces **            ***/

export interface transactionOutput {
    /** Hash of the Sidetree Anchor string */
    anchorString: string;
    /** Blockchain block time */
    ledgerTime: number;
        /** Blockchain hash for the corresponding time */
        ledgerHash: string;
    tyronHash:string;
    /** The paying wallet - contract address */
    ZILwallet: string;
        /** The verification method commitment to change the wallet address */
        tyronCommitment: string;
}

export interface transactionInput {
    /** Sidetree Anchor string - encoded */
    anchorString: string;

    /** Payment for the transaction - Identity Global Token */
    // It corresponds to the amount of operations times the operation cost - in ZIL => IGBT/ZIL exchange rate
    IGBT: number;
        operationCost: number;
        /** The verification method to change the operation cost */
        costCommitment: string;
        
    /** User addresses to call with tyron-smart-contracts (TSMs) */
    tyronAddresses: string[];
}

export interface TyronHashObject {
    exists: boolean;
    anchorString?: string;
    mapFileUri? : string;
}

export interface MapFileObject {
    exists: boolean;
    casUri?: string;
}

export interface AnchorFileObject {
    exists: boolean;
    anchorString?: string;
    mapFileUri?: string;
}

export interface BlockTimeStamp {
    exists:boolean;
    ledgerTime?: number;
    ledgerHash?: string;
}
