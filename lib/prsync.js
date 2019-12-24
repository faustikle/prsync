const Bitbucket = require('bitbucket');
const {
  flatten,
  prop,
  groupBy,
  mergeAll,
  keys,
  reverse,
  has,
  length,
  cond,
  always,
  T,
  equals,
} = require('ramda');
const request = require('request');
const chalk = require('chalk');
const ago = require('s-ago');
const log = console.log;

const bitbucketclient = new Bitbucket();
const username = process.env.BITBUCKET_GROUP || '';
const BITBUCKET_KEY = process.env.BITBUCKET_KEY || '';
const BITBUTCKET_SECRET = process.env.BITBUTCKET_SECRET || '';
const INTERVAL_UPDATE = process.env.INTERVAL_UPDATE || 60;

const getAcessToken = () => (
  new Promise((resolve, reject) => (
    request({
      url: 'https://bitbucket.org/site/oauth2/access_token',
      method: 'POST',
      json: true,
      form: {
        'grant_type': 'client_credentials'
      },
      auth: {
        'user': BITBUCKET_KEY,
        'pass': BITBUTCKET_SECRET,
      }
    }, (error, response, body) => (
      error ? reject(error) : resolve(body)
    ))
  )).then(prop('access_token'))
);

const authenticate = () => (
  getAcessToken()
    .then(token => bitbucketclient.authenticate({ token, type: 'token' }))
    .then(() => log('Login success...'))
);

const getRepositories = (bitbucket) => (
  bitbucket.repositories
    .list({ username: username })
    .then(repositories => repositories.data.values)
);

const getTimelineIcon = cond([
  [ has('approval'), always(chalk.green.bold('A')) ],
  [ has('update'), always(chalk.green.bold('U')) ],
  [ T, always([]) ],
]);

const convertPrData = (pr) => {
  return ({
    id: pr.id,
    title: pr.title,
    author: pr.author.nickname,
    repository: pr.repository,
    commentCount: pr.comment_count,
    link: pr.links.html.href,
    ago: ago(new Date(pr.updated_on)),
    timeline: flatten(reverse(pr.activities).map(getTimelineIcon)).join(' -> ')
  });
};

const getActivities = (pr, repository) => (bitbucket) => (
  bitbucket.pullrequests
    .listActivities({ pull_request_id: pr.id, username: username, repo_slug: repository })
    .then(activities => ({ ...pr, activities: activities.data.values }))
);

const getPrsForRepository = ({ uuid, name }) => (bitbucket) => (
  bitbucket
    .repositories
    .listPullRequests({ username: username, repo_slug: uuid })
    .then(prsData => prsData.data.values)
    .then(prs => (
      prs.length > 0
        ? Promise.all(prs.map(pr => getActivities(pr, uuid)(bitbucket)))
        : []
    ))
    .then(prs => prs.map(pr => ({ ...pr, repository: name })).map(convertPrData))
    .then(groupBy(pr => pr.repository))
);

const getPrs = (bitbucket) => (
  getRepositories(bitbucket)
    .then(repositories => repositories.map(repository => getPrsForRepository(repository)(bitbucket)))
    .then(promises => Promise.all(promises))
    .then(flatten)
    .then(mergeAll)
);

const getLastTimeUpdate = () => {
  const date = (new Date()).toISOString();

  return `${date.substr(11, 5)}`;
};

const printResume = () => {
  getPrs(bitbucketclient)
    .then(prsByRepository => {
      const countPrs = keys(prsByRepository).reduce((count, repository) => count + length(prsByRepository[repository]), 0);

      process.stdout.write('\033c');
      log(chalk.italic.cyan(`Last update: ${getLastTimeUpdate()}`));
      log('');
      log(chalk.red.bold(`${countPrs} active PRs`));
      log('');

      keys(prsByRepository).forEach(repository => {
        const prs = prsByRepository[repository];
        log(chalk.yellow.bold(`> ${repository}`));
        log('');
        prs.forEach(pr => {
          log(chalk.blue.bold(`${pr.title}`) + chalk.blue.dim(` - ${pr.author}`));
          log(chalk.magenta.italic(`${pr.commentCount} comments - `) + chalk.magenta.italic(`${pr.ago}`));
          log(pr.timeline);
          log(pr.link);
          log('');
        });
      });
    })
};

const main = () => {
  authenticate()
    .then(printResume)
    .catch(error => {
      log(error);
      process.exit(0);
    });

  setInterval(authenticate, 7000 * 1000);
  setInterval(printResume, 1000 * INTERVAL_UPDATE);
};

module.exports = main;
