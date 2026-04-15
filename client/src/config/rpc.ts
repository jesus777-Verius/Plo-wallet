import { ethers } from 'ethers';

// Obtener API key de Infura desde variables de entorno
const INFURA_API_KEY = import.meta.env.VITE_INFURA_API_KEY;

if (!INFURA_API_KEY) {
  throw new Error('VITE_INFURA_API_KEY no está configurada en el archivo .env');
}

// URL del RPC de Infura
const INFURA_RPC_URL = `https://polygon-mainnet.infura.io/v3/${INFURA_API_KEY}`;

// Precio aproximado de POL (idealmente obtener de API en producción)
export const POL_PRICE = 0.45;

// Provider singleton para reutilizar la misma conexión
let providerInstance: ethers.JsonRpcProvider | null = null;

/**
 * Obtiene el provider de Polygon usando Infura
 * Usa singleton para reutilizar la conexión
 */
export function getPolygonProvider(): ethers.JsonRpcProvider {
  if (!providerInstance) {
    providerInstance = new ethers.JsonRpcProvider(INFURA_RPC_URL);
  }
  return providerInstance;
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
