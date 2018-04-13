require('@remy/envy');
const mysql = require('mysql');
const { save, auth } = require('./routes/blaze');
var connection = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASS,
  database: process.env.MYSQL_DB,
});

let ctr = 0;
connection.connect();
(async () => {
  await auth.then(() => {});
  run();
})();

async function run() {
  try {
    await query();
    ctr++;
    run();
  } catch (e) {
    setTimeout(run, 2000);
  }
}

function query() {
  return new Promise((resolve, reject) => {
    connection.query(
      `SELECT * from sandbox where id>1138446 limit ${ctr * 1000}, 1000`,
      (error, results) => {
        if (error) {
          console.log(error);
          return reject();
        }
        return resolve(
          Promise.all(
            results.filter(_ => _.active === 'y').map(result =>
              getOwner(result).then(user => {
                if (user) {
                  result.meta = metadata({
                    url: result.url,
                    revision: result.revision,
                    user: user.name,
                  });
                  result.visibility = user.visibility;
                  result.user = user.name;
                } else {
                  result.meta = metadata({
                    url: result.url,
                    revision: result.revision,
                  });
                }

                return save(result);
              })
            )
          ).then(result => console.log(result.join('\n')))
        );
      }
    );
  });
}

function metadata({
  url,
  revision,
  user = 'anonymous',
  year = new Date().getFullYear(),
}) {
  return `<!--

> Created using JS Bin - https://jsbin.com
> Released under the MIT license - https://jsbin.mit-license.org
> Copyright (c) ${year} ${user} - https://jsbin.com/${url}/${revision}/edit

-->
<meta name="robots" content="none">`;
}

function getOwner({ url, revision } = {}) {
  return new Promise(resolve => {
    connection.query(
      `SELECT * from owners where url=? and revision=?`,
      [url, revision],
      (error, results) => {
        if (error || !results) {
          return resolve(false);
        }

        if (results) {
          resolve(results[0]);
        }
      }
    );
  });
}
