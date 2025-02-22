import type { EventEmitter, SendTransactionOptions, WalletName } from '@bbachain/wallet-adapter-base';
import {
    BaseMessageSignerWalletAdapter,
    isIosAndRedirectable,
    isVersionedTransaction,
    scopePollingDetectionStrategy,
    WalletAccountError,
    WalletConnectionError,
    WalletDisconnectedError,
    WalletDisconnectionError,
    WalletError,
    WalletNotConnectedError,
    WalletNotReadyError,
    WalletPublicKeyError,
    WalletReadyState,
    WalletSendTransactionError,
    WalletSignMessageError,
    WalletSignTransactionError,
} from '@bbachain/wallet-adapter-base';
import type {
    Connection,
    SendOptions,
    Transaction,
    TransactionSignature,
    TransactionVersion,
    VersionedTransaction,
} from '@bbachain/web3.js';
import { PublicKey } from '@bbachain/web3.js';

interface BBAWalletEvents {
    connect(...args: unknown[]): unknown;
    disconnect(...args: unknown[]): unknown;
    accountChanged(newPublicKey: PublicKey): unknown;
}

interface BBAWallet extends EventEmitter<BBAWalletEvents> {
    isBBAWallet?: boolean;
    publicKey?: { toBytes(): Uint8Array };
    isConnected: boolean;
    signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T>;
    signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]>;
    signAndSendTransaction<T extends Transaction | VersionedTransaction>(
        transaction: T,
        options?: SendOptions
    ): Promise<{ signature: TransactionSignature }>;
    signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }>;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
}

interface BBAWalletWindow extends Window {
    bbawallet?: {
        bbachain?: BBAWallet;
    };
    bbachain?: BBAWallet;
}

declare const window: BBAWalletWindow;

export interface BBAWalletAdapterConfig {}

export const BBAWalletName = 'BBA Wallet' as WalletName<'BBA Wallet'>;

