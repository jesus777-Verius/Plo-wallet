import { ethers } from 'ethers';
import { TOKENS, QUICKSWAP_ROUTER, ERC20_ABI, QUICKSWAP_ROUTER_ABI, TRANSACTION_LIMITS } from '../config/tokens';

export interface SwapQuote {
  amountIn: bigint;
  amountOut: bigint;
  amountOutMin: bigint;
  path: string[];
  priceImpact: number;
  estimatedGas: bigint;
}

export class SwapService {
  /**
   * Obtener cotización para un swap
   */
  static async getQuote(
    provider: ethers.JsonRpcProvider,
    fromToken: 'POL' | 'USDT' | 'USDC' | 'DAI',
    toToken: 'POL' | 'USDT' | 'USDC' | 'DAI',
    amountIn: string
  ): Promise<SwapQuote> {
    try {
      const routerContract = new ethers.Contract(QUICKSWAP_ROUTER, QUICKSWAP_ROUTER_ABI, provider);
      
      // Construir path
      const path = this.buildPath(fromToken, toToken);
      
      // Parsear amount según el token
      const parsedAmount = fromToken === 'POL'
        ? ethers.parseEther(amountIn)
        : ethers.parseUnits(amountIn, this.getTokenDecimals(fromToken));
      
      // Obtener amounts out
      const amounts = await routerContract.getAmountsOut(parsedAmount, path);
      const amountOut = amounts[amounts.length - 1];
      
      // Calcular slippage (2% por defecto)
      const slippagePercent = TRANSACTION_LIMITS.DEFAULT_SLIPPAGE;
      const amountOutMin = amountOut * BigInt(100 - slippagePercent) / BigInt(100);
      
      // Calcular price impact (simplificado)
      const priceImpact = 0.5; // En producción, calcular basado en liquidez
      
      // Estimar gas
      const estimatedGas = BigInt(300000); // Estimación conservadora
      
      return {
        amountIn: parsedAmount,
        amountOut,
        amountOutMin,
        path,
        priceImpact,
        estimatedGas
      };
    } catch (error) {
      console.error('Error getting quote:', error);
      throw new Error('No se pudo obtener cotización');
    }
  }
  
  /**
   * Ejecutar swap POL -> Token
   */
  static async swapPOLForToken(
    provider: ethers.JsonRpcProvider,
    privateKey: string,
    toToken: 'USDT' | 'USDC' | 'DAI',
    amountIn: string,
    amountOutMin: bigint,
    recipient: string
  ): Promise<ethers.TransactionReceipt> {
    const signer = new ethers.Wallet(privateKey, provider);
    const routerContract = new ethers.Contract(QUICKSWAP_ROUTER, QUICKSWAP_ROUTER_ABI, signer);
    
    const path = this.buildPath('POL', toToken);
    const deadline = Math.floor(Date.now() / 1000) + (TRANSACTION_LIMITS.DEFAULT_DEADLINE_MINUTES * 60);
    const value = ethers.parseEther(amountIn);
    
    const tx = await routerContract.swapExactETHForTokens(
      amountOutMin,
      path,
      recipient,
      deadline,
      {
        value,
        gasLimit: 350000
      }
    );
    
    return await tx.wait();
  }
  
  /**
   * Ejecutar swap Token -> POL
   */
  static async swapTokenForPOL(
    provider: ethers.JsonRpcProvider,
    privateKey: string,
    fromToken: 'USDT' | 'USDC' | 'DAI',
    amountIn: string,
    amountOutMin: bigint,
    recipient: string
  ): Promise<ethers.TransactionReceipt> {
    const signer = new ethers.Wallet(privateKey, provider);
    const tokenAddress = this.getTokenAddress(fromToken);
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    const routerContract = new ethers.Contract(QUICKSWAP_ROUTER, QUICKSWAP_ROUTER_ABI, signer);
    
    const parsedAmount = ethers.parseUnits(amountIn, this.getTokenDecimals(fromToken));
    
    // Verificar y aprobar si es necesario
    const allowance = await tokenContract.allowance(recipient, QUICKSWAP_ROUTER);
    if (allowance < parsedAmount) {
      const approveTx = await tokenContract.approve(QUICKSWAP_ROUTER, parsedAmount);
      await approveTx.wait();
    }
    
    const path = this.buildPath(fromToken, 'POL');
    const deadline = Math.floor(Date.now() / 1000) + (TRANSACTION_LIMITS.DEFAULT_DEADLINE_MINUTES * 60);
    
    const tx = await routerContract.swapExactTokensForETH(
      parsedAmount,
      amountOutMin,
      path,
      recipient,
      deadline,
      {
        gasLimit: 350000
      }
    );
    
    return await tx.wait();
  }
  
