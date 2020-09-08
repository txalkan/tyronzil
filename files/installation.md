# Install tyronZIL-js

> Getting ready:  
> - Recommended to use [nvm](https://github.com/nvm-sh/nvm) to install node.js
> - Make sure to have the latest version of npm: ```npm install -g npm```  
> - Also, install [node-gyp](https://github.com/nodejs/node-gyp): ```npm install -g node-gyp```  
On macOS ```xcode-select --install``` as well

1. ```git clone https://github.com/julio-cabdu/tyronZIL-js```

2. ```cd tyronZIL-js```

3. ```git status```
> To start contributing, create your topic branch: ```git checkout -b yourTyron```

4. ```npm install```

5. ```npm run build```

6. To get the CLI ready:
```npm install -g .```

## tyronZIL-CLI

### DID-create

Create your brand new tyronZIL DID and save it on the Zilliqa blockchain platform, forever.

```tyronzil did create``` and follow the instructions :zap:

> More info [here](https://www.tyronzil.com/operations/CRUD/did-create/)

### DID-resolve

Resolve any DID into its corresponding DID-document or DID-resolution-result with:

```tyronzil resolve```

> More info [here](https://www.tyronzil.com/operations/CRUD/did-resolve/)

### DID-recover

In case you want to reset your DID-state while keeping the same identifier, you need your recovery private key.

```tyronzil did recover``` and follow the instructions

> More info [here](https://www.tyronzil.com/operations/CRUD/did-recover/)

### DID-update

To update your tyronZIL DID you need your update private key:

```tyronzil did update``` and follow the instructions

> More info [here](https://www.tyronzil.com/operations/CRUD/did-update/)

### DID-deactivate

To fully deactivate your DID:

```tyronzil did deactivate``` and follow the instructions

> After deactivation, the DID will not be useful anymore, and trying to resolve it must throw a 'DidDeactivated' error.

> More info [here](https://www.tyronzil.com/operations/CRUD/did-deactivate/)

## Documentation

Build the project documentation with:

```typedoc --out```
