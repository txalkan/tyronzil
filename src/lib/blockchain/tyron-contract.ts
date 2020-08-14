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
    
    /** The client's Zilliqa address that executes the tyronZIL transaction (ByStr20) */
    public readonly clientAddress: string;

    /** The Zilliqa address where the `tyron-smart-contract` resides */
    public readonly tyronAddress: string;

    constructor(init: ContractInitialization) {
        this.clientAddress = init.clientAddress;
        if (init.tyronAddress !== TyronContracts.OwnYourData) {
            throw new SidetreeError(ErrorCode.WrongContract)
        } else {
            this.tyronAddress = init.tyronAddress;         
        }
    }
}

/***            ** interfaces **            ***/

/** The Zilliqa addresses to initialize the `tyron-smart-contract` */
export interface ContractInitialization {
    tyronAddress: string;
    clientAddress: string;
}

/** The `tyron contracts` organized by transition name */
enum TyronContracts {
    OwnYourData = "zil17slnpyrf8tk5tpf83f57j86ysz5wafg3hkvhzn"
}
