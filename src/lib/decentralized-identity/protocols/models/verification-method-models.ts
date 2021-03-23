/*
    tyronzil: Tyron Self-Sovereign Identity client for Node.js
    Copyright (C) 2021 Tyron Pungtas Open Association

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.
*/

export interface PublicKeyModel {
    id: string;
    key?: string;
}

export interface PrivateKeyModel {
    id: string;
    key: string;
}

export interface VerificationMethodModel extends PublicKeyModel {
    type: string;
    publicKeyBase58: string;
}

export enum PublicKeyPurpose {
    General = 'general',
    Auth = 'authentication',
    Assertion = 'assertion',
    Agreement = 'agreement',
    Invocation = 'invocation',
    Delegation = 'delegation',
    XSGD = 'xsgd'
}

export interface TyronVerificationMethods {
    publicKey?: VerificationMethodModel;
    authentication?: VerificationMethodModel;
    assertionMethod?: VerificationMethodModel;
    keyAgreement?: VerificationMethodModel;
    capabilityInvocation?: VerificationMethodModel;
    capabilityDelegation?: VerificationMethodModel;
    xsgdKey?: VerificationMethodModel;
}