export class BBAWalletAdapter extends BaseMessageSignerWalletAdapter {
    name = BBAWalletName;
    url = 'https://wallet.bbachain.com';
    icon =
        'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2aWV3Qm94PSIwIDAgNTAwIDUwMCI+CiAgPGRlZnM+CiAgICA8c3R5bGU+CiAgICAgIC5jbHMtMSB7CiAgICAgICAgZmlsbDogdXJsKCNsaW5lYXItZ3JhZGllbnQtMTMpOwogICAgICB9CgogICAgICAuY2xzLTIgewogICAgICAgIGZpbGw6IHVybCgjbGluZWFyLWdyYWRpZW50LTIpOwogICAgICB9CgogICAgICAuY2xzLTMgewogICAgICAgIGZpbGw6IHVybCgjbGluZWFyLWdyYWRpZW50LTEwKTsKICAgICAgfQoKICAgICAgLmNscy00IHsKICAgICAgICBmaWxsOiB1cmwoI2xpbmVhci1ncmFkaWVudC0xNCk7CiAgICAgIH0KCiAgICAgIC5jbHMtNCwgLmNscy01LCAuY2xzLTYgewogICAgICAgIG1peC1ibGVuZC1tb2RlOiBtdWx0aXBseTsKICAgICAgfQoKICAgICAgLmNscy00LCAuY2xzLTYgewogICAgICAgIG9wYWNpdHk6IC40MTsKICAgICAgfQoKICAgICAgLmNscy03IHsKICAgICAgICBmaWxsOiB1cmwoI2xpbmVhci1ncmFkaWVudC0xMik7CiAgICAgIH0KCiAgICAgIC5jbHMtNywgLmNscy04IHsKICAgICAgICBtaXgtYmxlbmQtbW9kZTogbGlnaHRlbjsKICAgICAgICBvcGFjaXR5OiAuNjE7CiAgICAgIH0KCiAgICAgIC5jbHMtOSB7CiAgICAgICAgZmlsbDogdXJsKCNsaW5lYXItZ3JhZGllbnQtNCk7CiAgICAgIH0KCiAgICAgIC5jbHMtNSB7CiAgICAgICAgb3BhY2l0eTogLjc5OwogICAgICB9CgogICAgICAuY2xzLTEwIHsKICAgICAgICBmaWxsOiB1cmwoI2xpbmVhci1ncmFkaWVudC0zKTsKICAgICAgfQoKICAgICAgLmNscy0xMSB7CiAgICAgICAgaXNvbGF0aW9uOiBpc29sYXRlOwogICAgICB9CgogICAgICAuY2xzLTEyIHsKICAgICAgICBmaWxsOiB1cmwoI2xpbmVhci1ncmFkaWVudC04KTsKICAgICAgfQoKICAgICAgLmNscy0xMyB7CiAgICAgICAgZmlsbDogdXJsKCNsaW5lYXItZ3JhZGllbnQtOSk7CiAgICAgIH0KCiAgICAgIC5jbHMtMTQgewogICAgICAgIGZpbGw6IHVybCgjbGluZWFyLWdyYWRpZW50LTExKTsKICAgICAgfQoKICAgICAgLmNscy0xNSB7CiAgICAgICAgZmlsbDogdXJsKCNsaW5lYXItZ3JhZGllbnQtNik7CiAgICAgIH0KCiAgICAgIC5jbHMtMTYgewogICAgICAgIGZpbGw6IHVybCgjbGluZWFyLWdyYWRpZW50KTsKICAgICAgfQoKICAgICAgLmNscy04IHsKICAgICAgICBmaWxsOiB1cmwoI2xpbmVhci1ncmFkaWVudC01KTsKICAgICAgfQoKICAgICAgLmNscy02IHsKICAgICAgICBmaWxsOiB1cmwoI2xpbmVhci1ncmFkaWVudC03KTsKICAgICAgfQogICAgPC9zdHlsZT4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0ibGluZWFyLWdyYWRpZW50IiB4MT0iLTIyMS4wOCIgeTE9Ii01NzEuNTMiIHgyPSI1NC40NiIgeTI9Ii01NzEuNTMiIGdyYWRpZW50VHJhbnNmb3JtPSJ0cmFuc2xhdGUoNTkuNjUgLTI1Ni43Nykgcm90YXRlKC0xOS40KSBzY2FsZSgxIC0xKSIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiM1NzI5ZWEiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjNDAxMGJiIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJsaW5lYXItZ3JhZGllbnQtMiIgeDE9Ii0yMjEuMDgiIHkxPSItNTcxLjUzIiB4Mj0iNTQuNDYiIHkyPSItNTcxLjUzIiBncmFkaWVudFRyYW5zZm9ybT0idHJhbnNsYXRlKDU5LjY1IC0yNTYuNzcpIHJvdGF0ZSgtMTkuNCkgc2NhbGUoMSAtMSkiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjNzU5NDAwIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzAwZTkyMCIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0ibGluZWFyLWdyYWRpZW50LTMiIHgxPSI0MC44NCIgeTE9IjM1NS43MSIgeDI9IjMwMC43MyIgeTI9IjI2NC4yIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzNiZTkwMCIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwMDNmMjAiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjODczM2ZmIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJsaW5lYXItZ3JhZGllbnQtNCIgeDE9Ii0xOTkuMjEiIHkxPSItNTg4LjIiIHgyPSItMTQuNzEiIHkyPSItNDAzLjciIGdyYWRpZW50VHJhbnNmb3JtPSJ0cmFuc2xhdGUoNTkuNjUgLTI1Ni43Nykgcm90YXRlKC0xOS40KSBzY2FsZSgxIC0xKSIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiM4NDJjZjAiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjMTE2YTAwIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzFjZmYwMCIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0ibGluZWFyLWdyYWRpZW50LTUiIHgxPSIxMy41NCIgeTE9IjMxMC4yNSIgeDI9IjI0MC45MiIgeTI9IjMxMC4yNSIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiMxNWJmMDAiIHN0b3Atb3BhY2l0eT0iMCIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM0Y2FhMDAiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImxpbmVhci1ncmFkaWVudC02IiB4MT0iMzUuNTYiIHkxPSItNjEzLjEzIiB4Mj0iLTIwMy44MiIgeTI9Ii0zODIuNDkiIGdyYWRpZW50VHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTguOTIgLTI2OS42NCkgcm90YXRlKC0xOS40KSBzY2FsZSgxIC0xKSIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiMzMDEwNzgiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjMjk5NDAwIiBzdG9wLW9wYWNpdHk9Ii45MyIvPgogICAgICA8c3RvcCBvZmZzZXQ9Ii4wMSIgc3RvcC1jb2xvcj0iIzI3OTYwMSIgc3RvcC1vcGFjaXR5PSIuOSIvPgogICAgICA8c3RvcCBvZmZzZXQ9Ii4xNyIgc3RvcC1jb2xvcj0iIzFiYWYxMyIgc3RvcC1vcGFjaXR5PSIuNjMiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIuMzIiIHN0b3AtY29sb3I9IiMxMWM0MjEiIHN0b3Atb3BhY2l0eT0iLjQiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIuNDgiIHN0b3AtY29sb3I9IiMwOWQ0MmMiIHN0b3Atb3BhY2l0eT0iLjIyIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iLjY0IiBzdG9wLWNvbG9yPSIjMDRkZjM0IiBzdG9wLW9wYWNpdHk9Ii4xIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iLjgxIiBzdG9wLWNvbG9yPSIjMDFlNjM5IiBzdG9wLW9wYWNpdHk9Ii4wMiIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwMGU5M2IiIHN0b3Atb3BhY2l0eT0iMCIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0ibGluZWFyLWdyYWRpZW50LTciIHgxPSItMTU2LjU4IiB5MT0iLTU0MS4wOSIgeDI9IjQ0Ljc2IiB5Mj0iLTU0MS4wOSIgZ3JhZGllbnRUcmFuc2Zvcm09InRyYW5zbGF0ZSgtOC45MiAtMjY5LjY0KSByb3RhdGUoLTE5LjQpIHNjYWxlKDEgLTEpIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzFhZTkwMCIgc3RvcC1vcGFjaXR5PSIwIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzFhZTgwMCIgc3RvcC1vcGFjaXR5PSIuMDIiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIuMDciIHN0b3AtY29sb3I9IiMyN2Q5MDAiIHN0b3Atb3BhY2l0eT0iLjI1Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iLjE0IiBzdG9wLWNvbG9yPSIjMzJjYzAwIiBzdG9wLW9wYWNpdHk9Ii40NSIvPgogICAgICA8c3RvcCBvZmZzZXQ9Ii4yMiIgc3RvcC1jb2xvcj0iIzNjYzEwMCIgc3RvcC1vcGFjaXR5PSIuNjIiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIuMzEiIHN0b3AtY29sb3I9IiM0M2I5MDAiIHN0b3Atb3BhY2l0eT0iLjc2Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iLjQxIiBzdG9wLWNvbG9yPSIjNDliMjAwIiBzdG9wLW9wYWNpdHk9Ii44NyIvPgogICAgICA8c3RvcCBvZmZzZXQ9Ii41MiIgc3RvcC1jb2xvcj0iIzRkYWQwMCIgc3RvcC1vcGFjaXR5PSIuOTQiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIuNjciIHN0b3AtY29sb3I9IiM1MGFhMDAiIHN0b3Atb3BhY2l0eT0iLjk5Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzUxYWEwMCIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0ibGluZWFyLWdyYWRpZW50LTgiIHgxPSItOTcwLjgyIiB5MT0iMzk3LjYxIiB4Mj0iLTY5NS4yOCIgeTI9IjM5Ny42MSIgZ3JhZGllbnRUcmFuc2Zvcm09InRyYW5zbGF0ZSgtNTg4LjY2IDkxLjY4KSByb3RhdGUoMTYwLjYpIHNjYWxlKDEgLTEpIiB4bGluazpocmVmPSIjbGluZWFyLWdyYWRpZW50Ii8+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImxpbmVhci1ncmFkaWVudC05IiB4MT0iLTk3MC44MiIgeTE9IjM5Ny42MSIgeDI9Ii02OTUuMjgiIHkyPSIzOTcuNjEiIGdyYWRpZW50VHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTU4OC42NiA5MS42OCkgcm90YXRlKDE2MC42KSBzY2FsZSgxIC0xKSIgeGxpbms6aHJlZj0iI2xpbmVhci1ncmFkaWVudC0yIi8+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImxpbmVhci1ncmFkaWVudC0xMCIgeDE9Ii05ODguMTciIHkxPSItMzA5LjM5IiB4Mj0iLTcyOC4yOCIgeTI9Ii00MDAuOSIgZ3JhZGllbnRUcmFuc2Zvcm09InRyYW5zbGF0ZSgtNTI5LjAxIC0xNjUuMSkgcm90YXRlKC0xODApIiB4bGluazpocmVmPSIjbGluZWFyLWdyYWRpZW50LTMiLz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0ibGluZWFyLWdyYWRpZW50LTExIiB4MT0iLTk0OC45NSIgeTE9IjM4MC45NCIgeDI9Ii03NjQuNDUiIHkyPSI1NjUuNDQiIGdyYWRpZW50VHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTU4OC42NiA5MS42OCkgcm90YXRlKDE2MC42KSBzY2FsZSgxIC0xKSIgeGxpbms6aHJlZj0iI2xpbmVhci1ncmFkaWVudC00Ii8+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImxpbmVhci1ncmFkaWVudC0xMiIgeDE9Ii0xMDE1LjQ2IiB5MT0iLTM1NC44NCIgeDI9Ii03ODguMDkiIHkyPSItMzU0Ljg0IiBncmFkaWVudFRyYW5zZm9ybT0idHJhbnNsYXRlKC01MjkuMDEgLTE2NS4xKSByb3RhdGUoLTE4MCkiIHhsaW5rOmhyZWY9IiNsaW5lYXItZ3JhZGllbnQtNSIvPgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJsaW5lYXItZ3JhZGllbnQtMTMiIHgxPSItNzE0LjE4IiB5MT0iMzU2LjAxIiB4Mj0iLTk1My41NiIgeTI9IjU4Ni42NCIgZ3JhZGllbnRUcmFuc2Zvcm09InRyYW5zbGF0ZSgtNTIwLjA5IDEwNC41NCkgcm90YXRlKDE2MC42KSBzY2FsZSgxIC0xKSIgeGxpbms6aHJlZj0iI2xpbmVhci1ncmFkaWVudC02Ii8+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImxpbmVhci1ncmFkaWVudC0xNCIgeDE9Ii05MDYuMzIiIHkxPSI0MjguMDUiIHgyPSItNzA0Ljk5IiB5Mj0iNDI4LjA1IiBncmFkaWVudFRyYW5zZm9ybT0idHJhbnNsYXRlKC01MjAuMDkgMTA0LjU0KSByb3RhdGUoMTYwLjYpIHNjYWxlKDEgLTEpIiB4bGluazpocmVmPSIjbGluZWFyLWdyYWRpZW50LTciLz4KICA8L2RlZnM+CiAgPGcgY2xhc3M9ImNscy0xMSI+CiAgICA8ZyBpZD0iTGF5ZXJfMSIgZGF0YS1uYW1lPSJMYXllciAxIj4KICAgICAgPGc+CiAgICAgICAgPGc+CiAgICAgICAgICA8cGF0aCBjbGFzcz0iY2xzLTE2IiBkPSJNMzE5LjY2LDMyMC42NGgwYy0xNy44NywzNi45LTQ5Ljc1LDY3LjAzLTkxLjQ5LDgxLjczLTgzLjk0LDI5LjU1LTE3NS45My0xNC41My0yMDUuNDgtOTguNDctNS45NS0xNi45LTguOTEtMzQuMTQtOS4xNS01MS4xMi4yMSwzLjc5LjYyLDcuNTcsMS4yNCwxMS4zMSwxLjA0LDYuNTMsMi43LDEzLDQuOTQsMTkuMzcsMjAuNCw1Ny45NCw4NC4xMiw4OC40OCwxNDIuMDUsNjguMDksMTUuMjMtNS4zNiwyOC43OC0xMy43LDQwLjI3LTI0LjguMDgtLjA3LjE2LS4xNC4yMy0uMjIuMTQtLjE0LjI3LS4yNy40Mi0uNDEuMjItLjIxLjQ0LS40Mi42Ni0uNjYsMTMuMTMtMTMuMDQsMjIuODQtMjkuMjcsMjguMTUtNDcuMDUuMDgtLjIyLjE0LS40NS4yMS0uNjcuMDItLjA0LjAyLS4wOC4wMy0uMTIuMDUtLjE4LjEtLjM4LjE2LS41Nmw0OS43NSwyMy44NCwxLjM5LjY3LDM3LjIsMTcuODNzLS40OSwxLjAzLS42LDEuMjVaIi8+CiAgICAgICAgICA8cGF0aCBjbGFzcz0iY2xzLTIiIGQ9Ik0zMTkuNjYsMzIwLjY0aDBjLTE3Ljg3LDM2LjktNDkuNzUsNjcuMDMtOTEuNDksODEuNzMtODMuOTQsMjkuNTUtMTc1LjkzLTE0LjUzLTIwNS40OC05OC40Ny01Ljk1LTE2LjktOC45MS0zNC4xNC05LjE1LTUxLjEyLjIxLDMuNzkuNjIsNy41NywxLjI0LDExLjMxLDEuMDQsNi41MywyLjcsMTMsNC45NCwxOS4zNywyMC40LDU3Ljk0LDg0LjEyLDg4LjQ4LDE0Mi4wNSw2OC4wOSwxNS4yMy01LjM2LDI4Ljc4LTEzLjcsNDAuMjctMjQuOC4wOC0uMDcuMTYtLjE0LjIzLS4yMi4xNC0uMTQuMjctLjI3LjQyLS40MS4yMi0uMjEuNDQtLjQyLjY2LS42NiwxMy4xMy0xMy4wNCwyMi44NC0yOS4yNywyOC4xNS00Ny4wNS4wOC0uMjIuMTQtLjQ1LjIxLS42Ny4wMi0uMDQuMDItLjA4LjAzLS4xMi4wNS0uMTguMS0uMzguMTYtLjU2bDQ5Ljc1LDIzLjg0LDEuMzkuNjcsMzcuMiwxNy44M3MtLjQ5LDEuMDMtLjYsMS4yNVoiLz4KICAgICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtMTAiIGQ9Ik0zMTkuNTYsMzIwLjY0aDBjLTE3Ljg3LDM2LjktNDkuNzUsNjcuMDMtOTEuNDksODEuNzMtODMuOTQsMjkuNTUtMTc1LjkzLTE0LjUzLTIwNS40OC05OC40Ny01Ljk1LTE2LjktOC45MS0zNC4xNC05LjE1LTUxLjEyLjIxLDMuNzkuNjIsNy41NywxLjI0LDExLjMxLDEuMDQsNi41MywyLjcsMTMsNC45NCwxOS4zNywyMC40LDU3Ljk0LDg0LjEyLDg4LjQ4LDE0Mi4wNSw2OC4wOSwxNS4yMy01LjM2LDI4Ljc4LTEzLjcsNDAuMjctMjQuOC4wOC0uMDcuMTYtLjE0LjIzLS4yMi4xNC0uMTQuMjctLjI3LjQyLS40MS4yMi0uMjEuNDQtLjQyLjY2LS42NiwxMy4xMy0xMy4wNCwyMi44NC0yOS4yNywyOC4xNS00Ny4wNS4wOC0uMjIuMTQtLjQ1LjIxLS42Ny4wMi0uMDQuMDItLjA4LjAzLS4xMi4wNS0uMTguMS0uMzguMTYtLjU2bDQ5Ljc1LDIzLjg0LDEuMzkuNjcsMzcuMiwxNy44M3MtLjQ5LDEuMDMtLjYsMS4yNVoiLz4KICAgICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtOSIgZD0iTTI0My4yNSwxMDguODdsLS42MSwxLjI4Yy0uMTktLjA3LS4zNy0uMTItLjU1LS4xOC0uMDQtLjAyLS4wOC0uMDItLjEyLS4wMy0uMjMtLjA3LS40Ni0uMTMtLjY4LS4xNy0yMS43My02LjA0LTQ0LjQ4LTUuMjYtNjUuODMsMi4yNi0xNC42Niw1LjE2LTI3Ljc0LDEzLjExLTM4LjksMjMuNjctLjIzLjItLjQ1LjQxLS42Ny42Mi0uMTUuMTMtLjI4LjI2LS40Mi40LS4wOC4wNy0uMTYuMTQtLjIzLjIzLTMwLjU5LDI5LjgyLTQxLjE5LDc1LjA3LTI3LjAxLDExNS4zNSwyLjc1LDcuODEsNi4zNCwxNS4yMiwxMC42OCwyMi4xNC45MSwxLjQ2LDEuODYsMi44OCwyLjg0LDQuMjgsMS40OSwyLjE0LDMuMDYsNC4yMiw0LjcxLDYuMjYsMCwuMDEuMDIuMDIuMDMuMDMsMy4wOSwzLjgzLDYuNDUsNy40NCw5Ljk4LDEwLjc2LjAzLjAzLjA3LjA3LjExLjEsMTYuMDIsMTMuMzcsMzguMTcsMTcuMzgsNTcuODEsMTAuNDcsNy40Ny0yLjYzLDE0LjIxLTYuNjUsMTkuOTQtMTEuNzcsNS41Ni00Ljk5LDEwLjE2LTExLjA0LDEzLjU3LTE3LjkyLjEtLjIxLjItLjQxLjMtLjYyLjEtLjIxLjItLjQxLjMtLjYybDEuMjUuNi45MS40NCwxLjI4LjYxYy0uMDUuMTgtLjEuMzgtLjE2LjU2LS4wMi4wNC0uMDIuMDgtLjAzLjEyLS4wNy4yMi0uMTIuNDQtLjIxLjY3LTUuMzEsMTcuNzgtMTUuMDMsMzQuMDEtMjguMTUsNDcuMDUtLjIxLjI0LS40My40NS0uNjYuNjYtLjE0LjE0LS4yNy4yNy0uNDIuNDEtLjA4LjA3LS4xNi4xNC0uMjMuMjItMTEuNDksMTEuMS0yNS4wNCwxOS40NC00MC4yNywyNC44LTU3Ljk0LDIwLjQtMTIxLjY2LTEwLjE1LTE0Mi4wNS02OC4wOS0yLjI0LTYuMzctMy45LTEyLjg0LTQuOTQtMTkuMzctLjYyLTMuNzUtMS4wNC03LjUzLTEuMjQtMTEuMzEtLjMxLTUuMjUtLjIzLTEwLjUyLjIzLTE1LjgyLjQtNC42MSwxLjA4LTkuMTYsMi4wNS0xMy42MS44NC00LjAxLDEuOTEtNy45NCwzLjE5LTExLjgsMTIuOTMtNTEuNyw1MS4wOS05NC40MiwxMDIuMzgtMTEyLjQ3LDQwLjIyLTE0LjE2LDgzLjUtMTEuOSwxMjEuOTgsNi4zNS4yMS4xLjQxLjIuNjIuMy4yMS4xLjQxLjIuNjIuM2wtMS4zNywyLjg1WiIvPgogICAgICAgICAgPHBhdGggY2xhc3M9ImNscy04IiBkPSJNMTYxLjc4LDM1MS41NGMxNS4yMy01LjM2LDI4Ljc4LTEzLjcsNDAuMjctMjQuOC4wOC0uMDcuMTYtLjE0LjIzLS4yMi4xNC0uMTQuMjctLjI3LjQyLS40MS4yMi0uMjEuNDQtLjQyLjY2LS42NiwxMy4xMy0xMy4wNCwyMi44NC0yOS4yNywyOC4xNS00Ny4wNS4wOC0uMjIuMTQtLjQ1LjIxLS42Ny4wMi0uMDQuMDItLjA4LjAzLS4xMi4wNS0uMTcuMS0uMzYuMTUtLjU0bC4xNS4wNCw4Ljg3LDQuMjVzLS4wMi4wNS0uMDIuMDdjLTUuNzcsMTkuMTYtMTYuMjgsMzYuNzMtMzAuNDMsNTAuODQtLjMuMzItLjYyLjY0LTEsMWwtLjY1LjYyYy0xMi40OCwxMi4wNS0yNy4yMSwyMS4xMS00My43NiwyNi45NC00OS40MSwxNy40LTEwMi42OS43NC0xMzQuMTItMzcuNjItMy4xMi02LjE4LTUuODktMTIuNjMtOC4yNS0xOS4zNC01Ljk1LTE2LjktOC45MS0zNC4xNC05LjE1LTUxLjEyLjIxLDMuNzkuNjIsNy41NywxLjI0LDExLjMxLDEuMDQsNi41MywyLjcsMTMsNC45NCwxOS4zNywyMC40LDU3Ljk0LDg0LjEyLDg4LjQ4LDE0Mi4wNSw2OC4wOVoiLz4KICAgICAgICAgIDxnIGNsYXNzPSJjbHMtNSI+CiAgICAgICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtMTUiIGQ9Ik00My4yLDIzNy43NGMuMTksMy41Ni41Niw3LjExLDEuMTYsMTAuNjUuNjMsMy45NSwxLjUzLDcuODgsMi42NywxMS43NywxLjMyLDQuNDcsMi45Myw4LjgsNC44NiwxMi45OSwxLjM4LDMuMDMsMi45Miw1Ljk4LDQuNjMsOC44NCwyLjkzLDUsNi4zNSw5Ljc1LDEwLjIxLDE0LjI0LDM1LjE0LDQwLjgxLDk2LjkzLDQ1LjQzLDEzNy43NCwxMC4yOSw4LjktNy42NywxNi4xOC0xNi42NiwyMS43NS0yNi43Ny4xOC0uMzIuMzctLjY1LjU1LS45Ny4yNC0uNDUuNDgtLjkxLjcxLTEuMzYuMTMtLjI2LjI3LS41MS40LS43Ny4xLS4yMS4yLS40MS4zLS42Mi4xLS4yMS4yLS40MS4zLS42MmwxLjI1LjYuOTEuNDQsMS4yOC42MWMtLjA1LjE4LS4xLjM4LS4xNi41Ni0uMDIuMDQtLjAyLjA4LS4wMy4xMi0uMDcuMjItLjEyLjQ0LS4yMS42Ny01LjMxLDE3Ljc4LTE1LjAzLDM0LjAxLTI4LjE1LDQ3LjA1LS4yMS4yNC0uNDMuNDUtLjY2LjY2LS4xNC4xNC0uMjcuMjctLjQyLjQxLS4wOC4wNy0uMTYuMTQtLjIzLjIyLTExLjQ5LDExLjEtMjUuMDQsMTkuNDQtNDAuMjcsMjQuOC01Ny45NCwyMC40LTEyMS42Ni0xMC4xNS0xNDIuMDUtNjguMDktMi4yNC02LjM3LTMuOS0xMi44NC00Ljk0LTE5LjM3LS42Mi0zLjc1LTEuMDQtNy41My0xLjI0LTExLjMxLS4zMS01LjI1LS4yMy0xMC41Mi4yMy0xNS44Mi40LTQuNjEsMS4wOC05LjE2LDIuMDUtMTMuNjEuODQtNC4wMSwxLjkxLTcuOTQsMy4xOS0xMS44LDEwLjA5LTQwLjM2LDM1LjU2LTc1LjI0LDcwLjY0LTk3LjE5LTM1LjI1LDMxLjExLTUyLjMyLDc3LjU5LTQ2LjQ2LDEyMy4zOFoiLz4KICAgICAgICAgIDwvZz4KICAgICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtNiIgZD0iTTI1Ljg0LDE5NC4zYy0xLjI4LDMuODUtMi4zNSw3Ljc5LTMuMTksMTEuOC0uOTYsNC40NS0xLjY0LDktMi4wNSwxMy42MS0uNDYsNS4zLS41NCwxMC41Ny0uMjMsMTUuODIuMjEsMy43OS42Miw3LjU3LDEuMjQsMTEuMzIsMS4wNCw2LjUzLDIuNywxMyw0Ljk0LDE5LjM3LDIwLjQsNTcuOTQsODQuMTIsODguNDgsMTQyLjA1LDY4LjA5LDE1LjIzLTUuMzYsMjguNzgtMTMuNyw0MC4yNy0yNC44LjA4LS4wNy4xNi0uMTQuMjMtLjIyLjE0LS4xNC4yNy0uMjcuNDItLjQxLjIyLS4yMS40NC0uNDIuNjYtLjY2LDguNzItOC42NiwxNS45Mi0xOC43NCwyMS4zNC0yOS43My01LjMzLDE3LjcyLTE1LjAyLDMzLjg4LTI4LjEsNDYuODgtLjIxLjI0LS40My40NS0uNjYuNjYtLjE0LjE0LS4yNy4yNy0uNDIuNDEtLjA4LjA3LS4xNi4xNC0uMjMuMjItMTEuNDksMTEuMS0yNS4wNCwxOS40NC00MC4yNywyNC44LTU3Ljk0LDIwLjQtMTIxLjY2LTEwLjE1LTE0Mi4wNS02OC4wOS0yLjI0LTYuMzctMy45LTEyLjg0LTQuOTQtMTkuMzctLjYyLTMuNzUtMS4wNC03LjUzLTEuMjQtMTEuMzItLjMxLTUuMjUtLjIyLTEwLjUyLjIzLTE1LjgyLjQtNC42MSwxLjA4LTkuMTYsMi4wNS0xMy42MS44NC00LjAxLDEuOTEtNy45NCwzLjE5LTExLjgsMi40Ni05Ljg0LDUuODQtMTkuMzUsMTAuMDUtMjguNDQtMS4yMiwzLjcxLTIuMzMsNy40Ny0zLjI5LDExLjI5WiIvPgogICAgICAgIDwvZz4KICAgICAgICA8Zz4KICAgICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtMTIiIGQ9Ik0xODAuMzQsMTc5LjM2aDBjMTcuODctMzYuOSw0OS43NS02Ny4wMyw5MS40OS04MS43Myw4My45NC0yOS41NSwxNzUuOTMsMTQuNTMsMjA1LjQ4LDk4LjQ3LDUuOTUsMTYuOSw4LjkxLDM0LjE0LDkuMTUsNTEuMTItLjIxLTMuNzktLjYyLTcuNTctMS4yNC0xMS4zMS0xLjA0LTYuNTMtMi43LTEzLTQuOTQtMTkuMzctMjAuNC01Ny45NC04NC4xMi04OC40OC0xNDIuMDUtNjguMDktMTUuMjMsNS4zNi0yOC43OCwxMy43LTQwLjI3LDI0LjgtLjA4LjA3LS4xNi4xNC0uMjMuMjItLjE0LjE0LS4yNy4yNy0uNDIuNDEtLjIyLjIxLS40NC40Mi0uNjYuNjYtMTMuMTMsMTMuMDQtMjIuODQsMjkuMjctMjguMTUsNDcuMDUtLjA4LjIyLS4xNC40NS0uMjEuNjctLjAyLjA0LS4wMi4wOC0uMDMuMTItLjA1LjE4LS4xLjM4LS4xNi41NmwtNDkuNzUtMjMuODQtMS4zOS0uNjctMzcuMi0xNy44M3MuNDktMS4wMy42LTEuMjVaIi8+CiAgICAgICAgICA8cGF0aCBjbGFzcz0iY2xzLTEzIiBkPSJNMTgwLjM0LDE3OS4zNmgwYzE3Ljg3LTM2LjksNDkuNzUtNjcuMDMsOTEuNDktODEuNzMsODMuOTQtMjkuNTUsMTc1LjkzLDE0LjUzLDIwNS40OCw5OC40Nyw1Ljk1LDE2LjksOC45MSwzNC4xNCw5LjE1LDUxLjEyLS4yMS0zLjc5LS42Mi03LjU3LTEuMjQtMTEuMzEtMS4wNC02LjUzLTIuNy0xMy00Ljk0LTE5LjM3LTIwLjQtNTcuOTQtODQuMTItODguNDgtMTQyLjA1LTY4LjA5LTE1LjIzLDUuMzYtMjguNzgsMTMuNy00MC4yNywyNC44LS4wOC4wNy0uMTYuMTQtLjIzLjIyLS4xNC4xNC0uMjcuMjctLjQyLjQxLS4yMi4yMS0uNDQuNDItLjY2LjY2LTEzLjEzLDEzLjA0LTIyLjg0LDI5LjI3LTI4LjE1LDQ3LjA1LS4wOC4yMi0uMTQuNDUtLjIxLjY3LS4wMi4wNC0uMDIuMDgtLjAzLjEyLS4wNS4xOC0uMS4zOC0uMTYuNTZsLTQ5Ljc1LTIzLjg0LTEuMzktLjY3LTM3LjItMTcuODNzLjQ5LTEuMDMuNi0xLjI1WiIvPgogICAgICAgICAgPHBhdGggY2xhc3M9ImNscy0zIiBkPSJNMTgwLjQ0LDE3OS4zNmgwYzE3Ljg3LTM2LjksNDkuNzUtNjcuMDMsOTEuNDktODEuNzMsODMuOTQtMjkuNTUsMTc1LjkzLDE0LjUzLDIwNS40OCw5OC40Nyw1Ljk1LDE2LjksOC45MSwzNC4xNCw5LjE1LDUxLjEyLS4yMS0zLjc5LS42Mi03LjU3LTEuMjQtMTEuMzEtMS4wNC02LjUzLTIuNy0xMy00Ljk0LTE5LjM3LTIwLjQtNTcuOTQtODQuMTItODguNDgtMTQyLjA1LTY4LjA5LTE1LjIzLDUuMzYtMjguNzgsMTMuNy00MC4yNywyNC44LS4wOC4wNy0uMTYuMTQtLjIzLjIyLS4xNC4xNC0uMjcuMjctLjQyLjQxLS4yMi4yMS0uNDQuNDItLjY2LjY2LTEzLjEzLDEzLjA0LTIyLjg0LDI5LjI3LTI4LjE1LDQ3LjA1LS4wOC4yMi0uMTQuNDUtLjIxLjY3LS4wMi4wNC0uMDIuMDgtLjAzLjEyLS4wNS4xOC0uMS4zOC0uMTYuNTZsLTQ5Ljc1LTIzLjg0LTEuMzktLjY3LTM3LjItMTcuODNzLjQ5LTEuMDMuNi0xLjI1WiIvPgogICAgICAgICAgPHBhdGggY2xhc3M9ImNscy0xNCIgZD0iTTI1Ni43NSwzOTEuMTNsLjYxLTEuMjhjLjE5LjA3LjM3LjEyLjU1LjE4LjA0LjAyLjA4LjAyLjEyLjAzLjIzLjA3LjQ2LjEzLjY4LjE3LDIxLjczLDYuMDQsNDQuNDgsNS4yNiw2NS44My0yLjI2LDE0LjY2LTUuMTYsMjcuNzQtMTMuMTEsMzguOS0yMy42Ny4yMy0uMi40NS0uNDEuNjctLjYyLjE1LS4xMy4yOC0uMjYuNDItLjQuMDgtLjA3LjE2LS4xNC4yMy0uMjMsMzAuNTktMjkuODIsNDEuMTktNzUuMDcsMjcuMDEtMTE1LjM1LTIuNzUtNy44MS02LjM0LTE1LjIyLTEwLjY4LTIyLjE0LS45MS0xLjQ2LTEuODYtMi44OC0yLjg0LTQuMjgtMS40OS0yLjE0LTMuMDYtNC4yMi00LjcxLTYuMjYsMC0uMDEtLjAyLS4wMi0uMDMtLjAzLTMuMDktMy44My02LjQ1LTcuNDQtOS45OC0xMC43Ni0uMDMtLjAzLS4wNy0uMDctLjExLS4xLTE2LjAyLTEzLjM3LTM4LjE3LTE3LjM4LTU3LjgxLTEwLjQ3LTcuNDcsMi42My0xNC4yMSw2LjY1LTE5Ljk0LDExLjc3LTUuNTYsNC45OS0xMC4xNiwxMS4wNC0xMy41NywxNy45Mi0uMS4yMS0uMi40MS0uMy42Mi0uMS4yMS0uMi40MS0uMy42MmwtMS4yNS0uNi0uOTEtLjQ0LTEuMjgtLjYxYy4wNS0uMTguMS0uMzguMTYtLjU2LjAyLS4wNC4wMi0uMDguMDMtLjEyLjA3LS4yMi4xMi0uNDQuMjEtLjY3LDUuMzEtMTcuNzgsMTUuMDMtMzQuMDEsMjguMTUtNDcuMDUuMjEtLjI0LjQzLS40NS42Ni0uNjYuMTQtLjE0LjI3LS4yNy40Mi0uNDEuMDgtLjA3LjE2LS4xNC4yMy0uMjIsMTEuNDktMTEuMSwyNS4wNC0xOS40NCw0MC4yNy0yNC44LDU3Ljk0LTIwLjQsMTIxLjY2LDEwLjE1LDE0Mi4wNSw2OC4wOSwyLjI0LDYuMzcsMy45LDEyLjg0LDQuOTQsMTkuMzcuNjIsMy43NSwxLjA0LDcuNTMsMS4yNCwxMS4zMS4zMSw1LjI1LjIzLDEwLjUyLS4yMywxNS44Mi0uNCw0LjYxLTEuMDgsOS4xNi0yLjA1LDEzLjYxLS44NCw0LjAxLTEuOTEsNy45NC0zLjE5LDExLjgtMTIuOTMsNTEuNy01MS4wOSw5NC40Mi0xMDIuMzgsMTEyLjQ3LTQwLjIyLDE0LjE2LTgzLjUsMTEuOS0xMjEuOTgtNi4zNS0uMjEtLjEtLjQxLS4yLS42Mi0uMy0uMjEtLjEtLjQxLS4yLS42Mi0uM2wxLjM3LTIuODVaIi8+CiAgICAgICAgICA8cGF0aCBjbGFzcz0iY2xzLTciIGQ9Ik0zMzguMjIsMTQ4LjQ2Yy0xNS4yMyw1LjM2LTI4Ljc4LDEzLjctNDAuMjcsMjQuOC0uMDguMDctLjE2LjE0LS4yMy4yMi0uMTQuMTQtLjI3LjI3LS40Mi40MS0uMjIuMjEtLjQ0LjQyLS42Ni42Ni0xMy4xMywxMy4wNC0yMi44NCwyOS4yNy0yOC4xNSw0Ny4wNS0uMDguMjItLjE0LjQ1LS4yMS42Ny0uMDIuMDQtLjAyLjA4LS4wMy4xMi0uMDUuMTctLjEuMzYtLjE1LjU0bC0uMTUtLjA0LTguODctNC4yNXMuMDItLjA1LjAyLS4wN2M1Ljc3LTE5LjE2LDE2LjI4LTM2LjczLDMwLjQzLTUwLjg0LjMtLjMyLjYyLS42NCwxLTFsLjY1LS42MmMxMi40OC0xMi4wNSwyNy4yMS0yMS4xMSw0My43Ni0yNi45NCw0OS40MS0xNy40LDEwMi42OS0uNzQsMTM0LjEyLDM3LjYyLDMuMTIsNi4xOCw1Ljg5LDEyLjYzLDguMjUsMTkuMzQsNS45NSwxNi45LDguOTEsMzQuMTQsOS4xNSw1MS4xMi0uMjEtMy43OS0uNjItNy41Ny0xLjI0LTExLjMxLTEuMDQtNi41My0yLjctMTMtNC45NC0xOS4zNy0yMC40LTU3Ljk0LTg0LjEyLTg4LjQ4LTE0Mi4wNS02OC4wOVoiLz4KICAgICAgICAgIDxnIGNsYXNzPSJjbHMtNSI+CiAgICAgICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTQ1Ni44LDI2Mi4yNmMtLjE5LTMuNTYtLjU2LTcuMTEtMS4xNi0xMC42NS0uNjMtMy45NS0xLjUzLTcuODgtMi42Ny0xMS43Ny0xLjMyLTQuNDctMi45My04LjgtNC44Ni0xMi45OS0xLjM4LTMuMDMtMi45Mi01Ljk4LTQuNjMtOC44NC0yLjkzLTUtNi4zNS05Ljc1LTEwLjIxLTE0LjI0LTM1LjE0LTQwLjgxLTk2LjkzLTQ1LjQzLTEzNy43NC0xMC4yOS04LjksNy42Ny0xNi4xOCwxNi42Ni0yMS43NSwyNi43Ny0uMTguMzItLjM3LjY1LS41NS45Ny0uMjQuNDUtLjQ4LjkxLS43MSwxLjM2LS4xMy4yNi0uMjcuNTEtLjQuNzctLjEuMjEtLjIuNDEtLjMuNjItLjEuMjEtLjIuNDEtLjMuNjJsLTEuMjUtLjYtLjkxLS40NC0xLjI4LS42MWMuMDUtLjE4LjEtLjM4LjE2LS41Ni4wMi0uMDQuMDItLjA4LjAzLS4xMi4wNy0uMjIuMTItLjQ0LjIxLS42Nyw1LjMxLTE3Ljc4LDE1LjAzLTM0LjAxLDI4LjE1LTQ3LjA1LjIxLS4yNC40My0uNDUuNjYtLjY2LjE0LS4xNC4yNy0uMjcuNDItLjQxLjA4LS4wNy4xNi0uMTQuMjMtLjIyLDExLjQ5LTExLjEsMjUuMDQtMTkuNDQsNDAuMjctMjQuOCw1Ny45NC0yMC40LDEyMS42NiwxMC4xNSwxNDIuMDUsNjguMDksMi4yNCw2LjM3LDMuOSwxMi44NCw0Ljk0LDE5LjM3LjYyLDMuNzUsMS4wNCw3LjUzLDEuMjQsMTEuMzEuMzEsNS4yNS4yMywxMC41Mi0uMjMsMTUuODItLjQsNC42MS0xLjA4LDkuMTYtMi4wNSwxMy42MS0uODQsNC4wMS0xLjkxLDcuOTQtMy4xOSwxMS44LTEwLjA5LDQwLjM2LTM1LjU2LDc1LjI0LTcwLjY0LDk3LjE5LDM1LjI1LTMxLjExLDUyLjMyLTc3LjU5LDQ2LjQ2LTEyMy4zOFoiLz4KICAgICAgICAgIDwvZz4KICAgICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtNCIgZD0iTTQ3NC4xNiwzMDUuN2MxLjI4LTMuODUsMi4zNS03Ljc5LDMuMTktMTEuOC45Ni00LjQ1LDEuNjQtOSwyLjA1LTEzLjYxLjQ2LTUuMy41NC0xMC41Ny4yMy0xNS44Mi0uMjEtMy43OS0uNjItNy41Ny0xLjI0LTExLjMyLTEuMDQtNi41My0yLjctMTMtNC45NC0xOS4zNy0yMC40LTU3Ljk0LTg0LjEyLTg4LjQ4LTE0Mi4wNS02OC4wOS0xNS4yMyw1LjM2LTI4Ljc4LDEzLjctNDAuMjcsMjQuOC0uMDguMDctLjE2LjE0LS4yMy4yMi0uMTQuMTQtLjI3LjI3LS40Mi40MS0uMjIuMjEtLjQ0LjQyLS42Ni42Ni04LjcyLDguNjYtMTUuOTIsMTguNzQtMjEuMzQsMjkuNzMsNS4zMy0xNy43MiwxNS4wMi0zMy44OCwyOC4xLTQ2Ljg4LjIxLS4yNC40My0uNDUuNjYtLjY2LjE0LS4xNC4yNy0uMjcuNDItLjQxLjA4LS4wNy4xNi0uMTQuMjMtLjIyLDExLjQ5LTExLjEsMjUuMDQtMTkuNDQsNDAuMjctMjQuOCw1Ny45NC0yMC40LDEyMS42NiwxMC4xNSwxNDIuMDUsNjguMDksMi4yNCw2LjM3LDMuOSwxMi44NCw0Ljk0LDE5LjM3LjYyLDMuNzUsMS4wNCw3LjUzLDEuMjQsMTEuMzIuMzEsNS4yNS4yMiwxMC41Mi0uMjMsMTUuODItLjQsNC42MS0xLjA4LDkuMTYtMi4wNSwxMy42MS0uODQsNC4wMS0xLjkxLDcuOTQtMy4xOSwxMS44LTIuNDYsOS44NC01Ljg0LDE5LjM1LTEwLjA1LDI4LjQ0LDEuMjItMy43MSwyLjMzLTcuNDcsMy4yOS0xMS4yOVoiLz4KICAgICAgICA8L2c+CiAgICAgIDwvZz4KICAgIDwvZz4KICA8L2c+Cjwvc3ZnPg==';
    supportedTransactionVersions: ReadonlySet<TransactionVersion> = new Set(['legacy', 0]);

