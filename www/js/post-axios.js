window.onload = function() {
  (function() {
    const inputEle = document.querySelector('#input');
    const submitEle = document.querySelector('#submit');

    const method = 'POST';
    const Bucket = window.COS_CONFIG.Bucket;
    const Region = window.COS_CONFIG.Region;
    const prefix = `${window.location.protocol}//${Bucket}.cos.${Region}.myqcloud.com/`;

    // 显示错误信息
    function showMsg(msg, color = 'red') {
      let msgEle = document.querySelector('#msg');
      msgEle && document.body.removeChild(msgEle);
      msgEle = document.createElement('div');
      msgEle.id = 'msg';
      document.body.appendChild(msgEle);
      msgEle.innerHTML = `<pre style="color: ${color};">${JSON.stringify(msg, null, 2)}</pre>`;
    }
    // 获取授权信息
    function getAuthorization() {
      let url = `/auth?method=${method}`;
      return new Promise((resolve, reject) => {
        axios.get(url).then(res => {
          if (res.data.success) {
            resolve(res.data.data);
          } else {
            showMsg(res.data.error);
            reject(res.data.error);
          }
        }).catch(error => {
          showMsg('获取授权失败');
          reject(error);
        });
      });
    }
    // 上传文件
    function uploadFile(file) {
      let pathname = 'file-' + parseInt(1000000 * (Math.random() + 1)) + '/' + file.name; // 随机文件夹名以避免同名文件覆盖
      getAuthorization().then(auth => {
        let url = prefix;

        var fd = new FormData();
        fd.append('Signature', auth.Authorization);
        auth.XCosSecurityToken && fd.append('x-cos-security-token', auth.XCosSecurityToken);
        fd.append('key', pathname);
        fd.append('file', file);

        axios({
          method,
          url,
          data: fd,
          onUploadProgress: function(e) {
            console.log(`上传进度${Math.round(e.loaded / e.total * 10000) / 100}%`);
          }
        }).then(() => {
          let p = document.createElement('p');
          p.innerHTML = `<a href="${prefix + pathname}" download target="_blank">${file.name}</a>`;
          document.body.appendChild(p);
        }).catch(() => {
          showMsg('上传失败');
        });
      });
    }
    // 监听上传按钮点击事件
    submitEle.addEventListener('click', () => {
      if (inputEle.files.length) {
        for (let i = 0; i < inputEle.files.length; i++) {
          let file = inputEle.files[i];
          uploadFile(file);
        }
      } else {
        showMsg('请选择文件');
      }
    });
  })();
};