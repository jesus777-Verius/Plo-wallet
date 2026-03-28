import { ethers } from 'ethers';
import { EncryptionService } from './EncryptionService';

export class GasEstimator {
  private static readonly MAX_GAS_LIMIT = BigInt(1000000); // Límite máximo de gas
  private static readonly MIN_GAS_LIMIT = BigInt(21000); // Límite mínimo de gas
  private static readonly MAX_GAS_PRICE = ethers.parseUnits('500', 'gwei'); // Precio máximo de gas
  private static readonly DEFAULT_GAS_PRICE = ethers.parseUnits('50', 'gwei');
  private static readonly POL_PRICE_USD = 0.45; // Precio de POL en USD

  /**
   * Estima el gas para una transacción con validaciones de seguridad
   */
  static async estimateTransferGas(
    provider: ethers.JsonRpcProvider,
    from: string,
    to: string,
    value: string
  ): Promise<{ gasLimit: bigint; gasPrice: bigint; totalCost: string; totalCostUSD: string }> {
    try {
      // Validar inputs
      if (!EncryptionService.isValidEthereumAddress(from)) {
        throw new Error('Dirección de origen inválida');
      }
      
      if (!EncryptionService.isValidEthereumAddress(to)) {
        throw new Error('Dirección de destino inválida');
      }
      
      if (!EncryptionService.validateAmount(value)) {
        throw new Error('Cantidad inválida');
      }

      const valueWei = ethers.parseEther(value);
      
      // Verificar que el valor no sea excesivo
      const maxValue = ethers.parseEther('1000'); // Máximo 1000 POL por transacción
      if (valueWei > maxValue) {
        throw new Error('Cantidad excede el límite máximo de seguridad');
      }

      // Estimar gas limit con timeout
      const gasEstimatePromise = provider.estimateGas({
        from,
        to,
        value: valueWei
      });
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout estimando gas')), 10000);
      });
      
      let gasLimit = await Promise.race([gasEstimatePromise, timeoutPromise]);
      
      // Validar gas limit
      if (gasLimit < this.MIN_GAS_LIMIT) {
        gasLimit = this.MIN_GAS_LIMIT;
      } else if (gasLimit > this.MAX_GAS_LIMIT) {
        throw new Error('Gas limit excede el máximo permitido');
      }
      
      // Agregar 20% de buffer para seguridad
      gasLimit = gasLimit * BigInt(120) / BigInt(100);

      // Obtener precio del gas con validación
      const feeData = await provider.getFeeData();
      let gasPrice = feeData.gasPrice || this.DEFAULT_GAS_PRICE;
      
      // Validar precio del gas
      if (gasPrice > this.MAX_GAS_PRICE) {
        console.warn('Gas price muy alto, usando precio por defecto');
        gasPrice = this.DEFAULT_GAS_PRICE;
      }

      // Calcular costo total
      const totalCost = gasLimit * gasPrice;
      const totalCostPOL = ethers.formatEther(totalCost);
      const totalCostUSD = (parseFloat(totalCostPOL) * this.POL_PRICE_USD).toFixed(6);

      // Verificar que el costo no sea excesivo
      if (parseFloat(totalCostPOL) > 0.1) { // Máximo 0.1 POL de gas
        throw new Error('Costo de gas excesivo, verifica la red');
      }

      return {
        gasLimit,
        gasPrice,
        totalCost: totalCostPOL,
        totalCostUSD
      };
    } catch (error: any) {
      console.error('Error estimating gas:', error);
      
      // Valores seguros por defecto
      return {
        gasLimit: BigInt(25000), // Un poco más que el mínimo
        gasPrice: this.DEFAULT_GAS_PRICE,
        totalCost: '0.00125',
        totalCostUSD: '0.0006'
      };
    }
  }

  /**
   * Estima gas para transacción de token ERC20 con validaciones
   */
  static async estimateTokenTransferGas(
    provider: ethers.JsonRpcProvider,
    tokenAddress: string,
    from: string,
    to: string,
    amount: bigint
  ): Promise<{ gasLimit: bigint; gasPrice: bigint; totalCost: string; totalCostUSD: string }> {
    try {
      // Validar direcciones
      if (!EncryptionService.isValidEthereumAddress(tokenAddress)) {
        throw new Error('Dirección de token inválida');
      }
      
      if (!EncryptionService.isValidEthereumAddress(from)) {
        throw new Error('Dirección de origen inválida');
      }
      
      if (!EncryptionService.isValidEthereumAddress(to)) {
        throw new Error('Dirección de destino inválida');
      }

      // Validar cantidad
      if (amount <= 0) {
        throw new Error('Cantidad debe ser mayor a 0');
      }

      const abi = ['function transfer(address to, uint256 amount) returns (bool)'];
      const contract = new ethers.Contract(tokenAddress, abi, provider);

      // Estimar gas con timeout
      const gasEstimatePromise = contract.transfer.estimateGas(to, amount, { from });
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout estimando gas para token')), 15000);
      });

      let gasLimit = await Promise.race([gasEstimatePromise, timeoutPromise]);
      
      // Validar y ajustar gas limit
      if (gasLimit < BigInt(50000)) {
        gasLimit = BigInt(50000); // Mínimo para tokens
      } else if (gasLimit > this.MAX_GAS_LIMIT) {
        throw new Error('Gas limit para token excede el máximo');
      }
      
      // Buffer del 30% para tokens (pueden ser más impredecibles)
      gasLimit = gasLimit * BigInt(130) / BigInt(100);

      const feeData = await provider.getFeeData();
      let gasPrice = feeData.gasPrice || this.DEFAULT_GAS_PRICE;
      
      if (gasPrice > this.MAX_GAS_PRICE) {
        gasPrice = this.DEFAULT_GAS_PRICE;
      }

      const totalCost = gasLimit * gasPrice;
      const totalCostPOL = ethers.formatEther(totalCost);
      const totalCostUSD = (parseFloat(totalCostPOL) * this.POL_PRICE_USD).toFixed(6);

      // Verificar costo excesivo
      if (parseFloat(totalCostPOL) > 0.2) {
        throw new Error('Costo de gas para token excesivo');
      }

      return {
        gasLimit,
        gasPrice,
        totalCost: totalCostPOL,
        totalCostUSD
      };
    } catch (error: any) {
      console.error('Error estimating token gas:', error);
      
      return {
        gasLimit: BigInt(70000), // Valor seguro para tokens
        gasPrice: this.DEFAULT_GAS_PRICE,
        totalCost: '0.0035',
        totalCostUSD: '0.0016'
      };
    }
  }

  /**
   * Validar que el gas price sea razonable
   */
  static validateGasPrice(gasPrice: bigint): boolean {
    const minGasPrice = ethers.parseUnits('1', 'gwei');
    return gasPrice >= minGasPrice && gasPrice <= this.MAX_GAS_PRICE;
  }

  /**
   * Obtener precio de gas recomendado
   */
  static async getRecommendedGasPrice(provider: ethers.JsonRpcProvider): Promise<bigint> {
    try {
      const feeData = await provider.getFeeData();
      let gasPrice = feeData.gasPrice || this.DEFAULT_GAS_PRICE;
      
      if (!this.validateGasPrice(gasPrice)) {
        gasPrice = this.DEFAULT_GAS_PRICE;
      }
      
      return gasPrice;
    } catch (error) {
      return this.DEFAULT_GAS_PRICE;
    }
  }
}
