# Stage 1
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY . .
RUN npm run build

# Stage 2
FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
