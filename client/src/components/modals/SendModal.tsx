import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { GasEstimator } from '../../services/GasEstimator';
import { AddressBook } from '../../services/AddressBook';
import { EncryptionService } from '../../services/EncryptionService';
import AddressBookModal from './AddressBookModal';

interface SendModalProps {
  wallet: any;
  balance: string;
  provider: ethers.JsonRpcProvider;
  onClose: () => void;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export default function SendModal({ wallet, balance, provider, onClose, onSuccess, onError }: SendModalProps) {
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [addressError, setAddressError] = useState('');
  const [amountError, setAmountError] = useState('');
  const [loading, setLoading] = useState(false);
  const [gasEstimate, setGasEstimate] = useState<any>(null);
  const [estimating, setEstimating] = useState(false);
  const [showAddressBook, setShowAddressBook] = useState(false);

  useEffect(() => {
    if (toAddress && amount && !addressError && !amountError) {
      estimateGas();
    } else {
      setGasEstimate(null);
    }
  }, [toAddress, amount]);

  const estimateGas = async () => {
    setEstimating(true);
    try {
      const estimate = await GasEstimator.estimateTransferGas(
        provider,
        wallet.address,
        toAddress,
        amount
      );
      setGasEstimate(estimate);
    } catch (error) {
      console.error('Error estimating gas:', error);
    } finally {
      setEstimating(false);
    }
  };

  const validateAddress = (address: string) => {
    if (!address) return 'La dirección es requerida';
    
    // Sanitizar input
    const sanitized = EncryptionService.sanitizeInput(address.trim());
    
    if (!EncryptionService.isValidEthereumAddress(sanitized)) {
      return 'Dirección de Ethereum inválida';
    }
    
    // Verificar que no sea la misma dirección del wallet
    if (sanitized.toLowerCase() === wallet.address.toLowerCase()) {
      return 'No puedes enviar a tu propia dirección';
    }
    
    return null;
  };

  const validateAmount = (amt: string, bal: string) => {
    if (!amt) return 'La cantidad es requerida';
    
    // Sanitizar y validar formato numérico
    const sanitized = EncryptionService.sanitizeInput(amt.trim());
    
    if (!EncryptionService.validateAmount(sanitized)) {
      return 'Cantidad inválida';
    }
    
    const numAmount = parseFloat(sanitized);
    const numBalance = parseFloat(bal);
    
    if (numAmount <= 0) return 'La cantidad debe ser mayor a 0';
    if (numAmount > numBalance) return 'Fondos insuficientes';
    
    // Verificar límites de seguridad
    const maxAmount = 1000; // Límite máximo por transacción
    if (numAmount > maxAmount) {
      return `Cantidad máxima permitida: ${maxAmount} POL`;
    }
    
    // Verificar decimales (máximo 6)
    const decimals = sanitized.split('.')[1];
    if (decimals && decimals.length > 6) {
      return 'Máximo 6 decimales permitidos';
    }
    
    return null;
  };

  const handleSend = async () => {
    setAddressError('');
    setAmountError('');

    const addrErr = validateAddress(toAddress);
    if (addrErr) {
      setAddressError(addrErr);
      return;
    }

    const amtErr = validateAmount(amount, balance);
    if (amtErr) {
      setAmountError(amtErr);
      return;
    }

    setLoading(true);

    try {
      // Crear wallet desde private key (SOLO en el navegador del usuario)
      const signer = new ethers.Wallet(wallet.privateKey, provider);
      
      // Preparar transacción con gas estimado
      const tx: any = {
        to: toAddress,
        value: ethers.parseEther(amount)
      };

      if (gasEstimate) {
        tx.gasLimit = gasEstimate.gasLimit;
        tx.gasPrice = gasEstimate.gasPrice;
      }
      
      // Firmar y enviar transacción (firmado localmente, nunca se envía la private key)
      const txResponse = await signer.sendTransaction(tx);
      
      // Esperar confirmación
      await txResponse.wait();
      
      // Preguntar si quiere guardar en contactos
      const contactName = AddressBook.findByAddress(toAddress);
      if (!contactName) {
        const save = window.confirm('¿Guardar esta dirección en tus contactos?');
        if (save) {
          const name = prompt('Nombre del contacto:');
          if (name) {
            try {
              AddressBook.addContact(name, toAddress);
            } catch (err) {
              console.error('Error saving contact:', err);
            }
          }
        }
      }
      
      onSuccess();
    } catch (err: any) {
      onError(`Error enviando transacción: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFromAddressBook = (address: string) => {
    setToAddress(address);
    setShowAddressBook(false);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-container">
        <div className="modal-header">
          <h3>Enviar POL</h3>
          <button onClick={onClose} className="modal-close">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
          <div className="input-group">
            <label>Dirección destino</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
                placeholder="0x..."
                className={`modal-input ${addressError ? 'error' : ''}`}
                style={{ flex: 1 }}
              />
              <button
                onClick={() => setShowAddressBook(true)}
                className="icon-btn"
                title="Libreta de direcciones"
                style={{ padding: '10px 15px' }}
              >
                <i className="fas fa-address-book"></i>
              </button>
            </div>
            {addressError && <div className="input-error show">{addressError}</div>}
          </div>
          <div className="input-group">
            <label>Cantidad</label>
            <div className="amount-input">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                step="0.0001"
                className={`modal-input ${amountError ? 'error' : ''}`}
              />
              <span className="currency-label">POL</span>
            </div>
            {amountError && <div className="input-error show">{amountError}</div>}
            <div className="balance-info">Balance disponible: {balance} POL</div>
          </div>

          {/* Gas Estimate */}
          {gasEstimate && (
            <div className="gas-estimate" style={{
              background: '#2a2d3a',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '15px'
            }}>
              <div style={{ fontSize: '0.9em', color: '#888', marginBottom: '8px' }}>
                <i className="fas fa-gas-pump"></i> Estimación de Gas
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>Costo de gas:</span>
                <span>{parseFloat(gasEstimate.totalCost).toFixed(6)} POL</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85em', color: '#888' }}>
                <span>≈ ${gasEstimate.totalCostUSD} USD</span>
                <span>Gas Price: {ethers.formatUnits(gasEstimate.gasPrice, 'gwei')} Gwei</span>
              </div>
            </div>
          )}

          {estimating && (
            <div style={{ textAlign: 'center', color: '#888', marginBottom: '15px' }}>
              <i className="fas fa-spinner fa-spin"></i> Estimando gas...
            </div>
          )}

          <button
            onClick={handleSend}
            className={`modal-btn primary ${loading ? 'btn-loading' : ''}`}
            disabled={loading}
          >
            <i className="fas fa-paper-plane"></i>
            {loading ? 'Enviando...' : 'Enviar Transacción'}
          </button>
        </div>
      </div>

      {showAddressBook && (
        <AddressBookModal
          onClose={() => setShowAddressBook(false)}
          onSelectAddress={handleSelectFromAddressBook}
          onMessage={() => {}} // No-op, los mensajes se manejan en WalletScreen
        />
      )}
    </div>
  );
}
