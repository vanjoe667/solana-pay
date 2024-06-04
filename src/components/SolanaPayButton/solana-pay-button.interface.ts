export interface ISolanaPayButtonProps {
    recipient: string,
    amount: number,
    name: string
}

export interface ISerializedTxRes {
    transaction: string,
    message?: string
}

export enum SolanaClusters {
    Devnet = 'devnet',
    Testnet = 'testnet',
    Mainnet = 'mainnet-beta',
  }
  
export enum SolanaCommitments {
    Confirmed = 'confirmed',
    Finalized = 'finalized',
  }
  
export const SolanaConfig: {
    cluster: SolanaClusters;
    commitment: SolanaCommitments;
} = {
    cluster: SolanaClusters.Mainnet,
    commitment: SolanaCommitments.Confirmed,
};

export type MakeTransactionInputData = {
    account: string;
};