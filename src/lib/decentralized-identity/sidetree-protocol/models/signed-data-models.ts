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

import { OperationType } from "../sidetree";

/** Defines model for the payload object required by the Update Operation Signed Data Object */
export interface UpdateSignedDataModel {
    decentralized_identifier: string;
    /** Encoded representation of the Update Operation Delta Object hash */
    delta_hash: string;
    previous_update_key: string;
}

/** Defines model for the payload object required by the Recovery Operation Signed Data Object */
export interface RecoverSignedDataModel {
    decentralized_identifier: string;
    /** Encoded representation of the Recovery Operation Delta Object hash */
    delta_hash: string;
    previous_recovery_key: string;
    /** A new recovery key for the next DID-Recover or Deactivate operation */
    new_recovery_key: string;
}

/** Defines model for the payload object required by the Deactivate Operation Signed Data Object */
export interface DeactivateSignedDataModel {
    /** The DID to deactivate */
    decentralized_identifier: string;
    previous_recovery_key: string;
}

/** Defines data to execute a Sidetree-Tyron operation */
export interface SignedDataRequest {
    type: OperationType;
    signed_data: string;
    signature: string;
    delta?: string;
}
