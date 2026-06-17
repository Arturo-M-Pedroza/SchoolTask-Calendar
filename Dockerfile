FROM php:8.3-fpm-alpine

# Install required system packages and build dependencies
RUN apk add --no-cache \
        git \
        curl \
        bash \
        libpng-dev \
        libjpeg-turbo-dev \
        freetype-dev \
        libwebp-dev \
        zlib-dev \
        libzip-dev \
        oniguruma-dev \
        libxml2-dev \
        zip \
        unzip \
        nodejs \
        npm \
        nginx \
        supervisor \
    && rm -rf /var/cache/apk/*

# Configure and install PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip

# --- Manera oficial y segura de instalar Composer en Docker ---
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

# 1. Copiar manifiestos de dependencias primero para optimizar la caché de Docker
COPY composer.json composer.lock* ./
COPY package.json package-lock.json* ./

# 2. Instalar dependencias sin ejecutar scripts (ya que aún no copiamos el código)
RUN composer install --no-dev --no-interaction --prefer-dist --no-scripts \
    && npm install

# 3. Copiar TODO el código de la aplicación (config/, app/, routes/, etc.)
COPY . .

# 4. Asegurar archivo de entorno y generar la clave de la aplicación
RUN cp .env.example .env \
    && php artisan key:generate --force --no-interaction

# 5. Optimizar el cargador automático de Composer ahora que el código está presente
RUN composer dump-autoload --optimize --no-dev

# 6. Compilar front-end assets (Wayfinder ahora tiene acceso a la estructura completa de Laravel)
ARG VITE_GOOGLE_CLIENT_ID
RUN npm run build

# 7. Configurar permisos para storage y cache
RUN chown -R www-data:www-data /var/www \
    && chmod -R 775 /var/www/storage /var/www/bootstrap/cache

# Copiar configuraciones de servicios
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 80

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]

# Final log
RUN echo "Dockerfile build completed successfully"
