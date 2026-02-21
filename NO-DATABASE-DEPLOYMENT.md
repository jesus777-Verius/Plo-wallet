# 🚀 Despliegue SIN Base de Datos - POL Wallet Personal

## ✅ **Para USO PERSONAL: NO necesitas base de datos**

### **¿Por qué NO necesitas base de datos?**
- Solo **TÚ** usarás la wallet
- **Un solo usuario** = archivos simples
- **Más seguro** = menos superficie de ataque
- **Más barato** = sin costos de base de datos
- **Más simple** = menos configuración

## 📁 **Sistema de Archivos Seguro**

### **Estructura de datos:**
```
/data/
├── user.json          # Datos del usuario (encriptados)
├── sessions.json       # Sesiones activas
└── backup_*.json       # Backups automáticos
```

### **Seguridad implementada:**
- ✅ **Doble encriptación**: AES-256 + bcrypt
- ✅ **Permisos de archivo**: Solo propietario (600)
- ✅ **Backups automáticos**: Respaldos seguros
- ✅ **Validación de integridad**: Verificación de datos

## 🌐 **Opciones de Despliegue SIN Base de Datos**

### **Opción 1: VPS Simple (Recomendado)**
```bash
# Costo: $5-10/mes
# Proveedores: DigitalOcean, Linode, Vultr

# 1. Crear VPS Ubuntu
# 2. Instalar Node.js y PM2
# 3. Subir código
# 4. Configurar SSL
# 5. ¡Listo!
```

### **Opción 2: Vercel + Railway**
```bash
# Frontend: Vercel (gratis)
# Backend: Railway ($5/mes)
# Total: $5/mes

# Limitación: Railway puede reiniciar y perder archivos
# Solución: Usar volúmenes persistentes
```

### **Opción 3: Heroku**
```bash
# Costo: $7/mes (Eco Dyno)
# Incluye: SSL, dominio, monitoreo
# Limitación: Se duerme después de 30 min inactivo
```

## 🔧 **Configuración Paso a Paso (VPS)**

### **1. Crear VPS**
```bash
# DigitalOcean Droplet
# - Ubuntu 22.04
# - 1GB RAM, 1 CPU
# - $6/mes
```

### **2. Configurar Servidor**
```bash
# Conectar por SSH
ssh root@tu-ip

# Actualizar sistema
apt update && apt upgrade -y

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Instalar PM2
npm install -g pm2

# Instalar Nginx
apt install nginx -y

# Configurar firewall
ufw allow ssh
ufw allow http
ufw allow https
ufw enable
```

### **3. Subir Código**
```bash
# En tu computadora local
scp -r . root@tu-ip:/var/www/pol-wallet/

# En el servidor
cd /var/www/pol-wallet
npm install
npm run build
```

### **4. Configurar SSL**
```bash
# Instalar Certbot
apt install certbot python3-certbot-nginx -y

# Obtener certificado (reemplaza tudominio.com)
certbot --nginx -d tudominio.com

# Configurar renovación automática
crontab -e
# Agregar: 0 12 * * * /usr/bin/certbot renew --quiet
```

### **5. Configurar Nginx**
```nginx
# /etc/nginx/sites-available/pol-wallet
server {
    listen 80;
    server_name tudominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name tudominio.com;
    
    ssl_certificate /etc/letsencrypt/live/tudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tudominio.com/privkey.pem;
    
    # Headers de seguridad
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### **6. Iniciar Aplicación**
```bash
# Crear directorio de datos
mkdir -p /var/www/pol-wallet/data
chmod 700 /var/www/pol-wallet/data

# Iniciar con PM2
cd /var/www/pol-wallet
pm2 start dist/index.js --name pol-wallet
pm2 startup
pm2 save

# Habilitar Nginx
ln -s /etc/nginx/sites-available/pol-wallet /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

## 🔐 **Variables de Entorno Seguras**

```bash
# /var/www/pol-wallet/.env
NODE_ENV=production
PORT=3000
POLYGON_RPC_URL=https://1rpc.io/matic

# Generar secrets seguros
JWT_SECRET=$(openssl rand -base64 64)
JWT_REFRESH_SECRET=$(openssl rand -base64 64)
ENCRYPTION_SALT=$(openssl rand -base64 32)

# Configurar dominio
ALLOWED_ORIGINS=https://tudominio.com
```

## 📊 **Comparación: Con vs Sin Base de Datos**

| Aspecto | Sin Base de Datos | Con Base de Datos |
|---------|-------------------|-------------------|
| **Costo** | $5-10/mes | $15-30/mes |
| **Complejidad** | Baja | Media-Alta |
| **Seguridad** | Alta (menos vectores) | Media (más superficie) |
| **Escalabilidad** | 1 usuario | Múltiples usuarios |
| **Backup** | Archivos simples | Dumps de BD |
| **Mantenimiento** | Mínimo | Regular |

## ⚡ **Script de Despliegue Automático**

<function_calls>
<invoke name="fsWrite">
<parameter name="path">deploy-no-db.shbin/bash

# Script de despliegue sin base de datos
# Uso: ./deploy-no-db.sh tu-dominio.com tu-ip-servidor

set -e

DOMAIN=$1
SERVER_IP=$2

if [ -z "$DOMAIN" ] || [ -z "$SERVER_IP" ]; then
    echo "Uso: ./deploy-no-db.sh tu-dominio.com tu-ip-servidor"
    exit 1
fi

echo "🚀 Desplegando POL Wallet en $DOMAIN ($SERVER_IP)..."

# 1. Preparar código localmente
echo "📦 Preparando código..."
npm install
npm run build

# 2. Subir código al servidor
echo "📤 Subiendo código al servidor..."
rsync -avz --exclude node_modules --exclude .git . root@$SERVER_IP:/var/www/pol-wallet/

# 3. Configurar servidor
echo "⚙️ Configurando servidor..."
ssh root@$SERVER_IP << EOF
cd /var/www/pol-wallet

# Instalar dependencias
npm install --production

# Crear directorio de datos seguro
mkdir -p data
chmod 700 data

# Generar variables de entorno
cat > .env << EOL
NODE_ENV=production
PORT=3000
POLYGON_RPC_URL=https://1rpc.io/matic
JWT_SECRET=\$(openssl rand -base64 64)
JWT_REFRESH_SECRET=\$(openssl rand -base64 64)
ENCRYPTION_SALT=\$(openssl rand -base64 32)
ALLOWED_ORIGINS=https://$DOMAIN
EOL

# Configurar PM2
pm2 delete pol-wallet 2>/dev/null || true
pm2 start dist/index.js --name pol-wallet
pm2 startup
pm2 save

# Configurar Nginx
cat > /etc/nginx/sites-available/pol-wallet << EOL
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\\\$server_name\\\$request_uri;
}

server {
    listen 443 ssl;
    server_name $DOMAIN;
    
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
    }
}
EOL

# Habilitar sitio
ln -sf /etc/nginx/sites-available/pol-wallet /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# Obtener certificado SSL
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

echo "✅ Despliegue completado!"
echo "🌐 Tu wallet está disponible en: https://$DOMAIN"
EOF

echo "🎉 ¡Despliegue exitoso!"
echo "🔗 Accede a tu wallet en: https://$DOMAIN"
echo "📊 Monitorea con: ssh root@$SERVER_IP 'pm2 status'"