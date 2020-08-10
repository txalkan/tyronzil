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

export default class TyronState {
    public readonly previousBlockStamp: BlockTimeStamp;
    public readonly latestBlockStamp: BlockTimeStamp;
    public readonly previousTxHash: string;
    public readonly latestTxHash: string;

    private constructor(
        state: StateModel
    ) {
        this.previousBlockStamp = state.previousBlockStamp;
        this.latestBlockStamp = state.latestBlockStamp;
        this.previousTxHash = state.previousTxHash;
        this.latestTxHash = state.latestTxHash;
    }

    /** Validates a state model into a tyron-state */
    public static async validate(state: string): Promise<TyronState> {
        const STATE = await JsonAsync.parse(state);
        
        // Does the validation to-do

        const TYRON_STATE: StateModel = {
            previousBlockStamp: STATE.previousBlockTimeStamp,
            latestBlockStamp: STATE.latestBlockTimeStamp,
            previousTxHash: STATE.previousTxHash,
            latestTxHash: STATE.latestTxHash,
        }

        return new TyronState(TYRON_STATE);
    }
}

/***            ** interfaces **            ***/

export interface StateModel {
    previousBlockStamp: BlockTimeStamp;
    latestBlockStamp: BlockTimeStamp;
    previousTxHash: string,
    latestTxHash: string;
}