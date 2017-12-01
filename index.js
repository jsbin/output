const express = require('express');
const app = express();
require('@remy/envy');

app.use('/', require('./routes'));
app.use(require('./error'));

app.listen(process.env.PORT || 5000);
