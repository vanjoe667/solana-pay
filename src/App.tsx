import React, { useMemo } from 'react';
import SolanaPayButton from './components/SolanaPayButton/solana-pay-button.component';
import { ISolanaPayButtonProps, SolanaConfig } from './components/SolanaPayButton/solana-pay-button.interface';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

function App() {
  const mockUpData: ISolanaPayButtonProps = {
    recipient: 'string',
    amount: 0,
    name: 'string'
};

const wallets = useMemo(() => [new PhantomWalletAdapter()],[]);
const network = clusterApiUrl(SolanaConfig.cluster);

  return (
  <ConnectionProvider endpoint={network}>
    <WalletProvider wallets={wallets} autoConnect>
      <WalletModalProvider>
            <div className="App">
              <SolanaPayButton />
            </div>
       </WalletModalProvider>
     </WalletProvider>
  </ConnectionProvider>
  );
}

export default App;
