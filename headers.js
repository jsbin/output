module.exports = {
  'Content-Type': 'text/html',
  'X-Robots-Tag': 'nofollow',

  // note: as of 2018-02-04, this doesn't stick due to non-support in AWS:
  // https://forums.aws.amazon.com/thread.jspa?threadID=149569
  'X-Frame-Options': 'DENY',
};
