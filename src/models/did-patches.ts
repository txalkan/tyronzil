import PublicKeyModel from "@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/PublicKeyModel";
import DidServiceEndpointModel from "@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/ServiceEndpointModel";
import DocumentModel from "@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/DocumentModel";

export interface PatchModel {
    action: PatchAction;
    /** If the action is `remove-public-keys`, then Patch.publicKeys MUST be an array of PublicKeyModel.id strings */
    publicKeys?: PublicKeyModel[] | string[];
    serviceEndpoints?: DidServiceEndpointModel;
    /** If the action is `remove-service-endpoints`, then Patch.ids MUST be an array of DidServiceEndpointModel.id strings */
    ids?: string[];
    document?: DocumentModel;
    }

export enum PatchAction {
    AddKeys = 'add-public-keys',
    RemoveKeys = 'remove-public-keys',
    AddServices = 'add-service-endpoints',
    RemoveServices = 'remove-service-endpoints',
    /** Acts as a complete state reset that replaces a DID's current PKI metadata with the state provided - also used to create new DIDs */
    Replace = 'replace',
    // CustomAction: '-custom-action',
}