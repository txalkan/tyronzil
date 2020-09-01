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

import DeltaModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/DeltaModel';
import Encoder from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Encoder';
import JsonAsync from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/util/JsonAsync';

export class Sidetree {
    private static async parse(encoded: string): Promise<any> {
        const MODEL = JsonAsync.parse(Encoder.decodeBase64UrlAsString(encoded))
        .then(model => { return model })
        .catch(err => console.error(err))
        return MODEL;
    }

    public static async suffixObject(encoded: string): Promise<SuffixDataModel|void> {
        const OBJECT = await this.parse(encoded)
        .then(model => {
            const SUFFIX_OBJECT = model as SuffixDataModel;
            return SUFFIX_OBJECT;
        })
        .catch(err => console.error(err))
        return OBJECT
    }

    public static async deltaObject(encoded: string): Promise<DeltaModel|void> {
        const OBJECT = await this.parse(encoded)
        .then(model => {
            const DELTA_OBJECT = model as DeltaModel;
            return DELTA_OBJECT;
        })
        .catch(err => console.error(err))
        return OBJECT
    }
}

export interface SuffixDataModel {
    /** The hash  */
    delta_hash: string;
    /** The recovery public key commitment */
    recovery_commitment: string;
}