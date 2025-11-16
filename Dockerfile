# Dockerfile

FROM node:20-alpine

ENV NODE_ENV production
ENV PORT 8667

WORKDIR /app

COPY package*.json ./

# Installiere die Produktionsabhängigkeiten
# Wir brauchen kein mDNS mehr
RUN npm install --omit=dev

COPY . .

EXPOSE ${PORT}

CMD [ "npm", "start" ]