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

import TyronState, { StateModel } from '../blockchain/tyron-state';
import * as fs from 'fs';
import LogColors from '../../bin/log-colors';
import JsonAsync from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/util/JsonAsync';
import Cas from '@decentralized-identity/sidetree/dist/lib/core/Cas';
import { BlockTimeStamp } from '../blockchain/zilliqa';

export default class TyronStore {

    /** The content-addressable storage */
    public static readonly CAS: Cas;

    public static readonly storage: Map<TransactionStore, TyronState>;

    /***            ****            ***/

    /** Validates which files are in the CAS */
    public static async fetchFile(
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

    /***            ****            ***/

    /** Fetches the client's latest `tyron-state` */
    public static async fetchState(stamp: string): Promise<TyronState> {
        const FILE_NAME = `TYRON_STATE_${stamp}.json`;
        let TYRON_STATE_FILE;
        try {
            TYRON_STATE_FILE = fs.readFileSync(FILE_NAME);
        } catch (error) {
            console.log(LogColors.red(`Could not read the tyron-state`));
        }
        
        /** Parses the tyron-state */
        let TYRON_STATE_JSON;
        if (TYRON_STATE_FILE !== undefined){
            TYRON_STATE_JSON = await JsonAsync.parse(TYRON_STATE_FILE.toString());
        }
        
        /** The tyron-state */
        const STATE: StateModel = {
            anchorString: TYRON_STATE_JSON.anchorString,
            previousTransaction: TYRON_STATE_JSON.previousTransaction,
            previousTyronHash: TYRON_STATE_JSON.previousTyronHash,
        };

        const TYRON_STATE = await TyronState.write(JSON.stringify(STATE));

        return TYRON_STATE;
    }

    /** Saves storage asynchronously */
    public static async write(txNumber: number, storage: Map<TransactionStore, TyronState>): Promise<void> {
        const PRINT_STORAGE = JSON.stringify([...storage], null, 2);
        const FILE_NAME = `TX_STORAGE_${txNumber}.json`;
        fs.writeFileSync(FILE_NAME, PRINT_STORAGE);
        console.info(LogColors.yellow(`TX-storage saved as: ${LogColors.brightYellow(FILE_NAME)}`));
    }
}

/***            ** interfaces **            ***/

/** Checks if the required files are in the CAS before submitting the transaction */
interface FilesInCAS {
    anchor: undefined | true;
    map: undefined | true;
    chunk: undefined | true;
}

export interface TransactionStore {
    timeStamp: BlockTimeStamp;
    /** The hash of the tyronZIL transaction */
    txHash: string;
}