    private _connecting: boolean;
    private _wallet: BBAWallet | null;
    private _publicKey: PublicKey | null;
    private _readyState: WalletReadyState =
        typeof window === 'undefined' || typeof document === 'undefined'
            ? WalletReadyState.Unsupported
            : WalletReadyState.NotDetected;

    constructor(config: BBAWalletAdapterConfig = {}) {
        super();
        this._connecting = false;
        this._wallet = null;
        this._publicKey = null;

        if (this._readyState !== WalletReadyState.Unsupported) {
            if (isIosAndRedirectable()) {
                // when in iOS (not webview), set BBA Wallet as loadable instead of checking for install
                this._readyState = WalletReadyState.Loadable;
                this.emit('readyStateChange', this._readyState);
            } else {
                scopePollingDetectionStrategy(() => {
                    if (window.bbawallet?.bbachain?.isBBAWallet || window.bbachain?.isBBAWallet) {
                        this._readyState = WalletReadyState.Installed;
                        this.emit('readyStateChange', this._readyState);
                        return true;
                    }
                    return false;
                });
            }
        }
    }

    get publicKey() {
        return this._publicKey;
    }

    get connecting() {
        return this._connecting;
    }

    get readyState() {
        return this._readyState;
    }

    async autoConnect(): Promise<void> {
        // Skip autoconnect in the Loadable state
        // We can't redirect to a universal link without user input
        if (this.readyState === WalletReadyState.Installed) {
            await this.connect();
        }
    }

