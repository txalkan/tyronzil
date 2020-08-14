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

import JsonAsync from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/util/JsonAsync';
import Multihash from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Multihash';
import { TransactionStore } from '../CAS/tyron-store';

export default class TyronState {
    /** The hash of the new tyron-state */
    public readonly tyronHash: string;
    public readonly anchorString: string;
    public readonly previousTransaction: TransactionStore;
    public readonly previousTyronHash: string;
    
    private constructor(
        state: StateModel,
        hash: string,
    ) {
        this.tyronHash = hash;
        this.anchorString = state.anchorString;
        this.previousTransaction = state.previousTransaction;
        this.previousTyronHash = state.previousTyronHash;
    }

    /** Generates a new tyron-state */
    public static async write(stateModel: string): Promise<TyronState> {
        const STATE = await JsonAsync.parse(stateModel);
        
        const MODEL: StateModel = {
            anchorString: STATE.anchorString,
            previousTransaction: STATE.previousTransaction,
            previousTyronHash: STATE.previousTyronHash,
        }

        const TYRON_HASH = Multihash.canonicalizeThenHashThenEncode(MODEL);

        return new TyronState(MODEL, TYRON_HASH);
    }
}

/***            ** interfaces **            ***/

/** The tyron state model */
export interface StateModel {
    anchorString: string;
    previousTransaction: TransactionStore;
    previousTyronHash: string;      // The corresponding tyron state to the previous transaction
}
