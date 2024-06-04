import { Connection, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { ISerializedTxRes, MakeTransactionInputData, SolanaCommitments } from "./solana-pay-button.interface";
import axios from 'axios';
import { getMint, getAssociatedTokenAddress, createTransferCheckedInstruction, getAccount } from "@solana/spl-token";
import { smartContracts } from "../../interfaces/constants/smart-contracts.constants";
import { CreateTransferError } from "@solana/pay";
import BigNumber from "bignumber.js";
import { TEN } from "../../interfaces/constants/create-transfer.constants";
import { Buffer } from 'buffer';


export const buildSerializedTransaction = async (payload: { addresses: {account: string; destinationAddress: string}, amount: number; reference: string; memo: string, connection: Connection }) => {
  const { account } = payload.addresses as MakeTransactionInputData;
  const payer = new PublicKey(account);
  const recipient = new PublicKey(payload.addresses.destinationAddress);
  const usdcAddress = new PublicKey(smartContracts.USDC);

  const usdcTransferInstruction = await createSPLTokenInstruction(
    recipient,
    new BigNumber(payload.amount),
    usdcAddress,
    payer,
    payload.connection
  );

   // Add the reference to the instruction as a key
  // This will mean this transaction is returned when we query for the reference
  usdcTransferInstruction.keys.push({
    pubkey: new PublicKey(payload.reference),
    isSigner: false,
    isWritable: false,
  });

  const transaction = new Transaction();
  transaction.feePayer = payer;
  transaction.recentBlockhash = (await payload.connection.getLatestBlockhash(SolanaCommitments.Finalized)).blockhash;

  // Create memo instruction
  const memoInstruction = createMemoInstruction(payload.memo, [payer]);
  // Add memo instruction to the transaction
  transaction.add(memoInstruction);

  // Add usdc transfer instruction to the transaction
  transaction.add(usdcTransferInstruction);

  // Serialize the transaction and convert to base64 to return it
  const serializedTransaction = transaction.serialize({
    requireAllSignatures: false,
  });
  return serializedTransaction.toString('base64');
};

async function createSPLTokenInstruction(
  recipient: PublicKey,
  amount: BigNumber,
  splToken: PublicKey,
  sender: PublicKey,
  connection: Connection
): Promise<TransactionInstruction> {
  // Check that the token provided is an initialized mint
  const mint = await getMint(connection, splToken);
  if (!mint.isInitialized) throw new CreateTransferError('mint not initialized');

  // Check that the amount provided doesn't have greater precision than the mint
  if ((amount.decimalPlaces() ?? 0) > mint.decimals) throw new CreateTransferError('amount decimals invalid');

  // Convert input decimal amount to integer tokens according to the mint decimals
  amount = amount.times(TEN.pow(mint.decimals)).integerValue(BigNumber.ROUND_FLOOR);

  // Get the sender's ATA and check that the account exists and can send tokens
  const senderATA = await getAssociatedTokenAddress(splToken, sender);
  const senderAccount = await getAccount(connection, senderATA);
  if (!senderAccount.isInitialized) throw new CreateTransferError('sender not initialized');
  if (senderAccount.isFrozen) throw new CreateTransferError('sender frozen');

  // Get the recipient's ATA and check that the account exists and can receive tokens
  const recipientATA = await getAssociatedTokenAddress(splToken, recipient);
  const recipientAccount = await getAccount(connection, recipientATA);
  if (!recipientAccount.isInitialized) throw new CreateTransferError('recipient not initialized');
  if (recipientAccount.isFrozen) throw new CreateTransferError('recipient frozen');

  // Check that the sender has enough tokens
  const tokens = BigInt(String(amount));
  if (tokens > senderAccount.amount) throw new CreateTransferError('insufficient funds');

  // Create an instruction to transfer SPL tokens, asserting the mint and decimals match
  return createTransferCheckedInstruction(senderATA, splToken, recipientATA, sender, tokens, mint.decimals);
}

const createMemoInstruction = (memo: string, signer: Array<PublicKey>) =>{
  const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
  const keys =
        signer == null
            ? []
            : signer.map(function (key) {
                  return { pubkey: key, isSigner: true, isWritable: false };
              });

  return new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: keys,
    data: Buffer.from(memo, 'utf8'),
})
}

// no longer in use
export const getSerializedTx = async (payload: {reference: string, amount: number, account: string, memo: string}) =>{
  const url = `https://ramp.scalex.africa/solana-pay?amount=${payload.amount}&reference=${payload.reference}&memo=${payload.memo}`;

  try {
    const response = await axios.post(url, {
      account: payload.account
  });

    console.log({response})

    if (response.status === 200) {
      const data: ISerializedTxRes = await response.data;
      console.log('Success:', data  );
      alert('Transaction successful!');
      return data?.transaction;
    } else {
      console.error('Error:', response.statusText);
      alert('Transaction failed.');
      return null;
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to execute transaction.');
    return null;
  }
}

// no longer in use
export const extractDataFromSolanaTxRequest = (uri: string) =>{
    const decodedUrl = decodeURIComponent(uri);
    const urlWithoutPrefix = decodedUrl.replace('solana:', '');

    const url = new URL(urlWithoutPrefix);
    const searchParams = new URLSearchParams(url.search);

    console.log({searchParams})
    const amount = searchParams.get('amount')?.split('?')[0];
    const message = searchParams.get('message');
    const reference = searchParams.get('reference');
    const label = searchParams.get('amount')?.split('?')[1];

    return {
        reference,
        amount,
        label,
        message,
    }
}