    async connect(): Promise<void> {
        try {
            if (this.connected || this.connecting) return;

            if (this.readyState === WalletReadyState.Loadable) {
                // redirect to the BBA Wallet /browse universal link
                // this will open the current URL in the BBA Wallet in-wallet browser
                const url = encodeURIComponent(window.location.href);
                const ref = encodeURIComponent(window.location.origin);
                window.location.href = `https://wallet.bbachain.com/ul/browse/${url}?ref=${ref}`;
                return;
            }

            if (this.readyState !== WalletReadyState.Installed) throw new WalletNotReadyError();

            this._connecting = true;

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const wallet = window.bbawallet?.bbachain || window.bbachain!;

            if (!wallet.isConnected) {
                try {
                    await wallet.connect();
                } catch (error: any) {
                    throw new WalletConnectionError(error?.message, error);
                }
            }

            if (!wallet.publicKey) throw new WalletAccountError();

            let publicKey: PublicKey;
            try {
                publicKey = new PublicKey(wallet.publicKey.toBytes());
            } catch (error: any) {
                throw new WalletPublicKeyError(error?.message, error);
            }

            wallet.on('disconnect', this._disconnected);
            wallet.on('accountChanged', this._accountChanged);

            this._wallet = wallet;
            this._publicKey = publicKey;

            this.emit('connect', publicKey);
        } catch (error: any) {
            this.emit('error', error);
            throw error;
        } finally {
            this._connecting = false;
        }
    }

