FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build -- --configuration=production --base-href /customers/

FROM nginx:alpine

# old alpine versions don't have openssl
RUN apk add --no-cache openssl

# Basic Auth credentials only used for local development these are overridden by the pipeline in production
ARG BASIC_AUTH_USER=admin
ARG BASIC_AUTH_PASS=passwordtest

RUN printf "${BASIC_AUTH_USER}:$(openssl passwd -apr1 ${BASIC_AUTH_PASS})\n" > /etc/nginx/.htpasswd

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/*/browser /usr/share/nginx/html/customers/

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]