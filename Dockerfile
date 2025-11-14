# Dockerfile

FROM node:20-alpine

ENV NODE_ENV production
ENV PORT 8667 # ⬅️ NEUER PORT

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev

COPY . .

# Dies ist nur dokumentarisch, da der Host Network Mode verwendet wird
EXPOSE ${PORT}

CMD [ "npm", "start" ]