    async disconnect(): Promise<void> {
        const wallet = this._wallet;
        if (wallet) {
            wallet.off('disconnect', this._disconnected);
            wallet.off('accountChanged', this._accountChanged);

            this._wallet = null;
            this._publicKey = null;

            try {
                await wallet.disconnect();
            } catch (error: any) {
                this.emit('error', new WalletDisconnectionError(error?.message, error));
            }
        }

        this.emit('disconnect');
    }

    async sendTransaction<T extends Transaction | VersionedTransaction>(
        transaction: T,
        connection: Connection,
        options: SendTransactionOptions = {}
    ): Promise<TransactionSignature> {
        try {
            const wallet = this._wallet;
            if (!wallet) throw new WalletNotConnectedError();

            try {
                const { signers, ...sendOptions } = options;

                if (isVersionedTransaction(transaction)) {
                    signers?.length && transaction.sign(signers);
                } else {
                    transaction = (await this.prepareTransaction(transaction, connection, sendOptions)) as T;
                    signers?.length && (transaction as Transaction).partialSign(...signers);
                }

                sendOptions.preflightCommitment = sendOptions.preflightCommitment || connection.commitment;

                const { signature } = await wallet.signAndSendTransaction(transaction, sendOptions);
                return signature;
            } catch (error: any) {
                if (error instanceof WalletError) throw error;
                throw new WalletSendTransactionError(error?.message, error);
            }
        } catch (error: any) {
            this.emit('error', error);
            throw error;
        }
    }

