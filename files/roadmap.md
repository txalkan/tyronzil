# tyronZIL roadmap

The tyronZIL project gets organized in development sprints of 4 weeks duration.

Dates | Sprint
---|---
29/6 - 24/7/2020 | Creates the tyronZIL DID-Client that performs DID CRUD operations (create, read, recover, update & deactivate).
27/7 - 21/8/2020 | Integrates the DID-Client with the Zilliqa blockchain platform.
24/8 - 18/9/2020 | Implements the [DID-Smart-Contract (DIDC)](https://www.tyronzil.com/smart-contracts/didc/) to immutably save and distribute DID-States.
21/9 - 11/12/2020 | **Tyron Improvement Proposal #1** - TIP1 consists of 3 sprints that aim to increase security and discoverability of Tyron Decentralized Identifiers (DIDs).
21/9 - 16/10/2020 | TIP1.1 implements Zilliqa's 32-byte private-keys to generate Schnorr signatures that can be verified by the DIDC. The contract also produces the SHA-256 hash of the Decentralized Identifier, which must be signed to deactivate the DID. And the DIDC can verify that all Schnorr signatures correspond to the [DID-Keys](https://www.tyronzil.com/protocol-parameters/#did-keys) that have their public keys stored in the contract. [Release notes](https://github.com/julio-cabdu/tyronZIL-js/releases/tag/v1.0.0-alpha).
19/10 - 13/11/2020 | TIP1.2 develops the *init.tyron* smart contract for the initialization of [@tyron.did](https://twitter.com/tyrondid) self-sovereign identities as well as a domain name system that implements the *.did*, *.agent* & *.tyron* domains. These top-level SSI Domains define the SSI Trinity constituted by the user as the owner of their decentralized identity, the agent providing products & services, and tyron as the technology & open organization. This development sprint also introduces the xWallet that gives ZRC-2 transfer capabilities to the DID smart contract (DIDC). By using a donation campaign code, the DIDC can send a commission-free transfer to another *user.did* & keep track of the token balance - find the donations prototype at [pung.me](https://pung.me). [Release notes](https://github.com/julio-cabdu/tyronZIL-js/releases/tag/v2.0.0-alpha).