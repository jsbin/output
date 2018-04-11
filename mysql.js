require('@remy/envy');
const mysql = require('mysql');
const { save } = require('./routes/blaze');
var connection = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASS,
  database: process.env.MYSQL_DB,
});

let ctr = 0;
connection.connect();
setTimeout(run, 2000);

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
      `SELECT * from sandbox where limit ${ctr * 20}, 20`,
      async (error, results) => {
        if (!error) {
          const result = await Promise.all(
            results.map(async result => {
              return getOwner(result).then(user => {
                if (user) {
                  const binId = [result.url, result.revision].join('/');
                  result.meta = `<!-- source: https://jsbin.com/${binId}/edit -->
<!-- author: @${user.name} -->
`;
                  result.visibility = user.visibility;
                  result.user = user.name;
                }
                return save(result);
              });
            })
          );
          console.log(result.join('\n'));
          return resolve();
        }

        console.log(error);
        reject();
      }
    );
  });
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
