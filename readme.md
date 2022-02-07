# Hasura Auth JS SDK

Hasura Auth JS SDK to handle **Auth** with [Hasura](https://hasura.io/). This package allow use multiple apps with custom endpoint.

## Install

`$ npm install @suplere/hbp-auth-js`

## Documentation

In VUE for example u may use this :
```
in module init (I use service file hbp.ts)
import { HasuraAuthClient } from "@suplere/hbp-auth-js";

export const hbpAuthClient = new HasuraAuthClient({
  url: HBP_ENDPOINT,
  appId: HBP_APP_ID,
});

in main.ts:
const app = createApp(App).use(store)

// wait for auth 
hbpAuthClient.isAuthenticatedAsync()
.then(status => {
  console.log('AUTH status', status)
  app.use(router).mount("#app");
})

```
