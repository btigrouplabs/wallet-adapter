# `@bbachain/wallet-adapter-ant-design`

# Quick Setup (using Create-React-App with craco-less)
See the [example](https://github.com/bbachain/wallet-adapter/tree/master/packages/example) package for more usage.

## Install

1. Set up craco if you haven't already using the following [guide](https://github.com/gsoft-inc/craco/blob/master/packages/craco/README.md#installation).
2. Add `craco-less` into the project `npm install --save craco-less`.
   1. Add it to the `craco.config.js` file
        ```javascript
        const CracoLessPlugin = require('craco-less');
        module.exports = {
            plugins: [
                {
                    plugin: CracoLessPlugin,
                    options: {
                        lessLoaderOptions: {
                            lessOptions: {
                                modifyVars: { '@primary-color': '#512da8' },
                                javascriptEnabled: true,
                            },
                        },
                    },
                },
            ],
        };
        ```
3. Install these peer dependencies (or skip this if you have them already):

```
npm install --save \
    antd \
    @ant-design/icons \
    @bbachain/web3.js \
    react
```
4. Install these dependencies:

```
npm install --save \
    @bbachain/wallet-adapter-wallets \
    @bbachain/wallet-adapter-react \
    @bbachain/wallet-adapter-ant-design \
    @bbachain/wallet-adapter-base
```


## Usage
Check out usage in the [example](https://github.com/bbachain/wallet-adapter/tree/master/packages/starter/example) package.

## Overrides

You can override the following elements from the stylesheet:

```
.wallet-adapter-icon
.wallet-adapter-modal-menu
.wallet-adapter-modal-menu-item
.wallet-adapter-modal-menu-button
.wallet-adapter-modal-menu-button-icon
.wallet-adapter-multi-button-menu
.wallet-adapter-multi-button-menu-item
.wallet-adapter-multi-button-menu-button
.wallet-adapter-multi-button-icon
.wallet-adapter-multi-button-item
```
