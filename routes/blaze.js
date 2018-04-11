const { promisify } = require('util');
const express = require('express');
const bodyParser = require('body-parser');
const createError = require('http-errors');
const binToFile = require('bin-to-file');
const B2 = require('backblaze-b2');
const less = promisify(require('less').render);
const Babel = require('babel-standalone');
const scss = promisify(require('node-sass').render);
const commonmark = require('commonmark');

const b2 = new B2({
  accountId: process.env.B2_ID,
  applicationKey: process.env.B2_KEY,
});

b2
  .authorize()
  .then(() => console.log('b2 connected'))
  .catch(e => console.log(`b2 failed: ${e}`));

const router = express.Router();

const processors = {
  jsx: source => processors.babel(source),
  less: async source => {
    return (await less(source)).css;
  },
  babel: s => {
    return Babel.transform(s, {
      presets: ['es2015', 'react', 'stage-0'],
      ast: false,
      sourceMap: false,
      sourceType: 'module',
    }).code;
  },
  scss: async source =>
    (await scss({
      data: source,
    })).css.toString(),
  markdown: source => {
    const reader = new commonmark.Parser();
    const writer = new commonmark.HtmlRenderer();

    return writer.render(reader.parse(source));
  },
};

const save = async body => {
  body = await transform(body);
  const revision = body.revision || 'latest';
  const url = body.url;

  const html = binToFile({ ...body, revision, url });
  // return html;
  const result = await b2
    .getUploadUrl(process.env.B2_BUCKET)
    .then(({ data }) => {
      const { uploadUrl, authorizationToken: uploadAuthToken } = data;

      const info = {};
      if (body.user) info['x-jsbin-user'] = body.user;
      if (body.visibility !== 'public')
        info['x-jsbin-visibility'] = body.visibility;

      return b2.uploadFile({
        uploadUrl,
        uploadAuthToken,
        filename: `${url}--${revision}.html`,
        mime: 'text/html', // optional mime type, will default to 'b2/x-auto' if not provided
        data: Buffer.from(html), // this is expecting a Buffer, not an encoded string
        info,
      }); // returns promise
    });
  return `https://jsbin.me/${url}/${revision}`;
};

async function transform(body) {
  if (body.settings) {
    body.source = {};
    await Promise.all(
      Object.entries(JSON.parse(body.settings || '{}').processors).map(
        async ([lang, processor]) => {
          if (lang !== processor) {
            // translate
            body.source[lang] = body[lang];
            let result = body[lang];
            try {
              body[lang] = await processors[processor](result);
            } catch (e) {
              console.log(e);
            }
          }
        }
      )
    );
  }
  return body;
}

router.use(bodyParser.json('*/*'));

router.param('rev', (req, res, next, value) => {
  res.locals.rev = value;
  next();
});

router.put('/:bin/:rev', (req, res, next) => {
  next('route');
});

router.post('/_', async (req, res, next) => {
  try {
    if (Array.isArray(req.body)) {
      // multiple
      const data = await Promise.all(req.body.map(save));
      res.send(data.join('\n'));
    } else {
      const data = await save(req.body);
      res.send(data);
    }
  } catch (e) {
    next(createError(500, e.message));
  }
});

router.put(['/_', '/:bin', '/:bin/*?'], async (req, res, next) => {
  // TODO map jsbin sandbox record to full html
  try {
    const body = {
      url: req.params.bin,
      revision: res.locals.rev || 'latest',
      ...req.body,
    };
    const data = await save(body);
    res.json(data);
  } catch (e) {
    console.log(e);
    next(createError(500, e.message));
  }
});

module.exports = router;
module.exports.save = save;
