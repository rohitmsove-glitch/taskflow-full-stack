FROM node:20-alpine AS build
WORKDIR /app
COPY frontend-angular/package*.json ./
RUN npm install
COPY frontend-angular/ ./
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY frontend-angular/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/taskflow/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
