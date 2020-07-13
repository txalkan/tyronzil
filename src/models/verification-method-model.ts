import JwkEs256k from "@decentralized-identity/sidetree/dist/lib/core/models/JwkEs256k";

export default interface VerificationMethodModel {
    id: string;
    type: string;
    controller?: string;
    jwk?: JwkEs256k;
}