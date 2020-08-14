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

import TyronAnchor, { AnchorFileInput, OperationBatch, SignedDataRequest} from "../lib/sidetree/protocol-files/anchor-file";
import { NetworkNamespace } from "../lib/sidetree/tyronZIL-schemes/did-scheme";
import { CreateDataRequest } from "../lib/sidetree/did-operations/did-create";
import OperationType from "@decentralized-identity/sidetree/dist/lib/core/enums/OperationType";
import TyronZIL, { TxInput, BlockTimeStamp } from "../lib/blockchain/zilliqa";
import { ContractInitialization } from "../lib/blockchain/tyron-contract";
import TyronState, { StateModel } from "../lib/blockchain/tyron-state";
import { TransactionStore } from "../lib/CAS/tyron-store";

export default class zilliqaMicroservice {
    public static async handleTransaction(): Promise<void> {
        
        // Values populated for testing purposes
        const VALUE_1: CreateDataRequest = {
            suffix_data: "eyJkZWx0YV9oYXNoIjoiRWlEbnR5WTFhTFdJMUVqZXlobUlLaUhwSjRwNTVLRnlVNjRWZDAwSFF5X0p5ZyIsInJlY292ZXJ5X2NvbW1pdG1lbnQiOiJFaUNUdjRCR1FzdVQyYWplaDJGaG5HRWczYUhqWUtHWnlQODFZRkd5YWpacG93In0",
            type: OperationType.Create,
            delta: "eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljX2tleXMiOlt7ImlkIjoicHJpbWFyeVNpZ25pbmdLZXkiLCJ0eXBlIjoiRWNkc2FTZWNwMjU2azFWZXJpZmljYXRpb25LZXkyMDE5IiwicHVibGljS2V5SndrIjp7Imt0eSI6IkVDIiwiY3J2Ijoic2VjcDI1NmsxIiwieCI6IkQ0QlVZSTU5OTZ1SDBxZW5ESml0bVkzVU44dEE4YVBOVWtLZkt3cDI4eEkiLCJ5IjoiNHRpTmVCd1BaaV8yTHpOaDNLdnQ1T01OWVV2SUVaMEl3Uy1UUHNncThpWSIsImtpZCI6IjB2R1RWRDg2QXNONXZlSHFhZVo4VDFlVkZPNzYzWGlhcjRFMVhaaXoyU0EifSwicHVycG9zZSI6WyJnZW5lcmFsIiwiYXV0aCJdfV0sInNlcnZpY2VfZW5kcG9pbnRzIjpbeyJpZCI6Im1haW4td2Vic2l0ZSIsInR5cGUiOiJ3ZWJzaXRlIiwiZW5kcG9pbnQiOiJodHRwczovL3R5cm9uWklMLmNvbSJ9XX19XSwidXBkYXRlQ29tbWl0bWVudCI6IkVpQTRFVWtVdG5rdTNubUdra1c0dmZyU3RqYWFWbVVhcmdjcEhsRmR5MHk2cmcifQ"
        };
        const CREATE_REQUEST = new Map([
            ["did:tyron:zil:test:EiCU-lPHwRXueFNxY2ZE8XVs_9ly3lgAcf6Veofa7d8XTw", VALUE_1]
        ]);

        const VALUE_2: SignedDataRequest = {
            did_suffix: "EiDrVp5cdZYnWEljefTiv0RPF6ic_aWPOPSzUgxdCeJ4AQ",
            signed_data: "eyJhbGciOiJFUzI1NksifQ.eyJkZWx0YV9oYXNoIjoiRWlBLWxZVXotTnN5cDdQVHpWaml2bW55MDBpZFhDT1dPX1dtSmtPVTIxc0JHUSIsInVwZGF0ZV9rZXkiOnsia3R5IjoiRUMiLCJjcnYiOiJzZWNwMjU2azEiLCJ4IjoiM3Nlc0VoTXlsaFJmdk0yWnJrbkN6UjJraFFfX2xvdVozU1lXbk9jZmZDNCIsInkiOiJ1VGZoOXpCMVpaN2hYT3gwTFZ5RGttRlFPU0llRUpDU2ItTjhhRVp6aUlrIn19.4uKMep71ovwiaajJSvfcw92tv1rYX2OSgxKu41b2trrLp3soYBmyWSYLMVAeIJ9OZM1YEnW3CtwyUVzehJMPWQ",
            type: OperationType.Update,
            delta: "eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJhZGQtc2VydmljZS1lbmRwb2ludHMiLCJzZXJ2aWNlX2VuZHBvaW50cyI6W3siaWQiOiJtYWluLXdlYnNpdGUiLCJ0eXBlIjoid2Vic2l0ZSIsImVuZHBvaW50IjoiaHR0cHM6Ly9qdWxpby5jb20ifV19XSwidXBkYXRlX2NvbW1pdG1lbnQiOiJFaUNNMkdhQk50azZ1ZmlyQVlqVUNvT3lJaDJ0QUJQak1objVGQjljUTQ4M1pnIn0"
        };

        const SIGNED_REQUEST  = new Map([
            ["did:tyron:zil:test:EiDrVp5cdZYnWEljefTiv0RPF6ic_aWPOPSzUgxdCeJ4AQ", VALUE_2]
        ]);

        const BATCH: OperationBatch = {
            network: NetworkNamespace.Testnet,
            count: 2,
            createRequestMap: CREATE_REQUEST,
            signedRequestMap: SIGNED_REQUEST
        };

        const ANCHOR_INPUT: AnchorFileInput = {
            network: NetworkNamespace.Testnet,
            batch: BATCH
        }

        const ANCHOR: TyronAnchor = await TyronAnchor.execute(ANCHOR_INPUT);

        const CONTRACT_INIT: ContractInitialization = {
            tyronAddress: "zil17slnpyrf8tk5tpf83f57j86ysz5wafg3hkvhzn",
            clientAddress: "0x0DBA45B0E1Cce172D84450Fc60e831F0A455d91d",
        };
        
        const TIME_STAMP: BlockTimeStamp = {
            ledgerTime: 999,
            ledgerHash: "ledger_hash"
        };

        const TRANSACTION: TransactionStore = {
            timeStamp: TIME_STAMP,
            txHash: "hash"
        };

        const PREVIOUS_STATE_MODEL: StateModel = {      // to-do fetch from storage
            anchorString: "anchorString",
            previousTransaction: TRANSACTION,
            previousTyronHash: "",
        };

        const PREVIOUS_TYRON_STATE: TyronState = await TyronState.write(JSON.stringify(PREVIOUS_STATE_MODEL));

        const TX_INPUT: TxInput = {
            init: CONTRACT_INIT,
            privateKey: "e7129809b0262abc43b73dc473f2daa14830a92b8f14c4b6b9aabde3b379b690",
            anchor: ANCHOR,
            previousTransaction: TRANSACTION,
            previousTyronState: PREVIOUS_TYRON_STATE,
        };

        const TX = await TyronZIL.executeTransaction(TX_INPUT);
        console.log(`The tyronZIL transaction: ${JSON.stringify(TX,null,2)}`);
    }
}