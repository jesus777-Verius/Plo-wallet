import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface Notification {
  id: string;
  type: 'incoming' | 'outgoing';
  amount: string;
  hash: string;
  timestamp: number;
  read: boolean;
}

interface NotificationBellProps {
  wallet: any;
  provider: ethers.JsonRpcProvider;
}

export default function NotificationBell({ wallet, provider }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!wallet || !provider) return;

    // Escuchar transacciones en tiempo real
    const setupListener = async () => {
      try {
        const { listenToIncomingTransactions } = await import('../config/rpc');
        
        const unsubscribe = listenToIncomingTransactions(wallet.address, (tx) => {
          const isIncoming = tx.to?.toLowerCase() === wallet.address.toLowerCase();
          const amount = ethers.formatEther(tx.value);
          
          if (parseFloat(amount) > 0) {
            const notification: Notification = {
              id: tx.hash,
              type: isIncoming ? 'incoming' : 'outgoing',
              amount,
              hash: tx.hash,
              timestamp: Date.now(),
              read: false
            };
            
            setNotifications(prev => [notification, ...prev].slice(0, 10));
            setUnreadCount(prev => prev + 1);
            
            // Mostrar notificación del navegador
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Elyon Wallet', {
                body: `${isIncoming ? 'Recibiste' : 'Enviaste'} ${parseFloat(amount).toFixed(4)} POL`,
                icon: '/matic-logo.png'
              });
            }
          }
        });
        
        return unsubscribe;
      } catch (error) {
        console.error('Error configurando listener:', error);
      }
    };

    setupListener();
  }, [wallet, provider]);

  useEffect(() => {
    // Solicitar permiso para notificaciones
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return (
    <div className="notification-bell">
      <button 
        className="bell-button"
        onClick={() => setShowDropdown(!showDropdown)}
        title="Notificaciones"
      >
        <i className="fas fa-bell"></i>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {showDropdown && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h4>Notificaciones</h4>
            <div className="notification-actions">
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="mark-read-btn">
                  <i className="fas fa-check"></i>
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={clearAll} className="clear-btn">
                  <i className="fas fa-trash"></i>
                </button>
              )}
            </div>
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">
                <i className="fas fa-bell-slash"></i>
                <p>No hay notificaciones</p>
              </div>
            ) : (
              notifications.map(notif => (
                <div 
                  key={notif.id} 
                  className={`notification-item ${notif.read ? 'read' : 'unread'}`}
                >
                  <div className={`notification-icon ${notif.type}`}>
                    <i className={`fas fa-arrow-${notif.type === 'incoming' ? 'down' : 'up'}`}></i>
                  </div>
                  <div className="notification-content">
                    <div className="notification-title">
                      {notif.type === 'incoming' ? 'Recibiste' : 'Enviaste'} POL
                    </div>
                    <div className="notification-amount">
                      {parseFloat(notif.amount).toFixed(4)} POL
                    </div>
                    <div className="notification-time">
                      {new Date(notif.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  <a 
                    href={`https://polygonscan.com/tx/${notif.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="notification-link"
                    title="Ver en PolygonScan"
                  >
                    <i className="fas fa-external-link-alt"></i>
                  </a>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