    async signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T> {
        try {
            const wallet = this._wallet;
            if (!wallet) throw new WalletNotConnectedError();

            try {
                return (await wallet.signTransaction(transaction)) || transaction;
            } catch (error: any) {
                throw new WalletSignTransactionError(error?.message, error);
            }
        } catch (error: any) {
            this.emit('error', error);
            throw error;
        }
    }

    async signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]> {
        try {
            const wallet = this._wallet;
            if (!wallet) throw new WalletNotConnectedError();

            try {
                return (await wallet.signAllTransactions(transactions)) || transactions;
            } catch (error: any) {
                throw new WalletSignTransactionError(error?.message, error);
            }
        } catch (error: any) {
            this.emit('error', error);
            throw error;
        }
    }

    async signMessage(message: Uint8Array): Promise<Uint8Array> {
        try {
            const wallet = this._wallet;
            if (!wallet) throw new WalletNotConnectedError();

            try {
                const { signature } = await wallet.signMessage(message);
                return signature;
            } catch (error: any) {
                throw new WalletSignMessageError(error?.message, error);
            }
        } catch (error: any) {
            this.emit('error', error);
            throw error;
        }
    }

    private _disconnected = () => {
        const wallet = this._wallet;
        if (wallet) {
            wallet.off('disconnect', this._disconnected);
            wallet.off('accountChanged', this._accountChanged);

            this._wallet = null;
            this._publicKey = null;

            this.emit('error', new WalletDisconnectedError());
            this.emit('disconnect');
        }
    };

    private _accountChanged = (newPublicKey: PublicKey) => {
        const publicKey = this._publicKey;
        if (!publicKey) return;

        try {
            newPublicKey = new PublicKey(newPublicKey.toBytes());
        } catch (error: any) {
            this.emit('error', new WalletPublicKeyError(error?.message, error));
            return;
        }

        if (publicKey.equals(newPublicKey)) return;

        this._publicKey = newPublicKey;
        this.emit('connect', newPublicKey);
    };
}
