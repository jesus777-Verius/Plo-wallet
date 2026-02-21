import { Router, Request, Response } from 'express';
import { WalletService } from '../services/WalletService';

const router = Router();
let walletService: WalletService;

// Inicializar servicio de wallet
router.use((req, res, next) => {
  if (!walletService) {
    walletService = new WalletService(process.env.POLYGON_RPC_URL!);
  }
  next();
});

// Crear nueva wallet
router.post('/create', (req: Request, res: Response) => {
  try {
    const wallet = walletService.createWallet();
    res.json({
      success: true,
      data: {
        address: wallet.address,
        privateKey: wallet.privateKey,
        message: 'Wallet creada exitosamente. GUARDA TU PRIVATE KEY DE FORMA SEGURA!'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error creando wallet'
    });
  }
});

// Importar wallet
router.post('/import', (req: Request, res: Response) => {
  try {
    const { privateKey } = req.body;
    
    if (!privateKey) {
      return res.status(400).json({
        success: false,
        error: 'Private key requerida'
      });
    }

    const wallet = walletService.importWallet(privateKey);
    res.json({
      success: true,
      data: {
        address: wallet.address,
        message: 'Wallet importada exitosamente'
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Private key inválida'
    });
  }
});

// Obtener balance
router.get('/balance/:address?', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const balance = await walletService.getBalance(address);
    
    res.json({
      success: true,
      data: {
        balance: `${balance} MATIC`,
        address: address || walletService.getWalletInfo()?.address
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Error obteniendo balance'
    });
  }
});

// Enviar transacción
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { to, amount, gasLimit, gasPrice } = req.body;
    
    if (!to || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Dirección destino y cantidad son requeridas'
      });
    }

    const tx = await walletService.sendTransaction({
      to,
      amount,
      gasLimit,
      gasPrice
    });

    res.json({
      success: true,
      data: tx
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: `Error enviando transacción: ${error}`
    });
  }
});

// Obtener información de transacción
router.get('/transaction/:hash', async (req: Request, res: Response) => {
  try {
    const { hash } = req.params;
    const tx = await walletService.getTransaction(hash);
    
    res.json({
      success: true,
      data: tx
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Error obteniendo transacción'
    });
  }
});

// Obtener información de wallet actual
router.get('/info', (req: Request, res: Response) => {
  const walletInfo = walletService.getWalletInfo();
  
  if (!walletInfo) {
    return res.status(400).json({
      success: false,
      error: 'No hay wallet cargada'
    });
  }

  res.json({
    success: true,
    data: walletInfo
  });
});

export default router;