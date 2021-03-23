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

import DidScheme, { SchemeInputData, NetworkNamespace } from "./did-scheme";
import ErrorCode from '../util/ErrorCode';

export enum UrlParameters {
    Hl = 'hl',        //resource hash of the DID-document to add integrity protection
    Service = 'service',        //identifies a service from the DID-document by service ID
    VersionId = 'version-id',        //identifies a specific version of the DID-document to be resolved
    VersionTime = 'version-time',        //identifies a specific version timestamp of the DID-document to be resolved (the doc that was valid at that particular time)
    InitialState = 'sidetree-initial-state'        //initial self-certifying state, to use the DID immediately after generation without being anchored (unpublished DID)
}

export default class DidUrlScheme extends DidScheme {
    public readonly didUrl?: string;
    public readonly path?: string;
    public readonly query?: string;
    public readonly fragment?: string;
    public readonly longFormDid?: string;

    private constructor(
        input: UrlInput
    ) {
        super(input.schemeInput);
        this.didUrl = this.did + this.path + this.query + this.fragment;
        this.path = '/' + input.path;
        this.query = '?' + input.query;
        this.fragment = '#' + input.fragment;
        this.longFormDid = this.did + this.query;
    }

    /** Validates if the given DID is a proper Tyron Decentralized Identifier */
    public static async validate(did: string): Promise<DidUrlScheme> {
        const PREFIX = this.schemeIdentifier + this.methodName + this.blockchain;

        if (!did.startsWith(PREFIX)) {
            throw new ErrorCode("CodeIncorrectDidPrefix", "The given DID does not have the right prefix");
        }

        const NETWORK = did.substring(14, 19);
        
        if (NETWORK !== NetworkNamespace.Mainnet && NETWORK !== NetworkNamespace.Testnet && NETWORK !== NetworkNamespace.Isolated) {
            throw new ErrorCode("CodeIncorrectNetwork", "The network namespace is invalid")
        }
        const DID_SUFFIX = did.substring(19);

        const SCHEME_INPUT_DATA: SchemeInputData = {
            network: NETWORK,
            didUniqueSuffix: DID_SUFFIX
        };
        const DID: UrlInput = {
            schemeInput: SCHEME_INPUT_DATA
        };
        return new DidUrlScheme(DID);
    }
}

export interface UrlInput {
    schemeInput: SchemeInputData;
    path?: string;
    query?: string;
    fragment?: string;
}

export interface LongFormDidInput {
    schemeInput: SchemeInputData;
    suffixData: string;
    delta: string;
}

export interface Query {
    urlParameter: UrlParameters;
    value: string;
}
