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
import { OperationType } from '../decentralized-identity/sidetree-protocol/sidetree';
import SidetreeError from '@decentralized-identity/sidetree/dist/lib/common/SidetreeError';

export default class TyronState {
    public readonly contract_owner: string;
    public readonly decentralized_identifier: string;
    public readonly tyron_hash: string;
    public readonly did_status: OperationType;
    public readonly did_document: string;
    public readonly did_update_key: string;
    public readonly did_recovery_key: string;
    public readonly created: number;
    public readonly updated: number;
    public readonly ledger_time: number;
    public readonly sidetree_transaction_number: number;

    private constructor(
        state: TyronStateModel
    ) {
        this.contract_owner = state.contract_owner;
        this.decentralized_identifier = state.decentralized_identifier;
        this.tyron_hash = state.tyron_hash;
        this.did_status = state.did_status as OperationType;
        this.did_document = state.did_document;
        this.did_update_key = state.did_update_key;
        this.did_recovery_key = state.did_recovery_key;
        this.created = state.created;
        this.updated = state.updated;
        this.ledger_time = state.ledger_time;
        this.sidetree_transaction_number = state.sidetree_transaction_number;
    }

    /** Fetches the current state from the blockchain 
     * @params addr: the Zilliqa address of the user's smart-contract
    */
    public static async fetch(network: NetworkNamespace, tyronAddr: string): Promise<TyronState> {
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
            const STATUS = await SmartUtil.getStatus(SMART_CONTRACT_STATE.result.did_status);
            switch (STATUS) {
                case OperationType.Deactivate:
                    throw new SidetreeError("DidDeactivated", "The requested DID is deactivated");
                default:
                    const STATE: TyronStateModel = {
                        contract_owner: contract_owner as string,
                        decentralized_identifier: String(SMART_CONTRACT_STATE.result.decentralized_identifier),
                        tyron_hash: await SmartUtil.getValue(SMART_CONTRACT_STATE.result.tyron_hash),
                        did_status: STATUS,
                        did_document: (await SmartUtil.getValue(SMART_CONTRACT_STATE.result.did_document)).substring(2),
                        did_update_key: await SmartUtil.getValue(SMART_CONTRACT_STATE.result.did_update_key),
                        did_recovery_key: await SmartUtil.getValue(SMART_CONTRACT_STATE.result.did_recovery_key),
                        created: Number(SMART_CONTRACT_STATE.result.created),
                        updated: Number(SMART_CONTRACT_STATE.result.updated),
                        ledger_time: Number(SMART_CONTRACT_STATE.result.ledger_time),
                        sidetree_transaction_number: Number(SMART_CONTRACT_STATE.result.sidetree_transaction_number),
                    };
                    return new TyronState(STATE);
            }
        })
        .catch(err => { throw err });
        return tyron_state;
    }
}

/***            ** interfaces **            ***/

/** The tyron state model */
export interface TyronStateModel {
    contract_owner: string;
    decentralized_identifier: string;
    tyron_hash: string;
    did_status: string;
    did_document: string;
    did_update_key: string;
    did_recovery_key: string;
    created: number;
    updated: number;
    ledger_time: number;
    sidetree_transaction_number: number;
}
