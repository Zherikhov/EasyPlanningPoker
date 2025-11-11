# Стадия сборки
FROM maven:3.9.5-eclipse-temurin-21 AS builder

WORKDIR /app
# Копируем только файлы, влияющие на зависимости, чтобы кэшировать их отдельно
COPY pom.xml ./
COPY .mvn/ .mvn/
# Предзагружаем зависимости для кэширования
RUN mvn -q -e -DskipTests dependency:go-offline
# ... existing code ...
# Теперь копируем исходники
COPY src ./src
# Если в проекте есть ресурсы вне src (например, frontend сборка, которую нужно встраивать), добавьте COPY нужных директорий
# Сборка .jar файла
RUN mvn -q clean package -DskipTests
# ... existing code ...
# 🏃 Стадия выполнения
FROM eclipse-temurin:21-jre

WORKDIR /app

# Копируем только готовый .jar из предыдущей стадии
COPY --from=builder /app/target/*.jar app.jar

# Открываем порт приложения
EXPOSE 8080

# Возможность прокинуть JVM/SPRING опции через переменные окружения
ENV JAVA_OPTS="" \
    SPRING_PROFILES_ACTIVE=""
# Запуск приложения
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
