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

import PublicKeyPurpose from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/PublicKeyPurpose';
import PublicKeyModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/PublicKeyModel';
import JwkEs256k from '@decentralized-identity/sidetree/dist/lib/core/models/JwkEs256k';
import Jwk from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/util/Jwk';
import Jws from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/util/Jws';
import TyronZILScheme from './tyronZIL-schemes/did-scheme';
import { UpdateSignedDataModel, RecoverSignedDataModel, DeactivateSignedDataModel } from './models/signed-data-models';

/** Defines input data to generate a cryptographic key pair */
export interface OperationKeyPairInput {
    id: string,
    purpose?: PublicKeyPurpose[]
}

/** Generates cryptographic operations */
export class Cryptography {

    /** 
     * Asymmetric cryptography to generate the key pair using the KEY_ALGORITHM (secp256k1)
     * @returns [publicKey, privateKey] */
    public static async operationKeyPair(input: OperationKeyPairInput): Promise<[PublicKeyModel, JwkEs256k]> {
        const [publicKey, privateKey] = await Jwk.generateEs256kKeyPair();
        const publicKeyModel: PublicKeyModel = {
            id: input.id,
            type: 'EcdsaSecp256k1VerificationKey2019',
            jwk: publicKey,
            purpose: input.purpose || Object.values(PublicKeyPurpose)
        };
        return [publicKeyModel, privateKey];
    }

    /** Signs the given payload as a ES256K compact JWS */
    public static async signUsingEs256k (didTyronZIL: TyronZILScheme, payload: UpdateSignedDataModel | RecoverSignedDataModel | DeactivateSignedDataModel, privateKey: JwkEs256k): Promise<string> {
        const PUBLIC_KEY = Jwk.getEs256kPublicKey(privateKey);

        const protectedHeader = {
            kid: didTyronZIL + '#'+ PUBLIC_KEY,
            alg: 'ES256K'
        };
        const compactJws = Jws.signAsCompactJws(payload, privateKey, protectedHeader);
        return compactJws;
    }
}