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

import { NetworkNamespace } from '../tyronZIL-schemes/did-scheme';
import PublicKeyPurpose from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/PublicKeyPurpose';

export interface CLICreateInput {
    network: NetworkNamespace;
    publicKeyInput: PublicKeyInput[];
}

export interface PublicKeyInput {
    id: string;
    purpose: PublicKeyPurpose[];
}