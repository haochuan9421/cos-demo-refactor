const path = require('path');
const chalk = require('chalk');
const request = require('request');
const express = require('express');
const bodyParser = require('body-parser');

const utils = require('../utils');
const CONFIG = require('../config');

// 设置端口，权重 .npmrc > package.json > 3000
const PORT = process.env.npm_CONFIG_PORT || process.env.PORT || 3000;

// 缓存临时密钥
const tempKeysCache = {
  policyStr: '',
  expiredTime: 0
};

// 拼接获取临时密钥的参数
function getTempKeys() {
  return new Promise((resolve, reject)=>{
    // 判断是否修改了 AllowPrefix
    if (CONFIG.AllowPrefix === '_ALLOW_DIR_/*') {
      reject({ error: '请修改 AllowPrefix 配置项，指定允许上传的路径前缀' });
      return;
    }

    // 定义绑定临时密钥的权限策略
    let ShortBucketName = CONFIG.Bucket.substr(0, CONFIG.Bucket.lastIndexOf('-'));
    let AppId = CONFIG.Bucket.substr(1 + CONFIG.Bucket.lastIndexOf('-'));
    let policy = {
      'version': '2.0',
      'statement': [{
        'effect': 'allow',
        'principal': { 'qcs': ['*'] },
        'action': [
          // // 这里可以从临时密钥的权限上控制前端允许的操作
          // 'name/cos:*', // 这样写可以包含下面所有权限
          // // 列出所有允许的操作
          // // ACL 读写
          // 'name/cos:GetBucketACL',
          // 'name/cos:PutBucketACL',
          // 'name/cos:GetObjectACL',
          // 'name/cos:PutObjectACL',
          // // 简单 Bucket 操作
          // 'name/cos:PutBucket',
          // 'name/cos:HeadBucket',
          // 'name/cos:GetBucket',
          // 'name/cos:DeleteBucket',
          // 'name/cos:GetBucketLocation',
          // // Versioning
          // 'name/cos:PutBucketVersioning',
          // 'name/cos:GetBucketVersioning',
          // // CORS
          // 'name/cos:PutBucketCORS',
          // 'name/cos:GetBucketCORS',
          // 'name/cos:DeleteBucketCORS',
          // // Lifecycle
          // 'name/cos:PutBucketLifecycle',
          // 'name/cos:GetBucketLifecycle',
          // 'name/cos:DeleteBucketLifecycle',
          // // Replication
          // 'name/cos:PutBucketReplication',
          // 'name/cos:GetBucketReplication',
          // 'name/cos:DeleteBucketReplication',
          // // 删除文件
          // 'name/cos:DeleteMultipleObject',
          // 'name/cos:DeleteObject',

          // 简单文件操作
          'name/cos:PutObject',
          'name/cos:PostObject',
          'name/cos:AppendObject',
          'name/cos:GetObject',
          'name/cos:HeadObject',
          'name/cos:OptionsObject',
          'name/cos:PutObjectCopy',
          'name/cos:PostObjectRestore',
          // 分片上传操作
          'name/cos:InitiateMultipartUpload',
          'name/cos:ListMultipartUploads',
          'name/cos:ListParts',
          'name/cos:UploadPart',
          'name/cos:CompleteMultipartUpload',
          'name/cos:AbortMultipartUpload',
        ],
        'resource': [
          'qcs::cos:' + CONFIG.Region + ':uid/' + AppId + ':prefix//' + AppId + '/' + ShortBucketName + '/',
          'qcs::cos:' + CONFIG.Region + ':uid/' + AppId + ':prefix//' + AppId + '/' + ShortBucketName + '/' + CONFIG.AllowPrefix
        ]
      }]

    };

    let policyStr = JSON.stringify(policy);

    // 有效时间小于 30 秒就重新获取临时密钥，否则使用缓存的临时密钥
    if (tempKeysCache.expiredTime - Date.now() / 1000 > 30 && tempKeysCache.policyStr === policyStr) {
      resolve(tempKeysCache);
      return;
    }

    
    let Method = 'POST';
    let params = {
      Region: 'gz',
      SecretId: CONFIG.SecretId,
      Timestamp: parseInt(new Date() / 1000),
      Nonce: utils.getRandom(10000, 20000),
      Action: 'GetFederationToken',
      durationSeconds: 7200,
      name: 'cos',
      policy: encodeURIComponent(policyStr),
    };
    // 计算签名
    params.Signature = utils.getSignature(params, CONFIG.SecretKey, Method);

    let opt = {
      method: Method,
      url: CONFIG.Url,
      rejectUnauthorized: false,
      json: true,
      form: params,
      headers: {
        Host: CONFIG.Domain
      },
      proxy: CONFIG.Proxy || '',
    };
    request(opt, function(error, response, body) {
      if(error){
        reject(error);
        return;  
      }
      if (body.code === 0) {
        let data = body.data;
        tempKeysCache.credentials = data.credentials;
        tempKeysCache.expiredTime = data.expiredTime;
        tempKeysCache.policyStr = policyStr;
        resolve(data);  
      } else {
        reject(body);
      }
    });
  });
}

const app = express();

app.use(bodyParser.json());
// 添加静态服务中间件
app.use(express.static(path.resolve(__dirname, '../www')));

// 计算签名接口
app.all('/auth', function (req, res) {
  res.header('Access-Control-Allow-Origin', '*');
  if (req.method.toUpperCase() === 'OPTIONS') {
    res.end();
    return;
  }
  // 获取临时密钥，计算签名
  getTempKeys()
    .then((tempKeys)=>{
      let opt = {
        SecretId: tempKeys.credentials.tmpSecretId,
        SecretKey: tempKeys.credentials.tmpSecretKey,
        Method: req.body.method || req.query.method || 'get',
        Pathname: req.body.pathname || req.query.pathname || '/',
        Query: req.body.query || req.query.query || {},
        Headers: req.body.headers || req.query.headers || {},
      };
      let data = {
        Authorization: utils.getAuthorization(opt),
        XCosSecurityToken: tempKeys.credentials.sessionToken || ''
      };
      res.send({
        success: true,
        data: data
      });
    }).catch((error)=>{
      res.send({
        success: false,
        error: error
      });
    });
});

// CORS 配置
app.all('*', function (req, res) {
  res.header('Access-Control-Allow-Origin', '*');
  if (req.method.toUpperCase() === 'OPTIONS') {
    res.end();
    return;
  }
  res.status(404).send('404 Not Found');
});

// 启动应用
app.listen(PORT, function() {
  console.log(chalk.green('启动成功:'), chalk.underline(`http://localhost:${PORT}`));
});