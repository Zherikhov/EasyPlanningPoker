# syntax=docker/dockerfile:1

# 1) Сборка фронтенда (React + Vite)
FROM node:18-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
# Быстрая и детерминированная установка зависимостей
RUN npm ci --no-audit --no-fund
# ... existing code ...
COPY frontend .
# Продакшн-сборка SPA (в dist)
RUN npm run build

# 2) Сборка бэкенда (Spring Boot, Java 21)
FROM maven:3.9.9-eclipse-temurin-21 AS backend-builder
WORKDIR /app
# Кэшируем зависимости Maven
COPY pom.xml ./
COPY .mvn/ .mvn/
RUN mvn -B -q -DskipTests dependency:go-offline
# ... existing code ...
# Копируем исходники
COPY src ./src
# Встраиваем собранный фронтенд как статические ресурсы Spring Boot
# (SPA будет отдаваться самим приложением на 8080)
COPY --from=frontend-builder /frontend/dist ./src/main/resources/static
# Собираем исполняемый JAR без тестов
RUN mvn -B -q clean package -DskipTests

# 3) Runtime-образ (минимальный JRE 21)
FROM eclipse-temurin:21-jre
WORKDIR /app

# Копируем только итоговый JAR
COPY --from=backend-builder /app/target/*.jar /app/app.jar

# Порт приложения
EXPOSE 8080

# Параметры для JVM и Spring профилей
ENV JAVA_OPTS="" \
    SPRING_PROFILES_ACTIVE=""

# Запуск приложения
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS ${SPRING_PROFILES_ACTIVE:+-Dspring.profiles.active=$SPRING_PROFILES_ACTIVE} -jar /app/app.jar"]
