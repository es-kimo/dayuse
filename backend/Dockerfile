# Stage 1: Build
FROM eclipse-temurin:17-jdk-jammy AS builder
WORKDIR /app

COPY gradlew gradlew.bat settings.gradle.kts build.gradle.kts ./
COPY gradle ./gradle
RUN chmod +x gradlew

# 의존성 캐싱
RUN ./gradlew dependencies --no-daemon || true

COPY src ./src
RUN ./gradlew bootJar --no-daemon -x test

# Stage 2: Runtime
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

RUN addgroup --system --gid 1001 dayuse && adduser --system --uid 1001 --ingroup dayuse dayuse
COPY --from=builder /app/build/libs/*.jar app.jar
USER dayuse

EXPOSE 8080
ENV SPRING_PROFILES_ACTIVE=local
ENV TZ=Asia/Seoul

ENTRYPOINT ["java", "-jar", "app.jar"]
