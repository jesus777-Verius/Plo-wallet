import { ethers } from 'ethers';
import { WalletInfo, TransactionRequest, TransactionResponse } from '../types/wallet';

export class WalletService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet | null = null;

  constructor(rpcUrl: string) {
    console.log(`Conectando a RPC: ${rpcUrl}`);
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Verificar conexión
    this.provider.getNetwork().then(network => {
      console.log(`Conectado a red: ${network.name} (chainId: ${network.chainId})`);
    }).catch(error => {
      console.error('Error conectando a la red:', error);
    });
  }

  // Crear nueva wallet
  createWallet(): WalletInfo {
    const wallet = ethers.Wallet.createRandom();
    this.wallet = new ethers.Wallet(wallet.privateKey, this.provider);
    
    return {
      address: wallet.address,
      balance: '0',
      privateKey: wallet.privateKey
    };
  }

  // Importar wallet desde private key
  importWallet(privateKey: string): WalletInfo {
    try {
      this.wallet = new ethers.Wallet(privateKey, this.provider);
      
      return {
        address: this.wallet.address,
        balance: '0'
      };
    } catch (error) {
      throw new Error('Private key inválida');
    }
  }

  // Obtener balance
  async getBalance(address?: string): Promise<string> {
    try {
      const targetAddress = address || this.wallet?.address;
      if (!targetAddress) throw new Error('No hay wallet cargada');

      console.log(`Obteniendo balance para: ${targetAddress}`);
      const balance = await this.provider.getBalance(targetAddress);
      console.log(`Balance obtenido: ${balance.toString()}`);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error obteniendo balance:', error);
      throw new Error(`Error obteniendo balance: ${error}`);
    }
  }

  // Enviar transacción
  async sendTransaction(txRequest: TransactionRequest): Promise<TransactionResponse> {
    if (!this.wallet) throw new Error('No hay wallet cargada');

    try {
      const tx = {
        to: txRequest.to,
        value: ethers.parseEther(txRequest.amount),
        gasLimit: txRequest.gasLimit || '21000',
        gasPrice: txRequest.gasPrice ? ethers.parseUnits(txRequest.gasPrice, 'gwei') : undefined
      };

      const txResponse = await this.wallet.sendTransaction(tx);
      
      return {
        hash: txResponse.hash,
        from: this.wallet.address,
        to: txRequest.to,
        value: txRequest.amount,
        status: 'pending'
      };
    } catch (error) {
      throw new Error(`Error enviando transacción: ${error}`);
    }
  }

  // Obtener información de transacción
  async getTransaction(hash: string) {
    try {
      const tx = await this.provider.getTransaction(hash);
      const receipt = await this.provider.getTransactionReceipt(hash);
      
      return {
        ...tx,
        status: receipt?.status === 1 ? 'confirmed' : 'failed',
        gasUsed: receipt?.gasUsed?.toString()
      };
    } catch (error) {
      throw new Error('Error obteniendo transacción');
    }
  }

  // Obtener información de la wallet actual
  getWalletInfo(): WalletInfo | null {
    if (!this.wallet) return null;
    
    return {
      address: this.wallet.address,
      balance: '0' // Se actualiza con getBalance()
    };
  }
}