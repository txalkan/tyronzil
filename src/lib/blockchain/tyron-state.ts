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

import { BlockTimeStamp } from './zilliqa';
import JsonAsync from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/util/JsonAsync';
import Multihash from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Multihash';

export default class TyronState {
    public readonly previousBlockStamp: BlockTimeStamp;
    public readonly latestLedgerTime: number;
    public readonly previousTxHash: string;
    
    /** The hash of the tyron-state */
    public readonly tyronHash: string;

    private constructor(
        state: StateModel,
        hash: string,
    ) {
        this.previousBlockStamp = state.previousBlockStamp;
        this.latestLedgerTime = state.latestLedgerTime;
        this.previousTxHash = state.previousTxHash;
        this.tyronHash = hash;
    }

    /** Generates a new tyron-state */
    public static async write(state: string): Promise<TyronState> {
        const STATE = await JsonAsync.parse(state);
        
        const MODEL: StateModel = {
            previousBlockStamp: STATE.previousBlockTimeStamp,
            latestLedgerTime: STATE.latestLedgerTime,
            previousTxHash: STATE.previousTxHash,
        }

        const TYRON_HASH = Multihash.canonicalizeThenHashThenEncode(MODEL);

        return new TyronState(MODEL, TYRON_HASH);
    }
}

/***            ** interfaces **            ***/

export interface StateModel {
    previousBlockStamp: BlockTimeStamp;
    latestLedgerTime: number;
    previousTxHash: string,
}