import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getPolygonProvider } from '../../config/rpc';

interface ActivityModalProps {
  wallet: any;
  onClose: () => void;
}

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  type: 'send' | 'receive';
  status: 'success' | 'pending' | 'failed';
}

export default function ActivityModal({ wallet, onClose }: ActivityModalProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [polPrice, setPolPrice] = useState(0.45);

  useEffect(() => {
    fetchTransactions();
    fetchPolPrice();
  }, []);

  const fetchPolPrice = async () => {
    try {
      // Obtener precio real de POL desde CoinGecko
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=polygon-ecosystem-token&vs_currencies=usd');
      const data = await response.json();
      if (data['polygon-ecosystem-token']?.usd) {
        setPolPrice(data['polygon-ecosystem-token'].usd);
      }
    } catch (err) {
      console.warn('Error fetching POL price, using default');
    }
  };

  const fetchTransactions = async () => {
    if (!wallet?.address) {
      setError('No hay wallet disponible');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const provider = await getPolygonProvider();
      
      // Obtener el bloque actual
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 5000); // Últimos ~5000 bloques
      
      const txList: Transaction[] = [];

      // Buscar transacciones donde la wallet es el destinatario (recibidas)
      const logsReceived = await provider.getLogs({
        fromBlock,
        toBlock: 'latest',
        topics: [
          ethers.id('Transfer(address,address,uint256)'),
          null,
          ethers.zeroPadValue(wallet.address.toLowerCase(), 32)
        ]
      });

      // Buscar transacciones donde la wallet es el remitente (enviadas)
      const logsSent = await provider.getLogs({
        fromBlock,
        toBlock: 'latest',
        topics: [
          ethers.id('Transfer(address,address,uint256)'),
          ethers.zeroPadValue(wallet.address.toLowerCase(), 32),
          null
        ]
      });

      // Procesar transacciones recibidas
      for (const log of logsReceived.slice(0, 10)) {
        try {
          const tx = await provider.getTransaction(log.transactionHash);
          const receipt = await provider.getTransactionReceipt(log.transactionHash);
          const block = await provider.getBlock(log.blockNumber);
          
          if (tx && receipt && block) {
            const value = ethers.formatEther(log.data);
            txList.push({
              hash: log.transactionHash,
              from: ethers.getAddress('0x' + log.topics[1].slice(26)),
              to: wallet.address,
              value: value,
              timestamp: block.timestamp,
              type: 'receive',
              status: receipt.status === 1 ? 'success' : 'failed'
            });
          }
        } catch (err) {
          console.warn('Error processing received tx:', err);
        }
      }

      // Procesar transacciones enviadas
      for (const log of logsSent.slice(0, 10)) {
        try {
          const tx = await provider.getTransaction(log.transactionHash);
          const receipt = await provider.getTransactionReceipt(log.transactionHash);
          const block = await provider.getBlock(log.blockNumber);
          
          if (tx && receipt && block) {
            const value = ethers.formatEther(log.data);
            txList.push({
              hash: log.transactionHash,
              from: wallet.address,
              to: ethers.getAddress('0x' + log.topics[2].slice(26)),
              value: value,
              timestamp: block.timestamp,
              type: 'send',
              status: receipt.status === 1 ? 'success' : 'failed'
            });
          }
        } catch (err) {
          console.warn('Error processing sent tx:', err);
        }
      }

      // Ordenar por timestamp descendente
      txList.sort((a, b) => b.timestamp - a.timestamp);
      
      setTransactions(txList.slice(0, 20)); // Mostrar solo las 20 más recientes
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching transactions:', err);
      setError('Error obteniendo transacciones. Intenta más tarde.');
      setLoading(false);
    }
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now() / 1000;
    const diff = now - timestamp;
    
    if (diff < 60) return 'Hace unos segundos';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} horas`;
    if (diff < 604800) return `Hace ${Math.floor(diff / 86400)} días`;
    
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-container">
        <div className="modal-header">
          <h3>Actividad Reciente</h3>
          <button onClick={onClose} className="modal-close">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: '#8247e5' }}></i>
              <p style={{ marginTop: '16px', color: '#666' }}>Cargando transacciones...</p>
            </div>
          )}
          
          {error && (
            <div className="warning-box">
              <i className="fas fa-exclamation-triangle"></i>
              <p>{error}</p>
            </div>
          )}
          
          {!loading && !error && transactions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <i className="fas fa-inbox" style={{ fontSize: '48px', color: '#ccc' }}></i>
              <p style={{ marginTop: '16px', color: '#666' }}>No hay transacciones recientes</p>
            </div>
          )}
          
          {!loading && !error && transactions.length > 0 && (
            <div className="activity-list">
              {transactions.map((tx) => (
                <div key={tx.hash} className="activity-item">
                  <div className="activity-info">
                    <div className={`activity-icon ${tx.type}`}>
                      <i className={`fas fa-arrow-${tx.type === 'receive' ? 'down' : 'up'}`}></i>
                    </div>
                    <div className="activity-details">
                      <div className="activity-type">
                        {tx.type === 'receive' ? 'Recibido' : 'Enviado'}
                        {tx.status === 'pending' && ' (Pendiente)'}
                        {tx.status === 'failed' && ' (Fallido)'}
                      </div>
                      <div className="activity-time">{formatTime(tx.timestamp)}</div>
                      <div className="activity-address" style={{ fontSize: '0.75em', color: '#888' }}>
                        {tx.type === 'receive' ? `De: ${formatAddress(tx.from)}` : `A: ${formatAddress(tx.to)}`}
                      </div>
                    </div>
                  </div>
                  <div className="activity-amount">
                    <div className="activity-value">
                      {tx.type === 'receive' ? '+' : '-'}{parseFloat(tx.value).toFixed(4)} POL
                    </div>
                    <div className="activity-usd">
                      ${(parseFloat(tx.value) * polPrice).toFixed(2)}
                    </div>
                    <a 
                      href={`https://polygonscan.com/tx/${tx.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '0.75em', color: '#8247e5', textDecoration: 'none' }}
                    >
                      Ver en PolygonScan ↗
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
