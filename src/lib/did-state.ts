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
import { PublicKeyModel, Operation, Recovery } from './models/verification-method-models';
import * as fs from 'fs';
import LogColors from '../bin/log-colors';
import DidCreate from './did-operations/did-create';
//import DidUpdate from '../lib/did-operations/did-update';
import DidRecover from '../lib/did-operations/did-recover';
//import DidDeactivate from '../lib/did-operations/did-deactivate';
//import { TyronZILUrlScheme } from './tyronZIL-schemes/did-url-scheme';
import TyronZILScheme from './tyronZIL-schemes/did-scheme';

export interface DidStateModel {
    did_tyronZIL: TyronZILScheme;
    publicKey: PublicKeyModel[];
    operation?: Operation;      // operation & recovery are undefined after deactivation - idem commitments
    recovery?: Recovery;
    updateCommitment?: string;
    recoveryCommitment?: string;
    service?: ServiceEndpointModel[];
    lastTransaction?: number;    
}

export default class DidState {
    public readonly did_tyronZIL: TyronZILScheme;
    public readonly publicKeys: PublicKeyModel[];
    public readonly operation?: Operation;
    public readonly recovery?: Recovery;
    public readonly updateCommitment?: string;
    public readonly recoveryCommitment?: string;
    public readonly service?: ServiceEndpointModel[];
    public readonly lastTransaction?: number;

    private constructor(
        input: DidStateModel
    ) {
        this.did_tyronZIL = input.did_tyronZIL;
        this.publicKeys = input.publicKey;
        this.operation = input.operation;
        this.recovery = input.recovery;
        this.updateCommitment = input.updateCommitment;
        this.recoveryCommitment = input.recoveryCommitment
        this.service = input.service;
        this.lastTransaction = input.lastTransaction;
    }

    /** Writes and saves the DID-state asynchronously */
    public static async write(input: DidState): Promise<void> {

        const PRINT_STATE = JSON.stringify(input, null, 2);

        // Saves the DID-state:
        const FILE_NAME = `${input.did_tyronZIL}-DID_STATE.json`;
        fs.writeFileSync(FILE_NAME, PRINT_STATE);
        console.info(LogColors.yellow(`DID-state saved as: ${LogColors.brightYellow(FILE_NAME)}`));

    }

    /** Fetches the current state for the given DID */
    public static async fetch(did_tyronZIL: string): Promise<DidState> {
        const FILE_NAME = `${did_tyronZIL}-DID_STATE.json`;
        
        let DID_STATE_FILE;
        try {
            DID_STATE_FILE = fs.readFileSync(FILE_NAME);
        } catch (error) {
            console.log(LogColors.red(`Could not read the DID-state`));
        }
        
        let DID_STATE;
        if (DID_STATE_FILE !== undefined){
            
            DID_STATE = await JsonAsync.parse(DID_STATE_FILE.toString());
        }
        
        const DID_STATE_MODEL: DidStateModel = {
            did_tyronZIL: DID_STATE.did_tyronZIL,
            publicKey: DID_STATE.publicKey,
            operation: DID_STATE.operation,
            recovery: DID_STATE.recovery,
            updateCommitment: DID_STATE.updateCommitment,
            recoveryCommitment: DID_STATE.recoveryCommitment,
            service: DID_STATE.service,
            lastTransaction: DID_STATE.lastTransaction
        };

        return new DidState(DID_STATE_MODEL);
    }

    public static async build(input: DidCreate | DidRecover): Promise<DidState> {
        // Builds the DID-state:
        const DID_STATE_MODEL: DidStateModel = {
            did_tyronZIL: input.did_tyronZIL,
            publicKey: input.publicKey,
            operation: input.operation,
            recovery: input.recovery,
            updateCommitment: input.updateCommitment,
            recoveryCommitment: input.recoveryCommitment,
            service: input.service,
        }
        return new DidState(DID_STATE_MODEL);
    }
}