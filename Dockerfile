FROM ubuntu:25.10

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    apache2 \
    gettext-base \
    libapache2-mod-php8.4 \
    mysql-server \
    openssl \
    php8.4 \
    php8.4-mysql \
  && a2enmod headers rewrite ssl \
  && (a2dissite 000-default default-ssl >/dev/null 2>&1 || true) \
  && rm -rf /var/lib/apt/lists/*

ENV APP_PORT_HTTP=8080 \
    APP_PORT_HTTPS=8443 \
    PUBLIC_HTTPS_PORT=8443 \
    APP_DATA_DIR=/var/www/data \
    DB_HOST=127.0.0.1 \
    DB_PORT=3306 \
    DB_NAME=au7h_auth \
    DB_USER=au7h_app \
    CERT_DIR=/var/www/certs \
    MYSQL_DATA_DIR=/var/lib/mysql \
    MYSQL_DATABASE=au7h_auth \
    MYSQL_APP_USER=au7h_app \
    MYSQL_PORT=3306

COPY docker/php.ini /etc/php/8.4/apache2/conf.d/90-au7h-security.ini
COPY docker/apache-global.conf /etc/apache2/conf-available/zzz-au7h-global.conf
COPY docker/apache-http.conf.template /etc/apache2/sites-available/http-redirect.conf.template
COPY docker/apache-ssl.conf.template /etc/apache2/sites-available/app-ssl.conf.template
COPY config /var/www/html/config
COPY public /var/www/html/public
COPY src /var/www/html/src
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint-custom.sh

RUN mkdir -p /var/www/data /var/www/certs /var/run/mysqld /var/lib/mysql \
  && a2enconf zzz-au7h-global \
  && chmod +x /usr/local/bin/docker-entrypoint-custom.sh \
  && chown -R www-data:www-data /var/www \
  && chown -R mysql:mysql /var/run/mysqld /var/lib/mysql

EXPOSE 8080 8443
VOLUME ["/var/www/data", "/var/www/certs", "/var/lib/mysql"]

ENTRYPOINT ["docker-entrypoint-custom.sh"]
CMD ["apache2ctl", "-D", "FOREGROUND"]
