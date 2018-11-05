# 腾讯云对象存储 COS 示例（Node 重构版）

### 可执行命令

`npm run start` 启动服务（签名接口 + 前端），运行在 3000 端口，你可以通过修改 `.npmrc` 或者 `package.json` 来调整端口。

`npm run lint` ESlint 代码风格检测。

`npm run fix` 按 ESlint 风格自动格式化代码。

### 参数配置

> 诸如 `SecretId` 和 `SecretKey` 等敏感信息已替换为 ****** 脱敏。

后端配置文件 ——> `config.js`

前端配置文件 ——> `www/js/config.js`

### Docker 部署

```bash
docker pull node
docker build -t tencent-cos .
docker run -d -p 3000:3000 tencent-cos

docker container ls -a
docker exec -i -t 容器名称或者容器ID bash
exit
```

