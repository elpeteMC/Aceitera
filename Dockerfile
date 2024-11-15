# Usa una imagen base de Node.js
FROM node:18

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia el archivo package.json y package-lock.json para instalar dependencias
COPY package*.json ./

# Instala las dependencias de la aplicación
RUN npm install

# Copia el resto del código de tu aplicación al contenedor
COPY . .

# Expone el puerto de la aplicación (Railway usará este puerto)
EXPOSE 3000

# Define el comando para iniciar la aplicación
CMD ["npm", "start"]
