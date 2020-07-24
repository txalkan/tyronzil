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
    status: OperationType
    publicKey?: PublicKeyModel[];       // undefined after deactivation
    operation?: Operation;              // undefined after deactivation
    recovery?: Recovery;                // undefined after deactivation
    updateCommitment?: string;          // undefined after deactivation
    recoveryCommitment?: string;        // undefined after deactivation
    service?: ServiceEndpointModel[];   // undefined after deactivation
    lastTransaction?: number;   
}

/***            ****            ***/

/** tyronZIL's DID-state */
export default class DidState {
    public readonly did_tyronZIL: string;
    public status: OperationType

    // W3C and Sidetree verification methods
    public publicKey?: PublicKeyModel[];
    public readonly operation?: Operation;
    public readonly recovery?: Recovery;

    // Sidetree commitments
    public readonly updateCommitment?: string;
    public readonly recoveryCommitment?: string;

    // Services
    public service?: ServiceEndpointModel[];

    // Ledger-time of the last transaction that affected the state
    public readonly lastTransaction?: number;
    
    private constructor(
        input: DidStateModel
    ) {
        this.did_tyronZIL = input.did_tyronZIL;
        this.status = input.status
        this.publicKey = input.publicKey;
        this.operation = input.operation;
        this.recovery = input.recovery;
        this.updateCommitment = input.updateCommitment;
        this.recoveryCommitment = input.recoveryCommitment
        this.service = input.service;
        this.lastTransaction = input.lastTransaction;
    }

    /***            ****            ***/

    /** Saves the DID-state asynchronously */
    public static async write(input: DidState): Promise<void> {
        const PRINT_STATE = JSON.stringify(input, null, 2);
        const FILE_NAME = `DID_STATE_${input.did_tyronZIL}.json`;
        fs.writeFileSync(FILE_NAME, PRINT_STATE);
        console.info(LogColors.yellow(`DID-state saved as: ${LogColors.brightYellow(FILE_NAME)}`));
    }

    /***            ****            ***/

    /** Fetches the current DID-state for the given tyronZIL DID */
    public static async fetch(did_tyronZIL: string): Promise<DidState> {
        const FILE_NAME = `DID_STATE_${did_tyronZIL}.json`;
        let DID_STATE_FILE;
        try {
            DID_STATE_FILE = fs.readFileSync(FILE_NAME);
        } catch (error) {
            console.log(LogColors.red(`Could not read the DID-state`));
        }
        
        /** Parses the DID-state */
        let DID_STATE_JSON;
        if (DID_STATE_FILE !== undefined){
            DID_STATE_JSON = await JsonAsync.parse(DID_STATE_FILE.toString());
        }
        
        /** The tyronZIL DID-state */
        const DID_STATE: DidStateModel = {
            did_tyronZIL: DID_STATE_JSON.did_tyronZIL,
            status: DID_STATE_JSON.status,
            publicKey: DID_STATE_JSON.publicKey,
            operation: DID_STATE_JSON.operation,
            recovery: DID_STATE_JSON.recovery,
            updateCommitment: DID_STATE_JSON.updateCommitment,
            recoveryCommitment: DID_STATE_JSON.recoveryCommitment,
            service: DID_STATE_JSON.service,
            lastTransaction: DID_STATE_JSON.lastTransaction,
        };

        return new DidState(DID_STATE);
    }

    /***            ****            ***/

    /** Serializes the create and recover operation output into its DID-state */
    public static async build(operation: DidCreate | DidRecover): Promise<DidState> {
        const DID_STATE: DidStateModel = {
            did_tyronZIL: operation.did_tyronZIL.did_tyronZIL,
            publicKey: operation.publicKey,
            operation: operation.operation,
            recovery: operation.recovery,
            updateCommitment: operation.updateCommitment,
            recoveryCommitment: operation.recoveryCommitment,
            service: operation.service,
            status: operation.type
        }
        return new DidState(DID_STATE);
    }

    /***            ****            ***/

    /** Deactivates the DID-state */
    public static async deactivate(operation: DidDeactivate): Promise<DidState> {
        const DID_STATE_MODEL: DidStateModel = {
            did_tyronZIL: operation.did_tyronZIL.did_tyronZIL,
            status: operation.type
        }
        return new DidState(DID_STATE_MODEL);
    }
}