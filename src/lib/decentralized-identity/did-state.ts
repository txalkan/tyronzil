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

import TyronState from '../blockchain/tyron-state';
import { NetworkNamespace } from './tyronZIL-schemes/did-scheme';
import { TyronZILUrlScheme } from './tyronZIL-schemes/did-url-scheme';
import OperationType from '@decentralized-identity/sidetree/dist/lib/core/enums/OperationType';
import { Sidetree } from './sidetree-protocol/sidetree';
import { DocumentModel } from './sidetree-protocol/models/patch-model';
import SidetreeError from '@decentralized-identity/sidetree/dist/lib/common/SidetreeError';

/** tyronZIL's DID-State */
export default class DidState {
    public readonly status: OperationType;
    public readonly contract_owner: string;
    public readonly did_tyronZIL: string;

    /** The DID-document as a Sidetree Document Model */
    public readonly document: DocumentModel | undefined;
    
    // Sidetree commitments
    public readonly updateCommitment: string | undefined;
    public readonly recoveryCommitment: string | undefined;
    
    private constructor(
        state: DidStateModel
    ) {
        this.status = state.status;
        this.contract_owner = state.contract_owner;
        this.did_tyronZIL = state.did_tyronZIL;
        this.document = state.document;
        this.updateCommitment = state.updateCommitment;
        this.recoveryCommitment = state.recoveryCommitment
    }

    /***            ****            ***/

    /** Fetches the current DID-State for the given tyron_addr */
    public static async fetch(network: NetworkNamespace, tyronAddr: string): Promise<DidState|void> {
        const did_state = await TyronState.fetch(network, tyronAddr)
        .then(async tyron_state => {
            const this_state = tyron_state as TyronState;
            // Validates the tyronZIL DID-scheme
            await TyronZILUrlScheme.validate(this_state.decentralized_identifier);
            return this_state;
        })
        .then(async tyron_state => {
            const STATUS = tyron_state.status;
            const CONTRACT_OWNER = tyron_state.contract_owner;
            let DOCUMENT;
            let UPDATE_COMMITMENT;
            let RECOVERY_COMMITMENT;
            switch (STATUS) {
                case OperationType.Deactivate:
                    throw new SidetreeError("DidDeactivated", "The requested DID is deactivated, and therefore the Resolver must throw an error.");
                default:
                    DOCUMENT = await Sidetree.documentModel(tyron_state.document) as DocumentModel;
                    UPDATE_COMMITMENT = tyron_state.update_commitment;
                    RECOVERY_COMMITMENT = tyron_state.recovery_commitment;
                    break
            }
            const THIS_STATE: DidStateModel = {
                status: STATUS,
                contract_owner: CONTRACT_OWNER,
                did_tyronZIL: tyron_state.decentralized_identifier,
                document: DOCUMENT,
                updateCommitment: UPDATE_COMMITMENT,
                recoveryCommitment: RECOVERY_COMMITMENT
            }
            return new DidState(THIS_STATE);
        })
        .catch(err => { throw err })
        return did_state;
    }
}

/***            ** interfaces **            ***/

/** The state model of a decentralized identifier */
export interface DidStateModel {
    status: OperationType;
    contract_owner: string;
    did_tyronZIL: string;
    document: DocumentModel;
    updateCommitment: string;
    recoveryCommitment: string;
}
