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

    /** The Zilliqa address where the `TyronInit smart-contract` resides */
    public readonly tyron_init: string;

    /** The user's Zilliqa address */
    public readonly contract_owner: string;

    /** The address of the user's `tyron-smart-contract` */
    public readonly tyron_addr: string;

    /** The client's Zilliqa address that executes the tyronZIL transaction (ByStr20) */
    public readonly client_addr: string;

    /** The minimum amount that the client MUST stake (in Qa = 10^-12 ZIL) */
    public readonly tyron_stake: number;

    constructor(
        init: ContractInit,
        tyron_addr: string
    ) {
        if (init.tyron_init !== TyronContracts.tyron_init) {
            throw new SidetreeError(ErrorCode.WrongContract)
        } else {
            this.tyron_init = init.tyron_init;         
        }
        this.contract_owner = init.contract_owner;
        this.client_addr = init.client_addr;
        this.tyron_stake = init.tyron_stake;
        this.tyron_addr = tyron_addr;
    }
}

/***            ** interfaces **            ***/

/** The Zilliqa addresses to initialize the `tyron-smart-contract` */
export interface ContractInit {
    tyron_init: string;
    contract_owner: string;
    client_addr: string;
    tyron_stake: number;
}

/** The `tyron smart-contracts` */
enum TyronContracts {
    tyron_init = "0x2ec55313454c229f02cc03266b3df5dbc72cadde"
}
