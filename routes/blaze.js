const { promisify } = require('util');
const express = require('express');
const bodyParser = require('body-parser');
const createError = require('http-errors');
const binToFile = require('bin-to-file');
const B2 = require('backblaze-b2');
const less = require('less');
const Babel = require('babel-standalone');
const scss = promisify(require('node-sass').render);
const commonmark = require('commonmark');
const coffee = require('coffeescript');
const pug = require('pug');
const stylus = require('stylus');
const typescript = require('typescript');

const b2 = new B2({
  accountId: process.env.B2_ID,
  applicationKey: process.env.B2_KEY,
});

const auth = b2
  .authorize()
  .then(() => console.log('b2 connected'))
  .catch(e => console.log(`b2 failed: ${e}`));

const router = express.Router();

const processorRename = s => {
  if (s === 'jsx' || s === 'traceur') {
    return 'babel';
  }

  return s;
};

const processors = {
  typescript: source =>
    typescript.transpileModule(source, {
      compilerOptions: { module: typescript.ModuleKind.CommonJS },
    }).outputText,
  less: source => less.render(source).then(res => res.css),
  coffeescript: source => coffee.compile(source),
  jade: source => {
    if (source.startsWith('!')) {
      source = ['doctype'].concat(source.split('\n').slice(1)).join('\n');
    }
    return pug.render(source);
  },
  stylus: source => {
    return new Promise((resolve, reject) => {
      stylus.render(source, { filename: 'bin.css' }, (err, css) => {
        if (err) {
          return reject(err);
        }
        resolve(css);
      });
    });
  },
  // jsx: source => processors.babel(source),
  // traceur: source => processors.babel(source),

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

  // "fix" http scripts
  const html = binToFile({ ...body, revision, url })
    .replace(/src="http:\/\/ajax.googleapis/g, 'src="https://ajax.googleapis')
    .replace(/src="http:\/\/code.jquery.com/g, 'src="https://code.jquery.com')
    .replace(/src="http:\/\/ajax.cdnjs.com/g, 'src="https://ajax.cdnjs.com')
    .replace(/http:\/\/cdnjs.cloudflare.com/g, 'https://cdnjs.cloudflare.com');

  await b2.getUploadUrl(process.env.B2_BUCKET).then(({ data }) => {
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
    body.processors = {};
    await Promise.all(
      Object.entries(JSON.parse(body.settings || '{}').processors || {}).map(
        async ([lang, processor]) => {
          if (lang !== processor) {
            // translate
            let result = body[lang];
            try {
              processor = processorRename(processor);
              const res = await processors[processor](result);
              body.processors[lang] = processor;
              body.source[lang] = body[lang];
              body[lang] = res;
            } catch (e) {
              console.log(body.id, body.url, body.revision, e);
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
module.exports.auth = auth;

// if the module isn't being required be another module
// and there's something being piped in, then —
if (!module.parent && !process.stdin.isTTY) {
  (async () => {
    await auth.then(() => {});
    const stdin = require('fs').readFileSync(0); // 0 = STDIN
    save(JSON.parse(stdin.toString()))
      .then(res => console.log(res))
      .catch(e => console.log(e));
  })();
}