  /**
   * Ejecutar swap Token -> Token
   */
  static async swapTokenForToken(
    provider: ethers.JsonRpcProvider,
    privateKey: string,
    fromToken: 'USDT' | 'USDC' | 'DAI',
    toToken: 'USDT' | 'USDC' | 'DAI',
    amountIn: string,
    amountOutMin: bigint,
    recipient: string
  ): Promise<ethers.TransactionReceipt> {
    const signer = new ethers.Wallet(privateKey, provider);
    const tokenAddress = this.getTokenAddress(fromToken);
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    const routerContract = new ethers.Contract(QUICKSWAP_ROUTER, QUICKSWAP_ROUTER_ABI, signer);
    
    const parsedAmount = ethers.parseUnits(amountIn, this.getTokenDecimals(fromToken));
    
    // Verificar y aprobar
    const allowance = await tokenContract.allowance(recipient, QUICKSWAP_ROUTER);
    if (allowance < parsedAmount) {
      const approveTx = await tokenContract.approve(QUICKSWAP_ROUTER, parsedAmount);
      await approveTx.wait();
    }
    
    const path = this.buildPath(fromToken, toToken);
    const deadline = Math.floor(Date.now() / 1000) + (TRANSACTION_LIMITS.DEFAULT_DEADLINE_MINUTES * 60);
    
    const tx = await routerContract.swapExactTokensForTokens(
      parsedAmount,
      amountOutMin,
      path,
      recipient,
      deadline,
      {
        gasLimit: 400000
      }
    );
    
    return await tx.wait();
  }
  
  /**
   * Construir path para el swap
   */
  private static buildPath(from: string, to: string): string[] {
    // POL usa WMATIC en el router
    const fromAddr = from === 'POL' ? TOKENS.WMATIC.address : this.getTokenAddress(from as any);
    const toAddr = to === 'POL' ? TOKENS.WMATIC.address : this.getTokenAddress(to as any);
    
    // Para swaps directos
    if (from === 'POL' || to === 'POL') {
      return [fromAddr, toAddr];
    }
    
    // Para swaps token-token, usar WMATIC como intermediario
    return [fromAddr, TOKENS.WMATIC.address, toAddr];
  }
  
  /**
   * Obtener dirección del token
   */
  private static getTokenAddress(token: 'USDT' | 'USDC' | 'DAI'): string {
    const addresses: Record<string, string> = {
      'USDT': TOKENS.USDT.address,
      'USDC': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      'DAI': '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063'
    };
    return addresses[token];
  }
  
  /**
   * Obtener decimales del token
   */
  private static getTokenDecimals(token: 'USDT' | 'USDC' | 'DAI'): number {
    const decimals: Record<string, number> = {
      'USDT': 6,
      'USDC': 6,
      'DAI': 18
    };
    return decimals[token];
  }
  
  /**
   * Verificar balance de token
   */
  static async getTokenBalance(
    provider: ethers.JsonRpcProvider,
    tokenSymbol: 'USDT' | 'USDC' | 'DAI',
    address: string
  ): Promise<string> {
    try {
      const tokenAddress = this.getTokenAddress(tokenSymbol);
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      const balance = await tokenContract.balanceOf(address);
      return ethers.formatUnits(balance, this.getTokenDecimals(tokenSymbol));
    } catch (error) {
      console.error('Error getting token balance:', error);
      return '0';
    }
  }
}
