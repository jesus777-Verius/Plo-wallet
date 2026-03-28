import { QRCodeSVG } from 'qrcode.react';

interface ReceiveModalProps {
  address: string;
  onClose: () => void;
  onCopy: () => void;
}

export default function ReceiveModal({ address, onClose, onCopy }: ReceiveModalProps) {
  const copyAddress = () => {
    navigator.clipboard.writeText(address).then(() => {
      onCopy();
    }).catch(() => {
      console.error('Error copying address');
    });
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-container">
        <div className="modal-header">
          <h3>Recibir POL</h3>
          <button onClick={onClose} className="modal-close">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
          <div className="qr-section" style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            padding: '20px',
            background: '#fff',
            borderRadius: '12px',
            marginBottom: '20px'
          }}>
            <QRCodeSVG 
              value={address}
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>
          <div className="address-section">
            <label>Tu dirección POL</label>
            <div className="address-display">
              <span style={{ wordBreak: 'break-all', fontSize: '0.9em' }}>{address}</span>
              <button onClick={copyAddress} className="copy-btn">
                <i className="fas fa-copy"></i>
              </button>
            </div>
          </div>
          <div className="warning-box" style={{ marginTop: '15px' }}>
            <i className="fas fa-info-circle"></i>
            <p>Solo envía POL (Polygon) a esta dirección. Otros tokens pueden perderse.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
