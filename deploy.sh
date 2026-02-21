#!/bin/bash

# Script de despliegue para POL Wallet
# Uso: ./deploy.sh [production|staging]

set -e

ENVIRONMENT=${1:-production}

echo "🚀 Iniciando despliegue para $ENVIRONMENT..."

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado"
    exit 1
fi

# Verificar PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 Instalando PM2..."
    npm install -g pm2
fi

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

# Compilar TypeScript
echo "🔨 Compilando TypeScript..."
npm run build

# Configurar variables de entorno
if [ "$ENVIRONMENT" = "production" ]; then
    echo "⚙️ Configurando variables de producción..."
    cp .env.production .env
else
    echo "⚙️ Configurando variables de desarrollo..."
    cp .env.example .env
fi

# Crear directorio de logs
mkdir -p logs

# Configurar PM2
echo "🔧 Configurando PM2..."
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'pol-wallet',
    script: 'dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: '$ENVIRONMENT'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Detener aplicación existente
echo "🛑 Deteniendo aplicación existente..."
pm2 delete pol-wallet 2>/dev/null || true

# Iniciar aplicación
echo "▶️ Iniciando aplicación..."
pm2 start ecosystem.config.js

# Guardar configuración PM2
pm2 save

# Configurar inicio automático
pm2 startup

echo "✅ Despliegue completado!"
echo "📊 Estado de la aplicación:"
pm2 status

echo ""
echo "🔗 Comandos útiles:"
echo "  pm2 logs pol-wallet    # Ver logs"
echo "  pm2 restart pol-wallet # Reiniciar"
echo "  pm2 stop pol-wallet    # Detener"
echo "  pm2 delete pol-wallet  # Eliminar"

if [ "$ENVIRONMENT" = "production" ]; then
    echo ""
    echo "⚠️  IMPORTANTE para producción:"
    echo "  1. Configura HTTPS con certificado SSL"
    echo "  2. Configura firewall (puertos 80, 443)"
    echo "  3. Configura dominio DNS"
    echo "  4. Cambia JWT_SECRET en .env"
    echo "  5. Configura monitoreo y backups"
fi