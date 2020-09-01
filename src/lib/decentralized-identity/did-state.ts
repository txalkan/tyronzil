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
import { PublicKeyModel } from './models/verification-method-models';
import * as fs from 'fs';
import LogColors from '../../bin/log-colors';
import TyronState from '../blockchain/tyron-state';
import { NetworkNamespace } from './tyronZIL-schemes/did-scheme';
import { TyronZILUrlScheme } from './tyronZIL-schemes/did-url-scheme';
import SidetreeError from '@decentralized-identity/sidetree/dist/lib/common/SidetreeError';
import ErrorCode from './util/ErrorCode';
import { PatchAction, PatchModel } from './models/patch-model';
import OperationType from '@decentralized-identity/sidetree/dist/lib/core/enums/OperationType';
import DeltaModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/DeltaModel';
import { Sidetree } from './util/sidetree';

/** tyronZIL's DID-state */
export default class DidState {
    public readonly did_tyronZIL: string;

    // Verification methods
    public readonly publicKey: PublicKeyModel[] | undefined;
    
    // Services
    public readonly service?: ServiceEndpointModel[] | undefined;

    // Sidetree commitments
    public readonly updateCommitment: string | undefined;
    public readonly recoveryCommitment: string | undefined;
    
    private constructor(
        input: DidStateModel
    ) {
        this.did_tyronZIL = input.did_tyronZIL;
        this.publicKey = input.publicKey;
        this.updateCommitment = input.updateCommitment;
        this.recoveryCommitment = input.recoveryCommitment
        this.service = input.service;
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

    /** Fetches the current DID-state for the given tyron_addr */
    public static async fetch(network: NetworkNamespace, tyronAddr: string): Promise<DidState | void> {
        const did_state = await TyronState.fetch(network, tyronAddr)
        .then(async tyron_state => {
            const this_state = tyron_state as TyronState;
            // Validates the tyronZIL DID-scheme
            await TyronZILUrlScheme.validate(this_state.decentralized_identifier);
            const STATUS = this_state.status;
            let PUBLIC_KEY;
            let SERVICE;
            let UPDATE_COMMITMENT;
            let RECOVERY_COMMITMENT;
            switch (STATUS) {
                case OperationType.Deactivate:
                    PUBLIC_KEY = undefined;
                    SERVICE = undefined;
                    UPDATE_COMMITMENT = undefined;
                    RECOVERY_COMMITMENT = undefined;
                    break;
                default: {
                    const DELTA_OBJECT = await Sidetree.deltaObject(this_state.delta) as DeltaModel;
                    UPDATE_COMMITMENT = DELTA_OBJECT.updateCommitment;
                    if(UPDATE_COMMITMENT !== this_state.update_commitment){
                        throw new SidetreeError(ErrorCode.CommitmentMismatch)
                    } else {
                        RECOVERY_COMMITMENT = this_state.recovery_commitment;
                        const PATCHES = DELTA_OBJECT.patches as PatchModel[];
                        let DOCUMENT;
                        for(const patch of PATCHES) {
                            const ACTION = patch.action;
                            switch (ACTION) {
                                case PatchAction.Replace:
                                    DOCUMENT = patch.document;
                                    PUBLIC_KEY = DOCUMENT?.public_keys;
                                    SERVICE = DOCUMENT?.service_endpoints;
                                    break;
                            }
                        } 
                    }
                    break;
                }
            }
            const DID_STATE: DidStateModel = {
                did_tyronZIL: this_state.decentralized_identifier,
                publicKey: PUBLIC_KEY,
                service: SERVICE,
                updateCommitment: UPDATE_COMMITMENT,
                recoveryCommitment: RECOVERY_COMMITMENT
            }
            return new DidState(DID_STATE);
        })
        .catch(err => console.error(err))
        return did_state;
    }
}

/***            ** interfaces **            ***/

/** The state model of a decentralized identifier */
export interface DidStateModel {
    did_tyronZIL: string;
    publicKey: PublicKeyModel[] | undefined;
    service: ServiceEndpointModel[] | undefined;        // undefined after deactivation       // undefined after deactivation
    updateCommitment: string | undefined;        // undefined after deactivation
    recoveryCommitment: string | undefined;        // undefined after deactivation
}
