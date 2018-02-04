const express = require('express');
const createError = require('http-errors');
const fetch = require('node-fetch');
const binToFile = require('bin-to-file');
const s3 = require('../s3');
const headers = require('../headers');
const API = process.env.API;
const router = express.Router();
module.exports = router;

router.param('rev', (req, res, next, value) => {
  res.locals.rev = value;
  next();
});

router.get('/:bin/:rev', (req, res, next) => {
  next('route');
});

router.get(['/:bin', '/:bin/*?'], async (req, res, next) => {
  const rev = res.locals.rev || 'latest';
  fetch(`${API}/bin/${req.params.bin}/${rev}`)
    .then(res => {
      if (res.status !== 200) {
        throw createError.NotFound();
      }

      return res.json();
    })
    .then(json => binToFile(json))
    .then(html => {
      res.set(headers).send(html);
      s3
        .put({ bin: req.params.bin, rev }, html)
        .then(url => console.log('saved %s', url))
        .catch(e => console.log(e));
    })
    .catch(next);
});

router.get('/', (req, res) => res.send('ok'));
