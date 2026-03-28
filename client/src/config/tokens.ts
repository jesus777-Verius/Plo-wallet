// Direcciones de contratos verificadas en Polygon Mainnet
export const TOKENS = {
  USDT: {
    address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    decimals: 6,
    symbol: 'USDT',
    name: 'Tether USD',
    verified: true,
    coingeckoId: 'tether'
  },
  WMATIC: {
    address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    decimals: 18,
    symbol: 'WMATIC',
    name: 'Wrapped MATIC',
    verified: true,
    coingeckoId: 'wmatic'
  }
};

// Routers verificados en Polygon
export const VERIFIED_ROUTERS = {
  QUICKSWAP_V2: {
    address: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
    name: 'QuickSwap V2',
    verified: true
  },
  QUICKSWAP_V3: {
    address: '0xf5b509bB0909a69B1c207E495f687a596C168E12',
    name: 'QuickSwap V3',
    verified: true
  },
  UNISWAP_V3: {
    address: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    name: 'Uniswap V3',
    verified: true
  }
};

// Usar QuickSwap V2 por defecto (más estable)
export const QUICKSWAP_ROUTER = VERIFIED_ROUTERS.QUICKSWAP_V2.address;
export const UNISWAP_V3_ROUTER = VERIFIED_ROUTERS.UNISWAP_V3.address;

// ABI mínimo y seguro para ERC20
export const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)'
];

// ABI seguro para QuickSwap Router V2
export const QUICKSWAP_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
  'function getAmountsIn(uint amountOut, address[] memory path) public view returns (uint[] memory amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  'function WETH() external pure returns (address)'
];

/**
 * Validar dirección de token
 */
export function isValidTokenAddress(address: string): boolean {
  // Verificar formato básico
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return false;
  }
  
  // Verificar que sea uno de los tokens conocidos
  const knownTokens = Object.values(TOKENS).map(token => token.address.toLowerCase());
  return knownTokens.includes(address.toLowerCase());
}

/**
 * Obtener información de token por dirección
 */
export function getTokenInfo(address: string): typeof TOKENS[keyof typeof TOKENS] | null {
  const normalizedAddress = address.toLowerCase();
  
  for (const token of Object.values(TOKENS)) {
    if (token.address.toLowerCase() === normalizedAddress) {
      return token;
    }
  }
  
  return null;
}

/**
 * Validar dirección de router
 */
export function isValidRouterAddress(address: string): boolean {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return false;
  }
  
  const knownRouters = Object.values(VERIFIED_ROUTERS).map(router => router.address.toLowerCase());
  return knownRouters.includes(address.toLowerCase());
}

/**
 * Obtener información de router por dirección
 */
export function getRouterInfo(address: string): typeof VERIFIED_ROUTERS[keyof typeof VERIFIED_ROUTERS] | null {
  const normalizedAddress = address.toLowerCase();
  
  for (const router of Object.values(VERIFIED_ROUTERS)) {
    if (router.address.toLowerCase() === normalizedAddress) {
      return router;
    }
  }
  
  return null;
}

/**
 * Validar path de swap
 */
export function isValidSwapPath(path: string[]): boolean {
  if (!Array.isArray(path) || path.length < 2) {
    return false;
  }
  
  // Verificar que todas las direcciones sean válidas
  return path.every(address => {
    // Permitir WMATIC y tokens conocidos
    return address.toLowerCase() === TOKENS.WMATIC.address.toLowerCase() || 
           isValidTokenAddress(address);
  });
}

/**
 * Obtener path seguro para swap
 */
export function getSwapPath(fromToken: string, toToken: string): string[] {
  const from = fromToken.toUpperCase() as keyof typeof TOKENS;
  const to = toToken.toUpperCase() as keyof typeof TOKENS;
  
  if (!TOKENS[from] || !TOKENS[to]) {
    throw new Error('Token no soportado');
  }
  
  // Para swaps directos entre tokens conocidos
  if (from === 'USDT' && to === 'WMATIC') {
    return [TOKENS.USDT.address, TOKENS.WMATIC.address];
  }
  
  if (from === 'WMATIC' && to === 'USDT') {
    return [TOKENS.WMATIC.address, TOKENS.USDT.address];
  }
  
  throw new Error('Path de swap no soportado');
}

/**
 * Límites de seguridad para transacciones
 */
export const TRANSACTION_LIMITS = {
  MAX_SLIPPAGE: 10, // 10% máximo
  MIN_SLIPPAGE: 0.1, // 0.1% mínimo
  DEFAULT_SLIPPAGE: 2, // 2% por defecto
  MAX_DEADLINE_MINUTES: 30, // 30 minutos máximo
  DEFAULT_DEADLINE_MINUTES: 10, // 10 minutos por defecto
  MAX_AMOUNT_USD: 50000, // $50,000 USD máximo por transacción
  MIN_AMOUNT_USD: 0.01 // $0.01 USD mínimo
};

/**
 * Validar parámetros de swap
 */
export function validateSwapParams(params: {
  amountIn: string;
  amountOutMin: string;
  path: string[];
  deadline: number;
  slippage: number;
}): boolean {
  // Validar amounts
  if (!params.amountIn || !params.amountOutMin) {
    return false;
  }
  
  const amountIn = parseFloat(params.amountIn);
  const amountOutMin = parseFloat(params.amountOutMin);
  
  if (amountIn <= 0 || amountOutMin <= 0) {
    return false;
  }
  
  // Validar path
  if (!isValidSwapPath(params.path)) {
    return false;
  }
  
  // Validar deadline
  const now = Math.floor(Date.now() / 1000);
  const maxDeadline = now + (TRANSACTION_LIMITS.MAX_DEADLINE_MINUTES * 60);
  
  if (params.deadline <= now || params.deadline > maxDeadline) {
    return false;
  }
  
  // Validar slippage
  if (params.slippage < TRANSACTION_LIMITS.MIN_SLIPPAGE || 
      params.slippage > TRANSACTION_LIMITS.MAX_SLIPPAGE) {
    return false;
  }
  
  return true;
}
