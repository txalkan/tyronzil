import JwkEs256k from '@decentralized-identity/sidetree/dist/lib/core/models/JwkEs256k';

/** Defines model for the JWS payload object required by the Update Operation Signed Data Object */
export default interface SignedDataModel {
    /** Encoded representation of the Update Operation Delta Object hash */
    delta_hash: string; //todo change name to kebab
    /** The JCS canonicalized IETF RFC 7517 compliant JWK representation matching the previous updateCommitment value */
    update_key: JwkEs256k;
}