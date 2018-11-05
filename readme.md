Rekbot
===

Amazon Rekognition Bot for Slack

Slack に投稿された画像を Amazon Rekognition で分析します。

### 必要なもの

- AWSアカウント
- Slackアカウント
- Serverless Framework https://serverless.com/

### 試し方

#### Slack App の作成

1. https://api.slack.com/ で新規にアプリを作成します。
2. Basic Information のページから Verification Token の値を取得します。
3. Bot Users のページからBotユーザを作成します。
4. OAuth & Permissions のページから Bot User OAuth Access Token の値を取得します。

#### Rekbot の AWS へのデプロイ

1. `serverless.yml` の `custom` の値を変更します。

| Key | Value |
|------|-------|
| `bucket` | S3 バケット名（例：rekbot-store） |
| `region` | AWS リージョン（例：ap-northeast-1） |
| `slack.accessToken` | Bot User OAuth Access Token の値 |
| `slack.verificationToken` | Verification Token の値 |

2. Serverless Framework を使ってデプロイします。

```console
$ yarn install
$ sls deploy
```

3. API Gateway の URL を取得します。

> URL は https://xxxxxxxx.amazonaws.com/dev/rekbot のようになります。

#### Slack App の設定

1. Event Subscriptions のページを開きます。
2. Enable Events を On にします。
3. Request URL に API Gateway の URL を入力します。
4. Subscribe to Bot Events で `messages.channels`, `message.groups`, `message.im`, `message.mpim` を追加します。
5. 保存します。

あとは Bot ユーザをチャンネルに追加するなり、DMを送ってください！
