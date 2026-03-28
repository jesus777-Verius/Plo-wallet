import type { ethers } from 'ethers';

// Lista de RPCs públicos de Polygon con validación de seguridad
export const POLYGON_RPCS = [
  'https://polygon-rpc.com',
  'https://rpc-mainnet.matic.network',
  'https://matic-mainnet.chainstacklabs.com',
  'https://rpc-mainnet.maticvigil.com',
  'https://polygon-bor-rpc.publicnode.com'
];

// RPCs de respaldo adicionales
const BACKUP_RPCS = [
  'https://polygon.llamarpc.com',
  'https://polygon.blockpi.network/v1/rpc/public'
];

export const POL_PRICE = 0.45; // Precio aproximado, idealmente obtener de API

// Configuración de timeouts y límites
const RPC_TIMEOUT = 10000; // 10 segundos
const HEALTH_CHECK_INTERVAL = 60000; // 1 minuto

// Cache de proveedores saludables
let healthyProviders: string[] = [...POLYGON_RPCS];
let lastHealthCheck = 0;

/**
 * Valida si una URL de RPC es segura
 */
function isValidRpcUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    
    // Solo HTTPS
    if (urlObj.protocol !== 'https:') {
      return false;
    }
    
    // Verificar dominios permitidos
    const allowedDomains = [
      'polygon-rpc.com',
      'matic.network',
      'chainstacklabs.com',
      'maticvigil.com',
      'publicnode.com',
      'llamarpc.com',
      'blockpi.network'
    ];
    
    return allowedDomains.some(domain => urlObj.hostname.includes(domain));
  } catch {
    return false;
  }
}

/**
 * Verifica la salud de un RPC endpoint
 */
async function checkRpcHealth(rpcUrl: string): Promise<boolean> {
  try {
    if (!isValidRpcUrl(rpcUrl)) {
      return false;
    }
    
    const { ethers } = await import('ethers');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Timeout para la verificación
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('RPC health check timeout')), RPC_TIMEOUT);
    });
    
    // Verificar conectividad básica
    const networkPromise = provider.getNetwork();
    const blockPromise = provider.getBlockNumber();
    
    const [network, blockNumber] = await Promise.race([
      Promise.all([networkPromise, blockPromise]),
      timeoutPromise
    ]);
    
    // Verificar que sea Polygon Mainnet
    if (network.chainId !== 137n) {
      console.warn(`RPC ${rpcUrl} no es Polygon Mainnet (chainId: ${network.chainId})`);
      return false;
    }
    
    // Verificar que el bloque sea reciente (menos de 5 minutos)
    const currentTime = Math.floor(Date.now() / 1000);
    const block = await provider.getBlock(blockNumber);
    
    if (!block || (currentTime - block.timestamp) > 300) {
      console.warn(`RPC ${rpcUrl} tiene bloques desactualizados`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.warn(`RPC health check failed for ${rpcUrl}:`, error);
    return false;
  }
}

/**
 * Actualiza la lista de proveedores saludables
 */
async function updateHealthyProviders(): Promise<void> {
  const now = Date.now();
  
  // Solo verificar si ha pasado el intervalo
  if (now - lastHealthCheck < HEALTH_CHECK_INTERVAL) {
    return;
  }
  
  console.log('Verificando salud de RPCs...');
  
  const allRpcs = [...POLYGON_RPCS, ...BACKUP_RPCS];
  const healthChecks = allRpcs.map(async (rpc) => {
    const isHealthy = await checkRpcHealth(rpc);
    return { rpc, isHealthy };
  });
  
  try {
    const results = await Promise.allSettled(healthChecks);
    const newHealthyProviders: string[] = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.isHealthy) {
        newHealthyProviders.push(allRpcs[index]);
      }
    });
    
    if (newHealthyProviders.length > 0) {
      healthyProviders = newHealthyProviders;
      console.log(`RPCs saludables: ${healthyProviders.length}/${allRpcs.length}`);
    } else {
      console.warn('No se encontraron RPCs saludables, usando lista por defecto');
      healthyProviders = [...POLYGON_RPCS];
    }
    
    lastHealthCheck = now;
  } catch (error) {
    console.error('Error actualizando proveedores saludables:', error);
  }
}

/**
 * Función para obtener un provider con fallback y validación de seguridad
 */
export async function getPolygonProvider() {
  const { ethers } = await import('ethers');
  
  // Actualizar lista de proveedores saludables si es necesario
  await updateHealthyProviders();
  
  // Intentar con proveedores saludables primero
  for (const rpc of healthyProviders) {
    try {
      if (!isValidRpcUrl(rpc)) {
        console.warn(`RPC URL inválida: ${rpc}`);
        continue;
      }
      
      const provider = new ethers.JsonRpcProvider(rpc);
      
      // Verificación rápida de conectividad
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Provider timeout')), 5000);
      });
      
      const networkPromise = provider.getNetwork();
      const network = await Promise.race([networkPromise, timeoutPromise]);
      
      // Verificar que sea Polygon Mainnet
      if (network.chainId === 137n) {
        console.log(`Conectado a RPC: ${rpc}`);
        return provider;
      } else {
        console.warn(`RPC ${rpc} no es Polygon Mainnet`);
      }
    } catch (error) {
      console.warn(`RPC ${rpc} falló, probando siguiente...`);
      continue;
    }
  }
  
  // Si todos fallan, usar el primero como último recurso
  console.warn('Todos los RPCs fallaron, usando RPC por defecto');
  return new ethers.JsonRpcProvider(POLYGON_RPCS[0]);
}

/**
 * Obtener múltiples proveedores para redundancia
 */
export async function getMultipleProviders(count: number = 2): Promise<ethers.JsonRpcProvider[]> {
  await updateHealthyProviders();
  
  const providers: ethers.JsonRpcProvider[] = [];
  const { ethers } = await import('ethers');
  
  for (let i = 0; i < Math.min(count, healthyProviders.length); i++) {
    try {
      const provider = new ethers.JsonRpcProvider(healthyProviders[i]);
      providers.push(provider);
    } catch (error) {
      console.error(`Error creando provider ${i}:`, error);
    }
  }
  
  return providers;
}

/**
 * Verificar si un provider está funcionando correctamente
 */
export async function validateProvider(provider: ethers.JsonRpcProvider): Promise<boolean> {
  try {
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    
    return network.chainId === 137n && blockNumber > 0;
  } catch {
    return false;
  }
}

/**
 * Obtener estadísticas de los RPCs
 */
export function getRpcStats(): {
  totalRpcs: number;
  healthyRpcs: number;
  lastHealthCheck: number;
} {
  return {
    totalRpcs: POLYGON_RPCS.length + BACKUP_RPCS.length,
    healthyRpcs: healthyProviders.length,
    lastHealthCheck
  };
}
