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

import JwkEs256k from "@decentralized-identity/sidetree/dist/lib/core/models/JwkEs256k";

export interface VerificationMethodModel {
    id: string;
    type: string;
    controller?: string;
    jwk: JwkEs256k;
}

export interface PublicKeyModel extends VerificationMethodModel {
    purpose: PublicKeyPurpose[]
}

export interface Operation extends VerificationMethodModel {
    purpose: SidetreeVerificationRelationship.Operation
}

export interface Recovery extends VerificationMethodModel {
    purpose: SidetreeVerificationRelationship.Recovery
}

export enum SidetreeVerificationRelationship {
    Operation = 'operation',
    Recovery = 'recovery'
}

export enum PublicKeyPurpose {
    General = 'general',
    Auth = 'auth',
    Agreement = 'agreement',
    Assertion = 'assertion',
    Delegation = 'delegation',
    Invocation = 'invocation'
}