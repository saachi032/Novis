import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useEffect, useState } from 'react';

export function useWalletConnection() {
  const { address, isConnected, chain } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);

  useEffect(() => {
    setIsCorrectNetwork(chain?.id === 84532); // Base Sepolia
  }, [chain]);

  const connectWallet = async () => {
    const injectedConnector = connectors[0]; // MetaMask
    if (injectedConnector) {
      connect({ connector: injectedConnector });
    }
  };

  return {
    address,
    isConnected,
    isCorrectNetwork,
    chain,
    connectWallet,
    disconnect,
  };
}
