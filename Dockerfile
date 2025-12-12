FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build -- --configuration=production --base-href /customers/

FROM nginx:alpine

# Copia la configurazione di Nginx
#COPY /nginx/templates/nginx.conf.template /etc/nginx/templates/nginx.conf.template
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist/*/browser /usr/share/nginx/html/customers/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
