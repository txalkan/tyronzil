# Install the SSI client

> Getting ready:  
> - Recommended to use [nvm](https://github.com/nvm-sh/nvm) to install node.js
> - Make sure to have the latest version of npm: ```npm install -g npm```  
> - Also, install [node-gyp](https://github.com/nodejs/node-gyp): ```npm install -g node-gyp```  
On macOS ```xcode-select --install``` as well

1. ```git clone https://github.com/Zillacracy-org/ssiclient```

2. ```cd ssiclient```

3. ```git status```

4. ```npm i```

5. ```npm run tyronzil```

## tyronzil command-line interface

### Deploy

Deploy a tyron smart contract with:

```tyronzil deploy``` 

### DID Create

Create your brand new tyronzil DID and save it on the Zilliqa blockchain platform, forever.

```tyronzil did create``` and follow the instructions :zap:

For your convenience, you can use [these testing-accounts](./testing-accounts.md).

> More info [here](https://www.tyronzil.com/CRUD-operations/did-create/)  

### DID Resolve

Resolve any DID into its corresponding DID Document or DID Resolution Result with:

```tyronzil resolve```

> More info [here](https://www.tyronzil.com/CRUD-operations/did-resolve/)

### DID Recover

In case you want to reset your DID Document while keeping the same identifier, you need your recovery private key.

```tyronzil did recover``` and follow the instructions

> More info [here](https://www.tyronzil.com/CRUD-operations/did-recover/)

### DID Update

To update your tyronzil DID you need your update private key:

```tyronzil did update``` and follow the instructions

> More info [here](https://www.tyronzil.com/CRUD-operations/did-update/)

### DID Deactivate

To fully deactivate your DID:

```tyronzil did deactivate``` and follow the instructions

After deactivation, the DID will not be useful anymore, and trying to resolve it must throw a 'DidDeactivated' error.

> More info [here](https://www.tyronzil.com/CRUD-operations/did-deactivate/)

## Documentation

Build the project documentation with:

```npm run typedoc```
