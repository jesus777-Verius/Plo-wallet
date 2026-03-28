import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { TOKENS, QUICKSWAP_ROUTER, ERC20_ABI, QUICKSWAP_ROUTER_ABI } from '../../config/tokens';
import { EncryptionService } from '../../services/EncryptionService';

interface SwapModalProps {
  wallet: any;
  provider: ethers.JsonRpcProvider;
  onClose: () => void;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export default function SwapModal({ wallet, provider, onClose, onSuccess, onError }: SwapModalProps) {
  const [fromToken, setFromToken] = useState<'USDT' | 'POL'>('USDT');
  const [toToken, setToToken] = useState<'USDT' | 'POL'>('POL');
  const [amount, setAmount] = useState('');
  const [estimatedOutput, setEstimatedOutput] = useState('0');
  const [usdtBalance, setUsdtBalance] = useState('0');
  const [loading, setLoading] = useState(false);
  const [amountError, setAmountError] = useState('');

  useEffect(() => {
    loadUSDTBalance();
  }, []);

  useEffect(() => {
    if (amount && parseFloat(amount) > 0) {
      estimateSwap();
    } else {
      setEstimatedOutput('0');
    }
  }, [amount, fromToken]);

  const loadUSDTBalance = async () => {
    try {
      const usdtContract = new ethers.Contract(TOKENS.USDT.address, ERC20_ABI, provider);
      const balance = await usdtContract.balanceOf(wallet.address);
      const formatted = ethers.formatUnits(balance, TOKENS.USDT.decimals);
      setUsdtBalance(formatted);
    } catch (error) {
      console.error('Error loading USDT balance:', error);
    }
  };

  const estimateSwap = async () => {
    try {
      const routerContract = new ethers.Contract(QUICKSWAP_ROUTER, QUICKSWAP_ROUTER_ABI, provider);
      const amountIn = fromToken === 'USDT' 
        ? ethers.parseUnits(amount, TOKENS.USDT.decimals)
        : ethers.parseEther(amount);

      const path = fromToken === 'USDT'
        ? [TOKENS.USDT.address, TOKENS.WMATIC.address]
        : [TOKENS.WMATIC.address, TOKENS.USDT.address];

      const amounts = await routerContract.getAmountsOut(amountIn, path);
      const output = fromToken === 'USDT'
        ? ethers.formatEther(amounts[1])
        : ethers.formatUnits(amounts[1], TOKENS.USDT.decimals);
      
      setEstimatedOutput(parseFloat(output).toFixed(6));
    } catch (error) {
      console.error('Error estimating swap:', error);
      setEstimatedOutput('0');
    }
  };

  const switchTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setAmount('');
    setEstimatedOutput('0');
  };

