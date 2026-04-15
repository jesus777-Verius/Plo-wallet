import { ethers } from 'ethers';

// Obtener API key de Infura desde variables de entorno
const INFURA_API_KEY = import.meta.env.VITE_INFURA_API_KEY;

console.log('🔑 Infura API Key cargada:', INFURA_API_KEY ? `${INFURA_API_KEY.substring(0, 8)}...` : 'NO CARGADA');

if (!INFURA_API_KEY || INFURA_API_KEY === 'your_infura_api_key_here') {
  throw new Error('VITE_INFURA_API_KEY no está configurada correctamente en el archivo .env');
}

// URLs del RPC de Infura (HTTP y WebSocket)
const INFURA_RPC_URL = `https://polygon-mainnet.infura.io/v3/${INFURA_API_KEY}`;
const INFURA_WSS_URL = `wss://polygon-mainnet.infura.io/ws/v3/${INFURA_API_KEY}`;

// Precio aproximado de POL (idealmente obtener de API en producción)
export const POL_PRICE = 0.45;

// Provider singleton para reutilizar la misma conexión
let providerInstance: ethers.JsonRpcProvider | null = null;
let wsProviderInstance: ethers.WebSocketProvider | null = null;

/**
 * Obtiene el provider HTTP de Polygon usando Infura
 * Usa singleton para reutilizar la conexión
 */
export function getPolygonProvider(): ethers.JsonRpcProvider {
  if (!providerInstance) {
    providerInstance = new ethers.JsonRpcProvider(INFURA_RPC_URL);
  }
  return providerInstance;
}

/**
 * Obtiene el provider WebSocket de Polygon para conexión en tiempo real
 * Usa singleton para reutilizar la conexión
 */
export function getPolygonWebSocketProvider(): ethers.WebSocketProvider {
  if (!wsProviderInstance) {
    wsProviderInstance = new ethers.WebSocketProvider(INFURA_WSS_URL);
    
    // Manejar reconexión automática
    const ws = wsProviderInstance.websocket as any;
    
    ws.addEventListener('close', () => {
      console.log('WebSocket desconectado, reconectando...');
      wsProviderInstance = null;
      setTimeout(() => {
        getPolygonWebSocketProvider();
      }, 3000);
    });
    
    ws.addEventListener('error', (error: any) => {
      console.error('WebSocket error:', error);
    });
  }
  return wsProviderInstance;
}

/**
 * Valida que el provider esté conectado a Polygon Mainnet
 */
export async function validateProvider(provider: ethers.JsonRpcProvider): Promise<boolean> {
  try {
    const network = await provider.getNetwork();
    return network.chainId === 137n;
  } catch {
    return false;
  }
}

/**
 * Escuchar transacciones entrantes en tiempo real
 */
export function listenToIncomingTransactions(
  address: string,
  callback: (tx: ethers.TransactionResponse) => void
): () => void {
  const wsProvider = getPolygonWebSocketProvider();
  
  // Escuchar transacciones directas de POL a esta dirección
  const handler = async (blockNumber: number) => {
    try {
      const block = await wsProvider.getBlock(blockNumber, true);
      if (block && block.prefetchedTransactions) {
        for (const tx of block.prefetchedTransactions) {
          if (tx.to?.toLowerCase() === address.toLowerCase()) {
            callback(tx);
          }
        }
      }
    } catch (error) {
      console.error('Error procesando bloque:', error);
    }
  };
  
  wsProvider.on('block', handler);
  
  // Retornar función para detener la escucha
  return () => {
    wsProvider.off('block', handler);
  };
}

/**
 * Escuchar cambios de balance en tiempo real
 */
export function listenToBalanceChanges(
  address: string,
  callback: (balance: string) => void
): () => void {
  const wsProvider = getPolygonWebSocketProvider();
  let lastBalance = '';
  
  // Verificar balance cada vez que hay un nuevo bloque
  const checkBalance = async () => {
    try {
      const balance = await wsProvider.getBalance(address);
      const formatted = ethers.formatEther(balance);
      
      if (formatted !== lastBalance) {
        lastBalance = formatted;
        callback(formatted);
      }
    } catch (error) {
      console.error('Error obteniendo balance:', error);
    }
  };
  
  // Escuchar nuevos bloques
  wsProvider.on('block', checkBalance);
  
  // Verificar balance inicial
  checkBalance();
  
  // Retornar función para detener la escucha
  return () => {
    wsProvider.off('block', checkBalance);
  };
}

/**
 * Escuchar estado de transacción en tiempo real
 */
export async function watchTransaction(
  txHash: string,
  onPending: () => void,
  onConfirmed: (receipt: ethers.TransactionReceipt) => void,
  onError: (error: Error) => void
): Promise<void> {
  const wsProvider = getPolygonWebSocketProvider();
  
  try {
    onPending();
    
    // Esperar confirmación
    const receipt = await wsProvider.waitForTransaction(txHash, 1);
    
    if (receipt) {
      onConfirmed(receipt);
    }
  } catch (error) {
    onError(error as Error);
  }
}

/**
 * Obtener información del nodo en tiempo real
 */
export async function getNodeInfo(): Promise<{
  blockNumber: number;
  gasPrice: string;
  chainId: bigint;
  connected: boolean;
}> {
  try {
    const provider = getPolygonProvider();
    
    const blockNumber = await provider.getBlockNumber();
    const network = await provider.getNetwork();
    
    // Obtener gas price directamente del provider sin usar getFeeData
    let gasPrice = '30'; // Default para Polygon
    try {
      const feeData = await provider.getFeeData();
      if (feeData.gasPrice) {
        gasPrice = ethers.formatUnits(feeData.gasPrice, 'gwei');
      }
    } catch (error) {
      // Si falla getFeeData, usar valor por defecto
      console.log('Usando gas price por defecto');
    }
    
    return {
      blockNumber,
      gasPrice,
      chainId: network.chainId,
      connected: true
    };
  } catch (error) {
    console.error('Error obteniendo info del nodo:', error);
    return {
      blockNumber: 0,
      gasPrice: '0',
      chainId: 0n,
      connected: false
    };
  }
}

/**
 * Cerrar todas las conexiones
 */
export function closeConnections(): void {
  if (wsProviderInstance) {
    wsProviderInstance.destroy();
    wsProviderInstance = null;
  }
  providerInstance = null;
}
