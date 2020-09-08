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
import OperationType from '@decentralized-identity/sidetree/dist/lib/core/enums/OperationType';

export default class TyronState {
    public readonly status: OperationType;
    public readonly contract_owner: string;
    public readonly decentralized_identifier: string;
    public readonly document: string;
    public readonly update_commitment: string;
    public readonly recovery_commitment: string;
    public readonly ledger_time: number;
    public readonly sidetree_transaction_number: number;
    
    private constructor(
        state: TyronStateModel
    ) {
        this.status = state.status as OperationType;
        this.contract_owner = state.contract_owner;
        this.decentralized_identifier = state.decentralized_identifier;
        this.document = state.document;
        this.update_commitment = state.update_commitment;
        this.recovery_commitment = state.recovery_commitment;
        this.ledger_time = state.ledger_time;
        this.sidetree_transaction_number = state.sidetree_transaction_number;
    }

    /** Fetches the current state from the blockchain 
     * @params addr: the Zilliqa address of the user's smart-contract
    */
    public static async fetch(network: NetworkNamespace, tyronAddr: string): Promise<void | TyronState> {
        const ZIL_INIT = new ZilliqaInit(network);
        const tyron_state = await ZIL_INIT.API.blockchain.getSmartContractInit(tyronAddr)
        .then(async immutable_fields => {
            const FIELDS = immutable_fields.result;
            let CONTRACT_OWNER;
            if(Array.isArray(FIELDS)) {
                for(const field of FIELDS) {
                    if(field.vname === "contract_owner") {
                        CONTRACT_OWNER = field.value
                    }
                }
            }
            return CONTRACT_OWNER;
        })
        .then(async contract_owner => {
            const SMART_CONTRACT_STATE = await ZIL_INIT.API.blockchain.getSmartContractState(tyronAddr);
            const STATE: TyronStateModel = {
                contract_owner: contract_owner as string,
                status: String(SMART_CONTRACT_STATE.result.status),
                decentralized_identifier: String(SMART_CONTRACT_STATE.result.decentralized_identifier),
                document: String(SMART_CONTRACT_STATE.result.document),
                update_commitment: String(SMART_CONTRACT_STATE.result.update_commitment),
                recovery_commitment: String(SMART_CONTRACT_STATE.result.recovery_commitment),
                ledger_time: Number(SMART_CONTRACT_STATE.result.ledger_time),
                sidetree_transaction_number: Number(SMART_CONTRACT_STATE.result.sidetree_transaction_number),
            };
            return new TyronState(STATE);
        })
        .catch(error => console.error(error));
        return tyron_state;
    }
}

/***            ** interfaces **            ***/

/** The tyron state model */
export interface TyronStateModel {
    contract_owner: string;
    status: string;
    decentralized_identifier: string;
    document: string;
    update_commitment: string;
    recovery_commitment: string;
    ledger_time: number;
    sidetree_transaction_number: number;
}
