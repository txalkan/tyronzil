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
import ServiceEndpointModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/ServiceEndpointModel';
import PublicKeyModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/PublicKeyModel';
import { Operation, Recovery } from './models/verification-method-models';
import * as fs from 'fs';
import SidetreeError from '@decentralized-identity/sidetree/dist/lib/common/SidetreeError';

export interface DidStateModel {
    did_tyronZIL: string;
    publicKey: PublicKeyModel[];
    operation: Operation;
    recovery: Recovery;
    service?: ServiceEndpointModel[];
    lastTransaction?: number;    
}

export default class DidState {
    public readonly did_tyronZIL: string;
    public readonly publicKeys: PublicKeyModel[];
    public readonly operation: Operation;
    public readonly recovery: Recovery;
    public readonly service?: ServiceEndpointModel[];
    public readonly lastTransaction?: number;

    private constructor(
        input: DidStateModel
    ) {
        this.did_tyronZIL = input.did_tyronZIL;
        this.publicKeys = input.publicKey;
        this.operation = input.operation;
        this.recovery = input.recovery;
        this.service = input.service;
        this.lastTransaction = input.lastTransaction;
    }

    public static async write(input: DidStateModel): Promise<DidState> {
        return new DidState(input);
    }

    /** Fetches the current state for the given DID */
    public static async fetch(did_tyronZIL: string): Promise<DidState> {
        const FILE_NAME = `${did_tyronZIL}-DID_STATE.json`;
        fs.readFileSync(FILE_NAME)

        let DID_STATE_FILE;
        try {
            DID_STATE_FILE = require(FILE_NAME);
        } catch (error) {
            console.log(error);
        }
        
        const DID_STATE = await JsonAsync.parse(DID_STATE_FILE);
        
        const PROPERTIES = Object.keys(DID_STATE);
        if (PROPERTIES.length !== 6) {
            console.log(`There ma`)
        }





    }
    /** Applies the new state to the given DID */
    //public static async applyCreate() {}
}