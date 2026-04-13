FROM php:8.4-apache

RUN apt-get update \
  && apt-get install -y --no-install-recommends gettext-base libsqlite3-dev openssl pkg-config \
  && docker-php-ext-install pdo_sqlite \
  && a2enmod headers rewrite ssl \
  && a2dissite 000-default default-ssl \
  && rm -rf /var/lib/apt/lists/*

ENV APP_PORT_HTTP=8080 \
    APP_PORT_HTTPS=8443 \
    PUBLIC_HTTPS_PORT=8443 \
    APP_DATA_DIR=/var/www/data \
    DB_PATH=/var/www/data/auth.db \
    CERT_DIR=/var/www/certs \
    TLS_CERT_PATH=/var/www/certs/server.crt \
    TLS_KEY_PATH=/var/www/certs/server.key

COPY docker/php.ini /usr/local/etc/php/conf.d/security.ini
COPY docker/apache-global.conf /etc/apache2/conf-available/kamsis-global.conf
COPY docker/apache-http.conf.template /etc/apache2/sites-available/http-redirect.conf.template
COPY docker/apache-ssl.conf.template /etc/apache2/sites-available/app-ssl.conf.template
COPY app /var/www/html/app
COPY public /var/www/html/public
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint-custom.sh

RUN mkdir -p /var/www/data /var/www/certs \
  && a2enconf kamsis-global \
  && chmod +x /usr/local/bin/docker-entrypoint-custom.sh \
  && chown -R www-data:www-data /var/www

EXPOSE 8080 8443
VOLUME ["/var/www/data", "/var/www/certs"]

ENTRYPOINT ["docker-entrypoint-custom.sh"]
CMD ["apache2-foreground"]
