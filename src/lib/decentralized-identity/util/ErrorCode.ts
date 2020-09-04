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

export default {
    InvalidAddress: 'The given address is not a valid Zilliqa Bech32 address',
    JwkEs256kUndefined: 'jwk_es256k_is_undefined',
    JwkEs256kHasUnknownProperty: 'jwk_es256k_has_unknown_property',
    JwkEs256kMissingOrInvalidCrv: 'jwk_es256k_missing_or_invalid_crv',
    JwkEs256kMissingOrInvalidKty: 'jwk_es256k_missing_or_invalid_kty',
    JwkEs256kMissingOrInvalidTypeX: 'jwk_es256k_missing_or_invalid_type_x',
    JwkEs256kMissingOrInvalidTypeY: 'jwk_es256k_missing_or_invalid_type_y',
    JwkEs256kMissingOrInvalidTypeKid: 'jwk_es256k_missing_or_invalid_type_kid',
    DidInvalidUrl: 'The_given_DID_is_not_a_URL',
    IncorrectDidPrefix: 'The_given_DID_does_not_have_the_right_prefix',
    IncorrectNetwork: 'The_network_namespace_is_invalid',
    CouldNotSave: 'Could not save the DID file',
    CouldNotVerifyKey: 'The given key is wrong',
    InvalidDID: 'The client has rejected the input - invalid tyronZIL DID',
    DidMismatch: "The given DID does not match the contract's decentralized identifier",
    CouldNotResolve: 'The client has rejected your resolve request',
    IncorrectPatchAction: 'The chosen action is not valid',
    RepeatedDID: 'There cannot be more than one operation per DID per tyronZIL transaction',
    BeyondCountLimit: 'The number of operations is beyond the maximum limit for a tyronZIL transaction',
    FileSizeExceedsLimit: 'The file size exceeds the allowed limit',
    CouldNotFetchLatestTxBlock: "The Zilliqa's latest transaction block could not be retrieved",
    WrongKey: 'The given private key is wrong',
    NotEnoughBalance: "The current account's balance is not enough",
    WrongTyronHash: 'The hash does not match the `tyron-smart-contract`',
    WrongContract: "The given address is not a `tyron-contract`",
    CommitmentMismatch: "The commitment in the object does not match the contract's commitment",
    DidDeactivated: 'The Decentralized Identifier is deactivated'
};
