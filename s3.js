const knox = require('knox');
const client = knox.createClient({
  key: process.env.AWS_ACCESS_KEY_ID,
  secret: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  bucket: process.env.AWS_BUCKET,
});

function put({ bin, rev }, html) {
  const url = `/${bin}/${rev}`;
  return new Promise((resolve, reject) => {
    const req = client.put(url, {
      'x-amz-acl': 'public-read',
      'x-amz-storage-class': 'REDUCED_REDUNDANCY',
      'Content-Length': Buffer.byteLength(html),
      'Content-Type': 'text/html',
    });

    req.on('response', res => {
      if (res.statusCode === 200) {
        resolve(req.url);
      }
    });
    req.on('error', reject);
    req.end(html);
  });
}

module.exports = {
  put,
};
