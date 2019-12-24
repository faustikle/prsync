## Before run

### Generate a Bitbucket credentials

* Access your bitbucket settings, and click on `ACCESS MANAGEMENT > OAuth`.
* In `OAuth consumers` click on `Add consumer` button.
* Fill `Name`, select `This is a private consumer` checkbox and mark permission `Pull requests - Read`, and save.
* Back on `OAuth integrated applications` screen, click on your consumer created and copy `Key` and `Secret` tokens.

### Set environments

Set this environments variables on your system:

- BITBUCKET_GROUP: Slug name of you username or group.
- BITBUCKET_KEY: Key generated before.
- BITBUTCKET_SECRET: Secret generated before.
- INTERVAL_UPDATE: (Optional) Time in seconds to poll news PRs, default 60.

## Run

With npx:
```shell
$ npx prsync
```

Intalling and run:
```shell
$ npm install -g prsync

$ prsync
```