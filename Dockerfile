# ベースイメージ（Java 21 対応）
FROM eclipse-temurin:21-jdk as builder

# 作業ディレクトリ
WORKDIR /app

# プロジェクトの jar/ソース類をコピー
COPY . .

# jar ビルド（maven wrapper 使用）
RUN ./mvnw clean package -DskipTests

# 実行用ステージ（軽量化）
FROM eclipse-temurin:21-jre

# 作業ディレクトリ
WORKDIR /app

RUN apt-get update && \
    apt-get install -y tzdata && \
    ln -sf /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
    echo "Asia/Tokyo" > /etc/timezone && \
    apt-get clean

# ビルド済み jar をコピー（jar の名前に応じて調整）
COPY --from=builder /app/target/demo-0.0.1-SNAPSHOT.jar app.jar

# アプリ起動
ENTRYPOINT ["java", "-jar", "app.jar"]
