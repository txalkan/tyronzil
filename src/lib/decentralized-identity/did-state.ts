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
import { OperationType, Sidetree } from './sidetree-protocol/sidetree';
import { DocumentModel } from './sidetree-protocol/models/patch-model';
import SidetreeError from '@decentralized-identity/sidetree/dist/lib/common/SidetreeError';

/** The Tyron DID-State */
export default class DidState {
    public readonly contract_owner: string;
    public readonly decentralized_identifier: string;
    public readonly tyron_hash: string;
    public readonly did_status: OperationType;
    
    /** The DID-document as a Sidetree Document Model */
    public readonly did_document: DocumentModel;
    
    public readonly did_update_key: string;
    public readonly did_recovery_key: string;
    
    private constructor(
        state: DidStateModel
    ) {
        this.contract_owner = state.contract_owner;
        this.decentralized_identifier = state.decentralized_identifier;
        this.tyron_hash = state.tyron_hash;
        this.did_status = state.did_status;
        this.did_document = state.did_document;
        this.did_update_key = state.did_update_key;
        this.did_recovery_key = state.did_recovery_key
    }

    /***            ****            ***/

    /** Fetches the current DID-State for the given tyron_addr */
    public static async fetch(network: NetworkNamespace, tyronAddr: string): Promise<DidState> {
        const did_state = await TyronState.fetch(network, tyronAddr)
        .then(async tyron_state => {
            // Validates the tyronZIL DID-scheme
            await TyronZILUrlScheme.validate(tyron_state.decentralized_identifier);
            return tyron_state;
        })
        .then(async tyron_state => {
            const CONTRACT_OWNER = tyron_state.contract_owner;
            const DID_STATUS = tyron_state.did_status;
            let TYRON_HASH;
            let DID_DOCUMENT;
            let DID_UPDATE_KEY;
            let DID_RECOVERY_KEY;
            switch (DID_STATUS) {
                case OperationType.Deactivate:
                    throw new SidetreeError("DidDeactivated", "The requested DID is deactivated, and therefore the Resolver must throw an error.");
                default:
                    TYRON_HASH = tyron_state.tyron_hash;
                    DID_DOCUMENT = await Sidetree.documentModel(tyron_state.did_document);
                    console.log(JSON.stringify(DID_DOCUMENT, null, 2));
                    DID_UPDATE_KEY = tyron_state.did_update_key;
                    DID_RECOVERY_KEY = tyron_state.did_recovery_key;
                    break
            }
            const THIS_STATE: DidStateModel = {
                contract_owner: CONTRACT_OWNER,
                decentralized_identifier: tyron_state.decentralized_identifier,
                tyron_hash: TYRON_HASH,
                did_status: DID_STATUS,
                did_document: DID_DOCUMENT,
                did_update_key: DID_UPDATE_KEY,
                did_recovery_key: DID_RECOVERY_KEY
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
    contract_owner: string;
    decentralized_identifier: string;
    tyron_hash: string;
    did_status: OperationType;
    did_document: DocumentModel;
    did_update_key: string;
    did_recovery_key: string;
}
