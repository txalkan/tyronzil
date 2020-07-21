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

import TyronZILScheme from "../tyronZIL-schemes/did-scheme";
import DidDoc from "../did-document";

/** tyronZIL's DID Resolver: resolves a DID into its DID-document */
export default class DidResolve {
    public readonly didDocument: JSON;

    private constructor(
        input: DidDoc
    ) {
        this.didDocument = JSON.stringify(input);
    }

    public static async resolution(input: ResolutionInput): Promise<ResolutionOutput> {
        const DID_tyronZIL = input.did_tyronZIL;
        
    }
}

export interface ResolutionInput {
    did_tyronZIL: string;
    metadata?: unknown
}

export interface ResolutionOutput {
    metadata?: unknown;
    documentStream: Buffer | void;
    documentMetadata: unknown | void;
}
