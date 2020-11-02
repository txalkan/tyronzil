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
import { OperationType } from './protocols/sidetree';

/** The Tyron DID-State */
export default class DidState {
    public readonly contractOwner: string;
    public readonly decentralized_identifier: string;
    public readonly did_status: OperationType;
    public readonly tyron_hash: string;
    public readonly verification_methods: Map<string, string>;
    public readonly services: Map<string, [string, string]>;
    
    public readonly did_update_key: string;
    public readonly did_recovery_key: string;
    
    private constructor(
        state: DidStateModel
    ) {
        this.contractOwner = state.contractOwner;
        this.decentralized_identifier = state.decentralized_identifier;
        this.did_status = state.did_status;
        this.tyron_hash = state.tyron_hash;
        this.verification_methods = state.verification_methods;
        this.services = state.services;
        this.did_update_key = state.did_update_key;
        this.did_recovery_key = state.did_recovery_key
    }

    /***            ****            ***/

    /** Fetches the current DID-State for the given tyron_addr */
    public static async fetch(network: NetworkNamespace, didcAddr: string): Promise<DidState> {
        const did_state = await TyronState.fetch(network, didcAddr)
        .then(async tyron_state => {
            // Validates the Tyron DID-Scheme
            await DidUrlScheme.validate(tyron_state.decentralized_identifier);
            
            const THIS_STATE: DidStateModel = {
                contractOwner: tyron_state.contractOwner,
                decentralized_identifier: tyron_state.decentralized_identifier,
                did_status: tyron_state.did_status,
                tyron_hash: tyron_state.tyron_hash,
                verification_methods: tyron_state.verification_methods,
                services: tyron_state.services,
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
    verification_methods: Map<string, string>;
    services: Map<string, [string, string]>;
    did_update_key: string;
    did_recovery_key: string;
}
