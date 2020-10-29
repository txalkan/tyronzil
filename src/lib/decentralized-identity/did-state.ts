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
import DidUrlScheme from './tyronZIL-schemes/did-url-scheme';
import { OperationType, Sidetree } from './protocols/sidetree';
import { DocumentModel } from './protocols/models/document-model';

/** The Tyron DID-State */
export default class DidState {
    public readonly contractOwner: string;
    public readonly decentralized_identifier: string;
    public readonly did_status: OperationType;
    public readonly tyron_hash: string;
    
    /** The DID-Document as a Sidetree Document Model */
    public readonly did_document: DocumentModel;
    
    public readonly did_update_key: string;
    public readonly did_recovery_key: string;
    
    private constructor(
        state: DidStateModel
    ) {
        this.contractOwner = state.contractOwner;
        this.decentralized_identifier = state.decentralized_identifier;
        this.did_status = state.did_status;
        this.tyron_hash = state.tyron_hash;
        this.did_document = state.did_document;
        this.did_update_key = state.did_update_key;
        this.did_recovery_key = state.did_recovery_key
    }

    /***            ****            ***/

    /** Fetches the current DID-State for the given tyron_addr */
    public static async fetch(network: NetworkNamespace, tyronAddr: string): Promise<DidState> {
        const did_state = await TyronState.fetch(network, tyronAddr)
        .then(async tyron_state => {
            // Validates the Tyron DID-Scheme
            await DidUrlScheme.validate(tyron_state.decentralized_identifier);
            
            const THIS_STATE: DidStateModel = {
                contractOwner: tyron_state.contractOwner,
                decentralized_identifier: tyron_state.decentralized_identifier,
                did_status: tyron_state.did_status,
                tyron_hash: tyron_state.tyron_hash,
                did_document: await Sidetree.documentModel(tyron_state.did_document),
                did_update_key: tyron_state.did_update_key,
                did_recovery_key: tyron_state.did_recovery_key
            };
            return new DidState(THIS_STATE);
        })
        .catch(err => { throw err })
        return did_state;
    }
}

/***            ** interfaces **            ***/

/** The state model of a Tyron Decentralized Identifier */
export interface DidStateModel {
    contractOwner: string;
    decentralized_identifier: string;
    did_status: OperationType;
    tyron_hash: string;
    did_document: DocumentModel;
    did_update_key: string;
    did_recovery_key: string;
}
