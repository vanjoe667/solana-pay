import { useCallback, useEffect, useRef } from 'react';
import './solana-pay-button.style.css';
import logo from '../../assets/images/solana-logo.svg';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { SolanaConfig } from './solana-pay-button.interface';
import { Connection, Transaction } from '@solana/web3.js'
import { createQR } from '@solana/pay';
import { buildSerializedTransaction, getSerializedTx } from './solana-pay-button.helpers';
import { testRecipient } from '../../interfaces/constants/mock-up.constants';
import '@solana/wallet-adapter-react-ui/styles.css';
import { Buffer } from 'buffer';
const { REACT_APP_RPC_API_KEY } = process.env

const SolanaPayButton = () => {
  const qrRef = useRef<HTMLDivElement>(null);
  const solanaUrl = 'solana:https%3A%2F%2Framp.scalex.africa%2Fsolana-pay%3Freference%3DGDBJSc2MmwoAQRRURxUobu665PJb3scq4QYxHnJNwsAC%26amount%3D12?label=Solana+Pay&message=Thanks+for+your+purchase%21+%F0%9F%8D%AA';

  const { wallet, publicKey, signTransaction } = useWallet();
  const rpcEndpoint = `https://rpc.shyft.to?api_key=${REACT_APP_RPC_API_KEY}`

  useEffect(() =>{
    const qr = createQR(solanaUrl, 512, 'azure');
    if (qrRef.current) {
      qrRef.current.innerHTML = '';
      qr.append(qrRef.current);
    }
    console.log({wallet, publicKey})
  },[solanaUrl, wallet, publicKey])


  
  const fetchAndSignTransaction = useCallback(async () => {
    if (!wallet || !publicKey) {
      alert('Please connect your wallet first.');
      return;
    }
    
    const connection = new Connection(rpcEndpoint, SolanaConfig.commitment);

    try {
      const serializedTransaction = await buildSerializedTransaction({
        addresses: {
          account: publicKey.toBase58(),
          destinationAddress: testRecipient.recipient
        },
        amount: testRecipient.amount,
        reference: testRecipient.reference,
        memo: testRecipient.memo,
        connection
      });


      console.log({serializedTransaction})
      if (!serializedTransaction) {
        alert('Error getting serialized tx');
        return;
      }

      const transaction = Transaction.from(Buffer.from(serializedTransaction, 'base64'));
      if (!signTransaction) {
        alert('Wallet does not support transaction signing.');
        return;
      }

      const signedTransaction = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());

      const latestBlockHash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        signature,
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      });
      alert(`Transaction successful with signature: ${signature}`);
    } catch (error) {
      console.error('Error fetching or signing transaction:', error);
      alert('Failed to complete transaction.');
    } finally {
      console.log('some error')
    }
  }, [wallet, publicKey, signTransaction, rpcEndpoint]);


  return (
      <div className="solana-pay-button-container">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <div ref={qrRef} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'left', gap: '10px', marginLeft: '15px' }}>
          <WalletMultiButton />
          <button className="solana-pay-button" onClick={fetchAndSignTransaction}>
            <img src={logo} className="solana-pay-logo" alt="logo" />
            Pay
          </button>
        </div>
      </div>
  );
};

export default SolanaPayButton;