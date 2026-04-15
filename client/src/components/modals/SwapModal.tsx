import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { SwapService } from '../../services/SwapService';
import { EncryptionService } from '../../services/EncryptionService';

interface SwapModalProps {
  wallet: any;
  provider: ethers.JsonRpcProvider;
  onClose: () => void;
  onSuccess: () => void;
  onError: (error: string) => void;
}

type TokenType = 'POL' | 'USDT';

export default function SwapModal({ wallet, provider, onClose, onSuccess, onError }: SwapModalProps) {
  const [fromToken, setFromToken] = useState<TokenType>('POL');
  const [toToken, setToToken] = useState<TokenType>('USDT');
  const [amount, setAmount] = useState('');
  const [estimatedOutput, setEstimatedOutput] = useState('0');
  const [polBalance, setPolBalance] = useState('0');
  const [usdtBalance, setUsdtBalance] = useState('0');
  const [loading, setLoading] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [amountError, setAmountError] = useState('');

  useEffect(() => {
    loadBalances();
  }, []);

  useEffect(() => {
    if (amount && parseFloat(amount) > 0) {
      estimateSwap();
    } else {
      setEstimatedOutput('0');
    }
  }, [amount, fromToken, toToken]);

  const loadBalances = async () => {
    try {
      const polBal = await provider.getBalance(wallet.address);
      setPolBalance(ethers.formatEther(polBal));
      
      const usdtBal = await SwapService.getTokenBalance(provider, 'USDT', wallet.address);
      setUsdtBalance(usdtBal);
    } catch (error) {
      console.error('Error loading balances:', error);
    }
  };

  const estimateSwap = async () => {
    setLoadingQuote(true);
    try {
      const quote = await SwapService.getQuote(provider, fromToken, toToken, amount);
      const decimals = toToken === 'POL' ? 18 : 6;
      const output = ethers.formatUnits(quote.amountOut, decimals);
      setEstimatedOutput(parseFloat(output).toFixed(6));
    } catch (error) {
      console.error('Error estimating swap:', error);
      setEstimatedOutput('0');
    } finally {
      setLoadingQuote(false);
    }
  };

  const switchTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setAmount('');
    setEstimatedOutput('0');
  };

  const handleSwap = async () => {
    setAmountError('');

    const sanitizedAmount = EncryptionService.sanitizeInput(amount.trim());
    
    if (!EncryptionService.validateAmount(sanitizedAmount)) {
      setAmountError('Cantidad inválida');
      return;
    }

    const numAmount = parseFloat(sanitizedAmount);
    const balance = fromToken === 'POL' ? parseFloat(polBalance) : parseFloat(usdtBalance);
    
    if (numAmount <= 0) {
      setAmountError('Ingresa una cantidad válida');
      return;
    }
    
    if (numAmount > balance) {
      setAmountError('Fondos insuficientes');
      return;
    }

    const estimatedNum = parseFloat(estimatedOutput);
    if (estimatedNum <= 0) {
      setAmountError('No se puede calcular el intercambio');
      return;
    }

    setLoading(true);

    try {
      const quote = await SwapService.getQuote(provider, fromToken, toToken, sanitizedAmount);
      
      if (fromToken === 'POL') {
        await SwapService.swapPOLForToken(
          provider,
          wallet.privateKey,
          'USDT',
          sanitizedAmount,
          quote.amountOutMin,
          wallet.address
        );
      } else {
        await SwapService.swapTokenForPOL(
          provider,
          wallet.privateKey,
          'USDT',
          sanitizedAmount,
          quote.amountOutMin,
          wallet.address
        );
      }
      
      onSuccess();
    } catch (err: any) {
      console.error('Swap error:', err);
      
      let errorMessage = 'Error en el intercambio';
      
      if (err.message.includes('insufficient funds')) {
        errorMessage = 'Fondos insuficientes';
      } else if (err.message.includes('slippage')) {
        errorMessage = 'Slippage muy alto';
      } else if (err.message.includes('user rejected')) {
        errorMessage = 'Transacción cancelada';
      }
      
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const currentBalance = fromToken === 'POL' ? polBalance : usdtBalance;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-container swap-modal">
        <div className="modal-header">
          <h3><i className="fas fa-exchange-alt"></i> Swap Tokens</h3>
          <button onClick={onClose} className="modal-close">
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="modal-body">
          {/* From Token */}
          <div className="swap-section">
            <label className="swap-label">Desde</label>
            <div className="swap-card">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                step="0.000001"
                className="swap-input"
                disabled={loading}
              />
              <div className="swap-token-badge">
                <span className="token-name">{fromToken}</span>
                <i className="fas fa-chevron-down"></i>
              </div>
            </div>
            <div className="swap-balance">
              <span>Balance: {parseFloat(currentBalance).toFixed(6)} {fromToken}</span>
              <button 
                className="max-btn" 
                onClick={() => setAmount(currentBalance)}
                disabled={loading}
              >
                MAX
              </button>
            </div>
            {amountError && <div className="swap-error">{amountError}</div>}
          </div>

          {/* Switch Button */}
          <div className="swap-switch-wrapper">
            <button onClick={switchTokens} className="swap-switch-btn" disabled={loading}>
              <i className="fas fa-exchange-alt"></i>
            </button>
          </div>

          {/* To Token */}
          <div className="swap-section">
            <label className="swap-label">A</label>
            <div className="swap-card">
              <input
                type="text"
                value={loadingQuote ? 'Calculando...' : estimatedOutput}
                readOnly
                placeholder="0"
                className="swap-input readonly"
              />
              <div className="swap-token-badge">
                <span className="token-name">{toToken}</span>
                <i className="fas fa-chevron-down"></i>
              </div>
            </div>
            <div className="swap-info-text">Estimado (2% slippage)</div>
          </div>

          {/* Swap Details */}
          <div className="swap-details-card">
            <div className="swap-detail-row">
              <span className="detail-label">
                <i className="fas fa-chart-line"></i> DEX
              </span>
              <span className="detail-value">QuickSwap V2</span>
            </div>
            <div className="swap-detail-row">
              <span className="detail-label">
                <i className="fas fa-percentage"></i> Slippage
              </span>
              <span className="detail-value">2%</span>
            </div>
          </div>

          {/* Swap Button */}
          <button
            onClick={handleSwap}
            className={`swap-btn ${loading ? 'loading' : ''}`}
            disabled={loading || loadingQuote || !amount || parseFloat(amount) <= 0}
          >
            <i className="fas fa-exchange-alt"></i>
            {loading ? 'Swapeando...' : 'Swap en QuickSwap'}
          </button>
          
          {/* Info Footer */}
          <div className="swap-footer">
            <i className="fas fa-info-circle"></i>
            <span>Swap real en QuickSwap DEX (Polygon Mainnet)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
