// 配置参数
const CONFIG = {
  Bucket: 'mycos-1255621697', // 存储桶名称
  Region: 'ap-guangzhou', // 所属地域
  SecretId: '******', // 固定密钥
  SecretKey: '******', // 固定密钥
  Url: 'https://sts.api.qcloud.com/v2/index.php',
  Domain: 'sts.api.qcloud.com',
  Proxy: '',
  AllowPrefix: '*', // 这里改成允许的路径前缀，这里可以根据自己网站的用户登录态判断允许上传的目录，例子：* 或者 a/* 或者 a.jpg
};

module.exports = CONFIG;