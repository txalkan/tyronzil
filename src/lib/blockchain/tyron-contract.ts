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

import SidetreeError from '@decentralized-identity/sidetree/dist/lib/common/SidetreeError';
import ErrorCode from '../ErrorCode';

/** The class to initialize the `tyron-smart-contract` */
export default class TyronContract {
    
    /** The Zilliqa address where the `tyron-smart-contract` resides */
    public readonly tyronAddress: string;

    /** The client's Zilliqa address that executes the tyronZIL transaction (ByStr20) */
    public readonly clientAddress: string;

    constructor(init: ContractInitialization) {
        this.tyronAddress = init.tyronAddress;
        this.clientAddress = init.clientAddress;
    }

    public static async initialize(init: ContractInitialization): Promise<TyronContract> {
        const TYRON_CONTRACT = init.tyronAddress;
        if (TYRON_CONTRACT !== TyronContracts.OwnYourData) {
            throw new SidetreeError(ErrorCode.WrongContract)
        }

        const CONTRACT_INIT: ContractInitialization = {
            tyronAddress: TYRON_CONTRACT,
            clientAddress: init.clientAddress,
        }

        return new TyronContract(CONTRACT_INIT);
    }

}

/***            ** interfaces **            ***/
export interface ContractInitialization {
    tyronAddress: string;
    clientAddress: string;
}

enum TyronContracts {
    OwnYourData = "add-address"
}