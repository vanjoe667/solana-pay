import { useCallback, useEffect, useRef, useState } from 'react';
import './solana-pay-button.style.css';
import logo from '../../assets/images/solana-logo.svg';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { SolanaConfig } from './solana-pay-button.interface';
import { clusterApiUrl, Connection, Transaction } from '@solana/web3.js'
import { createQR } from '@solana/pay';
import { extractDataFromSolanaTxRequest, getSerializedTx } from './solana-pay-button.helpers';
import { testRecipient } from '../../interfaces/constants/mock-up.constants';
import '@solana/wallet-adapter-react-ui/styles.css';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

const SolanaPayButton = () => {
  const qrRef = useRef<HTMLDivElement>(null);
  const solanaUrl = 'solana:https%3A%2F%2Framp.scalex.africa%2Fsolana-pay%3Freference%3D3SJQCfmAjgmr6MspES2pBZwQJ9y57A8kws3FYsdg8chu%26amount%3D12?label=Solana+Pay&message=Thanks+for+your+purchase%21+%F0%9F%8D%AA';

  const [loading, setLoading] = useState(false);
  const { wallet, publicKey, signTransaction } = useWallet();
  const network = clusterApiUrl(WalletAdapterNetwork.Mainnet);

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
    
    const connection = new Connection(network, SolanaConfig.commitment);
    setLoading(true);

    try {
      const parseSolanaPayUri = extractDataFromSolanaTxRequest(solanaUrl);
      console.error({parseSolanaPayUri});

      const serializedTransaction = await getSerializedTx({
        reference: testRecipient.reference,
        amount: testRecipient.amount,
        account: publicKey.toBase58()
      })

      console.log({serializedTransaction})
      if (!serializedTransaction) {
        alert('Error getting serialized tx');
        return;
      }

      const bytes = Uint8Array.from(atob(serializedTransaction), c => c.charCodeAt(0));
      const transaction = Transaction.from(bytes);
      if (!signTransaction) {
        alert('Wallet does not support transaction signing.');
        return;
      }

      const signedTransaction = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());

      console.log({signedTransaction, signature})
      const latestBlockHash = await connection.getLatestBlockhash();
      console.log({latestBlockHash})
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
      setLoading(false);
      console.log('some error')
    }
  }, [wallet, publicKey, signTransaction]);


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