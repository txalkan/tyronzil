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
import ServiceEndpointModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/ServiceEndpointModel';
import { PublicKeyModel, Operation, Recovery } from './models/verification-method-models';

export interface DidStateModel {
    did_tyronZIL: string;
    publicKey: PublicKeyModel[];
    operation?: Operation;      // operation & recovery are undefined after deactivation
    recovery?: Recovery;
    service?: ServiceEndpointModel[];
    lastTransaction?: number;    
}

export default class DidState {
    public readonly did_tyronZIL: string;
    public readonly publicKeys: PublicKeyModel[];
    public readonly operation?: Operation;
    public readonly recovery?: Recovery;
    public readonly service?: ServiceEndpointModel[];
    public readonly lastTransaction?: number;

    private constructor(
        input: DidStateModel
    ) {
        this.did_tyronZIL = input.did_tyronZIL;
        this.publicKeys = input.publicKey;
        this.operation = input.operation;
        this.recovery = input.recovery;
        this.service = input.service;
        this.lastTransaction = input.lastTransaction;
    }

    public static async write(input: DidStateModel): Promise<DidState> {
        return new DidState(input);
    }
}