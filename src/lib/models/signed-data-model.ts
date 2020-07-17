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

import JwkEs256k from '@decentralized-identity/sidetree/dist/lib/core/models/JwkEs256k';

/** Defines model for the JWS payload object required by the Update Operation Signed Data Object */
export interface UpdateSignedDataModel {
    /** Encoded representation of the Update Operation Delta Object hash */
    delta_hash?: string;
    deltaHash?: string;
    /** The JCS canonicalized IETF RFC 7517 compliant JWK representation matching the previous update commitment value */
    update_key?: JwkEs256k;
    updateKey?: JwkEs256k;
}

/** Defines model for the JWS payload object required by the Recovery Operation Signed Data Object */
export interface RecoverSignedDataModel {
    /** Encoded representation of the Recovery Operation Delta Object hash */
    delta_hash?: string;
    deltaHash?: string;
    /** The JCS canonicalized IETF RFC 7517 compliant JWK representation matching the previous recovery commitment value */
    recovery_key?: JwkEs256k;
    recoveryKey?: JwkEs256k;
    /** A new recovery commitment for the next recover operation */
    recovery_commitment?: string;
    recoveryCommitment?: string;
}

/** Defines model for the JWS payload object required by the Deactivate Operation Signed Data Object */
export interface DeactivateSignedDataModel {
    /** The unique suffix of the DID to deactivate */
    did_suffix?: string;
    didSuffix?: string;
    /** The JCS canonicalized IETF RFC 7517 compliant JWK representation matching the previous recovery commitment value */
    recovery_key: JwkEs256k;
    recoverykey?: JwkEs256k;
    
}