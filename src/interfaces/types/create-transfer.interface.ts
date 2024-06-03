import type { PublicKey } from '@solana/web3.js';
import type BigNumber from 'bignumber.js';

export type Recipient = PublicKey;
export type Amount = BigNumber;
export type SPLToken = PublicKey;
export type Reference = PublicKey;
export type References = Reference | Reference[];
export type Label = string;
export type Message = string;
export type Memo = string;
export type Link = URL;

export interface CreateTransferFields {
    recipient: Recipient;
    amount: Amount;
    splToken?: SPLToken;
    reference?: References;
    memo?: Memo;
}