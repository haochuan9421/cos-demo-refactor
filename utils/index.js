const crypto = require('crypto');
const CONFIG = require('../config');

module.exports = {
  // 获取随机数
  getRandom: function(min, max) {
    return Math.round(Math.random() * (max - min) + min);
  },
  // 对象转query string
  json2str: function (obj) {
    let arr = [];
    Object.keys(obj).sort().forEach(key=>{
      let value = obj[key] || '';
      arr.push(key + '=' + value);
    });
    return arr.join('&');
  },
  // JS的encodeURIComponent方法和其他语言的encode表现不一致，比如encodeURIComponent('*')的结果是'*',而PHP里urlencode('*')的结果是'%2A'
  safeUrlEncode(str) {
    return encodeURIComponent(str)
      .replace(/!/g, '%21')
      .replace(/'/g, '%27')
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29')
      .replace(/\*/g, '%2A');
  },
  // 获取对象键值并按小写后的首字母排序
  getObjectKeys(obj){
    return Object.keys(obj).sort((a, b)=>{
      a = a.toLowerCase();
      b = b.toLowerCase();
      return a === b ? 0 : (a > b ? 1 : -1);
    });
  },
  // 对象转query string + urlEncode
  obj2str(obj){
    let key, val;
    let list = [];
    let keyList = this.getObjectKeys(obj);
    for (let i = 0; i < keyList.length; i++) {
      key = keyList[i];
      val = (obj[key] === undefined || obj[key] === null) ? '' : ('' + obj[key]);
      key = ('' + key).toLowerCase();
      key = this.safeUrlEncode(key);
      val = this.safeUrlEncode(val) || '';
      list.push(key + '=' +  val);
    }
    return list.join('&');
  },
  // 简答的深拷贝
  clone(obj) {
    function map(obj, fn) {
      let o = obj instanceof Array ? [] : {};
      for (let i in obj) {
        if (obj.hasOwnProperty(i)) {
          o[i] = fn(obj[i]);
        }
      }
      return o;
    }
    return map(obj, function(value) {
      return typeof value === 'object' ? this.clone(value) : value;
    });
  },
  // 计算获取临时密钥的签名
  getSignature: function(opt, key, method) {
    let formatString = method + CONFIG.Domain + '/v2/index.php?' + this.json2str(opt);
    let hmac = crypto.createHmac('sha1', key);
    let sign = hmac.update(Buffer.from(formatString, 'utf8')).digest('base64');
    return sign;
  },
  // 计算授权签名
  getAuthorization(opt){
    let SecretId = opt.SecretId;
    let SecretKey = opt.SecretKey;
    let method = opt.Method.toLowerCase();
    let pathname = opt.Pathname.indexOf('/') === 0? opt.Pathname : '/' + opt.Pathname;
    let query = this.clone(opt.Query);
    let headers = this.clone(opt.Headers);
  
    // 签名有效起止时间
    let now = parseInt(new Date().getTime() / 1000) - 1;
    let exp = now + 900; // 签名过期时间为当前 + 900s;
  
    // 要用到的 Authorization 参数列表
    let qSignAlgorithm = 'sha1';
    let qAk = SecretId;
    let qSignTime = now + ';' + exp;
    let qKeyTime = now + ';' + exp;
    let qUrlParamList = this.getObjectKeys(query).join(';').toLowerCase();
    let qHeaderList = this.getObjectKeys(headers).join(';').toLowerCase();
  
    // 签名算法说明文档：https://www.qcloud.com/document/product/436/7778

    // 步骤一：计算 SignKey
    let signKey = crypto.createHmac('sha1', SecretKey).update(qKeyTime).digest('hex');
  
    // 步骤二：构成 FormatString
    let formatString = [method, pathname, this.obj2str(query), this.obj2str(headers), ''].join('\n');
    formatString = Buffer.from(formatString, 'utf8');
  
    // 步骤三：计算 StringToSign
    let sign = crypto.createHash('sha1').update(formatString).digest('hex');
    let stringToSign = ['sha1', qSignTime, sign, ''].join('\n');
  
    // 步骤四：计算 Signature
    let qSignature = crypto.createHmac('sha1', signKey).update(stringToSign).digest('hex');
  
    // 步骤五：构造 Authorization
    let authorization = [
      'q-sign-algorithm=' + qSignAlgorithm,
      'q-ak=' + qAk,
      'q-sign-time=' + qSignTime,
      'q-key-time=' + qKeyTime,
      'q-url-param-list=' + qUrlParamList,
      'q-header-list=' + qHeaderList,
      'q-signature=' + qSignature
    ].join('&');
  
    return authorization;
  }
};