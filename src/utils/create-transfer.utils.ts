import { createTransferCheckedInstruction, getAccount, getAssociatedTokenAddress, getMint } from '@solana/spl-token';
import type { Commitment, Connection, PublicKey } from '@solana/web3.js';
import { LAMPORTS_PER_SOL, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import BigNumber from 'bignumber.js';
import { MEMO_PROGRAM_ID, SOL_DECIMALS, TEN } from '../interfaces/constants/create-transfer.constants';
import { CreateTransferFields } from '../interfaces/types/create-transfer.interface.js';

export class CreateTransferError extends Error {
    name = 'CreateTransferError';
}

export async function createTransfer(
    connection: Connection,
    sender: PublicKey,
    { recipient, amount, splToken, reference, memo }: CreateTransferFields,
    { commitment }: { commitment?: Commitment } = {}
){
    // Check that the sender and recipient accounts exist
    const senderInfo = await connection.getAccountInfo(sender);
    if (!senderInfo) throw new CreateTransferError('sender not found');

    const recipientInfo = await connection.getAccountInfo(recipient);
    if (!recipientInfo) throw new CreateTransferError('recipient not found');

    // A native SOL or SPL token transfer instruction
    const instruction = splToken
        ? await createSPLTokenInstruction(recipient, amount, splToken, sender, connection)
        : await createSystemInstruction(recipient, amount, sender, connection);

    // If reference accounts are provided, add them to the transfer instruction
    if (reference) {
        if (!Array.isArray(reference)) {
            reference = [reference];
        }

        for (const pubkey of reference) {
            instruction.keys.push({ pubkey, isWritable: false, isSigner: false });
        }
    }

    // Create the transaction
    const transaction = new Transaction();
    transaction.feePayer = sender;
    transaction.recentBlockhash = (await connection.getLatestBlockhash(commitment)).blockhash;

    // If a memo is provided, add it to the transaction before adding the transfer instruction
    if (memo) {
        transaction.add(
            new TransactionInstruction({
                programId: MEMO_PROGRAM_ID,
                keys: [],
                data: Buffer.from(memo, 'utf8'),
            })
        );
    }

    // Add the transfer instruction to the transaction
    transaction.add(instruction);

    const serializedTransaction = transaction.serialize({
        // We will need the buyer to sign this transaction after it's returned to them
        requireAllSignatures: false
      })
    return serializedTransaction.toString('base64')
}

async function createSystemInstruction(
    recipient: PublicKey,
    amount: BigNumber,
    sender: PublicKey,
    connection: Connection
): Promise<TransactionInstruction> {
    // Check that the sender and recipient accounts exist
    const senderInfo = await connection.getAccountInfo(sender);
    if (!senderInfo) throw new CreateTransferError('sender not found');

    const recipientInfo = await connection.getAccountInfo(recipient);
    if (!recipientInfo) throw new CreateTransferError('recipient not found');

    // Check that the sender and recipient are valid native accounts
    if (!senderInfo.owner.equals(SystemProgram.programId)) throw new CreateTransferError('sender owner invalid');
    if (senderInfo.executable) throw new CreateTransferError('sender executable');
    if (!recipientInfo.owner.equals(SystemProgram.programId)) throw new CreateTransferError('recipient owner invalid');
    if (recipientInfo.executable) throw new CreateTransferError('recipient executable');

    // Check that the amount provided doesn't have greater precision than SOL
    if ((amount.decimalPlaces() ?? 0) > SOL_DECIMALS) throw new CreateTransferError('amount decimals invalid');

    // Convert input decimal amount to integer lamports
    amount = amount.times(LAMPORTS_PER_SOL).integerValue(BigNumber.ROUND_FLOOR);

    // Check that the sender has enough lamports
    const lamports = amount.toNumber();
    if (lamports > senderInfo.lamports) throw new CreateTransferError('insufficient funds');

    // Create an instruction to transfer native SOL
    return SystemProgram.transfer({
        fromPubkey: sender,
        toPubkey: recipient,
        lamports,
    });
}

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