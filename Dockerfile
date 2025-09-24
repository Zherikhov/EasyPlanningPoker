# -------- Frontend build --------
FROM node:20-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --include=dev
COPY frontend ./
RUN npm run build

# -------- Backend build (Maven) --------
FROM maven:3.9.11-eclipse-temurin-21 AS backend
WORKDIR /app
# скопируем бэкенд-исходники
COPY pom.xml ./
COPY src ./src
# положим собранный фронт в static
COPY --from=frontend /app/frontend/dist/ ./src/main/resources/static/
RUN mvn -DskipTests clean package

# -------- Runtime (JRE) --------
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=backend /app/target/*jar /app/app.jar
ENV PORT=8080
EXPOSE 8080
CMD ["sh","-c","java -Dserver.port=${PORT} -jar /app/app.jar"]
