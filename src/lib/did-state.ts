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
import ServiceEndpointModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/ServiceEndpointModel';
import { PublicKeyModel, Operation, Recovery } from './models/verification-method-models';
import * as fs from 'fs';
import LogColors from '../bin/log-colors';
import DidCreate from './did-operations/did-create';
import DidRecover from '../lib/did-operations/did-recover';
import JsonAsync from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/util/JsonAsync';
import DidDeactivate from './did-operations/did-deactivate';
import OperationType from '@decentralized-identity/sidetree/dist/lib/core/enums/OperationType';

export interface DidStateModel {
    did_tyronZIL: string;
    publicKey?: PublicKeyModel[];       // undefined after deactivation
    operation?: Operation;              // undefined after deactivation
    recovery?: Recovery;                // undefined after deactivation
    updateCommitment?: string;          // undefined after deactivation
    recoveryCommitment?: string;        // undefined after deactivation
    service?: ServiceEndpointModel[];   // undefined after deactivation
    lastTransaction?: number;
    status: OperationType
}

export default class DidState {
    public readonly did_tyronZIL: string;
    public readonly publicKey?: PublicKeyModel[];
    public readonly operation?: Operation;
    public readonly recovery?: Recovery;
    public readonly updateCommitment?: string;
    public readonly recoveryCommitment?: string;
    public readonly service?: ServiceEndpointModel[];
    public readonly lastTransaction?: number;
    public readonly status: OperationType

    private constructor(
        input: DidStateModel
    ) {
        this.did_tyronZIL = input.did_tyronZIL;
        this.publicKey = input.publicKey;
        this.operation = input.operation;
        this.recovery = input.recovery;
        this.updateCommitment = input.updateCommitment;
        this.recoveryCommitment = input.recoveryCommitment
        this.service = input.service;
        this.lastTransaction = input.lastTransaction;
        this.status = input.status
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
            lastTransaction: DID_STATE.lastTransaction,
            status: DID_STATE.status
        };

        return new DidState(DID_STATE_MODEL);
    }

    /** Builds the new DID-state */
    public static async build(input: DidCreate | DidRecover): Promise<DidState> {
        const DID_STATE_MODEL: DidStateModel = {
            did_tyronZIL: input.did_tyronZIL.did_tyronZIL,
            publicKey: input.publicKey,
            operation: input.operation,
            recovery: input.recovery,
            updateCommitment: input.updateCommitment,
            recoveryCommitment: input.recoveryCommitment,
            service: input.service,
            status: input.type
        }
        return new DidState(DID_STATE_MODEL);
    }

    /** Deactivates the DID-state */
    public static async deactivate(operation: DidDeactivate): Promise<DidState> {
        const DID_STATE_MODEL: DidStateModel = {
            did_tyronZIL: operation.did_tyronZIL.did_tyronZIL,
            status: operation.type
        }
        return new DidState(DID_STATE_MODEL);
    }
}