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

import { NetworkNamespace } from '../decentralized-identity/tyronZIL-schemes/did-scheme';
import ZilliqaInit from './zilliqa-init';
import SmartUtil from './smart-contracts/smart-util';
import { OperationType } from '../decentralized-identity/protocols/sidetree';
import ErrorCode from '../decentralized-identity/util/ErrorCode';

export default class TyronState {
    public readonly contractOwner: string;
    public readonly decentralized_identifier: string;
    public readonly tyron_hash: string;
    public readonly did_status: OperationType;
    public readonly verification_methods: Map<string, string>;
    public readonly services: Map<string, [string, string]>
    public readonly did_update_key: string;
    public readonly did_recovery_key: string;
    public readonly created: number;
    public readonly ledger_time: number;
    public readonly sidetree_transaction_number: number;

    private constructor(
        state: TyronStateModel
    ) {
        this.contractOwner = state.contractOwner;
        this.decentralized_identifier = state.decentralized_identifier;
        this.tyron_hash = state.tyron_hash;
        this.did_status = state.did_status as OperationType;
        this.verification_methods = state.verification_methods;
        this.services = state.services;
        this.did_update_key = state.did_update_key;
        this.did_recovery_key = state.did_recovery_key;
        this.created = state.created;
        this.ledger_time = state.ledger_time;
        this.sidetree_transaction_number = state.sidetree_transaction_number;
    }

    /** Fetches the current state from the blockchain 
     * @params addr: the Zilliqa address of the user's smart-contract
    */
    public static async fetch(network: NetworkNamespace, didcAddr: string): Promise<TyronState> {
        const ZIL_INIT = new ZilliqaInit(network);
        const tyron_state = await ZIL_INIT.API.blockchain.getSmartContractState(didcAddr)
        .then(async didc_state => {
            const STATUS = await SmartUtil.getStatus(didc_state.result.did_status);
            switch (STATUS) {
                case OperationType.Deactivate:
                    throw new ErrorCode("DidDeactivated", "The requested DID is deactivated");
                default:
                    const STATE: TyronStateModel = {
                        contractOwner: String(didc_state.result.contract_owner),
                        decentralized_identifier: String(didc_state.result.decentralized_identifier),
                        tyron_hash: await SmartUtil.getValue(didc_state.result.tyron_hash),
                        did_status: STATUS,
                        verification_methods: await SmartUtil.intoMap(didc_state.result.verification_methods),
                        services: await SmartUtil.fromServices(didc_state.result.services),
                        did_update_key: await SmartUtil.getValue(didc_state.result.did_update_key),
                        did_recovery_key: await SmartUtil.getValue(didc_state.result.did_recovery_key),
                        created: Number(didc_state.result.created),
                        ledger_time: Number(didc_state.result.ledger_time),
                        sidetree_transaction_number: Number(didc_state.result.sidetree_transaction_number),
                    };
                    return new TyronState(STATE);
            }
        })
        .catch(err => { throw err });
        return tyron_state;
    }
}

/***            ** interfaces **            ***/

/** The Tyron State Model */
export interface TyronStateModel {
    contractOwner: string;
    decentralized_identifier: string;
    tyron_hash: string;
    did_status: string;
    verification_methods: Map<string, string>;
    services: Map<string, [string, string]>;
    did_update_key: string;
    did_recovery_key: string;
    created: number;
    ledger_time: number;
    sidetree_transaction_number: number;
}
