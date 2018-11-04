window.onload = function() {
  (function() {
    var inputEle = document.getElementById('input');
    var submitEle = document.getElementById('submit');

    var method = 'PUT';
    var Bucket = window.COS_CONFIG.Bucket;
    var Region = window.COS_CONFIG.Region;
    var prefix = window.location.protocol + '//' + Bucket + '.cos.' + Region + '.myqcloud.com/';

    // 显示错误信息
    function showMsg(msg, color) {
      if (!arguments[1]) color = 'red';
      var msgEle = document.getElementById('msg');
      msgEle && document.body.removeChild(msgEle);
      msgEle = document.createElement('div');
      msgEle.id = 'msg';
      document.body.appendChild(msgEle);
      msgEle.innerHTML = '<pre style="color: ' + color + ';">' + JSON.stringify(msg, null, 2) + '</pre>';
    }
    // 获取授权信息
    function getAuthorization(pathname, callback) {
      var url = '/auth' + '?method=' + method + '&pathname=' + pathname;
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.onload = function() {
        if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304) {
          var res = JSON.parse(xhr.responseText);
          if (res.success) {
            callback(res.data);
          } else {
            showMsg(res.error);
          }
        } else {
          showMsg('获取授权失败');
        }
      };
      xhr.onerror = function() {
        showMsg('获取授权失败');
      };
      xhr.send();
    }
    // 上传文件
    function uploadFile(file) {
      var pathname = 'file-' + parseInt(1000000 * (Math.random() + 1)) + '/' + file.name; // 随机文件夹名以避免同名文件覆盖
      getAuthorization(pathname, function(auth) {
        var url = prefix + pathname;
        var xhr = new XMLHttpRequest();
        xhr.open(method, url, true);

        xhr.setRequestHeader('Authorization', auth.Authorization);
        auth.XCosSecurityToken && xhr.setRequestHeader('x-cos-security-token', auth.XCosSecurityToken);

        xhr.upload.onprogress = function(e) {
          console.log('上传进度 ' + (Math.round(e.loaded / e.total * 10000) / 100) + '%');
        };
        xhr.onload = function() {
          if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304) {
            var p = document.createElement('p');
            p.innerHTML = '<a href=' + url + ' download target="_blank">' + file.name + '</a>';
            document.body.appendChild(p);
          } else {
            showMsg('上传失败');
          }
        };
        xhr.onerror = function() {
          showMsg('上传失败');
        };
        xhr.send(file);
      });
    }
    // 监听上传按钮点击事件
    submitEle.addEventListener('click', function() {
      if (inputEle.files.length) {
        for (var i = 0; i < inputEle.files.length; i++) {
          var file = inputEle.files[i];
          uploadFile(file);
        }
      } else {
        showMsg('请选择文件');
      }
    });
  })();
};