# Mobile and responsive portal

## Demo data

The portal screens read through the `PortalDataSource` contract in `src/data/`.
`src/data/index.ts` selects the demo adapter, which keeps fictional records in
the session storage of the browser tab. Nothing is sent to a server.

- Sign in with the demo accounts on the login screen: Verified Doe, Unverified
  Doe, or Officer Doe.
- Claims, check-ins, and grants change the demo records of the tab. Sign out
  keeps the records. A new tab starts from the seed records.
- Demo voucher and member QR codes work only with the demo check-in screen.

To go live, add a `PortalDataSource` for the API and select it in
`src/data/index.ts`. Pages, routes, and components need no changes. The backend
must still check every role and membership rule. The role checks in the portal
only hide screens.

## Layout

- Below the `lg` breakpoint the portal shows a fixed bottom navigation. It uses
  the same role destinations as the desktop navigation and adds a More menu
  with Points and the other pages.
- The portal footer stays visible on phones above the bottom navigation.