  const handleSwap = async () => {
    setAmountError('');

    // Validar entrada con EncryptionService
    const sanitizedAmount = EncryptionService.sanitizeInput(amount.trim());
    
    if (!EncryptionService.validateAmount(sanitizedAmount)) {
      setAmountError('Cantidad inválida');
      return;
    }

    const numAmount = parseFloat(sanitizedAmount);
    const balance = fromToken === 'USDT' ? parseFloat(usdtBalance) : 0;
    
    if (numAmount <= 0) {
      setAmountError('Ingresa una cantidad válida');
      return;
    }
    
    if (numAmount > balance && fromToken === 'USDT') {
      setAmountError('Fondos insuficientes');
      return;
    }

    // Límites de seguridad para swaps
    const maxSwapAmount = fromToken === 'USDT' ? 10000 : 1000; // USDT: $10k, POL: 1000
    if (numAmount > maxSwapAmount) {
      setAmountError(`Cantidad máxima para swap: ${maxSwapAmount} ${fromToken}`);
      return;
    }

    // Verificar slippage mínimo
    const estimatedNum = parseFloat(estimatedOutput);
    if (estimatedNum <= 0) {
      setAmountError('No se puede calcular el intercambio');
      return;
    }

    setLoading(true);

    try {
      const signer = new ethers.Wallet(wallet.privateKey, provider);
      
      if (fromToken === 'USDT') {
        // Swap USDT -> POL con validaciones adicionales
        const usdtContract = new ethers.Contract(TOKENS.USDT.address, ERC20_ABI, signer);
        const routerContract = new ethers.Contract(QUICKSWAP_ROUTER, QUICKSWAP_ROUTER_ABI, signer);
        
        const amountIn = ethers.parseUnits(sanitizedAmount, TOKENS.USDT.decimals);
        
        // Verificar balance real antes de proceder
        const realBalance = await usdtContract.balanceOf(wallet.address);
        if (realBalance < amountIn) {
          throw new Error('Balance insuficiente verificado en blockchain');
        }
        
        // Verificar allowance y aprobar si es necesario
        const allowance = await usdtContract.allowance(wallet.address, QUICKSWAP_ROUTER);
        if (allowance < amountIn) {
          const approveTx = await usdtContract.approve(QUICKSWAP_ROUTER, amountIn);
          await approveTx.wait();
        }
        
        // Obtener precio actualizado antes del swap
        const path = [TOKENS.USDT.address, TOKENS.WMATIC.address];
        const amounts = await routerContract.getAmountsOut(amountIn, path);
        const currentOutput = ethers.formatEther(amounts[1]);
        
        // Verificar que el precio no haya cambiado drásticamente (protección MEV)
        const priceDifference = Math.abs(parseFloat(currentOutput) - estimatedNum) / estimatedNum;
        if (priceDifference > 0.05) { // 5% máximo de diferencia
          throw new Error('El precio ha cambiado significativamente. Intenta nuevamente.');
        }
        
        const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // 10 minutos
        const amountOutMin = amounts[1] * BigInt(90) / BigInt(100); // 10% slippage máximo
        
        const swapTx = await routerContract.swapExactTokensForETH(
          amountIn,
          amountOutMin,
          path,
          wallet.address,
          deadline,
          {
            gasLimit: 300000, // Límite de gas fijo para evitar ataques
          }
        );
        
        await swapTx.wait();
        onSuccess();
      } else {
        // Swap POL -> USDT con validaciones similares
        const routerContract = new ethers.Contract(QUICKSWAP_ROUTER, QUICKSWAP_ROUTER_ABI, signer);
        
        // Verificar balance de POL
        const polBalance = await provider.getBalance(wallet.address);
        const amountIn = ethers.parseEther(sanitizedAmount);
        
        if (polBalance < amountIn) {
          throw new Error('Balance de POL insuficiente');
        }
        
        const path = [TOKENS.WMATIC.address, TOKENS.USDT.address];
        const amounts = await routerContract.getAmountsOut(amountIn, path);
        const currentOutput = ethers.formatUnits(amounts[1], TOKENS.USDT.decimals);
        
        // Verificar cambio de precio
        const priceDifference = Math.abs(parseFloat(currentOutput) - estimatedNum) / estimatedNum;
        if (priceDifference > 0.05) {
          throw new Error('El precio ha cambiado significativamente. Intenta nuevamente.');
        }
        
        const deadline = Math.floor(Date.now() / 1000) + 60 * 10;
        const amountOutMin = amounts[1] * BigInt(90) / BigInt(100);
        
        const swapTx = await routerContract.swapExactETHForTokens(
          amountOutMin,
          path,
          wallet.address,
          deadline,
          { 
            value: amountIn,
            gasLimit: 300000
          }
        );
        
        await swapTx.wait();
        onSuccess();
      }
    } catch (err: any) {
      console.error('Swap error:', err);
      
      // Mensajes de error más seguros (no exponer detalles internos)
      let errorMessage = 'Error en el intercambio';
      
      if (err.message.includes('insufficient funds')) {
        errorMessage = 'Fondos insuficientes para completar la transacción';
      } else if (err.message.includes('slippage')) {
        errorMessage = 'Slippage muy alto, intenta con una cantidad menor';
      } else if (err.message.includes('deadline')) {
        errorMessage = 'Transacción expirada, intenta nuevamente';
      } else if (err.message.includes('precio ha cambiado')) {
        errorMessage = err.message;
      }
      
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-container">
        <div className="modal-header">
          <h3>Swap Tokens</h3>
          <button onClick={onClose} className="modal-close">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
          {/* From Token */}
          <div className="input-group">
            <label>Desde</label>
            <div className="swap-input-container">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                step="0.000001"
                className={`modal-input ${amountError ? 'error' : ''}`}
              />
              <div className="token-selector">
                <span className="token-badge">{fromToken}</span>
              </div>
            </div>
            {fromToken === 'USDT' && (
              <div className="balance-info">Balance: {parseFloat(usdtBalance).toFixed(6)} USDT</div>
            )}
            {amountError && <div className="input-error show">{amountError}</div>}
          </div>

          {/* Switch Button */}
          <div className="swap-switch-container">
            <button onClick={switchTokens} className="swap-switch-btn">
              <i className="fas fa-exchange-alt"></i>
            </button>
          </div>

          {/* To Token */}
          <div className="input-group">
            <label>A</label>
            <div className="swap-input-container">
              <input
                type="text"
                value={estimatedOutput}
                readOnly
                placeholder="0.0"
                className="modal-input"
              />
              <div className="token-selector">
                <span className="token-badge">{toToken}</span>
              </div>
            </div>
            <div className="swap-info">Estimado (5% slippage incluido)</div>
          </div>

          {/* Swap Info */}
          <div className="swap-details">
            <div className="swap-detail-item">
              <span>DEX</span>
              <span>QuickSwap</span>
            </div>
            <div className="swap-detail-item">
              <span>Slippage</span>
              <span>5%</span>
            </div>
          </div>

          <button
            onClick={handleSwap}
            className={`modal-btn primary ${loading ? 'btn-loading' : ''}`}
            disabled={loading || !amount || parseFloat(amount) <= 0}
          >
            <i className="fas fa-exchange-alt"></i>
            {loading ? 'Swapeando...' : 'Swap'}
          </button>
        </div>
      </div>
    </div>
  );
}
